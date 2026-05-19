<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reading_requests', function (Blueprint $table) {
            $table->string('audio_path')->nullable()->after('file_path');
            $table->foreignId('voluntario_id')->nullable()->constrained('users')->after('oyente_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reading_requests', function (Blueprint $table) {
            //
        });
    }
};
