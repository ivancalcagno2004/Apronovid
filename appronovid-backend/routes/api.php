<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReadingRequestController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Agrupamos las rutas protegidas por Sanctum
Route::middleware('auth:sanctum')->group(function () {
    // La que usa el Oyente para crear pedidos
    Route::post('/reading-requests', [ReadingRequestController::class, 'store']);

    // La que usa el Voluntario para ver el muro
    Route::get('/reading-requests', [ReadingRequestController::class, 'index']);

    // logout
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::post('/reading-requests/{id}/audio', [ReadingRequestController::class, 'uploadAudio']);

    Route::get('/my-reading-requests', [ReadingRequestController::class, 'myRequests']);
});
