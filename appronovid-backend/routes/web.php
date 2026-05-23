<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

Route::get('/', function () {
    return view('welcome');
});

// 🌟 RUTA DE RESCATE PARA AUDIOS EN WINDOWS / LOCAL
Route::get('/storage/{folder}/{filename}', function ($folder, $filename) {
    // Buscamos la ruta física real donde se guardó el archivo
    $path = storage_path('app/public/' . $folder . '/' . $filename);

    // Si el archivo no existe físicamente, devolvemos 404 real
    if (!File::exists($path)) {
        abort(404);
    }

    // Le devolvemos el archivo como un flujo de datos (stream) para que el reproductor lo pueda leer
    return response()->file($path);
})->where('filename', '.*'); // Esto permite que el nombre del archivo tenga puntos (ej: .mp3)

Route::get('/play-audio', function (Request $request) {
    $file = $request->query('file');

    // Limpiamos cualquier slash que venga por error
    $cleanPath = ltrim($file, '/');

    // Armamos la ruta profunda hacia el disco duro
    $fullPath = storage_path('app/public/' . $cleanPath);

    if (!File::exists($fullPath)) {
        // Si falla, en vez de un error genérico, Laravel nos va a imprimir 
        // la ruta exacta que está intentando leer para descubrir qué está mal.
        return response("ERROR: El archivo físico no existe en -> " . $fullPath, 404);
    }

    return response()->file($fullPath);
});
