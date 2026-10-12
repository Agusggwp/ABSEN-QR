<?php

namespace Database\Seeders;

use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\ClassMembership;
use App\Models\StudentQrCode;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ScannerDevice;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class StudentAndQrSeeder extends Seeder
{
    public function run(): void
    {
        $schoolYear = SchoolYear::getActive();
        $classes = SchoolClass::all();

        if ($classes->isEmpty()) {
            return;
        }

        $firstNamesL = [
            'I Wayan', 'I Made', 'I Nyoman', 'I Ketut', 'I Putu', 'I Gede', 'I Kadek', 'I Komang',
            'Arya', 'Bagus', 'Dimas', 'Aditya', 'Rizky', 'Fajar', 'Bayu', 'Bima', 'Satria', 'Agus',
            'Pratama', 'Darma', 'Surya', 'Ananda', 'Krisna', 'Rama', 'Yudha', 'Rian', 'Fikri', 'Hendra'
        ];

        $firstNamesP = [
            'Ni Wayan', 'Ni Made', 'Ni Nyoman', 'Ni Ketut', 'Ni Putu', 'Ni Luh', 'Ni Kadek', 'Ni Komang',
            'Ayu', 'Dewi', 'Putri', 'Saraswati', 'Lestari', 'Anggraini', 'Citra', 'Nabila', 'Siti', 'Rina',
            'Indah', 'Permata', 'Wulandari', 'Maharani', 'Kirana', 'Sari', 'Triana', 'Kartika', 'Melati'
        ];

        $lastNames = [
            'Suardana', 'Widnyana', 'Pradnyana', 'Arimbawa', 'Sukadana', 'Sudarma', 'Wirawan', 'Santosa',
            'Kusuma', 'Mahendra', 'Suryawan', 'Adiputra', 'Gunawan', 'Hartawan', 'Saputra', 'Permadi',
            'Utama', 'Wibawa', 'Nugraha', 'Setiawan', 'Prabowo', 'Hidayat', 'Kurniawan', 'Ramadhan'
        ];

        $totalStudents = 1000;
        $classCount = $classes->count();
        $today = now()->format('Y-m-d');
        $session = AttendanceSession::where('date', $today)->where('type', 'masuk')->first();
        $device = ScannerDevice::first();
        $petugas = User::where('role', 'petugas_absensi')->first();

        $studentsData = [];
        $qrCodesData = [];
        $membershipsData = [];

        // Chunk insert in batches of 200 for fast seeding
        DB::disableQueryLog();

        $this->command->info("Menyiapkan data 1.000 siswa dan QR Code aman...");

        for ($i = 1; $i <= $totalStudents; $i++) {
            $isMale = ($i % 2 === 1);
            $gender = $isMale ? 'L' : 'P';
            $firstArr = $isMale ? $firstNamesL : $firstNamesP;
            $firstName = $firstArr[array_rand($firstArr)];
            $lastName = $lastNames[array_rand($lastNames)];
            $fullName = "{$firstName} {$lastName}";

            $nis = (string) (20261000 + $i); // 20261001 s/d 20262000
            $nisn = '00' . str_pad((string) (65432100 + $i), 8, '0', STR_PAD_LEFT);
            $assignedClass = $classes[($i - 1) % $classCount];

            $studentId = $i; // Will match auto-increment since table is clean
            $now = now();

            $studentsData[] = [
                'id' => $studentId,
                'nis' => $nis,
                'nisn' => $nisn,
                'name' => $fullName,
                'gender' => $gender,
                'photo_path' => null,
                'class_id' => $assignedClass->id,
                'is_active' => true,
                'notes' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            // Unguessable secret token: e.g. "SEC-ART-UUID-..."
            // Hashed using SHA-256 for secure lookup
            $rawToken = 'ART-' . Str::upper(Str::random(6)) . '-' . Str::uuid()->toString();
            $tokenHash = hash('sha256', $rawToken);
            $cardNumber = 'KARTU-' . str_pad((string) $i, 5, '0', STR_PAD_LEFT);
            $masked = substr($rawToken, 0, 8) . '****' . substr($rawToken, -4);

            $qrCodesData[] = [
                'student_id' => $studentId,
                'qr_token_hash' => $tokenHash,
                'qr_token_encrypted' => \Illuminate\Support\Facades\Crypt::encryptString($rawToken),
                'raw_token_masked' => $masked,
                'card_number' => $cardNumber,
                'status' => 'active',
                'issued_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $membershipsData[] = [
                'student_id' => $studentId,
                'class_id' => $assignedClass->id,
                'school_year_id' => $schoolYear?->id,
                'start_date' => '2026-07-15',
                'end_date' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($studentsData) >= 200) {
                Student::insert($studentsData);
                StudentQrCode::insert($qrCodesData);
                ClassMembership::insert($membershipsData);
                $studentsData = [];
                $qrCodesData = [];
                $membershipsData = [];
            }
        }

        if (!empty($studentsData)) {
            Student::insert($studentsData);
            StudentQrCode::insert($qrCodesData);
            ClassMembership::insert($membershipsData);
        }

        // Seed sample attendances for first 60 students today to display rich dashboard stats
        if ($session && $device && $petugas) {
            $attendances = [];
            for ($sId = 1; $sId <= 65; $sId++) {
                $student = Student::find($sId);
                if (!$student) continue;

                $qr = StudentQrCode::where('student_id', $sId)->first();
                $status = ($sId <= 45) ? 'hadir' : (($sId <= 55) ? 'terlambat' : (($sId <= 60) ? 'izin' : 'sakit'));
                $scanTime = now()->subMinutes(rand(10, 80));

                $attendances[] = [
                    'session_id' => $session->id,
                    'student_id' => $student->id,
                    'class_id' => $student->class_id,
                    'date' => $today,
                    'type' => 'masuk',
                    'status' => $status,
                    'verification_status' => 'verified_officer',
                    'scanned_at' => $scanTime,
                    'scanner_device_id' => $device->id,
                    'verified_by_user_id' => $petugas->id,
                    'qr_code_id' => $qr?->id,
                    'notes' => $status === 'terlambat' ? 'Terlambat 12 menit karena macet' : null,
                    'is_corrected' => false,
                    'created_at' => $scanTime,
                    'updated_at' => $scanTime,
                ];
            }
            Attendance::insert($attendances);
        }

        $this->command->info("Selesai: 1.000 Siswa, QR Code, dan Data Absensi Awal berhasil dibuat.");
    }
}
