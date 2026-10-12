<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\AttendanceSession;
use App\Services\ClassroomConfirmationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class ClassroomConfirmationController extends Controller
{
    public function __construct(
        protected ClassroomConfirmationService $confirmationService
    ) {}

    public function index(Request $request): Response
    {
        $user = auth()->user();
        $classes = SchoolClass::orderBy('name')->get(['id', 'name', 'grade_level', 'homeroom_teacher_id']);

        if ($classes->isEmpty()) {
            return Inertia::render('Classroom/Index', [
                'classes' => [],
                'selected_class_id' => null,
                'selected_class' => null,
                'session' => null,
                'students' => [],
                'discrepancies_count' => 0,
            ]);
        }

        // Default selected class: either the homeroom class of the teacher or the first class
        $defaultClass = $classes->where('homeroom_teacher_id', $user->id)->first() ?? $classes->first();
        $classId = (int) $request->query('class_id', $defaultClass->id);

        $today = now()->format('Y-m-d');
        $session = AttendanceSession::where('date', $today)->where('status', 'open')->first();
        $sessionId = $session?->id;

        $comparisonData = $this->confirmationService->getClassroomAttendanceComparison($classId, $sessionId);

        return Inertia::render('Classroom/Index', [
            'classes' => $classes,
            'selected_class_id' => $classId,
            'selected_class' => $comparisonData['class'],
            'session' => $comparisonData['session'],
            'students' => $comparisonData['students_comparison'],
            'discrepancies_count' => $comparisonData['discrepancies_count'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'class_id' => 'required|exists:classes,id',
            'session_id' => 'required|exists:attendance_sessions,id',
            'confirmations' => 'required|array',
            'confirmations.*.student_id' => 'required|exists:students,id',
            'confirmations.*.class_status' => 'required|in:present_in_class,absent_in_class,with_excuse',
            'confirmations.*.notes' => 'nullable|string|max:255',
        ]);

        $result = $this->confirmationService->saveClassroomConfirmation(
            classId: (int) $request->input('class_id'),
            sessionId: (int) $request->input('session_id'),
            teacherUserId: auth()->id(),
            confirmationsData: $request->input('confirmations')
        );

        $warning = $result['anomalies_detected'] > 0
            ? " Perhatian: Ditemukan {$result['anomalies_detected']} anomali (siswa scan gerbang tapi tidak ada di kelas)."
            : "";

        return redirect()->back()->with('success', $result['message'] . $warning);
    }
}
