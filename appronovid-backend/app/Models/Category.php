<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['name', 'slug'];

    // Relación: Una categoría tiene muchos audiolibros en el catálogo
    public function audiobooks()
    {
        return $this->hasMany(Audiobook::class);
    }

    // Relación: Una categoría tiene muchos pedidos
    public function requests()
    {
        return $this->hasMany(ReadingRequest::class);
    }
}
