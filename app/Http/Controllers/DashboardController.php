<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ScannerDevice;
use App\Models\SchoolSetting;
use App\Services\EzvizCctvService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected EzvizCctvService $cctvService
    ) {}

    public function index(Request $request): Response
    {
        $today = now()->format('Y-m-d');
        $session = AttendanceSession::where('date', $today)->where('type', 'masuk')->first();

        // 1. Total Siswa Aktif
        $totalStudents = Student::where('is_active', true)->count();

        // 2. Kehadiran Hari Ini
        $todayAttendances = $session
            ? Attendance::with(['student.schoolClass', 'verifiedByUser'])
                ->where('session_id', $session->id)
                ->get()
            : collect();

        $hadirCount = $todayAttendances->where('status', 'hadir')->count();
        $terlambatCount = $todayAttendances->where('status', 'terlambat')->count();
        $izinCount = $todayAttendances->where('status', 'izin')->count();
        $sakitCount = $todayAttendances->where('status', 'sakit')->count();
        $dispensasiCount = $todayAttendances->where('status', 'dispensasi')->count();
        $alpaCount = $todayAttendances->where('status', 'alpa')->count();
        $perluVerifikasiCount = $todayAttendances->where('status', 'perlu_verifikasi')->count();

        $totalScannedToday = $todayAttendances->count();
        $belumAbsenCount = max(0, $totalStudents - $totalScannedToday);

        $presentPercentage = $totalStudents > 0
            ? round((($hadirCount + $terlambatCount) / $totalStudents) * 100, 1)
            : 0;

        // 3. Statistik per Kelas
        $classes = SchoolClass::withCount(['students as total_students' => function ($q) {
            $q->where('is_active', true);
        }])->get();

        $classStats = $classes->map(function ($cls) use ($todayAttendances) {
            $classScans = $todayAttendances->where('class_id', $cls->id);
            $present = $classScans->whereIn('status', ['hadir', 'terlambat'])->count();
            $rate = $cls->total_students > 0 ? round(($present / $cls->total_students) * 100, 1) : 0;

            return [
                'id' => $cls->id,
                'name' => $cls->name,
                'grade_level' => $cls->grade_level,
                'total_students' => $cls->total_students,
                'present' => $present,
                'late' => $classScans->where('status', 'terlambat')->count(),
                'attendance_rate' => $rate,
            ];
        });

        // 4. Grafik Tren Kehadiran 7 Hari Terakhir
        $chartDates = [];
        $weeklyTrend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $dayLabel = now()->subDays($i)->translatedFormat('D, d M');

            $dayScans = Attendance::where('date', $date)->where('type', 'masuk')->get();
            $weeklyTrend[] = [
                'date' => $dayLabel,
                'hadir' => $dayScans->where('status', 'hadir')->count(),
                'terlambat' => $dayScans->where('status', 'terlambat')->count(),
                'izin_sakit' => $dayScans->whereIn('status', ['izin', 'sakit'])->count(),
                'alpa' => $dayScans->where('status', 'alpa')->count(),
            ];
        }

        // 5. Aktivitas Pemindaian Terbaru (10 Terakhir)
        $recentScans = $todayAttendances
            ->sortByDesc('scanned_at')
            ->take(10)
            ->map(function ($att) {
                return [
                    'id' => $att->id,
                    'student_name' => $att->student?->name ?? 'Siswa',
                    'nis' => $att->student?->nis ?? '-',
                    'class_name' => $att->schoolClass?->name ?? '-',
                    'status' => $att->status,
                    'time' => $att->scanned_at ? Carbon::parse($att->scanned_at)->format('H:i:s') : '-',
                    'officer' => $att->verifiedByUser?->name ?? 'Petugas',
                ];
            })
            ->values();

        // 6. Status Perangkat Scanner
        $scannerDevices = ScannerDevice::all()->map(function ($dev) {
            $isHeartbeatRecent = $dev->last_heartbeat && $dev->last_heartbeat->diffInMinutes(now()) < 5;
            return [
                'id' => $dev->id,
                'device_name' => $dev->device_name,
                'location' => $dev->location_description,
                'is_active' => $dev->is_active,
                'is_online' => $isHeartbeatRecent,
                'last_heartbeat' => $dev->last_heartbeat ? $dev->last_heartbeat->diffForHumans() : 'Belum aktif',
            ];
        });

        // 7. Status Integrasi CCTV
        $cctvEnabled = SchoolSetting::get('cctv_enabled', '0') === '1';
        $cctvStatus = [
            'is_enabled' => $cctvEnabled,
            'model' => SchoolSetting::get('cctv_model', 'EZVIZ H8c'),
            'status_label' => SchoolSetting::get('cctv_status', 'Belum didukung (Fitur Opsional)'),
        ];

        return Inertia::render('Dashboard', [
            'metrics' => [
                'total_students' => $totalStudents,
                'hadir' => $hadirCount,
                'terlambat' => $terlambatCount,
                'izin' => $izinCount,
                'sakit' => $sakitCount,
                'dispensasi' => $dispensasiCount,
                'alpa' => $alpaCount,
                'perlu_verifikasi' => $perluVerifikasiCount,
                'belum_absen' => $belumAbsenCount,
                'attendance_percentage' => $presentPercentage,
            ],
            'session' => $session ? [
                'id' => $session->id,
                'date' => $session->date,
                'type' => $session->type,
                'start_time' => $session->start_time,
                'end_time' => $session->end_time,
                'late_time' => $session->late_time,
                'status' => $session->status,
            ] : null,
            'class_stats' => $classStats,
            'weekly_trend' => $weeklyTrend,
            'recent_scans' => $recentScans,
            'scanner_devices' => $scannerDevices,
            'cctv_status' => $cctvStatus,
            'current_time' => now()->format('H:i:s'),
            'current_date' => now()->translatedFormat('l, d F Y'),
        ]);
    }
}
