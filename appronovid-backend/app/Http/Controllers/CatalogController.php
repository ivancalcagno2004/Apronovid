<?php

namespace App\Http\Controllers;

use App\Models\Audiobook;
use App\Models\ReadingRequest;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $categoryId = $request->query('category_id');

        // 1. Buscar en el Catálogo Histórico (Audiobooks)
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

        // 2. Buscar en Pedidos Públicos de la Comunidad (ReadingRequests)
        $requestsQuery = ReadingRequest::with('category')
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
                'author' => 'Pedido de Oyente', // Texto por defecto
                'reader' => null, // Opcional: podrías traer el nombre del voluntario con una relación
                'category_name' => $req->category ? $req->category->name : 'Sin categoría',
            ];
        });

        // 3. Fusionar las dos listas, ordenar por los más recientes y reindexar
        $catalog = $audiobooks->concat($publicRequests)
            ->sortByDesc('created_at')
            ->values();

        return response()->json($catalog);
    }
}
