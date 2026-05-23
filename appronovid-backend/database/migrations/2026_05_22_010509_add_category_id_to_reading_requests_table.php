<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reading_requests', function (Blueprint $table) {
            // Se agrega la columna y se enlaza con la tabla categories
            $table->foreignId('category_id')->nullable()->constrained('categories')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('reading_requests', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
        });
    }
};
