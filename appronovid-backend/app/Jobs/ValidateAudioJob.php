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
            $response = Http::timeout(200)
                ->withoutVerifying()
                ->withToken('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')
                ->withHeaders(['Content-Type' => 'audio/m4a'])
                ->withBody(file_get_contents($audioPathAbsoluto), 'audio/m4a')
                ->post('https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3');

            $resultadoAI = $response->json();
            $textoTranscrito = $resultadoAI['text'] ?? '';

            if ($response->successful()) {

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
                // ❌ RECHAZADO POR FALLO DE API
                $recording->status = 'rejected';
                $recording->ai_transcription = "Error técnico al procesar el audio en el servidor.";
                $recording->save();

                $readingRequest->status = 'pending';
                $readingRequest->save();

                $this->sendPush($recording->volunteer_id, 'Audio rechazado ❌', "Tu lectura de '{$readingRequest->title}' no se pudo validar debido a un error técnico. Por favor, intenta grabar nuevamente.");
            }
        } catch (\Exception $e) {
            Log::error("Error en Job de IA: " . $e->getMessage());
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
