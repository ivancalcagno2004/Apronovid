<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Audiobook;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\VolunteerRecording;
use App\Models\ReadingRequest;
use Illuminate\Support\Facades\Cache;

class CatalogController extends Controller
{
    public function index()
    {
        $audiobooks = Audiobook::with('category')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($book) {
                return [
                    'id' => $book->id,
                    'title' => $book->title,
                    'author' => $book->author,
                    'reader' => $book->reader,
                    'year' => $book->year,
                    'audio_path' => $book->audio_path,
                    'category_name' => $book->category ? $book->category->name : 'Sin categoría',
                ];
            });

        return response()->json($audiobooks);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'author' => 'nullable|string',
            'reader' => 'nullable|string',
            'year' => 'nullable|integer',
            'audio_file' => 'required|file|mimes:mp3,wav|max:204800',
        ]);

        $path = $request->file('audio_file')->store('catalog_audios', 'public');

        $audiobook = Audiobook::create([
            'title' => $request->title,
            'category_id' => $request->category_id,
            'author' => $request->author,
            'reader' => $request->reader,
            'year' => $request->year,
            'audio_path' => $path,
        ]);

        try {
            $interestedUsers = User::whereNotNull('expo_push_token')
                ->where('role', 'oyente')
                ->where(function ($query) use ($audiobook) {

                    // Condición 1: Ha pedido audios de esta categoría
                    $query->whereHas('readingRequests', function ($q) use ($audiobook) {
                        $q->where('category_id', $audiobook->category_id);
                    })

                        // 🌟 Condición 2: Tiene favoritos (de CUALQUIER TIPO) de esta categoría
                        ->orWhereHas('favorites', function ($q) use ($audiobook) {
                            $q->whereHasMorph(
                                'favoritable',
                                [\App\Models\Audiobook::class, \App\Models\ReadingRequest::class],
                                function ($qMorph) use ($audiobook) {
                                    // Buscamos en la columna category_id del modelo final
                                    $qMorph->where('category_id', $audiobook->category_id);
                                }
                            );
                        });
                })->get();

            $messages = [];

            foreach ($interestedUsers as $user) {
                // CREAMOS UNA LLAVE ÚNICA PARA ESTE USUARIO
                $cacheKey = 'recommendation_sent_today_' . $user->id;

                // SI YA SE LE ENVIÓ UNA RECOMENDACIÓN HOY, LO SALTAMOS
                if (Cache::has($cacheKey)) {
                    continue;
                }

                $messages[] = [
                    'to'     => $user->expo_push_token,
                    'sound'  => 'default',
                    'title'  => '¡Nueva recomendación para vos! 🎧',
                    'body'   => "Se acaba de subir '{$audiobook->title}' al catálogo público.",
                    'data'   => [
                        'type' => 'recommendation',
                        'audio_id' => $audiobook->id,
                        'source' => 'audiobook'
                    ]
                ];

                // 🌟 GUARDAMOS EN CACHÉ QUE YA FUE NOTIFICADO (Vence a la medianoche)
                Cache::put($cacheKey, true, now()->endOfDay());
            }

            if (!empty($messages)) {
                \Illuminate\Support\Facades\Http::withoutVerifying()->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])->post('https://exp.host/--/api/v2/push/send', $messages);
            }
        } catch (\Exception $e) {
            Log::error('Error enviando notificaciones push de recomendación: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Audiolibro subido al catálogo con éxito', 'data' => $audiobook], 201);
    }

    public function destroy($id)
    {
        $audiobook = Audiobook::findOrFail($id);

        if ($audiobook->audio_path) {
            $storagePath = 'public/' . ltrim($audiobook->audio_path, '/');
            if (Storage::exists($storagePath)) {
                Storage::delete($storagePath);
            }
        }

        $audiobook->delete();

        return response()->json(['message' => 'Audiolibro eliminado correctamente del catálogo.']);
    }

    public function getManualReviews()
    {
        $reviews = VolunteerRecording::where('status', 'manual_review')
            ->with(['readingRequest', 'volunteer'])
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($reviews);
    }

    public function approveReview($id)
    {
        $recording = VolunteerRecording::findOrFail($id);
        $readingRequest = ReadingRequest::findOrFail($recording->reading_request_id);

        $recording->status = 'approved';
        $recording->save();

        $readingRequest->status = 'completed';
        $readingRequest->audio_path = $recording->audio_path;
        $readingRequest->voluntario_id = $recording->volunteer_id;
        $readingRequest->save();

        // Avisar a los involucrados
        $this->notifyUser($recording->volunteer_id, '¡Audio Aprobado! 🎉', 'Un administrador aprobó tu lectura manualmente.');
        $this->notifyUser($readingRequest->oyente_id, '¡Tu solicitud fue grabada! 🎧', "Ya podés escuchar '{$readingRequest->title}'.");

        return response()->json(['message' => 'Audio aprobado exitosamente.']);
    }

    public function rejectReview(Request $request, $id)
    {
        // Validamos que el admin haya mandado un motivo
        $request->validate([
            'feedback' => 'required|string|max:1000'
        ]);

        $recording = \App\Models\VolunteerRecording::findOrFail($id);
        $readingRequest = \App\Models\ReadingRequest::findOrFail($recording->reading_request_id);

        $recording->status = 'rejected';
        // 🌟 Guardamos el feedback del admin en la columna de la IA con una etiqueta
        $recording->ai_transcription = "Revisión Manual: " . $request->feedback;
        $recording->save();

        $readingRequest->status = 'pending';
        $readingRequest->save();

        // Le mandamos el motivo por notificación push también
        $this->notifyUser(
            $recording->volunteer_id,
            'Audio rechazado ❌',
            'Un administrador revisó tu lectura. Motivo: ' . $request->feedback
        );

        return response()->json(['message' => 'Audio rechazado con feedback enviado.']);
    }

    private function notifyUser($userId, $title, $body)
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
