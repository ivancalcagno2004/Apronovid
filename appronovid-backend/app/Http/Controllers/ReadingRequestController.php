<?php

namespace App\Http\Controllers;

use App\Models\ReadingRequest;
use Illuminate\Http\Request;

class ReadingRequestController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description_or_text' => 'required|string',
            'file' => 'nullable|file|mimes:pdf,doc,docx,txt|max:15360', // Máximo 15MB por documento
        ]);

        $filePath = null;

        // Si la app móvil envió un archivo físico, lo guardamos en storage/app/public/requests
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('requests', 'public');
        }

        $readingRequest = ReadingRequest::create([
            'oyente_id' => $request->user()->id,
            'title' => $validated['title'],
            'description_or_text' => $validated['description_or_text'],
            'file_path' => $filePath,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Pedido creado exitosamente con adjunto',
            'data' => $readingRequest
        ], 201);
    }

    public function index()
    {
        // Traemos los pedidos pendientes, del más nuevo al más viejo
        $requests = \App\Models\ReadingRequest::where('status', 'pending')
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

        // Guardamos el audio en la carpeta public/audios
        $audioPath = $request->file('audio')->store('audios', 'public');

        // Actualizamos el pedido
        $readingRequest->update([
            'audio_path' => $audioPath,
            'status' => 'completed',
            'voluntario_id' => $request->user()->id, // Guardamos quién lo grabó
        ]);

        return response()->json([
            'message' => '¡Audio subido con éxito!',
            'data' => $readingRequest
        ]);
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
}
