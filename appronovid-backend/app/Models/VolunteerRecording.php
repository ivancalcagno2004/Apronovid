<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VolunteerRecording extends Model
{
    use HasFactory;

    protected $fillable = [
        'reading_request_id',
        'volunteer_id',
        'audio_path',
        'status',
        'ai_transcription'
    ];

    public function readingRequest()
    {
        return $this->belongsTo(ReadingRequest::class, 'reading_request_id');
    }

    public function volunteer()
    {
        return $this->belongsTo(User::class, 'volunteer_id');
    }
}
