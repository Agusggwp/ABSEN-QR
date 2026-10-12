<?php

namespace Database\Seeders;

use App\Models\SchoolYear;
use App\Models\SchoolClass;
use App\Models\SchoolSchedule;
use App\Models\ScannerDevice;
use App\Models\AttendanceSession;
use App\Models\User;
use Illuminate\Database\Seeder;

class AcademicAndClassSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Tahun Ajaran
        $schoolYear = SchoolYear::updateOrCreate(
            ['name' => '2026/2027', 'semester' => 'ganjil'],
            [
                'start_date' => '2026-07-15',
                'end_date' => '2026-12-23',
                'is_active' => true,
            ]
        );

        // 2. Guru / Wali Kelas
        $guruWali = User::where('role', 'guru_wali')->first();

        // 3. Kelas (15 Kelas untuk menampung 1.000 siswa)
        $classList = [
            ['name' => 'X MIPA 1', 'grade_level' => '10', 'teacher_id' => $guruWali?->id],
            ['name' => 'X MIPA 2', 'grade_level' => '10', 'teacher_id' => null],
            ['name' => 'X MIPA 3', 'grade_level' => '10', 'teacher_id' => null],
            ['name' => 'X IPS 1', 'grade_level' => '10', 'teacher_id' => null],
            ['name' => 'X IPS 2', 'grade_level' => '10', 'teacher_id' => null],
            ['name' => 'XI MIPA 1', 'grade_level' => '11', 'teacher_id' => null],
            ['name' => 'XI MIPA 2', 'grade_level' => '11', 'teacher_id' => null],
            ['name' => 'XI MIPA 3', 'grade_level' => '11', 'teacher_id' => null],
            ['name' => 'XI IPS 1', 'grade_level' => '11', 'teacher_id' => null],
            ['name' => 'XI IPS 2', 'grade_level' => '11', 'teacher_id' => null],
            ['name' => 'XII MIPA 1', 'grade_level' => '12', 'teacher_id' => null],
            ['name' => 'XII MIPA 2', 'grade_level' => '12', 'teacher_id' => null],
            ['name' => 'XII MIPA 3', 'grade_level' => '12', 'teacher_id' => null],
            ['name' => 'XII IPS 1', 'grade_level' => '12', 'teacher_id' => null],
            ['name' => 'XII IPS 2', 'grade_level' => '12', 'teacher_id' => null],
        ];

        foreach ($classList as $cls) {
            SchoolClass::updateOrCreate(
                ['school_year_id' => $schoolYear->id, 'name' => $cls['name']],
                [
                    'grade_level' => $cls['grade_level'],
                    'homeroom_teacher_id' => $cls['teacher_id'],
                ]
            );
        }

        // 4. Jadwal Sekolah (Senin - Jumat)
        for ($day = 1; $day <= 5; $day++) {
            SchoolSchedule::updateOrCreate(
                ['school_year_id' => $schoolYear->id, 'day_of_week' => $day],
                [
                    'check_in_start' => '06:00:00',
                    'check_in_end' => '07:30:00',
                    'late_tolerance_time' => '07:00:00',
                    'check_out_start' => ($day === 5 ? '11:45:00' : '13:45:00'),
                    'check_out_end' => '16:00:00',
                    'is_school_day' => true,
                ]
            );
        }
        // Sabtu & Minggu Libur
        foreach ([6, 7] as $day) {
            SchoolSchedule::updateOrCreate(
                ['school_year_id' => $schoolYear->id, 'day_of_week' => $day],
                [
                    'check_in_start' => '06:00:00',
                    'check_in_end' => '07:30:00',
                    'late_tolerance_time' => '07:00:00',
                    'check_out_start' => '13:30:00',
                    'check_out_end' => '16:00:00',
                    'is_school_day' => false,
                ]
            );
        }

        // 5. Perangkat Scanner
        $petugas = User::where('role', 'petugas_absensi')->first();
        $devices = [
            [
                'device_name' => 'Gerbang Utama Scanner Pos 1',
                'device_identifier' => 'DEV-GATE-01-POS1',
                'location_description' => 'Pos Penjagaan Gerbang Utama Timur',
                'assigned_user_id' => $petugas?->id,
                'ip_address' => '192.168.1.50',
                'is_active' => true,
            ],
            [
                'device_name' => 'Gerbang Utama Scanner Pos 2',
                'device_identifier' => 'DEV-GATE-02-POS2',
                'location_description' => 'Pos Penjagaan Gerbang Utama Barat',
                'assigned_user_id' => null,
                'ip_address' => '192.168.1.51',
                'is_active' => true,
            ],
            [
                'device_name' => 'Lobi Gedung Pusat',
                'device_identifier' => 'DEV-LOBBY-01',
                'location_description' => 'Lobi Utama Gedung Administrasi',
                'assigned_user_id' => null,
                'ip_address' => '192.168.1.60',
                'is_active' => true,
            ],
        ];

        foreach ($devices as $dev) {
            ScannerDevice::updateOrCreate(
                ['device_identifier' => $dev['device_identifier']],
                $dev
            );
        }

        // 6. Sesi Absensi Aktif Hari Ini
        $today = now()->format('Y-m-d');
        AttendanceSession::updateOrCreate(
            ['date' => $today, 'type' => 'masuk'],
            [
                'school_year_id' => $schoolYear->id,
                'start_time' => '06:00:00',
                'end_time' => '07:30:00',
                'late_time' => '07:00:00',
                'status' => 'open',
            ]
        );
    }
}
