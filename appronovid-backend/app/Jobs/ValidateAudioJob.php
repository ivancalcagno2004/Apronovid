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

        if (empty(trim($textoOriginal))) {
            $readingRequest->status = 'completed';
            $readingRequest->save();
            return;
        }

        try {
            // 🌟 1. Generamos la URL de Lectura (GET) usando el S3Client nativo
            $s3Client = new \Aws\S3\S3Client([
                'version'     => 'latest',
                'region'      => env('AWS_DEFAULT_REGION', 'auto'),
                'endpoint'    => env('AWS_ENDPOINT'),
                'credentials' => [
                    'key'    => env('AWS_ACCESS_KEY_ID'),
                    'secret' => env('AWS_SECRET_ACCESS_KEY'),
                ],
                'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
            ]);

            $command = $s3Client->getCommand('GetObject', [
                'Bucket' => env('AWS_BUCKET'),
                'Key'    => $recording->audio_path,
            ]);

            // Generamos la firma para poder leer el archivo (válida por 15 min)
            $presignedRequest = $s3Client->createPresignedRequest($command, '+15 minutes');
            $audioUrl = (string) $presignedRequest->getUri();

            $groqKey = env('GROQ_API_KEY');
            if (!$groqKey) {
                throw new \Exception("Falta API KEY");
            }

            // 🌟 2. Descargamos el archivo temporalmente desde Cloudflare a Azure
            $tempPath = sys_get_temp_dir() . '/' . uniqid() . '.mp3';
            file_put_contents($tempPath, file_get_contents($audioUrl));

            // 🌟 3. Lo mandamos a Groq
            $guzzleClient = new \GuzzleHttp\Client(['verify' => false]);
            $client = \OpenAI::factory()
                ->withApiKey($groqKey)
                ->withBaseUri('https://api.groq.com/openai/v1') // Corregido el doble .api.api
                ->withHttpClient($guzzleClient)
                ->make();

            $response = $client->audio()->transcribe([
                'model' => 'whisper-large-v3',
                'file' => fopen($tempPath, 'r'),
            ]);

            // Limpiamos el archivo temporal del servidor
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }

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

                    if ($readingRequest->file_path) {
                        \Illuminate\Support\Facades\Storage::disk('public')->delete($readingRequest->file_path);
                    }

                    $readingRequest->status = 'completed';
                    $readingRequest->audio_path = $recording->audio_path;
                    $readingRequest->file_path = null;
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
                                $cacheKey = 'recommendation_sent_today_' . $user->id;

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

            if ($this->attempts() < $this->tries) {
                $this->release(60 * $this->attempts());
                return;
            }

            $recording->status = 'manual_review';
            $recording->ai_transcription = "La IA falló o se saturó. Requiere validación administrativa.";
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
