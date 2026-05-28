<?php

namespace App\Http\Controllers;

use App\Models\VolunteerRecording;
use Illuminate\Http\Request;
use App\Models\ReadingRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class VolunteerRecordingController extends Controller
{
    public function index(Request $request)
    {
        $recordings = VolunteerRecording::with('readingRequest')
            ->where('volunteer_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $recordings
        ]);
    }

    public function getStats(Request $request)
    {
        $user = $request->user();

        // 1. Calculamos los audios aprobados divididos por privacidad
        $publicAudios = ReadingRequest::where('voluntario_id', $user->id)
            ->where('status', 'completed')
            ->where('is_public', true)
            ->count();

        $privateAudios = ReadingRequest::where('voluntario_id', $user->id)
            ->where('status', 'completed')
            ->where('is_public', false)
            ->count();

        $totalApproved = $publicAudios + $privateAudios;

        // 2. Verificamos si tiene algún audio que haya superado los 50 likes
        $hasHitAudio = DB::table('volunteer_ratings')
            ->where('volunteer_id', $user->id)
            ->where('vote', 'like')
            ->select('audio_id', DB::raw('count(*) as total'))
            ->groupBy('audio_id')
            ->having('total', '>=', 50)
            ->exists();

        // 3. Armamos el sistema de Medallas (Basado en el esfuerzo TOTAL)
        $badges = [];

        if ($totalApproved >= 10) {
            $badges[] = ['id' => 'bronce', 'icon' => 'mic', 'color' => '#CD7F32', 'title' => 'Micrófono de Bronce', 'desc' => '10 audios grabados y aprobados.'];
        }
        if ($totalApproved >= 20) {
            $badges[] = ['id' => 'plata', 'icon' => 'mic', 'color' => '#C0C0C0', 'title' => 'Micrófono de Plata', 'desc' => '20 audios grabados y aprobados.'];
        }
        if ($totalApproved >= 30) {
            $badges[] = ['id' => 'oro', 'icon' => 'mic', 'color' => '#FFD700', 'title' => 'Micrófono de Oro', 'desc' => '30 audios grabados y aprobados.'];
        }

        $totalVotes = $user->total_likes + $user->total_dislikes;
        if ($user->stars >= 4.8 && $totalVotes >= 20) {
            $badges[] = ['id' => 'perfeccion', 'icon' => 'star', 'color' => '#9C27B0', 'title' => 'Voz de Cristal', 'desc' => 'Mantuvo una calificación superior a 4.8 con más de 20 votos.'];
        }

        if ($hasHitAudio) {
            $badges[] = ['id' => 'hit', 'icon' => 'flame', 'color' => '#FF5722', 'title' => 'Hit de la Comunidad', 'desc' => 'Un audio suyo recibió más de 50 valoraciones positivas.'];
        }

        return response()->json([
            'stats' => [
                'public_audios' => $publicAudios,
                'private_audios' => $privateAudios,
                'total_audios' => $totalApproved,
                'stars' => $user->stars,
                'total_likes' => $user->total_likes
            ],
            'badges' => $badges
        ]);
    }

    public function getPublicStats($id)
    {
        $user = User::findOrFail($id);

        $publicAudios = ReadingRequest::where('voluntario_id', $user->id)
            ->where('status', 'completed')
            ->where('is_public', true)
            ->count();

        $privateAudios = ReadingRequest::where('voluntario_id', $user->id)
            ->where('status', 'completed')
            ->where('is_public', false)
            ->count();

        $totalApproved = $publicAudios + $privateAudios;

        $hasHitAudio = DB::table('volunteer_ratings')
            ->where('volunteer_id', $user->id)
            ->where('vote', 'like')
            ->select('audio_id', DB::raw('count(*) as total'))
            ->groupBy('audio_id')
            ->having('total', '>=', 50)
            ->exists();

        $badges = [];

        if ($totalApproved >= 10) $badges[] = 'Micrófono de Bronce';
        if ($totalApproved >= 20) $badges[] = 'Micrófono de Plata';
        if ($totalApproved >= 30) $badges[] = 'Micrófono de Oro';

        $totalVotes = $user->total_likes + $user->total_dislikes;
        if ($user->stars >= 4.8 && $totalVotes >= 20) $badges[] = 'Voz de Cristal';
        if ($hasHitAudio) $badges[] = 'Hit de la Comunidad';

        return response()->json([
            'name' => $user->name,
            'public_audios' => $publicAudios,
            'private_audios' => $privateAudios,
            'total_audios' => $totalApproved,
            'stars' => $user->stars,
            'badges' => $badges
        ]);
    }
}
