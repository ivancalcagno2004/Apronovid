<?php

namespace App\Jobs;

use App\Models\ReadingRequest;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProcessReadingRequestFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $readingRequestId;

    // Le damos hasta 3 minutos para procesar PDFs gigantes antes de fallar
    public $timeout = 180;

    public function __construct($readingRequestId)
    {
        $this->readingRequestId = $readingRequestId;
    }

    public function handle()
    {
        $request = ReadingRequest::find($this->readingRequestId);
        if (!$request || !$request->file_path) return;

        $fullPath = storage_path('app/public/' . $request->file_path);
        if (!file_exists($fullPath)) return;

        $extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
        $textoExtraido = '';

        try {
            // 1. LÓGICA PARA PDF
            if ($extension === 'pdf') {
                $parser = new \Smalot\PdfParser\Parser();
                $pdf = $parser->parseFile($fullPath);
                $textoExtraido = trim($pdf->getText());
            }
            // 2. LÓGICA PARA IMÁGENES (OCR)
            elseif (in_array($extension, ['jpg', 'jpeg', 'png'])) {
                $base64Image = base64_encode(file_get_contents($fullPath));
                $mimeType = mime_content_type($fullPath);
                $dataUri = "data:{$mimeType};base64,{$base64Image}";

                $response = Http::withoutVerifying()
                    ->timeout(60)
                    ->asForm()
                    ->post('https://api.ocr.space/parse/image', [
                        'apikey' => env('OCR_SPACE_API_KEY', 'helloworld'),
                        'base64Image' => $dataUri,
                        'language' => 'spa',
                        'scale' => 'true',
                        'OCREngine' => '2'
                    ]);

                if ($response->successful()) {
                    $resultado = $response->json();
                    if (isset($resultado['ParsedResults']) && count($resultado['ParsedResults']) > 0) {
                        $textoExtraido = trim($resultado['ParsedResults'][0]['ParsedText'] ?? '');
                    }
                }
            }

            // 3. ACTUALIZAR EL PEDIDO
            if (!empty($textoExtraido)) {
                $textoOriginal = str_replace("⏳ Procesando archivo adjunto, esto puede demorar un par de minutos...", "", $request->description_or_text);

                $request->description_or_text = trim($textoOriginal) . $textoExtraido;
                $request->save();

                // 4. AVISAR AL USUARIO POR PUSH
                $this->notifyUser($request->oyente_id, '¡Archivo procesado! 📄', "La IA terminó de leer '{$request->title}'. Ya está disponible para los narradores.");
            }
        } catch (\Exception $e) {
            Log::error("Error procesando archivo (Job): " . $e->getMessage());
            $this->notifyUser($request->oyente_id, 'Error al leer el archivo ⚠️', "No pudimos extraer el texto de '{$request->title}'. Intentá subir una foto más clara.");
        }
    }

    private function notifyUser($userId, $title, $body)
    {
        $user = User::find($userId);
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
