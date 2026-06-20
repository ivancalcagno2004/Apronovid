<?php

namespace App\Http\Controllers;

use App\Models\ReadingRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser as PdfParser;

class ReadingRequestController extends Controller
{
    public function index()
    {
        $requests = ReadingRequest::where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $requests
        ]);
    }

    // 🌟 VERSIÓN A PRUEBA DE BALAS: Instanciando el S3Client directamente
    public function getAudioUploadUrl(Request $request, $id) // (O getUploadUrl para el admin)
    {
        // 1. Validaciones (Ajustalas según si estás en Voluntario o Admin)
        $readingRequest = \App\Models\ReadingRequest::findOrFail($id);
        if ($readingRequest->status !== 'pending') {
            return response()->json(['message' => 'El pedido ya no está disponible.'], 403);
        }

        $filename = 'volunteer_audios/' . \Illuminate\Support\Str::uuid() . '.mp3';

        // 2. Instanciamos el cliente nativo de AWS S3 directamente
        $s3Client = new \Aws\S3\S3Client([
            'version'     => 'latest',
            'region'      => env('AWS_DEFAULT_REGION', 'auto'),
            'endpoint'    => env('AWS_ENDPOINT'), // Fundamental para Cloudflare R2
            'credentials' => [
                'key'    => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
            ],
            // R2 requiere path-style endpoints
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
        ]);

        // 3. Creamos el comando de subida (PutObject)
        $command = $s3Client->getCommand('PutObject', [
            'Bucket' => env('AWS_BUCKET'),
            'Key' => $filename,
            'ContentType' => 'audio/mpeg'
        ]);

        // 4. Generamos la firma válida por 15 minutos
        $presignedRequest = $s3Client->createPresignedRequest($command, '+15 minutes');
        $url = (string) $presignedRequest->getUri();

        return response()->json([
            'upload_url' => $url,
            'path' => $filename
        ]);
    }

    // 🌟 ACTUALIZADO: El voluntario solo nos avisa que ya subió el audio a R2
    public function uploadAudio(Request $request, $id)
    {
        $request->validate([
            'audio_path' => 'required|string', // Ahora recibimos el path, no el archivo físico
        ]);

        $readingRequest = ReadingRequest::findOrFail($id);

        if ($readingRequest->status !== 'pending') {
            return response()->json(['message' => 'El pedido ya no está disponible.'], 403);
        }

        $readingRequest->status = 'validating';
        $readingRequest->save();

        $recording = \App\Models\VolunteerRecording::create([
            'reading_request_id' => $readingRequest->id,
            'volunteer_id' => $request->user()->id,
            'audio_path' => $request->audio_path, // Guardamos la ruta de R2
            'status' => 'validating'
        ]);

        $voluntario = $request->user();
        if ($voluntario->expo_push_token) {
            Http::withoutVerifying()->post('https://exp.host/--/api/v2/push/send', [
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
        $userId = $request->user()->id;

        $paginator = ReadingRequest::with('category')
            ->where('oyente_id', $userId)
            ->orderBy('created_at', 'desc')
            ->cursorPaginate(15);

        // Optimizamos la carga de usuarios para evitar consultas N+1
        $readerIds = collect($paginator->items())->pluck('voluntario_id')->filter()->unique();
        $readers = User::whereIn('id', $readerIds)->get()->keyBy('id');

        $votedAudioIds = DB::table('volunteer_ratings')
            ->where('user_id', $userId)
            ->pluck('audio_id')
            ->toArray();

        $requests = collect($paginator->items())->map(function ($item) use ($readers, $votedAudioIds) {
            $voluntario = $item->voluntario_id ? $readers->get($item->voluntario_id) : null;

            $hasVoted = in_array((string)$item->id, $votedAudioIds) || in_array('req_' . $item->id, $votedAudioIds);

            // 🌟 TODA LA MAGIA SE REDUCE A ESTO:
            $fullAudioUrl = $item->audio_path
                ? rtrim(env('R2_PUBLIC_URL'), '/') . '/' . ltrim($item->audio_path, '/')
                : null;

            return [
                'id' => $item->id,
                'title' => $item->title,
                'description_or_text' => $item->description_or_text,
                'status' => $item->status,
                'audio_path' => $fullAudioUrl, // Mandamos la URL completa directo a React Native
                'is_public' => (bool) $item->is_public,
                'created_at' => $item->created_at,
                'author' => null,
                'reader' => $voluntario ? $voluntario->name : null,
                'reader_id' => $item->voluntario_id,
                'reader_stars' => $voluntario ? $voluntario->stars : null,
                'category_name' => $item->category ? $item->category->name : 'Sin categoría',
                'has_voted' => $hasVoted,
            ];
        });

        return response()->json([
            'data' => $requests,
            'next_cursor' => $paginator->nextCursor() ? $paginator->nextCursor()->encode() : null
        ]);
    }

    public function catalog(Request $request)
    {
        $userId = $request->user()->id;
        $search = $request->search;
        $categoryId = $request->category_id;

        // 🌟 NUEVO: Traemos la lista de usuarios bloqueados por este usuario para filtrar sus audios
        $blockedIds = \Illuminate\Support\Facades\DB::table('blocked_users')
            ->where('user_id', $userId)
            ->pluck('blocked_user_id')
            ->toArray();

        // 1. Pedidos Completados por Voluntarios (Requests)
        $requestsQuery = \App\Models\ReadingRequest::with('category')
            ->where('is_public', 1)
            ->where('status', 'completed')
            ->whereNotIn('voluntario_id', $blockedIds); // Filtramos los pedidos de voluntarios bloqueados

        if (!empty($categoryId) && $categoryId !== 'all') {
            $requestsQuery->where('category_id', $categoryId);
        }
        if (!empty($search)) {
            $requestsQuery->where('title', 'like', '%' . $search . '%');
        }

        $requestsData = $requestsQuery->get()->map(function ($item) {
            return [
                'id' => 'req_' . $item->id,
                'original_id' => $item->id,
                'title' => $item->title,
                'description_or_text' => $item->description_or_text,
                'status' => $item->status,
                'audio_path' => $item->audio_path,
                'is_public' => (bool) $item->is_public,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
                'reader_id' => $item->voluntario_id,
                'author' => null,
                'reader' => null, // Se llena abajo
                'category_name' => $item->category ? $item->category->name : 'Sin categoría',
                'source_type' => 'request',
            ];
        });

        // 2. Audiolibros subidos por el Admin (Audiobooks)
        $audiobooksQuery = \App\Models\Audiobook::with('category');

        if (!empty($categoryId) && $categoryId !== 'all') {
            $audiobooksQuery->where('category_id', $categoryId);
        }
        if (!empty($search)) {
            $audiobooksQuery->where(function ($q) use ($search) {
                $q->where('title', 'like', '%' . $search . '%')
                    ->orWhere('author', 'like', '%' . $search . '%');
            });
        }

        $audiobooksData = $audiobooksQuery->get()->map(function ($item) {
            return [
                'id' => 'hist_' . $item->id,
                'original_id' => $item->id,
                'title' => $item->title,
                'description_or_text' => null,
                'status' => 'completed',
                'audio_path' => $item->audio_path,
                'is_public' => true,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
                'author' => $item->author,
                'reader' => $item->reader,
                'reader_id' => null,
                'category_name' => $item->category ? $item->category->name : 'Sin categoría',
                'source_type' => 'audiobook',
            ];
        });

        // 3. Fusión en memoria, orden y paginación
        $allData = $requestsData->concat($audiobooksData)->sortByDesc('updated_at')->values();

        $page = max(1, (int) $request->get('page', 1));
        $perPage = 15;
        $sliced = $allData->slice(($page - 1) * $perPage, $perPage);

        // 4. Mapeo Final (A R2 Directo y validación de votos)
        $readerIds = $sliced->pluck('reader_id')->filter()->unique();
        $readers = \App\Models\User::whereIn('id', $readerIds)->get()->keyBy('id');

        $votedAudioIds = \Illuminate\Support\Facades\DB::table('volunteer_ratings')
            ->where('user_id', $userId)
            ->pluck('audio_id')
            ->toArray();

        // 🌟 NUEVO: Traemos todos los favoritos del usuario y normalizamos sus IDs ('req_x' o 'hist_x')
        $favoriteIds = \App\Models\Favorite::where('user_id', $userId)
            ->get()
            ->map(function ($fav) {
                $prefix = $fav->favoritable_type === \App\Models\Audiobook::class ? 'hist_' : 'req_';
                return $prefix . $fav->favoritable_id;
            })
            ->toArray();

        // Agregamos $favoriteIds al "use" de la función anónima
        $catalog = $sliced->map(function ($item) use ($readers, $votedAudioIds, $favoriteIds) {
            $voluntario = $item['reader_id'] ? $readers->get($item['reader_id']) : null;

            if ($item['source_type'] === 'request') {
                $item['reader'] = $voluntario ? $voluntario->name : null;
                $item['reader_stars'] = $voluntario ? $voluntario->stars : null;
            } else {
                $item['reader_stars'] = null;
            }

            $item['has_voted'] = in_array((string)$item['original_id'], $votedAudioIds) || in_array($item['id'], $votedAudioIds);

            // 🌟 NUEVO: Le avisamos a React Native si este ítem está en la lista de favoritos del usuario
            $item['is_favorite'] = in_array($item['id'], $favoriteIds);

            // Magia de Cloudflare R2
            $item['audio_path'] = $item['audio_path']
                ? env('R2_PUBLIC_URL') . '/' . ltrim($item['audio_path'], '/')
                : null;

            unset($item['original_id'], $item['source_type']);
            return $item;
        })->values();

        return response()->json([
            'success' => true,
            'data' => $catalog,
            'next_page' => ($page * $perPage) < $allData->count() ? $page + 1 : null
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'description_or_text' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'is_public' => 'nullable|boolean',
        ]);

        $textoFinal = $request->description_or_text ?? '';
        $path = null;

        if ($request->hasFile('file')) {
            $path = $request->file('file')->store('attachments', 'public');
            // Mensaje temporal para el usuario mientras la cola hace su trabajo
            $textoFinal = !empty($textoFinal)
                ? $textoFinal . "\n\n⏳ Procesando archivo adjunto, esto puede demorar un par de minutos..."
                : "⏳ Procesando archivo adjunto, esto puede demorar un par de minutos...";
        }

        $readingRequest = new \App\Models\ReadingRequest();
        $readingRequest->title = $request->title;
        $readingRequest->category_id = $request->category_id;
        $readingRequest->description_or_text = $textoFinal;
        $readingRequest->file_path = $path;
        $readingRequest->status = 'pending';
        $readingRequest->oyente_id = $request->user()->id;
        $readingRequest->is_public = $request->has('is_public') ? filter_var($request->is_public, FILTER_VALIDATE_BOOLEAN) : false;
        $readingRequest->save();

        // 🌟 SI HAY ARCHIVO, MANDAMOS A LA COLA A PROCESAR EN SEGUNDO PLANO
        if ($path) {
            \App\Jobs\ProcessReadingRequestFile::dispatch($readingRequest->id);
        }

        return response()->json([
            'message' => $path ? 'Pedido creado. Extrayendo texto en segundo plano...' : 'Pedido creado exitosamente.',
            'data' => $readingRequest
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $readingRequest = \App\Models\ReadingRequest::where('id', $id)
            ->where('oyente_id', $request->user()->id)
            ->firstOrFail();

        if ($readingRequest->status !== 'pending') {
            return response()->json(['message' => 'No podés editar un pedido que ya fue grabado o está en evaluación.'], 403);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'category_id' => 'sometimes|exists:categories,id',
            'description_or_text' => 'nullable|string',
            'is_public' => 'sometimes|boolean',
            'file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $textoFinal = $request->input('description_or_text', $readingRequest->description_or_text);

        if ($request->hasFile('file')) {
            // Borramos el viejo si existía
            if ($readingRequest->file_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($readingRequest->file_path);
            }

            $path = $request->file('file')->store('attachments', 'public');
            $readingRequest->file_path = $path;

            // Mensaje temporal
            $textoFinal = !empty($textoFinal)
                ? $textoFinal . "\n\n⏳ Procesando archivo adjunto, esto puede demorar un par de minutos..."
                : "⏳ Procesando archivo adjunto, esto puede demorar un par de minutos...";

            // 🌟 DISPARAMOS LA COLA
            \App\Jobs\ProcessReadingRequestFile::dispatch($readingRequest->id);
        }

        $readingRequest->title = $request->input('title', $readingRequest->title);
        $readingRequest->description_or_text = $textoFinal;
        $readingRequest->is_public = $request->has('is_public') ? filter_var($request->is_public, FILTER_VALIDATE_BOOLEAN) : $readingRequest->is_public;
        $readingRequest->save();

        return response()->json(['message' => 'Pedido actualizado con éxito.', 'data' => $readingRequest]);
    }

    public function destroy(Request $request, $id)
    {
        $readingRequest = \App\Models\ReadingRequest::findOrFail($id);

        if ($request->user()->role !== 'admin' && $readingRequest->oyente_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para eliminar este pedido.'], 403);
        }

        if ($request->user()->role !== 'admin' && $readingRequest->status !== 'pending') {
            return response()->json(['message' => 'No podés eliminar un pedido en proceso.'], 403);
        }

        if ($readingRequest->image_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($readingRequest->image_path);
        }

        $readingRequest->delete();

        return response()->json(['message' => 'Pedido eliminado correctamente.']);
    }

    public function report(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500'
        ]);

        $readingRequest = \App\Models\ReadingRequest::findOrFail($id);

        if ($readingRequest->status !== 'pending') {
            return response()->json(['message' => 'Solo se pueden reportar pedidos pendientes.'], 403);
        }

        // 🌟 NUEVO: Verificamos si este usuario ya reportó este pedido
        $yaReporto = \App\Models\Feedback::where('reading_request_id', $id)
            ->where('user_id', $request->user()->id)
            ->where('type', 'report')
            ->exists();

        if ($yaReporto) {
            return response()->json(['message' => 'Ya enviaste un reporte para este pedido. No podés reportarlo dos veces.'], 403);
        }

        // 2. Guardar el reporte
        \App\Models\Feedback::create([
            'user_id' => $request->user()->id,
            'type' => 'report',
            'message' => $request->input('reason'),
            'reading_request_id' => $id
        ]);

        // 3. Contar y ocultar si llega a 5
        $reportCount = \App\Models\Feedback::where('reading_request_id', $id)->count();

        $fueOcultado = false;
        if ($reportCount >= 5) {
            $readingRequest->status = 'reported';
            $readingRequest->save();
            $fueOcultado = true;
        }

        // 4. Avisarle al Admin por Push
        try {
            $admins = \App\Models\User::where('role', 'admin')->whereNotNull('expo_push_token')->get();
            $voluntario = $request->user()->name;

            foreach ($admins as $admin) {
                $bodyMsg = $fueOcultado
                    ? "🚨 El pedido '{$readingRequest->title}' fue ocultado tras recibir 5 reportes."
                    : "El voluntario {$voluntario} reportó un pedido. (Reporte {$reportCount}/5).";

                \Illuminate\Support\Facades\Http::withoutVerifying()->post('https://exp.host/--/api/v2/push/send', [
                    'to' => $admin->expo_push_token,
                    'title' => '🚨 Pedido Reportado',
                    'body' => $bodyMsg,
                    'sound' => 'default',
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error push de reporte: ' . $e->getMessage());
        }

        // 5. Responder
        if ($fueOcultado) {
            return response()->json(['message' => 'Reporte enviado. El pedido fue ocultado temporalmente por acumulación de quejas.']);
        }

        return response()->json(['message' => "Reporte enviado ({$reportCount}/5). Gracias por ayudar a moderar."]);
    }
}
