<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\ReadingRequest;
use App\Models\Audiobook;
use App\Models\User; // 🌟 IMPORTANTE: Agregamos el modelo User

class FavoriteController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

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

        $historical = Audiobook::with('category')->whereIn('id', $histIds)->get()->map(function ($item) {
            return [
                'id' => 'hist_' . $item->id,
                'title' => $item->title,
                'audio_path' => ltrim(str_replace(asset('storage/'), '', $item->audio_path), '/'),
                'created_at' => $item->created_at,
                'author' => $item->author,
                'reader' => $item->reader,
                'category_name' => $item->category ? $item->category->name : 'Sin categoría',
            ];
        });

        $requests = ReadingRequest::with('category')->whereIn('id', $reqIds)->get()->map(function ($item) {
            // 🌟 Buscamos al voluntario en la base de datos
            $voluntario = $item->voluntario_id ? User::find($item->voluntario_id) : null;

            return [
                'id' => 'req_' . $item->id,
                'title' => $item->title,
                'audio_path' => $item->audio_path,
                'created_at' => $item->created_at,
                'author' => 'Pedido de Oyente',

                // 🌟 AHORA SÍ MANDAMOS LOS DATOS DEL NARRADOR
                'reader' => $voluntario ? $voluntario->name : null,
                'reader_id' => $item->voluntario_id,
                'reader_stars' => $voluntario ? $voluntario->stars : null,

                'category_name' => $item->category ? $item->category->name : 'Sin categoría',
            ];
        });

        return response()->json($historical->concat($requests));
    }

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
