<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RatingController extends Controller
{
    public function rateVolunteer(Request $request, $volunteerId)
    {
        // 🌟 Ahora exigimos que nos manden el audio_id
        $request->validate([
            'vote' => 'required|in:like,dislike',
            'audio_id' => 'required|string'
        ]);

        $userId = $request->user()->id;

        // 🌟 Verificamos si este oyente ya votó ESTE audio en particular
        $alreadyVoted = DB::table('volunteer_ratings')
            ->where('user_id', $userId)
            ->where('audio_id', $request->audio_id)
            ->exists();

        if ($alreadyVoted) {
            return response()->json(['message' => 'Ya valoraste este audio.'], 400);
        }

        // 🌟 Anotamos el voto en el registro histórico
        DB::table('volunteer_ratings')->insert([
            'user_id' => $userId,
            'volunteer_id' => $volunteerId,
            'audio_id' => $request->audio_id,
            'vote' => $request->vote,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $volunteer = User::findOrFail($volunteerId);
        if ($request->vote === 'like') {
            $volunteer->increment('total_likes');
        } else {
            $volunteer->increment('total_dislikes');
        }

        return response()->json([
            'message' => 'Voto registrado exitosamente',
            'new_stars' => $volunteer->stars
        ]);
    }
}
