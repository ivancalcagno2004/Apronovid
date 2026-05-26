<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Feedback;

class FeedbackController extends Controller
{
    // 🔒 Admin: Ver todos los reportes y sugerencias
    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        // Traemos los reportes incluyendo el nombre y email del usuario que los creó
        $feedback = Feedback::with('user:id,name,email')->latest()->get();
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
