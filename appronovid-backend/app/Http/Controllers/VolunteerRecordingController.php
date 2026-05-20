<?php

namespace App\Http\Controllers;

use App\Models\VolunteerRecording;
use Illuminate\Http\Request;

class VolunteerRecordingController extends Controller
{
    /**
     * Obtener el historial de grabaciones del voluntario autenticado.
     */
    public function index(Request $request)
    {
        // Traemos las grabaciones del usuario logueado, ordenadas por la más reciente
        $recordings = VolunteerRecording::with('readingRequest')
            ->where('volunteer_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $recordings
        ]);
    }
}
