<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\SchoolClass;
use App\Models\AttendanceSession;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceHistoryController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $classId = $request->query('class_id');
        $status = $request->query('status');
        $startDate = $request->query('start_date', now()->format('Y-m-d'));
        $endDate = $request->query('end_date', now()->format('Y-m-d'));
        $perPage = min((int) $request->query('per_page', 20), 100);

        $query = Attendance::with([
            'student.schoolClass',
            'schoolClass',
            'verifiedByUser',
            'scannerDevice',
            'corrections.correctedByUser'
        ])->latest('scanned_at');

        if ($startDate && $endDate) {
            $query->whereBetween('date', [$startDate, $endDate]);
        } elseif ($startDate) {
            $query->where('date', $startDate);
        }

        if ($search) {
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('nis', 'like', "%{$search}%");
            });
        }

        if ($classId) {
            $query->where('class_id', $classId);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $attendances = $query->paginate($perPage)->withQueryString();
        $classes = SchoolClass::orderBy('name')->get(['id', 'name']);

        // Summary stats for current filter
        $statQuery = clone $query;
        $totalFound = $statQuery->count();

        return Inertia::render('AttendanceHistory/Index', [
            'attendances' => $attendances,
            'classes' => $classes,
            'total_count' => $totalFound,
            'filters' => [
                'search' => $search,
                'class_id' => $classId,
                'status' => $status,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'per_page' => $perPage,
            ],
        ]);
    }
}
