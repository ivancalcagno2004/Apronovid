<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Feedback;
use App\Models\User; // 🌟 IMPORTANTE: Agregamos el modelo User para buscar a los admins
use Illuminate\Support\Facades\Http; // 🌟 Agregamos Http para mandar la notificación

class FeedbackController extends Controller
{
    // 🔒 Admin: Ver todos los reportes y sugerencias
    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $feedback = Feedback::with('user:id,name,email,role')->latest()->get();

        return response()->json($feedback);
    }

    // 👤 Cualquier usuario: Guardar un nuevo reporte
    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|in:bug,suggestion',
            'message' => 'required|string|max:5000',
        ]);

        $feedback = Feedback::create([
            'user_id' => $request->user()->id,
            'type' => $request->input('type'),
            'message' => $request->input('message'),
        ]);

        // 🌟 NUEVO: Lógica de notificaciones Push para los Administradores
        try {
            // Buscamos a todos los admins que tengan un token de Expo guardado
            $admins = User::where('role', 'admin')
                ->whereNotNull('expo_push_token')
                ->get();

            if ($admins->count() > 0) {
                $remitente = $request->user()->name;
                $tipoIcono = $request->input('type') === 'bug' ? '🪲' : '💡';
                $tipoTexto = $request->input('type') === 'bug' ? 'un nuevo error' : 'una nueva sugerencia';

                // Le disparamos la notificación a cada admin
                foreach ($admins as $admin) {
                    Http::withoutVerifying()->post('https://exp.host/--/api/v2/push/send', [
                        'to' => $admin->expo_push_token,
                        'title' => 'Nuevo mensaje en el Buzón 📬',
                        'body' => "{$remitente} envió {$tipoTexto} {$tipoIcono}.",
                        'sound' => 'default',
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Si la notificación falla por algún motivo (ej: sin internet), 
            // atrapamos el error para que el reporte se guarde igual y no le tire error al usuario.
            \Illuminate\Support\Facades\Log::error('Error enviando push a admins: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Feedback guardado con éxito', 'data' => $feedback], 201);
    }

    // 🔒 Admin: Eliminar un reporte o sugerencia
    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $feedback = Feedback::find($id);

        if (!$feedback) {
            return response()->json(['message' => 'El reporte ya no existe.'], 404);
        }

        $feedback->delete();

        return response()->json(['message' => 'Reporte eliminado con éxito']);
    }
}
