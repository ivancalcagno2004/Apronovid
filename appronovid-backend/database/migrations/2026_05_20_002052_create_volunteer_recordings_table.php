<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('volunteer_recordings', function (Blueprint $table) {
            $table->id();
            // Relación con el pedido original
            $table->foreignId('reading_request_id')->constrained()->onDelete('cascade');
            // Relación con el voluntario que grabó
            $table->foreignId('volunteer_id')->constrained('users')->onDelete('cascade');

            $table->string('audio_path');
            $table->string('status')->default('validating'); // validating, approved, rejected
            $table->text('ai_transcription')->nullable(); // Guardamos lo que entendió la IA
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('volunteer_recordings');
    }
};
