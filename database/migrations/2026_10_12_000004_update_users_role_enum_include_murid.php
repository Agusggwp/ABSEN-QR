<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin_sekolah', 'petugas_absensi', 'guru_wali', 'kepala_sekolah', 'murid') NOT NULL DEFAULT 'admin_sekolah'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin_sekolah', 'petugas_absensi', 'guru_wali', 'kepala_sekolah') NOT NULL DEFAULT 'admin_sekolah'");
        }
    }
};
