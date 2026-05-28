<?php

namespace App\Jobs;

use App\Models\ReadingRequest;
use App\Models\VolunteerRecording;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ValidateAudioJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $requestId;
    public $timeout = 300;

    // Permitimos 3 intentos antes de rendirnos
    public $tries = 3;

    public function __construct($requestId)
    {
        $this->requestId = $requestId;
    }

    public function handle()
    {
        $recording = VolunteerRecording::findOrFail($this->requestId);
        $readingRequest = ReadingRequest::findOrFail($recording->reading_request_id);

        if (!$recording || !$recording->audio_path) return;

        $textoOriginal = $readingRequest->description_or_text;
        $audioPathAbsoluto = storage_path('app/public/' . $recording->audio_path);

        if (empty(trim($textoOriginal))) {
            $readingRequest->status = 'completed';
            $readingRequest->save();
            return;
        }

        try {
            $groqKey = env('GROQ_API_KEY');
            if (!$groqKey) {
                Log::error("Falta GROQ_API_KEY en el archivo .env");
                throw new \Exception("Falta API KEY"); // Forzamos el catch
            }

            $guzzleClient = new \GuzzleHttp\Client(['verify' => false]);
            $client = \OpenAI::factory()
                ->withApiKey($groqKey)
                ->withBaseUri('https://api.groq.com/openai/v1')
                ->withHttpClient($guzzleClient)
                ->make();

            $response = $client->audio()->transcribe([
                'model' => 'whisper-large-v3',
                'file' => fopen($audioPathAbsoluto, 'r'),
            ]);

            $textoTranscrito = $response->text ?? '';

            if (!empty($textoTranscrito)) {
                $recording->ai_transcription = $textoTranscrito;
                $recording->save();

                $porcentajeSimilitud = 0;
                similar_text(
                    strtolower(preg_replace('/[^a-z0-9 ]/', '', $textoOriginal)),
                    strtolower(preg_replace('/[^a-z0-9 ]/', '', $textoTranscrito)),
                    $porcentajeSimilitud
                );

                if ($porcentajeSimilitud >= 70) {
                    $recording->status = 'approved';
                    $recording->save();

                    $readingRequest->status = 'completed';
                    $readingRequest->audio_path = $recording->audio_path;
                    $readingRequest->voluntario_id = $recording->volunteer_id;
                    $readingRequest->save();

                    $this->sendPush($recording->volunteer_id, '¡Audio publicado! 🎉', "Tu lectura pasó el control de calidad y ya está disponible.");
                    $this->sendPush($readingRequest->oyente_id, '¡Tu solicitud fue grabada! 🎧', "Ya podés escuchar '{$readingRequest->title}'.");

                    if ($readingRequest->is_public) {
                        try {
                            $interestedUsers = \App\Models\User::whereNotNull('expo_push_token')
                                ->where('role', 'oyente')
                                ->where('id', '!=', $readingRequest->oyente_id)
                                ->whereHas('favorites', function ($query) use ($readingRequest) {
                                    $query->where('category_id', $readingRequest->category_id);
                                })
                                ->get();

                            $messages = [];
                            foreach ($interestedUsers as $user) {
                                // 🌟 LLAVE ÚNICA DEL USUARIO
                                $cacheKey = 'recommendation_sent_today_' . $user->id;

                                // 🌟 SI YA LO NOTIFICAMOS HOY, LO SALTAMOS
                                if (Cache::has($cacheKey)) {
                                    continue;
                                }

                                $messages[] = [
                                    'to'     => $user->expo_push_token,
                                    'sound'  => 'default',
                                    'title'  => '¡Nuevo audio disponible! 🎧',
                                    'body'   => "Un voluntario acaba de grabar '{$readingRequest->title}', un audio que podría interesarte.",
                                    'data'   => [
                                        'type' => 'recommendation',
                                        'audio_id' => $readingRequest->id,
                                        'source' => 'reading_request'
                                    ]
                                ];

                                // 🌟 GUARDAMOS EL REGISTRO HASTA LA MEDIANOCHE
                                Cache::put($cacheKey, true, now()->endOfDay());
                            }

                            if (!empty($messages)) {
                                Http::withoutVerifying()->withHeaders([
                                    'Accept' => 'application/json',
                                    'Content-Type' => 'application/json',
                                ])->post('https://exp.host/--/api/v2/push/send', $messages);
                            }
                        } catch (\Exception $e) {
                            Log::error('Error notificaciones recomendación: ' . $e->getMessage());
                        }
                    }
                } else {
                    $recording->status = 'rejected';
                    $recording->save();

                    $readingRequest->status = 'pending';
                    $readingRequest->save();

                    $this->sendPush($recording->volunteer_id, 'Audio rechazado por calidad ❌', "Tu lectura no coincide suficientemente con el texto original.");
                }
            } else {
                throw new \Exception("Transcripción vacía devuelta por la IA");
            }
        } catch (\Exception $e) {
            Log::error("Error en Job de IA (Intento " . $this->attempts() . "): " . $e->getMessage());

            // 🌟 NUEVO: Sistema de degradación elegante (Fallback)
            if ($this->attempts() < $this->tries) {
                // Esperamos 1 min, luego 2 min, etc antes de reintentar
                $this->release(60 * $this->attempts());
                return;
            }

            // Si agotamos los intentos, no rechazamos: pasa a Revisión Manual
            $recording->status = 'manual_review';
            $recording->ai_transcription = "La IA falló o se saturó. Requiere validación humana.";
            $recording->save();

            $readingRequest->status = 'manual_review';
            $readingRequest->save();

            $this->sendPush($recording->volunteer_id, 'Audio en revisión manual ⏳', "El sistema automático está saturado. Un administrador revisará tu lectura pronto.");
        }
    }

    private function sendPush($userId, $title, $body)
    {
        $user = \App\Models\User::find($userId);
        if ($user && $user->expo_push_token) {
            Http::withoutVerifying()->post('https://exp.host/--/api/v2/push/send', [
                'to' => $user->expo_push_token,
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
            ]);
        }
    }
}
