<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\AttendanceVerification;
use App\Models\AuditLog;
use App\Models\ScannerDevice;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\StudentQrCode;
use App\Services\AttendanceService;
use App\Services\QrSecurityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DevModeController extends Controller
{
    public function __construct(
        protected AttendanceService $attendanceService,
        protected QrSecurityService $qrSecurityService
    ) {}

    /**
     * Tampilan Pusat Kontrol Developer (Khusus Super Admin)
     */
    public function index(Request $request): Response
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $today = now()->toDateString();
        $session = $this->attendanceService->getTodayActiveSession();

        $students = Student::with(['schoolClass', 'activeQrCode'])
            ->where('is_active', true)
            ->orderBy('name')
            ->take(200)
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'nis' => $s->nis,
                    'class_name' => $s->schoolClass?->name ?? 'Tanpa Kelas',
                    'card_number' => $s->activeQrCode?->card_number ?? 'Belum ada kartu',
                    'has_qr' => (bool) $s->activeQrCode,
                ];
            });

        $devices = ScannerDevice::where('is_active', true)->get(['id', 'device_name', 'device_identifier']);
        $defaultDevice = $devices->first();

        $todayAttendancesCount = $session ? Attendance::where('session_id', $session->id)->count() : 0;
        $totalDevScans = Attendance::where('notes', 'like', '%[DEV%')->orWhere('notes', 'like', '%[SIMULASI%')->count();

        $recentDevScans = Attendance::with(['student.schoolClass', 'scannerDevice'])
            ->where(function ($q) {
                $q->where('notes', 'like', '%[DEV%')
                  ->orWhere('notes', 'like', '%[SIMULASI%');
            })
            ->latest('id')
            ->take(15)
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'student_name' => $a->student?->name ?? 'Siswa',
                    'nis' => $a->student?->nis ?? '-',
                    'class_name' => $a->student?->schoolClass?->name ?? '-',
                    'status' => $a->status,
                    'date' => Carbon::parse($a->date)->format('d M Y'),
                    'time' => Carbon::parse($a->scanned_at)->format('H:i:s'),
                    'notes' => $a->notes,
                ];
            });

        return Inertia::render('DevMode/Index', [
            'session' => $session ? [
                'id' => $session->id,
                'date' => Carbon::parse($session->date)->format('Y-m-d'),
                'type' => $session->type,
                'status' => $session->status,
                'start_time' => $session->start_time,
                'end_time' => $session->end_time,
                'late_time' => $session->late_time,
            ] : null,
            'students' => $students,
            'devices' => $devices,
            'stats' => [
                'total_students' => Student::where('is_active', true)->count(),
                'total_classes' => SchoolClass::count(),
                'today_attendances' => $todayAttendancesCount,
                'total_dev_scans' => $totalDevScans,
                'total_audit_logs' => AuditLog::count(),
            ],
            'recent_dev_scans' => $recentDevScans,
        ]);
    }

    /**
     * Buka / Tutup Sesi Absensi hari ini
     */
    public function toggleSession(): JsonResponse
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $session = $this->attendanceService->getTodayActiveSession();
        if (!$session) {
            return response()->json(['success' => false, 'message' => 'Gagal memuat sesi.'], 400);
        }

        $newStatus = ($session->status === 'open') ? 'closed' : 'open';
        $session->update(['status' => $newStatus]);

        AuditLog::log(
            action: 'dev_mode.toggle_session',
            entityType: 'AttendanceSession',
            entityId: $session->id,
            payloadBefore: ['status' => $session->getOriginal('status')],
            payloadAfter: ['status' => $newStatus],
            userId: auth()->id()
        );

        return response()->json([
            'success' => true,
            'status' => $newStatus,
            'message' => "Sesi absensi berhasil diubah menjadi: {$newStatus}",
            'session' => $session->fresh(),
        ]);
    }

    /**
     * Simulasi Scan Absensi 1 Siswa dengan status pilihan
     */
    public function simulateScan(Request $request): JsonResponse
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $request->validate([
            'student_id' => 'required|exists:students,id',
            'status' => 'required|in:hadir,terlambat,izin,sakit,alpa',
            'custom_note' => 'nullable|string|max:255',
        ]);

        $session = $this->attendanceService->getTodayActiveSession();
        if ($session->status !== 'open') {
            $session->update(['status' => 'open']);
        }

        $device = ScannerDevice::where('is_active', true)->first() ?? ScannerDevice::create([
            'device_identifier' => 'DEV-CONSOLE',
            'device_name' => 'Konsol Developer',
            'location_description' => 'Pusat Dev Super Admin',
            'is_active' => true,
        ]);

        $student = Student::with('schoolClass')->findOrFail($request->input('student_id'));
        $status = $request->input('status');
        $customNote = $request->input('custom_note');
        $note = trim(($customNote ? "{$customNote} " : '') . '[DEV MODE SIMULASI ' . now()->format('H:i:s') . ']');

        // Update existing jika sudah ada atau buat baru
        $existing = Attendance::where('session_id', $session->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existing) {
            $existing->update([
                'status' => $status,
                'scanned_at' => now(),
                'scanner_device_id' => $device->id,
                'verified_by_user_id' => auth()->id(),
                'notes' => $note,
            ]);
            $attendance = $existing->fresh();
        } else {
            $attendance = Attendance::create([
                'session_id' => $session->id,
                'student_id' => $student->id,
                'class_id' => $student->class_id,
                'date' => $session->date,
                'type' => $session->type,
                'status' => $status,
                'verification_status' => 'verified_officer',
                'scanned_at' => now(),
                'scanner_device_id' => $device->id,
                'verified_by_user_id' => auth()->id(),
                'notes' => $note,
                'is_corrected' => false,
            ]);

            AttendanceVerification::create([
                'attendance_id' => $attendance->id,
                'verification_method' => 'officer_visual',
                'officer_user_id' => auth()->id(),
                'verification_result' => 'valid_match',
                'notes' => 'Simulasi Dev Super Admin',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => "Simulasi absensi untuk {$student->name} berhasil dicatat sebagai {$status}.",
            'attendance' => $attendance,
        ]);
    }

    /**
     * Simulasi Burst Scan Massal (5, 10, 20, 50 Siswa)
     */
    public function burstScan(Request $request): JsonResponse
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $request->validate([
            'count' => 'required|integer|min:1|max:100',
        ]);

        $count = (int) $request->input('count');
        $session = $this->attendanceService->getTodayActiveSession();
        if ($session->status !== 'open') {
            $session->update(['status' => 'open']);
        }

        $device = ScannerDevice::where('is_active', true)->first();
        $deviceId = $device ? $device->id : 1;

        $results = $this->attendanceService->devBurstScan($session->id, $deviceId, auth()->id(), $count);

        return response()->json([
            'success' => true,
            'count' => count($results),
            'scans' => $results,
            'message' => "Berhasil mensimulasikan " . count($results) . " absensi siswa sekaligus.",
        ]);
    }

    /**
     * Generate Data Riwayat Absensi Historis (7 hari atau 30 hari) untuk menguji grafik & laporan
     */
    public function generateHistory(Request $request): JsonResponse
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $request->validate([
            'days' => 'required|integer|in:7,14,30',
        ]);

        $days = (int) $request->input('days');
        $students = Student::where('is_active', true)->take(50)->get();

        if ($students->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Tidak ada siswa aktif ditemukan.'], 400);
        }

        $schoolYearId = SchoolYear::getActive()?->id ?? SchoolYear::first()?->id;
        $device = ScannerDevice::where('is_active', true)->first();
        $deviceId = $device ? $device->id : 1;

        $totalInserted = 0;
        $statuses = ['hadir', 'hadir', 'hadir', 'hadir', 'terlambat', 'izin', 'sakit'];

        for ($i = $days; $i >= 1; $i--) {
            $targetDate = now()->subDays($i);

            // Lewati hari Minggu
            if ($targetDate->isSunday()) {
                continue;
            }

            $dateString = $targetDate->toDateString();

            // Sesi masuk untuk tanggal tersebut
            $session = AttendanceSession::firstOrCreate(
                ['date' => $dateString, 'type' => 'masuk'],
                [
                    'school_year_id' => $schoolYearId,
                    'start_time' => '06:00:00',
                    'end_time' => '07:30:00',
                    'late_time' => '07:00:00',
                    'status' => 'closed',
                ]
            );

            // Insert 15 - 30 siswa untuk hari tersebut jika belum ada
            $sampleStudents = $students->random(min(count($students), rand(15, 30)));
            foreach ($sampleStudents as $student) {
                $alreadyExists = Attendance::where('session_id', $session->id)
                    ->where('student_id', $student->id)
                    ->exists();

                if (!$alreadyExists) {
                    $st = $statuses[array_rand($statuses)];
                    $scannedHour = ($st === 'terlambat') ? rand(7, 7) : 6;
                    $scannedMin = rand(10, 50);
                    $scanTime = $targetDate->copy()->setTime($scannedHour, $scannedMin, rand(10, 50));

                    Attendance::create([
                        'session_id' => $session->id,
                        'student_id' => $student->id,
                        'class_id' => $student->class_id,
                        'date' => $dateString,
                        'type' => 'masuk',
                        'status' => $st,
                        'verification_status' => 'verified_officer',
                        'scanned_at' => $scanTime,
                        'scanner_device_id' => $deviceId,
                        'verified_by_user_id' => auth()->id(),
                        'notes' => '[SIMULASI HISTORIS]',
                        'is_corrected' => false,
                    ]);
                    $totalInserted++;
                }
            }
        }

        return response()->json([
            'success' => true,
            'inserted_count' => $totalInserted,
            'message' => "Berhasil mengenerate {$totalInserted} rekod absensi historis selama {$days} hari ke belakang.",
        ]);
    }

    /**
     * Hapus semua absensi berlabel simulasi/dev mode
     */
    public function resetDevData(): JsonResponse
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $attendanceIds = Attendance::where('notes', 'like', '%[DEV%')
            ->orWhere('notes', 'like', '%[SIMULASI%')
            ->pluck('id');

        AttendanceVerification::whereIn('attendance_id', $attendanceIds)->delete();
        $count = Attendance::whereIn('id', $attendanceIds)->delete();

        AuditLog::log(
            action: 'dev_mode.reset_dev_data',
            entityType: 'Attendance',
            entityId: 0,
            payloadBefore: ['deleted_count' => $count],
            payloadAfter: null,
            userId: auth()->id()
        );

        return response()->json([
            'success' => true,
            'deleted_count' => $count,
            'message' => "Berhasil membersihkan {$count} rekod absensi yang bertanda [DEV MODE] / [SIMULASI].",
        ]);
    }

    /**
     * Hapus semua absensi sesi hari ini
     */
    public function resetToday(): JsonResponse
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $session = $this->attendanceService->getTodayActiveSession();
        if (!$session) {
            return response()->json(['success' => false, 'message' => 'Tidak ada sesi aktif hari ini.'], 400);
        }

        $count = $this->attendanceService->devResetTodayAttendance($session->id);

        return response()->json([
            'success' => true,
            'deleted_count' => $count,
            'message' => "Berhasil mereset {$count} data absensi pada sesi hari ini.",
        ]);
    }

    /**
     * Sandbox Cryptography: Inspeksi token QR siswa secara mendalam
     */
    public function inspectToken(Request $request): JsonResponse
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $request->validate([
            'query' => 'required|string',
        ]);

        $query = trim($request->input('query'));

        // Bisa cari berdasarkan NIS, Card Number, atau Raw Token
        $qrRecord = null;
        $student = Student::with(['schoolClass', 'activeQrCode'])
            ->where('nis', $query)
            ->orWhere('name', 'like', "%{$query}%")
            ->first();

        if ($student && $student->activeQrCode) {
            $qrRecord = $student->activeQrCode;
        } else {
            // Coba cari dari card_number atau token hash
            $tokenHash = hash('sha256', $query);
            $qrRecord = StudentQrCode::with('student.schoolClass')
                ->where('card_number', $query)
                ->orWhere('qr_token_hash', $tokenHash)
                ->first();
        }

        if (!$qrRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ditemukan data token QR atau siswa untuk input tersebut.',
            ], 404);
        }

        $decryptedToken = null;
        try {
            if ($qrRecord->qr_token_encrypted) {
                $decryptedToken = \Illuminate\Support\Facades\Crypt::decryptString($qrRecord->qr_token_encrypted);
            }
        } catch (\Exception $e) {
            $decryptedToken = '[Gagal didekripsi: enkripsi korup atau kunci berbeda]';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'card_id' => $qrRecord->id,
                'card_number' => $qrRecord->card_number,
                'status' => $qrRecord->status,
                'issued_at' => $qrRecord->issued_at,
                'qr_token_hash' => $qrRecord->qr_token_hash,
                'raw_token_masked' => $qrRecord->raw_token_masked,
                'decrypted_token' => $decryptedToken,
                'student' => [
                    'id' => $qrRecord->student?->id,
                    'name' => $qrRecord->student?->name,
                    'nis' => $qrRecord->student?->nis,
                    'class_name' => $qrRecord->student?->schoolClass?->name ?? '-',
                ],
            ],
        ]);
    }
}
