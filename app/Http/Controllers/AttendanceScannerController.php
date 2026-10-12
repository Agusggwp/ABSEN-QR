<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ScannerDevice;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\JsonResponse;

class AttendanceScannerController extends Controller
{
    public function __construct(
        protected AttendanceService $attendanceService
    ) {}

    public function index(Request $request): Response
    {
        $timezone = \App\Models\SchoolSetting::get('timezone', config('app.timezone', 'Asia/Makassar'));
        $today = now()->timezone($timezone)->format('Y-m-d');
        $session = $this->attendanceService->getTodayActiveSession();

        $devices = ScannerDevice::where('is_active', true)->get();
        $defaultDeviceId = $devices->first()?->id;

        // Ambil pemindaian hari ini pada perangkat
        $recentScans = $session
            ? Attendance::with(['student.schoolClass', 'verifiedByUser'])
                ->where('session_id', $session->id)
                ->latest('scanned_at')
                ->take(20)
                ->get()
                ->map(function ($att) use ($timezone) {
                    return [
                        'id' => $att->id,
                        'student_id' => $att->student_id,
                        'name' => $att->student?->name ?? 'Siswa',
                        'nis' => $att->student?->nis ?? '-',
                        'class_name' => $att->schoolClass?->name ?? '-',
                        'status' => $att->status,
                        'time' => Carbon::parse($att->scanned_at)->timezone($timezone)->format('H:i:s'),
                        'officer_name' => $att->verifiedByUser?->name ?? 'Petugas',
                    ];
                })
            : [];

        // Data siswa aktif untuk quick simulator di Mode Dev (Khusus Super Admin)
        $isSuperAdmin = auth()->user()?->isSuperAdmin() ?? false;
        $devStudents = $isSuperAdmin
            ? \App\Models\Student::with(['schoolClass', 'activeQrCode'])
                ->where('is_active', true)
                ->take(150)
                ->get()
                ->map(function ($s) {
                    $token = $s->activeQrCode?->getDecryptedToken();
                    if (!$token) {
                        $tokenData = app(\App\Services\QrSecurityService::class)->getActiveTokenForStudent($s);
                        $token = $tokenData['raw_secret_token'];
                    }
                    return [
                        'id' => $s->id,
                        'name' => $s->name,
                        'nis' => $s->nis,
                        'class_name' => $s->schoolClass?->name ?? '-',
                        'photo_path' => $s->photo_path,
                        'token' => $token,
                    ];
                })
            : [];

        return Inertia::render('Scanner/Index', [
            'session' => $session ? [
                'id' => $session->id,
                'date' => $session->date,
                'type' => $session->type,
                'start_time' => $session->start_time,
                'end_time' => $session->end_time,
                'late_time' => $session->late_time,
                'status' => $session->status,
            ] : null,
            'devices' => $devices,
            'default_device_id' => $defaultDeviceId,
            'recent_scans' => $recentScans,
            'dev_students' => $devStudents,
            'is_super_admin' => $isSuperAdmin,
            'attendance_settings' => \App\Models\AttendanceSetting::getSettings()->load('activeCamera'),
            'server_clock' => now()->timezone($timezone)->format('H:i:s'),
            'server_date' => now()->timezone($timezone)->translatedFormat('l, d F Y'),
        ]);
    }

    /**
     * API: Pre-scan token QR siswa sebelum verifikasi petugas.
     */
    public function preScan(Request $request): JsonResponse
    {
        $request->validate([
            'qr_token' => 'required|string',
            'device_id' => 'required|exists:scanner_devices,id',
            'session_id' => 'nullable|exists:attendance_sessions,id',
            'dev_mode' => 'nullable|boolean',
        ]);

        $rawToken = $request->input('qr_token');
        $deviceId = (int) $request->input('device_id');
        $sessionId = $request->input('session_id') ? (int) $request->input('session_id') : null;
        $isDevMode = (bool) $request->input('dev_mode', false);

        $result = $this->attendanceService->preScanVerify($rawToken, $deviceId, $sessionId, $isDevMode);

        return response()->json($result);
    }

    /**
     * API: Petugas mengonfirmasi bahwa wajah siswa cocok dengan kartu.
     */
    public function confirm(Request $request): JsonResponse
    {
        $request->validate([
            'student_id' => 'required|exists:students,id',
            'session_id' => 'required|exists:attendance_sessions,id',
            'device_id' => 'required|exists:scanner_devices,id',
            'qr_code_id' => 'nullable|exists:student_qr_codes,id',
            'status' => 'nullable|in:hadir,terlambat,perlu_verifikasi',
            'notes' => 'nullable|string|max:255',
            'dev_mode' => 'nullable|boolean',
        ]);

        try {
            $isDevMode = (bool) $request->input('dev_mode', false);

            $result = $this->attendanceService->confirmAttendance(
                studentId: (int) $request->input('student_id'),
                sessionId: (int) $request->input('session_id'),
                deviceId: (int) $request->input('device_id'),
                officerUserId: auth()->id(),
                qrCodeId: $request->input('qr_code_id'),
                customStatus: $request->input('status'),
                notes: $request->input('notes'),
                isDevMode: $isDevMode
            );

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * API: Petugas menolak verifikasi (misal: titip absen / foto tidak cocok).
     */
    public function reject(Request $request): JsonResponse
    {
        $request->validate([
            'student_id' => 'required|exists:students,id',
            'session_id' => 'required|exists:attendance_sessions,id',
            'device_id' => 'required|exists:scanner_devices,id',
            'rejection_reason' => 'required|string|max:255',
            'notes' => 'nullable|string|max:255',
        ], [
            'rejection_reason.required' => 'Pilih atau tuliskan alasan penolakan verifikasi.',
        ]);

        $result = $this->attendanceService->rejectAttendance(
            studentId: (int) $request->input('student_id'),
            sessionId: (int) $request->input('session_id'),
            deviceId: (int) $request->input('device_id'),
            officerUserId: auth()->id(),
            rejectionReason: $request->input('rejection_reason'),
            notes: $request->input('notes')
        );

        return response()->json($result);
    }

    /**
     * Dev Mode API: Buka atau tutup sesi secara instan (Khusus Super Admin).
     */
    public function devToggleSession(Request $request): JsonResponse
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $session = $this->attendanceService->getTodayActiveSession();
        if (!$session) {
            return response()->json(['success' => false, 'message' => 'Gagal membuat sesi hari ini.'], 400);
        }

        $newStatus = ($session->status === 'open') ? 'closed' : 'open';
        $session->update(['status' => $newStatus]);

        return response()->json([
            'success' => true,
            'status' => $newStatus,
            'message' => "Sesi absensi sekarang: {$newStatus}",
            'session' => $session->fresh(),
        ]);
    }

    /**
     * Dev Mode API: Reset semua absensi hari ini agar bisa tes dari nol (Khusus Super Admin).
     */
    public function devResetToday(Request $request): JsonResponse
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $request->validate([
            'session_id' => 'required|exists:attendance_sessions,id',
        ]);

        $sessionId = (int) $request->input('session_id');
        $deletedCount = $this->attendanceService->devResetTodayAttendance($sessionId);

        return response()->json([
            'success' => true,
            'deleted_count' => $deletedCount,
            'message' => "Berhasil mereset {$deletedCount} data absensi hari ini.",
        ]);
    }

    /**
     * Dev Mode API: Simulasi burst scan acak (misal 5 siswa) (Khusus Super Admin).
     */
    public function devBurstScan(Request $request): JsonResponse
    {
        abort_unless(auth()->user()->isSuperAdmin(), 403, 'Akses terbatas untuk Super Admin.');

        $request->validate([
            'session_id' => 'required|exists:attendance_sessions,id',
            'device_id' => 'required|exists:scanner_devices,id',
            'count' => 'nullable|integer|min:1|max:20',
        ]);

        $sessionId = (int) $request->input('session_id');
        $deviceId = (int) $request->input('device_id');
        $count = (int) $request->input('count', 5);

        $results = $this->attendanceService->devBurstScan($sessionId, $deviceId, auth()->id(), $count);

        return response()->json([
            'success' => true,
            'count' => count($results),
            'scans' => $results,
            'message' => "Berhasil mensimulasikan " . count($results) . " absensi siswa.",
        ]);
    }
}
