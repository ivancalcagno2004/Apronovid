<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskQueue extends Model
{
    use HasFactory;

    protected $fillable = ['reading_request_id', 'narrador_id', 'audio_url', 'status', 'assigned_at', 'completed_at'];

    public function readingRequest()
    {
        return $this->belongsTo(ReadingRequest::class);
    }

    public function narrador()
    {
        return $this->belongsTo(User::class, 'narrador_id');
    }
}
