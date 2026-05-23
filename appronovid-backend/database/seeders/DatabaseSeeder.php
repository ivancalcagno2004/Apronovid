<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Category;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Crear el usuario Administrador
        User::firstOrCreate(
            ['email' => 'admin@apronovid.com'], // Si este email ya existe, no lo duplica
            [
                'name' => 'Administrador Apronovid',
                'password' => Hash::make('admin1234'), // Contraseña por defecto
                'role' => 'admin',
            ]
        );

        // 2. Crear las categorías históricas basadas en tu documento
        $categorias = [
            'Novela',
            'Cuentos',
            'Relatos',
            'Fábulas',
            'Leyendas',
            'Vivencias',
            'Canciones',
            'Canciones de Cuna',
            'Poemas',
            'Reflexiones',
            'Recetas',
            'Autoayuda',
            'Otros'
        ];

        foreach ($categorias as $nombre) {
            Category::firstOrCreate(
                ['name' => $nombre],
                ['slug' => Str::slug($nombre)] // Convierte "Canciones de Cuna" en "canciones-de-cuna"
            );
        }
    }
}
