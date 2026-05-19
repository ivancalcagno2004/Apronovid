<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reading_requests', function (Blueprint $table) {
            $table->id();
            // Vinculamos al Oyente que hace el pedido
            $table->foreignId('oyente_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('description_or_text');
            // Controlamos el ciclo de vida del pedido
            $table->enum('status', ['pending', 'assigned', 'completed'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reading_requests');
    }
};
