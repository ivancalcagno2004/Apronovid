<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_queues', function (Blueprint $table) {
            $table->id();
            // Referencia al pedido original
            $table->foreignId('reading_request_id')->constrained('reading_requests')->onDelete('cascade');
            // Referencia al Narrador que aceptó la tarea
            $table->foreignId('narrador_id')->constrained('users')->onDelete('cascade');

            // La URL donde guardaremos el audio normalizado (Firebase o Azure Blob Storage)
            $table->string('audio_url')->nullable();

            $table->enum('status', ['recording', 'reviewing', 'approved', 'rejected'])->default('recording');

            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_queues');
    }
};
