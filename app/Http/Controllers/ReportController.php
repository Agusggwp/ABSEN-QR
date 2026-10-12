<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Services\ExcelImportExportService;
use App\Services\PdfReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ReportController extends Controller
{
    public function __construct(
        protected ExcelImportExportService $excelService,
        protected PdfReportService $pdfService
    ) {}

    public function index(Request $request): Response
    {
        $startDate = $request->query('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->query('end_date', now()->format('Y-m-d'));
        $classId = $request->query('class_id');
        $status = $request->query('status');
        $reportType = $request->query('type', 'daily'); // 'daily', 'monthly', 'late', 'excuse', 'class_summary'
        $perPage = min((int) $request->query('per_page', 20), 100);

        $query = Attendance::with(['student.schoolClass', 'verifiedByUser'])
            ->whereBetween('date', [$startDate, $endDate])
            ->latest('date');

        if ($classId) {
            $query->where('class_id', $classId);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($reportType === 'late') {
            $query->where('status', 'terlambat');
        } elseif ($reportType === 'excuse') {
            $query->whereIn('status', ['izin', 'sakit', 'dispensasi']);
        }

        $attendances = $query->paginate($perPage)->withQueryString();

        // Statistik agregat untuk periode ini
        $allPeriodRecords = Attendance::whereBetween('date', [$startDate, $endDate]);
        if ($classId) {
            $allPeriodRecords->where('class_id', $classId);
        }

        $stats = [
            'total' => (clone $allPeriodRecords)->count(),
            'hadir' => (clone $allPeriodRecords)->where('status', 'hadir')->count(),
            'terlambat' => (clone $allPeriodRecords)->where('status', 'terlambat')->count(),
            'izin' => (clone $allPeriodRecords)->where('status', 'izin')->count(),
            'sakit' => (clone $allPeriodRecords)->where('status', 'sakit')->count(),
            'dispensasi' => (clone $allPeriodRecords)->where('status', 'dispensasi')->count(),
            'alpa' => (clone $allPeriodRecords)->where('status', 'alpa')->count(),
        ];

        $classes = SchoolClass::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Reports/Index', [
            'attendances' => $attendances,
            'classes' => $classes,
            'stats' => $stats,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'class_id' => $classId,
                'status' => $status,
                'type' => $reportType,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function exportExcel(Request $request): SymfonyResponse
    {
        $startDate = $request->query('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->query('end_date', now()->format('Y-m-d'));
        $classId = $request->query('class_id');
        $status = $request->query('status');

        $query = Attendance::with(['student.schoolClass', 'verifiedByUser'])
            ->whereBetween('date', [$startDate, $endDate])
            ->latest('date');

        if ($classId) {
            $query->where('class_id', $classId);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $attendances = $query->take(2000)->get();
        $title = "Laporan Rekapitulasi Absensi Siswa ({$startDate} s/d {$endDate})";

        return $this->excelService->exportAttendanceExcel($attendances, $title);
    }

    public function exportPdf(Request $request): SymfonyResponse
    {
        $startDate = $request->query('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->query('end_date', now()->format('Y-m-d'));
        $classId = $request->query('class_id');
        $status = $request->query('status');

        $query = Attendance::with(['student.schoolClass', 'verifiedByUser'])
            ->whereBetween('date', [$startDate, $endDate])
            ->latest('date');

        if ($classId) {
            $query->where('class_id', $classId);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $attendances = $query->take(500)->get();

        $stats = [
            'total' => $attendances->count(),
            'hadir' => $attendances->where('status', 'hadir')->count(),
            'terlambat' => $attendances->where('status', 'terlambat')->count(),
            'izin' => $attendances->where('status', 'izin')->count(),
            'sakit' => $attendances->where('status', 'sakit')->count(),
            'alpa' => $attendances->where('status', 'alpa')->count(),
        ];

        $title = "Laporan Rekapitulasi Kehadiran Siswa";
        $periodInfo = Carbon::parse($startDate)->translatedFormat('d M Y') . " s/d " . Carbon::parse($endDate)->translatedFormat('d M Y');

        return $this->pdfService->generateAttendanceReportPdf($attendances, $title, $stats, $periodInfo);
    }
}
