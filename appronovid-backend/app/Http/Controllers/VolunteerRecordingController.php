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

        // 🌟 Formateamos la colección para armar la URL absoluta de Cloudflare
        $formattedRecordings = $recordings->map(function ($item) {

            $fullAudioUrl = $item->audio_path
                ? (str_starts_with($item->audio_path, 'http')
                    ? $item->audio_path
                    : rtrim(env('R2_PUBLIC_URL'), '/') . '/' . ltrim($item->audio_path, '/'))
                : null;

            return [
                'id' => $item->id,
                'status' => $item->status,
                'audio_path' => $fullAudioUrl,
                'ai_transcription' => $item->ai_transcription,
                'created_at' => $item->created_at,
                'reading_request' => $item->readingRequest ? [
                    'title' => $item->readingRequest->title,
                    'description_or_text' => $item->readingRequest->description_or_text,
                ] : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formattedRecordings
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
            'id' => $user->id,
            'name' => $user->name,
            'public_audios' => $publicAudios,
            'private_audios' => $privateAudios,
            'total_audios' => $totalApproved,
            'stars' => $user->stars,
            'badges' => $badges
        ]);
    }

    public function getLeaderboard()
    {
        // 1. Buscamos a los usuarios con mejores estrellas y likes
        $users = User::whereNotNull('stars')
            ->where('stars', '>', 0)
            ->orderBy('stars', 'desc')
            ->orderBy('total_likes', 'desc')
            ->take(10)
            ->get();

        // 2. Optimizamos la consulta para no hacer N+1 (buscamos los audios de todos a la vez)
        $audioCounts = \App\Models\ReadingRequest::selectRaw('voluntario_id, count(*) as total')
            ->whereIn('voluntario_id', $users->pluck('id'))
            ->where('status', 'completed')
            ->groupBy('voluntario_id')
            ->pluck('total', 'voluntario_id');

        // 3. Mapeamos la data
        $leaderboard = $users->map(function ($user) use ($audioCounts) {
            $totalApproved = $audioCounts->get($user->id, 0);

            // Resumen rápido de medallas para la UI
            $topBadge = null;
            if ($totalApproved >= 30) $topBadge = 'Oro';
            elseif ($totalApproved >= 20) $topBadge = 'Plata';
            elseif ($totalApproved >= 10) $topBadge = 'Bronce';

            if ($user->stars >= 4.8 && ($user->total_likes + $user->total_dislikes) >= 20) {
                $topBadge = 'Cristal';
            }

            return [
                'id' => $user->id,
                'name' => $user->name,
                'stars' => $user->stars,
                'total_audios' => $totalApproved,
                'likes' => $user->total_likes,
                'top_badge' => $topBadge,
            ];
        });

        // 4. Re-ordenamos el Top 10 final por Estrellas -> Audios grabados -> Likes
        $leaderboard = $leaderboard->sortByDesc('likes')
            ->sortByDesc('total_audios')
            ->sortByDesc('stars')
            ->values();

        return response()->json([
            'success' => true,
            'data' => $leaderboard
        ]);
    }
}
