<?php

namespace App\Http\Controllers;

use App\Models\AttendanceException;
use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class AttendanceExceptionController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $category = $request->query('category');
        $perPage = min((int) $request->query('per_page', 15), 100);

        $query = AttendanceException::with(['student.schoolClass', 'approvedByUser'])->latest();

        if ($search) {
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('nis', 'like', "%{$search}%");
            });
        }

        if ($category && $category !== 'all') {
            $query->where('category', $category);
        }

        $exceptions = $query->paginate($perPage)->withQueryString();
        $classes = SchoolClass::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Exceptions/Index', [
            'exceptions' => $exceptions,
            'classes' => $classes,
            'filters' => [
                'search' => $search,
                'category' => $category,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function searchStudents(Request $request)
    {
        $search = $request->query('q');
        $classId = $request->query('class_id');

        $query = Student::where('is_active', true)->with('schoolClass:id,name');

        if ($classId) {
            $query->where('class_id', $classId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('nis', 'like', "%{$search}%");
            });
        }

        $students = $query->orderBy('name')->take(30)->get(['id', 'name', 'nis', 'class_id']);

        return response()->json($students);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'category' => 'required|in:izin,sakit,dispensasi',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|max:500',
        ], [
            'student_id.required' => 'Pilih siswa yang mengajukan izin/sakit.',
            'category.required' => 'Pilih kategori izin/sakit.',
            'reason.required' => 'Alasan wajib diisi.',
        ]);

        $exception = AttendanceException::create([
            ...$validated,
            'approved_by_user_id' => auth()->id(),
        ]);

        AuditLog::log(
            action: 'attendance_exception.created',
            entityType: 'AttendanceException',
            entityId: $exception->id,
            payloadBefore: null,
            payloadAfter: $exception->toArray()
        );

        return redirect()->back()->with('success', 'Surat izin/sakit berhasil dicatat.');
    }

    public function destroy(AttendanceException $exception): RedirectResponse
    {
        $old = $exception->toArray();
        $exception->delete();

        AuditLog::log(
            action: 'attendance_exception.deleted',
            entityType: 'AttendanceException',
            entityId: $exception->id,
            payloadBefore: $old,
            payloadAfter: null
        );

        return redirect()->back()->with('success', 'Data izin/sakit berhasil dihapus.');
    }
}
