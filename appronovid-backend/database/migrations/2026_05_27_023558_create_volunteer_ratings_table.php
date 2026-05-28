<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('volunteer_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // ID del Oyente
            $table->foreignId('volunteer_id')->constrained('users')->onDelete('cascade'); // ID del Voluntario
            $table->string('audio_id'); // Guardaremos el ID compuesto, ej: "req_15"
            $table->enum('vote', ['like', 'dislike']);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('volunteer_ratings');
    }
};
