<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\StudentAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentAccountController extends Controller
{
    public function __construct(
        protected StudentAccountService $accountService
    ) {}

    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $classId = $request->input('class_id');
        $status = $request->input('status'); // all, active, inactive, no_account
        $perPage = (int) $request->input('per_page', 15);

        $query = Student::with(['schoolClass', 'user']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('nis', 'like', "%{$search}%")
                  ->orWhere('nisn', 'like', "%{$search}%");
            });
        }

        if ($classId) {
            $query->where('class_id', $classId);
        }

        if ($status === 'active') {
            $query->whereHas('user', fn($q) => $q->where('is_active', true));
        } elseif ($status === 'inactive') {
            $query->whereHas('user', fn($q) => $q->where('is_active', false));
        } elseif ($status === 'no_account') {
            $query->whereNull('user_id');
        } elseif ($status === 'has_account') {
            $query->whereNotNull('user_id');
        }

        $students = $query->orderBy('name')->paginate($perPage)->withQueryString();

        // Stats summary
        $totalStudents = Student::count();
        $hasAccountCount = Student::whereNotNull('user_id')->count();
        $noAccountCount = max(0, $totalStudents - $hasAccountCount);
        $activeAccountCount = User::where('role', 'murid')->where('is_active', true)->count();
        $inactiveAccountCount = User::where('role', 'murid')->where('is_active', false)->count();

        $classes = SchoolClass::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Students/Accounts', [
            'students' => $students,
            'classes' => $classes,
            'filters' => [
                'search' => $search,
                'class_id' => $classId,
                'status' => $status,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total_students' => $totalStudents,
                'has_account' => $hasAccountCount,
                'no_account' => $noAccountCount,
                'active_accounts' => $activeAccountCount,
                'inactive_accounts' => $inactiveAccountCount,
            ],
        ]);
    }

    public function createSingle(Student $student): RedirectResponse
    {
        $user = $this->accountService->createAccountForStudent($student);
        $defaultPassword = 'Siswa@' . $student->nis;

        return redirect()->back()->with('success', "Akun untuk {$student->name} berhasil dibuat! Username: {$user->username}, Password Awal: {$defaultPassword}");
    }

    public function bulkCreate(Request $request): RedirectResponse
    {
        $studentIds = $request->input('student_ids', []);
        $result = $this->accountService->bulkCreateAccounts($studentIds);

        return redirect()->back()->with('success', "Pembuatan akun massal selesai: {$result['created']} akun dibuat, {$result['skipped']} sudah memiliki akun.");
    }

    public function resetPassword(Student $student): RedirectResponse
    {
        $newPassword = $this->accountService->resetStudentPassword($student);

        return redirect()->back()->with('success', "Kata sandi murid {$student->name} berhasil direset ke: {$newPassword}");
    }

    public function toggleStatus(Student $student): RedirectResponse
    {
        $newStatus = $this->accountService->toggleAccountStatus($student);
        $label = $newStatus ? 'diaktifkan' : 'dinonaktifkan';

        return redirect()->back()->with('success', "Akun murid {$student->name} berhasil {$label}.");
    }
}
