<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ReadingRequest;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class AutoTtsFallback extends Command
{
    protected $signature = 'app:auto-tts-fallback';
    protected $description = 'Genera lecturas automáticas hiperrealistas usando la capa gratuita de Azure AI Speech';

    public function handle()
    {
        $this->info('Buscando pedidos rezagados (más de 48 horas)...');

        $expiredRequests = ReadingRequest::where('status', 'pending')
            ->where('created_at', '<=', now()->subDays(2))
            ->get();

        if ($expiredRequests->isEmpty()) {
            $this->info('No se encontraron pedidos vencidos.');
            return Command::SUCCESS;
        }

        $key = env('AZURE_SPEECH_KEY');
        $region = env('AZURE_SPEECH_REGION');

        if (!$key || !$region) {
            $this->error('Faltan configurar las credenciales de Azure Speech en el archivo .env');
            return Command::FAILURE;
        }

        foreach ($expiredRequests as $request) {
            if (!$request->description_or_text) {
                continue;
            }

            $this->info("Procesando pedido ID: {$request->id} - Titulo: {$request->title}");

            $escapedText = htmlspecialchars($request->description_or_text, ENT_XML1, 'UTF-8');
            $ssmlPayload = "<speak version='1.0' xml:lang='es-AR'>" .
                "<voice xml:lang='es-AR' xml:gender='Female' name='es-AR-ElenaNeural'>" .
                $escapedText .
                "</voice>" .
                "</speak>";

            try {
                $endpoint = "https://{$region}.tts.speech.microsoft.com/cognitiveservices/v1";

                $headers = [
                    "Ocp-Apim-Subscription-Key: " . $key,
                    "Content-Type: application/ssml+xml",
                    "X-Microsoft-OutputFormat: audio-16khz-128kbitrate-mono-mp3",
                    "User-Agent: ApronovidBackend",
                    "Content-Length: " . strlen($ssmlPayload)
                ];

                $options = [
                    'http' => [
                        'method'  => 'POST',
                        'header'  => implode("\r\n", $headers),
                        'content' => $ssmlPayload,
                        'ignore_errors' => true,
                        'timeout' => 60
                    ],
                    'ssl' => [
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                    ]
                ];

                $context = stream_context_create($options);
                $responseBody = file_get_contents($endpoint, false, $context);

                $statusLine = $http_response_header[0] ?? '';
                preg_match('{HTTP\/\S*\s(\d{3})}', $statusLine, $match);
                $httpCode = (int) ($match[1] ?? 500);

                if ($httpCode === 200 && $responseBody) {
                    $fileName = 'audios/ai_generated_' . $request->id . '_' . time() . '.mp3';

                    Storage::disk('public')->put($fileName, $responseBody);

                    $request->status = 'completed';
                    $request->audio_path = $fileName;
                    $request->voluntario_id = null;
                    $request->save();

                    $this->sendPush(
                        $request->oyente_id,
                        '¡Tu audio ya está listo! 🤖',
                        "Nuestra IA generó la lectura para tu pedido: '{$request->title}'."
                    );

                    $this->info("¡Pedido {$request->id} completado con Azure TTS con éxito!");
                } else {
                    $this->error("Error en Azure Speech para el pedido {$request->id}: HTTP {$httpCode} - Respuesta: {$responseBody}");
                }
            } catch (\Exception $e) {
                $this->error("Excepción al procesar el pedido {$request->id}: " . $e->getMessage());
            }
        }

        return Command::SUCCESS;
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
