<?php

namespace App\Http\Controllers;

use App\Models\ReadingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser as PdfParser;

class ReadingRequestController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id', // 🌟 NUEVO: Validamos la categoría
            'description_or_text' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'is_public' => 'nullable|boolean',
        ]);

        $textoFinal = $request->description_or_text ?? '';

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());

            // CASO A: Es un archivo PDF
            if ($extension === 'pdf') {
                try {
                    $parser = new \Smalot\PdfParser\Parser();
                    $pdf = $parser->parseFile($file->getRealPath());
                    $textoExtraido = $pdf->getText();

                    if (!empty(trim($textoExtraido))) {
                        $textoFinal = !empty($textoFinal)
                            ? $textoFinal . "\n\n--- Texto escaneado del PDF ---\n" . $textoExtraido
                            : $textoExtraido;
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Error extrayendo texto de PDF: " . $e->getMessage());
                }
            }
            // CASO B: Es una Foto / Imagen (JPG, JPEG, PNG) - AHORA CON OCR.SPACE (100% Gratis)
            elseif (in_array($extension, ['jpg', 'jpeg', 'png'])) {
                try {
                    $base64Image = base64_encode(file_get_contents($file->getRealPath()));
                    $mimeType = $file->getMimeType();
                    $dataUri = "data:{$mimeType};base64,{$base64Image}";

                    // 1. Hacemos la petición a la API gratuita de OCR.space
                    $response = \Illuminate\Support\Facades\Http::withoutVerifying()
                        ->timeout(60)
                        ->asForm() // OCR.space requiere formato de formulario, no JSON
                        ->post('https://api.ocr.space/parse/image', [
                            'apikey' => 'helloworld', // Clave pública gratuita (podés registrar la tuya gratis en su web)
                            'base64Image' => $dataUri,
                            'language' => 'spa', // Seteado en español para que lea bien las 'ñ' y tildes
                            'scale' => 'true',   // Agranda la imagen internamente para leer mejor
                            'OCREngine' => '2'   // Usa su motor más avanzado
                        ]);

                    if ($response->successful()) {
                        $resultado = $response->json();

                        // Verificamos si la API de OCR tuvo algún problema procesando la foto
                        if (isset($resultado['IsErroredOnProcessing']) && $resultado['IsErroredOnProcessing']) {
                            \Illuminate\Support\Facades\Log::error("OCR.space falló: " . json_encode($resultado['ErrorMessage']));
                            return response()->json(['message' => 'Error al leer la imagen. Intentá con otra más nítida.'], 422);
                        }

                        // 2. Extraemos y juntamos el texto reconocido
                        $textoEscaneado = '';
                        if (isset($resultado['ParsedResults']) && count($resultado['ParsedResults']) > 0) {
                            $textoEscaneado = $resultado['ParsedResults'][0]['ParsedText'] ?? '';
                        }

                        if (!empty(trim($textoEscaneado))) {
                            $textoFinal = !empty($textoFinal)
                                ? $textoFinal . "\n\n--- Texto escaneado de la foto ---\n" . trim($textoEscaneado)
                                : trim($textoEscaneado);
                        } else {
                            return response()->json(['message' => 'No se pudo encontrar texto legible en esta imagen.'], 422);
                        }
                    } else {
                        \Illuminate\Support\Facades\Log::error("Error de conexión con OCR.space");
                        return response()->json(['message' => 'Error de conexión con el servidor de lectura.'], 422);
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Error procesando imagen: " . $e->getMessage());
                    return response()->json(['message' => 'Error interno procesando la imagen.'], 500);
                }
            }

            $path = $file->store('attachments', 'public');
        } else {
            $path = null;
        }

        // Guardamos en la base de datos
        $readingRequest = new \App\Models\ReadingRequest();
        $readingRequest->title = $request->title;
        $readingRequest->category_id = $request->category_id; // 🌟 NUEVO: Guardamos la categoría
        $readingRequest->description_or_text = $textoFinal;
        $readingRequest->file_path = $path;
        $readingRequest->status = 'pending';
        $readingRequest->oyente_id = $request->user()->id;
        $readingRequest->is_public = $request->has('is_public') ? filter_var($request->is_public, FILTER_VALIDATE_BOOLEAN) : false;

        $readingRequest->save();

        return response()->json([
            'message' => 'Pedido creado exitosamente.',
            'data' => $readingRequest
        ], 201);
    }

    public function index()
    {
        $requests = ReadingRequest::where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $requests
        ]);
    }

    public function uploadAudio(Request $request, $id)
    {
        $request->validate([
            'audio' => 'required|file|mimes:m4a,mp3,wav,aac,mp4,3gp|max:20480',
        ]);

        $readingRequest = \App\Models\ReadingRequest::findOrFail($id);

        $readingRequest->status = 'validating';
        $readingRequest->save();

        $path = $request->file('audio')->store('audios', 'public');

        $recording = \App\Models\VolunteerRecording::create([
            'reading_request_id' => $readingRequest->id,
            'volunteer_id' => $request->user()->id,
            'audio_path' => $path,
            'status' => 'validating'
        ]);

        $voluntario = $request->user();
        if ($voluntario->expo_push_token) {
            \Illuminate\Support\Facades\Http::withoutVerifying()->post('https://exp.host/--/api/v2/push/send', [
                'to' => $voluntario->expo_push_token,
                'title' => 'Audio en evaluación ⏳',
                'body' => 'Recibimos tu grabación. La IA la está procesando.',
                'sound' => 'default',
            ]);
        }

        \App\Jobs\ValidateAudioJob::dispatch($recording->id);

        return response()->json(['message' => '¡Audio recibido! Procesando calidad.']);
    }

    public function myRequests(Request $request)
    {
        $requests = ReadingRequest::where('oyente_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $requests
        ]);
    }

    public function update(Request $request, $id)
    {
        $readingRequest = ReadingRequest::where('id', $id)
            ->where('oyente_id', $request->user()->id)
            ->firstOrFail();

        if ($readingRequest->status !== 'pending') {
            return response()->json(['message' => 'No podés editar un pedido que ya fue grabado o está en evaluación.'], 403);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'category_id' => 'sometimes|exists:categories,id', // 🌟 NUEVO: Validamos si lo edita
            'description_or_text' => 'sometimes|string',
            'is_public' => 'sometimes|boolean'
        ]);

        // 🌟 NUEVO: Sumamos la categoría a los campos que se pueden actualizar
        $readingRequest->update($request->only(['title', 'category_id', 'description_or_text', 'is_public']));

        return response()->json(['message' => 'Pedido actualizado con éxito.', 'data' => $readingRequest]);
    }

    // Eliminar un pedido
    public function destroy(Request $request, $id)
    {
        $readingRequest = \App\Models\ReadingRequest::findOrFail($id);

        // 🌟 MAGIA: Permitimos borrar si es un Administrador, O si es el Oyente que lo creó.
        if ($request->user()->role !== 'admin' && $readingRequest->oyente_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para eliminar este pedido.'], 403);
        }

        // Si es un oyente intentando borrar, no lo dejamos si ya está en proceso.
        // (El admin sí puede borrarlo en cualquier momento).
        if ($request->user()->role !== 'admin' && $readingRequest->status !== 'pending') {
            return response()->json(['message' => 'No podés eliminar un pedido en proceso.'], 403);
        }

        // Si tiene una imagen asociada, la borramos del storage
        if ($readingRequest->image_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($readingRequest->image_path);
        }

        $readingRequest->delete();

        return response()->json(['message' => 'Pedido eliminado correctamente.']);
    }

    public function catalog(Request $request)
    {
        $query = \App\Models\ReadingRequest::where('is_public', true)
            ->where('status', 'completed');

        if ($request->has('search') && !empty($request->search)) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        $catalog = $query->orderBy('updated_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $catalog
        ]);
    }
}
