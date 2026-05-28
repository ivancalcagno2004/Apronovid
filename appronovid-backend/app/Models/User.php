<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'expo_push_token',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['stars'];

    public function getStarsAttribute()
    {
        $totalVotes = $this->total_likes + $this->total_dislikes;

        if ($totalVotes < 5) {
            return null;
        }

        $percentage = $this->total_likes / $totalVotes;

        // Retorna el cálculo sobre 5, redondeado a 1 decimal (ej: 4.8)
        return round($percentage * 5, 1);
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function readingRequests()
    {
        return $this->hasMany(ReadingRequest::class, 'oyente_id');
    }

    public function taskQueues()
    {
        return $this->hasMany(TaskQueue::class, 'narrador_id');
    }

    public function favorites()
    {
        return $this->belongsToMany(ReadingRequest::class, 'favorites', 'user_id', 'reading_request_id')->withTimestamps();
    }
}
