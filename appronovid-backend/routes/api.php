<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReadingRequestController;
use App\Http\Controllers\VolunteerRecordingController;

// Rutas Públicas
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Rutas Protegidas (Requieren estar logueado)
Route::middleware('auth:sanctum')->group(function () {

    // --- USUARIO Y PERFIL ---
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::put('/profile/email', [AuthController::class, 'updateEmail']);
    Route::put('/profile/password', [AuthController::class, 'updatePassword']);

    // 🆕 Guardado del Token de Expo (Notificaciones)
    Route::post('/user/push-token', function (Request $request) {
        $request->validate(['token' => 'required|string']);
        $request->user()->update(['expo_push_token' => $request->token]);
        return response()->json(['message' => 'Token guardado']);
    });

    // --- PEDIDOS DE LECTURA (OYENTES Y VOLUNTARIOS) ---
    Route::post('/reading-requests', [ReadingRequestController::class, 'store']);
    Route::get('/reading-requests', [ReadingRequestController::class, 'index']);
    Route::get('/my-reading-requests', [ReadingRequestController::class, 'myRequests']);
    Route::put('/reading-requests/{id}', [ReadingRequestController::class, 'update']);
    Route::delete('/reading-requests/{id}', [ReadingRequestController::class, 'destroy']);

    // --- AUDIOS Y GRABACIONES ---
    Route::post('/reading-requests/{id}/audio', [ReadingRequestController::class, 'uploadAudio']);
    Route::get('/my-recordings', [VolunteerRecordingController::class, 'index']);

    // --- CERRAR SESIÓN ---
    Route::post('/logout', [AuthController::class, 'logout']);
});
