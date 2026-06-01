<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 🌟 ESTO DESTRUYE LA TABLA VIEJA ANTES DE CREAR LA NUEVA
        Schema::dropIfExists('favorites');

        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Crea favoritable_id y favoritable_type
            $table->morphs('favoritable');

            $table->timestamps();

            // Evita duplicados
            $table->unique(['user_id', 'favoritable_id', 'favoritable_type'], 'user_favorite_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('favorites');
    }
};
