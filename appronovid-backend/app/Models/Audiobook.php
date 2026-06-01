<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Audiobook extends Model
{
    // 🌟 CAMBIAMOS audio_url por audio_path
    protected $fillable = ['title', 'description', 'audio_path', 'category_id', 'author', 'reader', 'year'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function favorites()
    {
        return $this->morphMany(Favorite::class, 'favoritable');
    }
}
