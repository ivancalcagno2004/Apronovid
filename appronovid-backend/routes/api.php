<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReadingRequestController;
use App\Http\Controllers\VolunteerRecordingController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\RatingController;
use Illuminate\Support\Facades\Log;

// Rutas Públicas
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/google-auth', [AuthController::class, 'googleAuth']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
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
    Route::get('/catalog', [\App\Http\Controllers\CatalogController::class, 'index']);
    Route::post('/feedback', [FeedbackController::class, 'store']);
    Route::get('/admin/feedback', [FeedbackController::class, 'index']);
    Route::delete('/admin/feedback/{id}', [FeedbackController::class, 'destroy']);
    Route::post('/volunteers/{volunteerId}/rate', [RatingController::class, 'rateVolunteer']);
    Route::get('/volunteer/stats', [VolunteerRecordingController::class, 'getStats']);
    Route::get('/volunteer/{id}/public-stats', [VolunteerRecordingController::class, 'getPublicStats']);
    Route::post('/reading-requests/{id}/report', [ReadingRequestController::class, 'report']);

    // --- AUDIOS Y GRABACIONES ---
    Route::post('/reading-requests/{id}/audio', [ReadingRequestController::class, 'uploadAudio']);
    Route::get('/my-recordings', [VolunteerRecordingController::class, 'index']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites/{id}/toggle', [FavoriteController::class, 'toggle']);

    // --- CERRAR SESIÓN ---
    Route::post('/logout', [AuthController::class, 'logout']);

    // --- RUTAS DE ADMINISTRACIÓN (Requieren rol de admin) ---
    Route::middleware([\App\Http\Middleware\IsAdmin::class])->prefix('admin')->group(function () {
        Route::get('/catalog', [\App\Http\Controllers\Admin\CatalogController::class, 'index']);
        Route::post('/catalog', [\App\Http\Controllers\Admin\CatalogController::class, 'store']);
        Route::delete('/catalog/{id}', [\App\Http\Controllers\Admin\CatalogController::class, 'destroy']);
        Route::get('/manual-reviews', [\App\Http\Controllers\Admin\CatalogController::class, 'getManualReviews']);
        Route::post('/manual-reviews/{id}/approve', [\App\Http\Controllers\Admin\CatalogController::class, 'approveReview']);
        Route::post('/manual-reviews/{id}/reject', [\App\Http\Controllers\Admin\CatalogController::class, 'rejectReview']);
        Route::post('/reported-requests/{id}/restore', [\App\Http\Controllers\FeedbackController::class, 'restoreReport']);
        Route::delete('/reported-requests/{id}', [\App\Http\Controllers\FeedbackController::class, 'deleteReportedRequest']);
    });
});
// 🌟 RUTA DE AUDIO DEFINITIVA
Route::get('/audio/descargar/{path}', function ($path) {
    // Armamos la ruta física exacta
    $fullPath = storage_path('app/public/' . $path);

    if (!file_exists($fullPath)) {
        // Escribimos en el log el error exacto para no adivinar más
        Log::error("Fallo al reproducir audio. Ruta física buscada: " . $fullPath);
        return response()->json([
            'error' => 'El archivo no existe físicamente en el disco',
            'ruta_buscada' => $fullPath
        ], 404);
    }

    return response()->file($fullPath);
})->where('path', '.*'); // Esto permite que la ruta acepte las barras (/) de 'catalog_audios/...'
