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

        $blockedIds = \Illuminate\Support\Facades\DB::table('blocked_users')
            ->where('user_id', $userId)
            ->pluck('blocked_user_id')
            ->toArray();

        // 🌟 Usamos Cursor Pagination en vez de get() para traerlos de a 15 de forma ultrarrápida
        $paginator = Favorite::with('favoritable.category')
            ->where('user_id', $userId)
            ->whereNotIn('voluntario_id', $blockedIds)
            ->orderBy('created_at', 'desc')
            ->cursorPaginate(15);

        // 🌟 OPTIMIZACIÓN: Buscamos a los voluntarios de antemano para evitar el problema de consultas N+1
        $readerIds = collect($paginator->items())->filter(function ($fav) {
            return $fav->favoritable_type === \App\Models\ReadingRequest::class && $fav->favoritable;
        })->pluck('favoritable.voluntario_id')->filter()->unique();

        $readers = User::whereIn('id', $readerIds)->get()->keyBy('id');

        $results = collect($paginator->items())->map(function ($fav) use ($readers) {
            $item = $fav->favoritable;

            // Si por alguna razón el audio original fue borrado por un admin, lo ignoramos
            if (!$item) return null;

            // 🌟 FORMATEO INTELIGENTE HACIA CLOUDFLARE R2
            $fullAudioUrl = $item->audio_path
                ? env('R2_PUBLIC_URL') . '/' . ltrim($item->audio_path, '/')
                : null;

            if ($fav->favoritable_type === \App\Models\Audiobook::class) {
                return [
                    'id' => 'hist_' . $item->id,
                    'title' => $item->title,
                    'audio_path' => $fullAudioUrl,
                    'created_at' => $fav->created_at,
                    'author' => $item->author,
                    'reader' => $item->reader,
                    'category_name' => $item->category ? $item->category->name : 'Sin categoría',
                ];
            } else {
                $voluntario = $item->voluntario_id ? $readers->get($item->voluntario_id) : null;

                return [
                    'id' => 'req_' . $item->id,
                    'title' => $item->title,
                    'audio_path' => $fullAudioUrl,
                    'created_at' => $fav->created_at,
                    'reader' => $voluntario ? $voluntario->name : null,
                    'reader_id' => $item->voluntario_id,
                    'reader_stars' => $voluntario ? $voluntario->stars : null,
                    'category_name' => $item->category ? $item->category->name : 'Sin categoría',
                ];
            }
        })->filter()->values();

        // 🌟 Devolvemos el array de data y el próximo cursor para que React Native sepa cómo seguir
        return response()->json([
            'data' => $results,
            'next_cursor' => $paginator->nextCursor() ? $paginator->nextCursor()->encode() : null
        ]);
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
