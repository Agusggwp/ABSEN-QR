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
    public function preScanVerify(string $rawToken, int $deviceId, ?int $sessionId = null, bool $isDevMode = false): array
    {
        // 1. Validasi Perangkat Scanner
        $device = ScannerDevice::find($deviceId);
        if (!$device || !$device->is_active) {
            if ($isDevMode) {
                $device = ScannerDevice::first() ?? ScannerDevice::create([
                    'device_identifier' => 'DEV-TERMINAL',
                    'device_name' => 'Scanner Dev Terminal',
                    'location_description' => 'Pos Pengembang',
                    'is_active' => true,
                ]);
            } else {
                return [
                    'status' => 'rejected',
                    'code' => 'DEVICE_INVALID',
                    'message' => 'Perangkat scanner tidak terdaftar atau telah dinonaktifkan.',
                ];
            }
        }

        // 2. Validasi Sesi Absensi
        $session = $sessionId ? AttendanceSession::find($sessionId) : $this->getTodayActiveSession();
        if (!$session || $session->status !== 'open') {
            if ($isDevMode) {
                // Di Dev Mode: Sesi otomatis dibuka agar pengembang bisa tes 24 jam
                if ($session) {
                    $session->update(['status' => 'open']);
                } else {
                    $session = $this->getTodayActiveSession();
                }
            } else {
                return [
                    'status' => 'rejected',
                    'code' => 'SESSION_CLOSED',
                    'message' => 'Tidak ada sesi absensi yang sedang dibuka untuk pemindaian saat ini.',
                ];
            }
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

        if ($existingAttendance && !$isDevMode) {
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
            'message' => $existingAttendance
                ? '[MODE DEV] Siswa ini sudah pernah absen (' . Carbon::parse($existingAttendance->scanned_at)->format('H:i:s') . '). Mode Dev mengizinkan Anda untuk terus melakukan scan ulang!'
                : 'Token valid. Mohon petugas mencocokkan wajah siswa fisik dengan foto resmi di bawah.',
            'is_dev_re_scan' => (bool) $existingAttendance,
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
        ?string $notes = null,
        bool $isDevMode = false
    ): array {
        return DB::transaction(function () use ($studentId, $sessionId, $deviceId, $officerUserId, $qrCodeId, $customStatus, $notes, $isDevMode) {
            // Lock session
            $session = AttendanceSession::where('id', $sessionId)->lockForUpdate()->first();
            if (!$session || $session->status !== 'open') {
                if ($isDevMode && $session) {
                    $session->update(['status' => 'open']);
                } else {
                    throw new Exception('Sesi absensi telah ditutup atau tidak valid.');
                }
            }

            // Kunci dan cek apakah rekod absensi sudah ada (Race Condition Protection)
            $existing = Attendance::where('session_id', $sessionId)
                ->where('student_id', $studentId)
                ->lockForUpdate()
                ->first();

            if ($existing && !$isDevMode) {
                return [
                    'success' => false,
                    'code' => 'DUPLICATE_ENTRY',
                    'message' => 'Siswa sudah tercatat absen sebelumnya pada sesi ini.',
                    'attendance' => $existing,
                ];
            }

            $student = Student::with('schoolClass')->findOrFail($studentId);

            // Waktu server resmi sesuai zona waktu sekolah
            $timezone = \App\Models\SchoolSetting::get('timezone', config('app.timezone', 'Asia/Makassar'));
            $serverTimestamp = now()->timezone($timezone);
            $serverTime = $serverTimestamp->format('H:i:s');

            $status = $customStatus ?? (($serverTime > $session->late_time) ? 'terlambat' : 'hadir');

            if ($existing && $isDevMode) {
                // Di mode dev: Perbarui rekod lama agar bisa scan berkali-kali tanpa terhalang duplikasi
                $existing->update([
                    'status' => $status,
                    'scanned_at' => $serverTimestamp,
                    'verified_by_user_id' => $officerUserId,
                    'scanner_device_id' => $deviceId,
                    'notes' => trim(($notes ?? '') . ' [DEV RE-SCAN ' . $serverTimestamp->format('H:i:s') . ']'),
                ]);
                $attendance = $existing->fresh(['student.schoolClass', 'verifiedByUser']);
            } else {
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
                    'notes' => $isDevMode ? trim(($notes ?? '') . ' [DEV MODE]') : $notes,
                    'is_corrected' => false,
                ]);
            }

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
                'is_dev_re_scan' => (bool) ($existing && $isDevMode),
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
        // Prioritaskan sesi yang masih 'open' hari ini
        $session = AttendanceSession::whereDate('date', $today)
            ->where('status', 'open')
            ->first();

        if ($session) {
            return $session;
        }

        // Jika tidak ada yang open, periksa apakah ada sesi apapun hari ini
        $todaySession = AttendanceSession::whereDate('date', $today)->latest('id')->first();
        if ($todaySession) {
            return $todaySession;
        }

        // Jika belum ada sesi sama sekali hari ini, buat sesi masuk standar
        return AttendanceSession::create([
            'date' => $today,
            'type' => 'masuk',
            'school_year_id' => \App\Models\SchoolYear::getActive()?->id ?? \App\Models\SchoolYear::first()?->id,
            'start_time' => '06:00:00',
            'end_time' => '07:30:00',
            'late_time' => '07:00:00',
            'status' => 'open',
        ]);
    }

    /**
     * Mode Dev: Reset/bersihkan semua absensi pada sesi hari ini untuk pengujian ulang dari awal.
     */
    public function devResetTodayAttendance(int $sessionId): int
    {
        $session = AttendanceSession::findOrFail($sessionId);
        $attendanceIds = Attendance::where('session_id', $session->id)->pluck('id');
        AttendanceVerification::whereIn('attendance_id', $attendanceIds)->delete();
        $count = Attendance::where('session_id', $session->id)->delete();

        AuditLog::log(
            action: 'attendance.dev_reset',
            entityType: 'AttendanceSession',
            entityId: $session->id,
            payloadBefore: ['deleted_rows' => $count],
            payloadAfter: null,
            userId: auth()->id()
        );

        return $count;
    }

    /**
     * Mode Dev: Simulasi scan massal secara acak (burst scan).
     */
    public function devBurstScan(int $sessionId, int $deviceId, int $userId, int $count = 5): array
    {
        $session = AttendanceSession::findOrFail($sessionId);
        if ($session->status !== 'open') {
            $session->update(['status' => 'open']);
        }

        $students = Student::with(['schoolClass', 'activeQrCode'])
            ->where('is_active', true)
            ->inRandomOrder()
            ->take($count)
            ->get();

        $results = [];

        foreach ($students as $idx => $student) {
            $status = ($idx % 3 === 0) ? 'terlambat' : 'hadir';
            $res = $this->confirmAttendance(
                studentId: $student->id,
                sessionId: $session->id,
                deviceId: $deviceId,
                officerUserId: $userId,
                qrCodeId: $student->activeQrCode?->id,
                customStatus: $status,
                notes: 'Simulasi burst scan mode dev',
                isDevMode: true
            );
            if (isset($res['attendance'])) {
                $timezone = \App\Models\SchoolSetting::get('timezone', config('app.timezone', 'Asia/Makassar'));
                $results[] = [
                    'id' => $res['attendance']->id,
                    'name' => $student->name,
                    'nis' => $student->nis,
                    'class_name' => $student->schoolClass?->name ?? '-',
                    'status' => $res['attendance']->status,
                    'time' => Carbon::parse($res['attendance']->scanned_at)->timezone($timezone)->format('H:i:s'),
                ];
            }
        }

        return $results;
    }
}
