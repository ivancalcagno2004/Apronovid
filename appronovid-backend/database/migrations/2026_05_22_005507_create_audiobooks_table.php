<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('audiobooks', function (Blueprint $table) {
            $table->id();
            $table->string('title'); // Corresponde a LIBRO 
            $table->foreignId('category_id')->nullable()->constrained()->onDelete('cascade'); // Corresponde a TEMA 
            $table->string('author')->nullable(); // Corresponde a AUTOR 
            $table->string('reader')->nullable(); // Corresponde a LECTOR 
            $table->integer('year')->nullable(); // Corresponde a AÑO 
            $table->string('audio_path');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audiobooks');
    }
};
