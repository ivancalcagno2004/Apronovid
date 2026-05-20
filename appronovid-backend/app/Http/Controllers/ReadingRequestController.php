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
            'description_or_text' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'is_public' => 'nullable|boolean', // 🆕 Agregamos la validación
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
            // CASO B: Es una Foto / Imagen (JPG, JPEG, PNG)
            elseif (in_array($extension, ['jpg', 'jpeg', 'png'])) {
                try {
                    $response = \Illuminate\Support\Facades\Http::withHeaders([
                        'Authorization' => 'Bearer ' . env('HUGGINGFACE_TOKEN'),
                        'Content-Type' => $file->getMimeType(),
                    ])->withBody(
                        file_get_contents($file->getRealPath()),
                        $file->getMimeType()
                    )->post('https://api-inference.huggingface.co/models/microsoft/trocr-large-printed');

                    if ($response->successful()) {
                        $resultado = $response->json();
                        $textoEscaneado = $resultado[0]['generated_text'] ?? '';

                        if (!empty(trim($textoEscaneado))) {
                            $textoFinal = !empty($textoFinal)
                                ? $textoFinal . "\n\n--- Texto escaneado de la foto ---\n" . $textoEscaneado
                                : $textoEscaneado;
                        }
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Error en OCR de imagen con HuggingFace: " . $e->getMessage());
                }
            }

            $path = $file->store('attachments', 'public');
        } else {
            $path = null;
        }

        // Guardamos en la base de datos
        $readingRequest = new \App\Models\ReadingRequest();
        $readingRequest->title = $request->title;
        $readingRequest->description_or_text = $textoFinal;
        $readingRequest->file_path = $path;
        $readingRequest->status = 'pending';
        $readingRequest->oyente_id = $request->user()->id;

        // 🆕 Interpretamos si el oyente activó el "switch" en el frontend
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

        // El pedido pasa a estar en cuarentena (evaluando)
        $readingRequest->status = 'validating';
        $readingRequest->save();

        $path = $request->file('audio')->store('audios', 'public');

        // 🆕 CREAMOS EL REGISTRO DE LA GRABACIÓN ESPECÍFICA
        $recording = \App\Models\VolunteerRecording::create([
            'reading_request_id' => $readingRequest->id,
            'volunteer_id' => $request->user()->id,
            'audio_path' => $path,
            'status' => 'validating'
        ]);

        // 🔔 Notificación push inmediata al voluntario
        $voluntario = $request->user();
        if ($voluntario->expo_push_token) {
            \Illuminate\Support\Facades\Http::withoutVerifying()->post('https://exp.host/--/api/v2/push/send', [
                'to' => $voluntario->expo_push_token,
                'title' => 'Audio en evaluación ⏳',
                'body' => 'Recibimos tu grabación. La IA la está procesando.',
                'sound' => 'default',
            ]);
        }

        // Despachamos el Job pasándole el ID de la GRABACIÓN, no del pedido
        \App\Jobs\ValidateAudioJob::dispatch($recording->id);

        return response()->json(['message' => '¡Audio recibido! Procesando calidad.']);
    }

    public function myRequests(Request $request)
    {
        // Traemos solo los pedidos del oyente que está logueado 
        $requests = ReadingRequest::where('oyente_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $requests
        ]);
    }

    // Actualizar un pedido
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
            'description_or_text' => 'sometimes|string',
            'is_public' => 'sometimes|boolean'
        ]);

        $readingRequest->update($request->only(['title', 'description_or_text', 'is_public']));

        return response()->json(['message' => 'Pedido actualizado con éxito.', 'data' => $readingRequest]);
    }

    // Eliminar un pedido
    public function destroy(Request $request, $id)
    {
        $readingRequest = ReadingRequest::where('id', $id)
            ->where('oyente_id', $request->user()->id)
            ->firstOrFail();

        if ($readingRequest->status !== 'pending') {
            return response()->json(['message' => 'No podés eliminar un pedido en proceso. Contactá a soporte si necesitás bajarlo.'], 403);
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
        // Solo traemos los públicos que ya tienen audio (completados)
        $query = \App\Models\ReadingRequest::where('is_public', true)
            ->where('status', 'completed');

        // Si el oyente escribió algo en el buscador
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
