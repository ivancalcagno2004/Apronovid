<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReadingRequest extends Model
{
    use HasFactory;

    protected $fillable = ['oyente_id', 'title', 'description_or_text', 'status', 'file_path', 'audio_path', 'voluntario_id'];

    public function oyente()
    {
        return $this->belongsTo(User::class, 'oyente_id');
    }

    public function tasks()
    {
        return $this->hasMany(TaskQueue::class);
    }
}
