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
        // 1. Tambahkan relasi dan username akun pada tabel users
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 60)->nullable()->unique()->after('email');
            $table->foreignId('student_id')->nullable()->after('role')->constrained('students')->nullOnDelete();
            $table->boolean('must_change_password')->default(false)->after('is_active');
        });

        // 2. Tambahkan user_id pada tabel students
        Schema::table('students', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });

        // 3. Tambahkan qr_token_encrypted pada tabel student_qr_codes untuk dekripsi on-demand aman di Portal Murid
        Schema::table('student_qr_codes', function (Blueprint $table) {
            $table->longText('qr_token_encrypted')->nullable()->after('qr_token_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_qr_codes', function (Blueprint $table) {
            $table->dropColumn('qr_token_encrypted');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
            $table->dropColumn(['username', 'student_id', 'must_change_password']);
        });
    }
};
