<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RoleAndUserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'Super Administrator',
                'email' => 'superadmin@artdevata.sch.id',
                'password' => Hash::make('password123'),
                'role' => 'super_admin',
                'phone' => '081234567890',
                'is_active' => true,
            ],
            [
                'name' => 'Admin Sekolah ARTDEVATA',
                'email' => 'admin@artdevata.sch.id',
                'password' => Hash::make('password123'),
                'role' => 'admin_sekolah',
                'phone' => '081234567891',
                'is_active' => true,
            ],
            [
                'name' => 'Petugas Gerbang Utama (I Wayan Sukadana)',
                'email' => 'petugas@artdevata.sch.id',
                'password' => Hash::make('password123'),
                'role' => 'petugas_absensi',
                'phone' => '081234567892',
                'is_active' => true,
            ],
            [
                'name' => 'I Made Wirata, S.Pd. (Wali Kelas X MIPA 1)',
                'email' => 'guru@artdevata.sch.id',
                'password' => Hash::make('password123'),
                'role' => 'guru_wali',
                'phone' => '081234567893',
                'is_active' => true,
            ],
            [
                'name' => 'Dr. Ni Ketut Suryani, M.Pd. (Kepala Sekolah)',
                'email' => 'kepsek@artdevata.sch.id',
                'password' => Hash::make('password123'),
                'role' => 'kepala_sekolah',
                'phone' => '081234567894',
                'is_active' => true,
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }
    }
}
