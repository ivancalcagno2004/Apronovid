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
    // 🌟 APLICAMOS EL S3Client DIRECTO AL ADMIN
    public function getUploadUrl(Request $request)
    {
        $filename = 'catalog_audios/' . \Illuminate\Support\Str::uuid() . '.mp3';

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

        $command = $s3Client->getCommand('PutObject', [
            'Bucket' => env('AWS_BUCKET'),
            'Key' => $filename,
            'ContentType' => 'audio/mpeg'
        ]);

        $presignedRequest = $s3Client->createPresignedRequest($command, '+15 minutes');
        $url = (string) $presignedRequest->getUri();

        return response()->json([
            'upload_url' => $url,
            'path' => $filename
        ]);
    }

    public function index(Request $request)
    {
        $paginator = Audiobook::with('category')
            ->orderBy('created_at', 'desc')
            ->cursorPaginate(15);

        $audiobooks = collect($paginator->items())->map(function ($book) {
            return [
                'id' => 'hist_' . $book->id,
                'title' => $book->title,
                'author' => $book->author,
                'reader' => $book->reader,
                'year' => $book->year,
                'audio_path' => $book->audio_path,
                'category_name' => $book->category ? $book->category->name : 'Sin categoría',
            ];
        });

        return response()->json([
            'data' => $audiobooks,
            'next_cursor' => $paginator->nextCursor() ? $paginator->nextCursor()->encode() : null
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'author' => 'nullable|string',
            'reader' => 'nullable|string',
            'year' => 'nullable|integer',
            'audio_path' => 'required|string',
        ]);

        $audiobook = Audiobook::create([
            'title' => $request->title,
            'category_id' => $request->category_id,
            'author' => $request->author,
            'reader' => $request->reader,
            'year' => $request->year,
            'audio_path' => $request->audio_path,
        ]);

        try {
            $interestedUsers = User::whereNotNull('expo_push_token')
                ->where('role', 'oyente')
                ->where(function ($query) use ($audiobook) {

                    $query->whereHas('readingRequests', function ($q) use ($audiobook) {
                        $q->where('category_id', $audiobook->category_id);
                    })
                        ->orWhereHas('favorites', function ($q) use ($audiobook) {
                            $q->whereHasMorph(
                                'favoritable',
                                [\App\Models\Audiobook::class, \App\Models\ReadingRequest::class],
                                function ($qMorph) use ($audiobook) {
                                    $qMorph->where('category_id', $audiobook->category_id);
                                }
                            );
                        });
                })->get();

            $messages = [];

            foreach ($interestedUsers as $user) {
                $cacheKey = 'recommendation_sent_today_' . $user->id;

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
        $realId = str_replace('hist_', '', $id);
        $audiobook = Audiobook::findOrFail($realId);

        if ($audiobook->audio_path) {
            try {
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

                $s3Client->deleteObject([
                    'Bucket' => env('AWS_BUCKET'),
                    'Key'    => $audiobook->audio_path,
                ]);
            } catch (\Exception $e) {
                Log::error('Error borrando audio de R2: ' . $e->getMessage());
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

        $this->notifyUser($recording->volunteer_id, '¡Audio Aprobado! 🎉', 'Un administrador aprobó tu lectura manualmente.');
        $this->notifyUser($readingRequest->oyente_id, '¡Tu solicitud fue grabada! 🎧', "Ya podés escuchar '{$readingRequest->title}'.");

        return response()->json(['message' => 'Audio aprobado exitosamente.']);
    }

    public function rejectReview(Request $request, $id)
    {
        $request->validate([
            'feedback' => 'required|string|max:1000'
        ]);

        $recording = \App\Models\VolunteerRecording::findOrFail($id);
        $readingRequest = \App\Models\ReadingRequest::findOrFail($recording->reading_request_id);

        $recording->status = 'rejected';
        $recording->ai_transcription = "Revisión Manual: " . $request->feedback;
        $recording->save();

        $readingRequest->status = 'pending';
        $readingRequest->save();

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
