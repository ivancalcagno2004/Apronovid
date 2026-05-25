<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\ReadingRequest;
use App\Models\Audiobook;

class FavoriteController extends Controller
{
    // Trae y combina los favoritos de ambas tablas
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        // Obtenemos todos los strings de favoritos (ej: ['hist_13', 'req_25'])
        $catalogIds = DB::table('favorites')
            ->where('user_id', $userId)
            ->pluck('catalog_id');

        $histIds = [];
        $reqIds = [];

        foreach ($catalogIds as $id) {
            if (str_starts_with($id, 'hist_')) {
                $histIds[] = str_replace('hist_', '', $id);
            } else {
                $reqIds[] = str_replace('req_', '', $id);
            }
        }

        // 🌟 1. Buscamos los históricos y los convertimos a ARRAY simple
        $historical = Audiobook::with('category')->whereIn('id', $histIds)->get()->map(function ($item) {
            return [
                'id' => 'hist_' . $item->id, // Acá Laravel ya no nos borra el texto
                'title' => $item->title,
                'audio_path' => ltrim(str_replace(asset('storage/'), '', $item->audio_path), '/'),
                'created_at' => $item->created_at,
                'author' => $item->author,
                'reader' => $item->reader,
                'category_name' => $item->category ? $item->category->name : 'Sin categoría',
            ];
        });

        // 🌟 2. Buscamos los pedidos de lectura comunitarios y los convertimos a ARRAY
        $requests = ReadingRequest::with('category')->whereIn('id', $reqIds)->get()->map(function ($item) {
            return [
                'id' => 'req_' . $item->id, // Acá tampoco lo borra
                'title' => $item->title,
                'audio_path' => $item->audio_path,
                'created_at' => $item->created_at,
                'author' => 'Pedido de Oyente',
                'reader' => null,
                'category_name' => $item->category ? $item->category->name : 'Sin categoría',
            ];
        });

        // Juntamos ambos resultados y los mandamos al frontend
        return response()->json($historical->concat($requests));
    }

    // Agrega o quita el favorito usando el string completo con prefijo
    public function toggle(Request $request, $id)
    {
        $userId = $request->user()->id;

        $exists = DB::table('favorites')
            ->where('user_id', $userId)
            ->where('catalog_id', $id)
            ->first();

        if ($exists) {
            DB::table('favorites')
                ->where('user_id', $userId)
                ->where('catalog_id', $id)
                ->delete();
        } else {
            DB::table('favorites')->insert([
                'user_id' => $userId,
                'catalog_id' => $id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        return response()->json(['message' => 'Favoritos actualizados']);
    }
}
