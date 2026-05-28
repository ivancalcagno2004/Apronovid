<?php

namespace App\Http\Controllers;

use App\Models\Audiobook;
use App\Models\ReadingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // 🌟 IMPORTANTE: Agregamos la fachada DB

class CatalogController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $categoryId = $request->query('category_id');

        // 🌟 1. Obtenemos los favoritos Y LOS VOTOS del usuario actual
        $userId = $request->user()?->id;
        $userFavorites = [];
        $userVotes = []; // <-- NUEVO

        if ($userId) {
            $userFavorites = DB::table('favorites')
                ->where('user_id', $userId)
                ->pluck('catalog_id')
                ->toArray();

            // <-- NUEVO: Buscamos qué audios ya votó
            $userVotes = DB::table('volunteer_ratings')
                ->where('user_id', $userId)
                ->pluck('audio_id')
                ->toArray();
        }

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

        // Mapeamos los resultados para que el frontend los entienda igual
        $audiobooks = $audiobooksQuery->get()->map(function ($book) {
            return [
                'id' => 'hist_' . $book->id, // Le ponemos prefijo para que no choque con los IDs de pedidos
                'title' => $book->title,
                'audio_path' => ltrim(str_replace(asset('storage/'), '', $book->audio_path), '/'),
                'created_at' => $book->created_at,
                'author' => $book->author,
                'reader' => $book->reader,
                'category_name' => $book->category ? $book->category->name : 'Sin categoría',
            ];
        });

        // 3. Buscar en Pedidos Públicos de la Comunidad (ReadingRequests)
        // 🌟 IMPORTANTE: Agregamos 'volunteer' al with() para traernos los datos del usuario que grabó
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

        $publicRequests = $requestsQuery->get()->map(function ($req) {
            return [
                'id' => 'req_' . $req->id,
                'title' => $req->title,
                'audio_path' => $req->audio_path,
                'created_at' => $req->created_at,
                'author' => null,

                'reader' => $req->voluntario ? $req->voluntario->name : 'Voluntario Anónimo',
                'reader_id' => $req->voluntario ? $req->voluntario->id : null,
                'reader_stars' => $req->voluntario ? $req->voluntario->stars : null,

                'category_name' => $req->category ? $req->category->name : 'Sin categoría',
            ];
        });

        // 4. Fusionar, ordenar y 🌟 AGREGAR EL ESTADO DE FAVORITOS 🌟
        $catalog = $audiobooks->concat($publicRequests)
            ->sortByDesc('created_at')
            ->values()
            ->map(function ($item) use ($userFavorites, $userVotes) {
                // Chequeamos si el ID (ej: 'hist_13') está en la lista de favoritos del usuario
                $item['is_favorite'] = in_array($item['id'], $userFavorites);
                $item['has_voted'] = in_array($item['id'], $userVotes);
                return $item;
            });

        return response()->json($catalog);
    }
}
