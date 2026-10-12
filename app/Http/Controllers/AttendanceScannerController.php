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
        $today = now()->format('Y-m-d');
        $session = $this->attendanceService->getTodayActiveSession();

        $devices = ScannerDevice::where('is_active', true)->get();
        $defaultDeviceId = $devices->first()?->id;

        // Ambil pemindaian hari ini pada perangkat
        $recentScans = $session
            ? Attendance::with(['student.schoolClass', 'verifiedByUser'])
                ->where('session_id', $session->id)
                ->latest('scanned_at')
                ->take(15)
                ->get()
                ->map(function ($att) {
                    return [
                        'id' => $att->id,
                        'student_id' => $att->student_id,
                        'name' => $att->student?->name ?? 'Siswa',
                        'nis' => $att->student?->nis ?? '-',
                        'class_name' => $att->schoolClass?->name ?? '-',
                        'status' => $att->status,
                        'time' => Carbon::parse($att->scanned_at)->format('H:i:s'),
                        'officer_name' => $att->verifiedByUser?->name ?? 'Petugas',
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
            'attendance_settings' => \App\Models\AttendanceSetting::getSettings()->load('activeCamera'),
            'server_clock' => now()->format('H:i:s'),
            'server_date' => now()->translatedFormat('l, d F Y'),
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
        ]);

        $rawToken = $request->input('qr_token');
        $deviceId = (int) $request->input('device_id');
        $sessionId = $request->input('session_id') ? (int) $request->input('session_id') : null;

        $result = $this->attendanceService->preScanVerify($rawToken, $deviceId, $sessionId);

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
        ]);

        try {
            $result = $this->attendanceService->confirmAttendance(
                studentId: (int) $request->input('student_id'),
                sessionId: (int) $request->input('session_id'),
                deviceId: (int) $request->input('device_id'),
                officerUserId: auth()->id(),
                qrCodeId: $request->input('qr_code_id'),
                customStatus: $request->input('status'),
                notes: $request->input('notes')
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
}
