<?php

namespace App\Http\Controllers;

use App\Models\Audiobook;
use App\Models\ReadingRequest;
use App\Models\Favorite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $categoryId = $request->query('category_id');

        $userId = $request->user()?->id;
        $userFavorites = [];
        $userVotes = [];

        if ($userId) {
            $favorites = Favorite::where('user_id', $userId)->get();

            foreach ($favorites as $fav) {
                if ($fav->favoritable_type === \App\Models\Audiobook::class) {
                    $userFavorites[] = 'hist_' . $fav->favoritable_id;
                } else {
                    $userFavorites[] = 'req_' . $fav->favoritable_id;
                }
            }

            // Buscamos qué audios ya votó el usuario (Devuelve ej: ['req_15', 'req_22'])
            $userVotes = DB::table('volunteer_ratings')
                ->where('user_id', $userId)
                ->pluck('audio_id')
                ->toArray();
        }
        // 1. Contar los "likes" de cada audio en los Pedidos Públicos
        $likesCounts = DB::table('volunteer_ratings')
            ->where('vote', 'like')
            ->select('audio_id', DB::raw('count(*) as total'))
            ->groupBy('audio_id')
            ->pluck('total', 'audio_id')
            ->toArray();

        // 2. Buscar en el Catálogo Histórico (Audiobooks)
        $audiobooksQuery = Audiobook::with('category');

        if ($categoryId && $categoryId !== 'all') {
            $audiobooksQuery->where('category_id', $categoryId);
        }

        if ($search) {
            $audiobooksQuery->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('author', 'like', "%{$search}%")
                    ->orWhere('reader', 'like', "%{$search}%");
            });
        }

        $audiobooks = $audiobooksQuery->get()->map(function ($book) {
            return [
                'id' => 'hist_' . $book->id,
                'title' => $book->title,
                'audio_path' => ltrim(str_replace(asset('storage/'), '', $book->audio_path), '/'),
                'created_at' => $book->created_at,
                'author' => $book->author,
                'reader' => $book->reader,
                'category_name' => $book->category ? $book->category->name : 'Sin categoría',
                'likes_count' => null, // Los audiolibros históricos no tienen sistema de likes de voluntarios
            ];
        });

        // 3. Buscar en Pedidos Públicos de la Comunidad (ReadingRequests)
        $requestsQuery = ReadingRequest::with(['category', 'voluntario'])
            ->where('is_public', true)
            ->where('status', 'completed')
            ->whereNotNull('audio_path');

        if ($categoryId && $categoryId !== 'all') {
            $requestsQuery->where('category_id', $categoryId);
        }

        if ($search) {
            $requestsQuery->where('title', 'like', "%{$search}%");
        }

        $publicRequests = $requestsQuery->get()->map(function ($req) use ($likesCounts) {
            $compositeId = 'req_' . $req->id;

            return [
                'id' => $compositeId,
                'title' => $req->title,
                'audio_path' => $req->audio_path,
                'created_at' => $req->created_at,
                'author' => null,
                'reader' => $req->voluntario ? $req->voluntario->name : 'Voluntario Anónimo',
                'reader_id' => $req->voluntario ? $req->voluntario->id : null,
                'reader_stars' => $req->voluntario ? $req->voluntario->stars : null,
                'category_name' => $req->category ? $req->category->name : 'Sin categoría',

                'likes_count' => $likesCounts[$compositeId] ?? 0,
            ];
        });

        // 4. Fusionar y ordenar
        $catalog = $audiobooks->concat($publicRequests)
            ->sortByDesc('created_at')
            ->values()
            ->map(function ($item) use ($userFavorites, $userVotes) {
                $item['is_favorite'] = in_array($item['id'], $userFavorites);

                // 🌟 Como tu DB ya guarda 'req_X', la comparación es directa
                $item['has_voted'] = in_array($item['id'], $userVotes);

                return $item;
            });

        return response()->json($catalog);
    }
}
