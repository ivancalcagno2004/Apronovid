<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Favorite;
use App\Models\User;

class FavoriteController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        // 🌟 MAGIA ELOQUENT: Traemos todos los favoritos del usuario con sus modelos y categorías en 1 sola consulta
        $favorites = Favorite::with('favoritable.category')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        $results = $favorites->map(function ($fav) {
            // "favoritable" puede ser un Audiobook o un ReadingRequest automáticamente
            $item = $fav->favoritable;

            // Si por alguna razón el audio original fue borrado por un admin, lo ignoramos
            if (!$item) return null;

            if ($fav->favoritable_type === \App\Models\Audiobook::class) {
                return [
                    'id' => 'hist_' . $item->id,
                    'title' => $item->title,
                    'audio_path' => ltrim(str_replace(asset('storage/'), '', $item->audio_path), '/'),
                    'created_at' => $fav->created_at, // Mostramos la fecha en que lo guardó en favoritos
                    'author' => $item->author,
                    'reader' => $item->reader,
                    'category_name' => $item->category ? $item->category->name : 'Sin categoría',
                ];
            } else {
                $voluntario = $item->voluntario_id ? User::find($item->voluntario_id) : null;

                return [
                    'id' => 'req_' . $item->id,
                    'title' => $item->title,
                    'audio_path' => $item->audio_path,
                    'created_at' => $fav->created_at,
                    'reader' => $voluntario ? $voluntario->name : null,
                    'reader_id' => $item->voluntario_id,
                    'reader_stars' => $voluntario ? $voluntario->stars : null,
                    'category_name' => $item->category ? $item->category->name : 'Sin categoría',
                ];
            }
        })->filter()->values(); // Filtramos los nulos (si los hay) y reindexamos

        return response()->json($results);
    }

    public function toggle(Request $request, $id)
    {
        $userId = $request->user()->id;

        // 🌟 Desciframos el ID que manda React Native ('hist_x' o 'req_x') y le asignamos su clase real
        if (str_starts_with($id, 'hist_')) {
            $realId = str_replace('hist_', '', $id);
            $modelClass = \App\Models\Audiobook::class;
        } else {
            $realId = str_replace('req_', '', $id);
            $modelClass = \App\Models\ReadingRequest::class;
        }

        // Buscamos si ya existe usando el Polimorfismo
        $favorite = Favorite::where('user_id', $userId)
            ->where('favoritable_id', $realId)
            ->where('favoritable_type', $modelClass)
            ->first();

        if ($favorite) {
            $favorite->delete();
            return response()->json(['message' => 'Eliminado de favoritos']);
        } else {
            Favorite::create([
                'user_id' => $userId,
                'favoritable_id' => $realId,
                'favoritable_type' => $modelClass,
            ]);
            return response()->json(['message' => 'Agregado a favoritos']);
        }
    }
}
