<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Audiobook;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CatalogController extends Controller
{
    // 🌟 NUEVO: Obtener la lista de audiolibros históricos para el panel de gestión
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

        // 🌟 Le decimos exactamente el nombre de la carpeta y le forzamos el disco 'public'
        $path = $request->file('audio_file')->store('catalog_audios', 'public');

        $audiobook = Audiobook::create([
            'title' => $request->title,
            'category_id' => $request->category_id,
            'author' => $request->author,
            'reader' => $request->reader,
            'year' => $request->year,
            'audio_path' => $path, // El path ya sale limpio de fábrica: 'catalog_audios/archivo.mp3'
        ]);

        return response()->json(['message' => 'Audiolibro subido al catálogo con éxito', 'data' => $audiobook], 201);
    }

    // 🌟 NUEVO: Eliminar un audiolibro del catálogo y su archivo físico
    public function destroy($id)
    {
        $audiobook = Audiobook::findOrFail($id);

        // Eliminar el archivo físico si existe en el almacenamiento
        if ($audiobook->audio_path) {
            $storagePath = 'public/' . ltrim($audiobook->audio_path, '/');
            if (Storage::exists($storagePath)) {
                Storage::delete($storagePath);
            }
        }

        $audiobook->delete();

        return response()->json(['message' => 'Audiolibro eliminado correctamente del catálogo.']);
    }
}
