<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\AttendanceVerification;
use App\Models\AttendanceCorrection;
use App\Models\ScannerDevice;
use App\Models\Student;
use App\Models\StudentQrCode;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Exception;

class AttendanceService
{
    public function __construct(
        protected QrSecurityService $qrSecurityService
    ) {}

    /**
     * Tahap 1: Validasi awal token dan ambil data siswa untuk verifikasi visual petugas.
     * Mengembalikan data siswa (foto, NIS, nama, kelas) jika lolos validasi teknis.
     */
    public function preScanVerify(string $rawToken, int $deviceId, ?int $sessionId = null): array
    {
        // 1. Validasi Perangkat Scanner
        $device = ScannerDevice::find($deviceId);
        if (!$device || !$device->is_active) {
            return [
                'status' => 'rejected',
                'code' => 'DEVICE_INVALID',
                'message' => 'Perangkat scanner tidak terdaftar atau telah dinonaktifkan.',
            ];
        }

        // 2. Validasi Sesi Absensi
        $session = $sessionId ? AttendanceSession::find($sessionId) : $this->getTodayActiveSession();
        if (!$session || $session->status !== 'open') {
            return [
                'status' => 'rejected',
                'code' => 'SESSION_CLOSED',
                'message' => 'Tidak ada sesi absensi yang sedang dibuka untuk pemindaian saat ini.',
            ];
        }

        // 3. Validasi Kriptografis Token QR
        $qrCode = $this->qrSecurityService->findByRawToken($rawToken);
        if (!$qrCode) {
            return [
                'status' => 'rejected',
                'code' => 'QR_NOT_FOUND',
                'message' => 'Kode QR tidak dikenali dalam sistem.',
            ];
        }

        if ($qrCode->status !== 'active') {
            return [
                'status' => 'rejected',
                'code' => 'QR_REVOKED',
                'message' => 'Kartu QR ini telah ' . ($qrCode->status === 'revoked' ? 'dicabut' : 'diganti kartu baru') . ' dan tidak berlaku.',
            ];
        }

        // 4. Validasi Siswa
        $student = $qrCode->student;
        if (!$student) {
            return [
                'status' => 'rejected',
                'code' => 'STUDENT_NOT_FOUND',
                'message' => 'Data pemilik kartu tidak ditemukan.',
            ];
        }

        if (!$student->is_active) {
            return [
                'status' => 'rejected',
                'code' => 'STUDENT_INACTIVE',
                'message' => 'Siswa berstatus nonaktif/alumni/keluar.',
            ];
        }

        // 5. Cek Apakah Siswa Sudah Absen pada Sesi Ini (Pencegahan Scan Ganda)
        $existingAttendance = Attendance::where('session_id', $session->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existingAttendance) {
            return [
                'status' => 'duplicate',
                'code' => 'ALREADY_SCANNED',
                'message' => 'Siswa sudah melakukan absensi pada sesi ini (' . Carbon::parse($existingAttendance->scanned_at)->format('H:i:s') . ' WITA).',
                'attendance' => $existingAttendance,
                'student' => [
                    'id' => $student->id,
                    'nis' => $student->nis,
                    'name' => $student->name,
                    'gender' => $student->gender,
                    'class_name' => $student->schoolClass?->name ?? 'Belum ada kelas',
                    'photo_path' => $student->photo_path,
                ],
            ];
        }

        // 6. Hitung Status Kedatangan (Hadir atau Terlambat berdasarkan Server Clock)
        $serverTime = now()->format('H:i:s');
        $isLate = ($serverTime > $session->late_time);
        $suggestedStatus = $isLate ? 'terlambat' : 'hadir';

        return [
            'status' => 'ready_for_verification',
            'code' => 'VERIFY_IDENTITY',
            'message' => 'Token valid. Mohon petugas mencocokkan wajah siswa fisik dengan foto resmi di bawah.',
            'session' => [
                'id' => $session->id,
                'type' => $session->type,
                'late_time' => $session->late_time,
            ],
            'device' => [
                'id' => $device->id,
                'device_name' => $device->device_name,
            ],
            'qr_code_id' => $qrCode->id,
            'suggested_status' => $suggestedStatus,
            'is_late' => $isLate,
            'server_time' => now()->format('H:i:s'),
            'student' => [
                'id' => $student->id,
                'nis' => $student->nis,
                'name' => $student->name,
                'gender' => $student->gender,
                'class_name' => $student->schoolClass?->name ?? 'Belum ada kelas',
                'photo_path' => $student->photo_path,
            ],
        ];
    }

    /**
     * Tahap 2: Konfirmasi kehadiran oleh petugas setelah memverifikasi identitas fisik siswa.
     * Menggunakan transaksi database dengan SELECT ... FOR UPDATE untuk mengunci rekod dari konkurensi scan simultan.
     */
    public function confirmAttendance(
        int $studentId,
        int $sessionId,
        int $deviceId,
        int $officerUserId,
        ?int $qrCodeId = null,
        ?string $customStatus = null,
        ?string $notes = null
    ): array {
        return DB::transaction(function () use ($studentId, $sessionId, $deviceId, $officerUserId, $qrCodeId, $customStatus, $notes) {
            // Lock session
            $session = AttendanceSession::where('id', $sessionId)->lockForUpdate()->first();
            if (!$session || $session->status !== 'open') {
                throw new Exception('Sesi absensi telah ditutup atau tidak valid.');
            }

            // Kunci dan cek apakah rekod absensi sudah ada (Race Condition Protection)
            $existing = Attendance::where('session_id', $sessionId)
                ->where('student_id', $studentId)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return [
                    'success' => false,
                    'code' => 'DUPLICATE_ENTRY',
                    'message' => 'Siswa sudah tercatat absen sebelumnya pada sesi ini.',
                    'attendance' => $existing,
                ];
            }

            $student = Student::with('schoolClass')->findOrFail($studentId);

            // Waktu server resmi
            $serverTimestamp = now();
            $serverTime = $serverTimestamp->format('H:i:s');

            $status = $customStatus ?? (($serverTime > $session->late_time) ? 'terlambat' : 'hadir');

            $attendance = Attendance::create([
                'session_id' => $session->id,
                'student_id' => $student->id,
                'class_id' => $student->class_id,
                'date' => $session->date,
                'type' => $session->type,
                'status' => $status,
                'verification_status' => 'verified_officer',
                'scanned_at' => $serverTimestamp,
                'scanner_device_id' => $deviceId,
                'verified_by_user_id' => $officerUserId,
                'qr_code_id' => $qrCodeId,
                'notes' => $notes,
                'is_corrected' => false,
            ]);

            // Catat audit verifikasi
            AttendanceVerification::create([
                'attendance_id' => $attendance->id,
                'verification_method' => 'officer_visual',
                'officer_user_id' => $officerUserId,
                'verification_result' => 'valid_match',
                'notes' => $notes,
            ]);

            // Update heartbeat scanner device
            ScannerDevice::where('id', $deviceId)->update([
                'last_heartbeat' => now(),
            ]);

            // Audit log immutable
            AuditLog::log(
                action: 'attendance.scanned',
                entityType: 'Attendance',
                entityId: $attendance->id,
                payloadBefore: null,
                payloadAfter: [
                    'student_id' => $student->id,
                    'nis' => $student->nis,
                    'name' => $student->name,
                    'status' => $status,
                    'scanned_at' => $serverTimestamp->toDateTimeString(),
                    'officer_id' => $officerUserId,
                ],
                userId: $officerUserId
            );

            return [
                'success' => true,
                'message' => 'Absensi berhasil dikonfirmasi dan dicatat.',
                'attendance' => $attendance,
                'student' => $student,
            ];
        });
    }

    /**
     * Tahap 2 Alternatif: Penolakan oleh petugas jika dicurigai titip absen / identitas tidak cocok.
     */
    public function rejectAttendance(
        int $studentId,
        int $sessionId,
        int $deviceId,
        int $officerUserId,
        string $rejectionReason,
        ?string $notes = null
    ): array {
        $student = Student::findOrFail($studentId);

        AuditLog::log(
            action: 'attendance.rejected_by_officer',
            entityType: 'Student',
            entityId: $studentId,
            payloadBefore: null,
            payloadAfter: [
                'student_id' => $student->id,
                'nis' => $student->nis,
                'name' => $student->name,
                'session_id' => $sessionId,
                'device_id' => $deviceId,
                'reason' => $rejectionReason,
                'notes' => $notes,
            ],
            userId: $officerUserId
        );

        return [
            'success' => true,
            'message' => 'Insiden penolakan verifikasi berhasil dicatat dalam audit log sistem.',
            'reason' => $rejectionReason,
        ];
    }

    /**
     * Koreksi manual absensi (Hanya Administrator, alasan wajib dicatat).
     */
    public function correctAttendance(
        int $attendanceId,
        string $newStatus,
        string $reason,
        int $adminUserId
    ): Attendance {
        return DB::transaction(function () use ($attendanceId, $newStatus, $reason, $adminUserId) {
            $attendance = Attendance::findOrFail($attendanceId);
            $previousStatus = $attendance->status;

            if ($previousStatus === $newStatus) {
                return $attendance;
            }

            $attendance->update([
                'status' => $newStatus,
                'is_corrected' => true,
                'notes' => trim(($attendance->notes ? $attendance->notes . ' | ' : '') . "Koreksi: {$reason}"),
            ]);

            AttendanceCorrection::create([
                'attendance_id' => $attendance->id,
                'corrected_by_user_id' => $adminUserId,
                'previous_status' => $previousStatus,
                'new_status' => $newStatus,
                'reason' => $reason,
            ]);

            AuditLog::log(
                action: 'attendance.corrected',
                entityType: 'Attendance',
                entityId: $attendance->id,
                payloadBefore: ['status' => $previousStatus],
                payloadAfter: ['status' => $newStatus, 'reason' => $reason],
                userId: $adminUserId
            );

            return $attendance->fresh(['student', 'corrections.correctedByUser']);
        });
    }

    /**
     * Dapatkan sesi aktif hari ini atau buat otomatis jika belum ada berdasarkan jadwal sekolah.
     */
    public function getTodayActiveSession(): ?AttendanceSession
    {
        $today = now()->format('Y-m-d');
        $session = AttendanceSession::where('date', $today)
            ->where('status', 'open')
            ->first();

        if ($session) {
            return $session;
        }

        // Jika belum ada, buat sesi masuk standar hari ini
        return AttendanceSession::firstOrCreate(
            ['date' => $today, 'type' => 'masuk'],
            [
                'school_year_id' => \App\Models\SchoolYear::getActive()?->id,
                'start_time' => '06:00:00',
                'end_time' => '07:30:00',
                'late_time' => '07:00:00',
                'status' => 'open',
            ]
        );
    }
}
