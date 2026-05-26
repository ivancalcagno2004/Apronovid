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
use Illuminate\Support\Facades\Storage;

class ValidateAudioJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $requestId; // (Ojo: Aunque se llame requestId, acá le estás pasando el ID del recording, lo cual está perfecto).
    public $timeout = 300;

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

        // 🛠️ CORREGIDO: La ruta absoluta sale de $recording
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
                return;
            }

            // 1. Creamos el cliente web que ignora el error de certificado SSL en Windows
            $guzzleClient = new \GuzzleHttp\Client(['verify' => false]);

            // 2. Iniciamos el SDK de OpenAI, pero lo engañamos para que use los servidores gratuitos de Groq
            $client = \OpenAI::factory()
                ->withApiKey($groqKey)
                ->withBaseUri('https://api.groq.com/openai/v1')
                ->withHttpClient($guzzleClient)
                ->make();

            // 3. Enviamos el archivo de audio directamente al modelo Whisper de Groq
            $response = $client->audio()->transcribe([
                'model' => 'whisper-large-v3',
                'file' => fopen($audioPathAbsoluto, 'r'), // fopen lee el archivo pesado de a pedacitos
            ]);

            // Extraemos el texto de la respuesta
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
                    // ¡APROBADO!
                    $recording->status = 'approved';
                    $recording->save();

                    $readingRequest->status = 'completed';
                    $readingRequest->audio_path = $recording->audio_path;
                    $readingRequest->voluntario_id = $recording->volunteer_id;
                    $readingRequest->save();

                    $this->sendPush($recording->volunteer_id, '¡Audio publicado! 🎉', "Tu lectura pasó el control de calidad y ya está disponible.");
                    $this->sendPush($readingRequest->oyente_id, '¡Tu solicitud fue grabada! 🎧', "Ya podés escuchar '{$readingRequest->title}'.");
                } else {
                    // ❌ RECHAZADO POR CALIDAD
                    $recording->status = 'rejected';
                    $recording->save();

                    $readingRequest->status = 'pending';
                    $readingRequest->save();

                    $this->sendPush($recording->volunteer_id, 'Audio rechazado por calidad ❌', "Tu lectura de '{$readingRequest->title}' no coincide con el texto original. La IA no aprobó la transcripción.");
                }
            } else {
                // ❌ RECHAZADO POR FALLO (Vino vacío)
                $recording->status = 'rejected';
                $recording->ai_transcription = "La IA no pudo entender el audio.";
                $recording->save();

                $readingRequest->status = 'pending';
                $readingRequest->save();

                $this->sendPush($recording->volunteer_id, 'Audio rechazado ❌', "No pudimos validar tu lectura. Por favor, intenta grabar nuevamente en un lugar con menos ruido.");
            }
        } catch (\Exception $e) {
            Log::error("Error en Job de IA: " . $e->getMessage());

            if ($e->getCode() === 429) {
                $this->release(60); // Reintenta en 1 minuto
                return;
            }
            // ❌ RECHAZADO POR ERROR TÉCNICO (El "catch" definitivo)
            $recording->status = 'rejected';
            $recording->ai_transcription = "Error técnico al procesar el audio en el servidor.";
            $recording->save();

            $readingRequest->status = 'pending';
            $readingRequest->save();

            $this->sendPush($recording->volunteer_id, 'Audio rechazado ❌', "Tu lectura de '{$readingRequest->title}' no se pudo validar debido a un error técnico. Por favor, intenta grabar nuevamente.");
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
