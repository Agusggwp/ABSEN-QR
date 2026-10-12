<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\ClassMembership;
use App\Models\AuditLog;
use App\Services\QrSecurityService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class StudentController extends Controller
{
    public function __construct(
        protected QrSecurityService $qrSecurityService
    ) {}

    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $classId = $request->query('class_id');
        $status = $request->query('status', 'active'); // 'active', 'inactive', 'all'
        $perPage = min((int) $request->query('per_page', 15), 100);

        $query = Student::with(['schoolClass', 'activeQrCode'])->latest();

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
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $students = $query->paginate($perPage)->withQueryString();
        $classes = SchoolClass::orderBy('name')->get(['id', 'name', 'grade_level']);

        return Inertia::render('Students/Index', [
            'students' => $students,
            'classes' => $classes,
            'filters' => [
                'search' => $search,
                'class_id' => $classId,
                'status' => $status,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nis' => 'required|string|max:30|unique:students,nis',
            'nisn' => 'nullable|string|max:30|unique:students,nisn',
            'name' => 'required|string|max:150',
            'gender' => 'required|in:L,P',
            'class_id' => 'required|exists:classes,id',
            'notes' => 'nullable|string',
        ], [
            'nis.unique' => 'NIS sudah digunakan oleh siswa lain.',
            'nisn.unique' => 'NISN sudah digunakan oleh siswa lain.',
            'name.required' => 'Nama lengkap siswa wajib diisi.',
            'class_id.required' => 'Pilih kelas siswa.',
        ]);

        $student = Student::create([
            ...$validated,
            'is_active' => true,
        ]);

        // Buat kartu QR otomatis
        $this->qrSecurityService->generateTokenForStudent($student);

        // Catat keanggotaan kelas
        ClassMembership::create([
            'student_id' => $student->id,
            'class_id' => $student->class_id,
            'school_year_id' => SchoolYear::getActive()?->id,
            'start_date' => now()->format('Y-m-d'),
        ]);

        AuditLog::log(
            action: 'student.created',
            entityType: 'Student',
            entityId: $student->id,
            payloadBefore: null,
            payloadAfter: ['nis' => $student->nis, 'name' => $student->name, 'class_id' => $student->class_id]
        );

        return redirect()->route('students.index')->with('success', "Siswa {$student->name} berhasil ditambahkan dan kartu QR telah dibuat.");
    }

    public function update(Request $request, Student $student): RedirectResponse
    {
        $validated = $request->validate([
            'nis' => 'required|string|max:30|unique:students,nis,' . $student->id,
            'nisn' => 'nullable|string|max:30|unique:students,nisn,' . $student->id,
            'name' => 'required|string|max:150',
            'gender' => 'required|in:L,P',
            'class_id' => 'required|exists:classes,id',
            'is_active' => 'required|boolean',
            'notes' => 'nullable|string',
        ]);

        $oldData = $student->only(['nis', 'name', 'class_id', 'is_active']);
        $oldClassId = $student->class_id;

        $student->update($validated);

        // Jika pindah kelas, catat mutasi kelas tanpa merusak riwayat
        if ($oldClassId != $validated['class_id']) {
            ClassMembership::where('student_id', $student->id)
                ->where('class_id', $oldClassId)
                ->whereNull('end_date')
                ->update(['end_date' => now()->format('Y-m-d')]);

            ClassMembership::create([
                'student_id' => $student->id,
                'class_id' => $validated['class_id'],
                'school_year_id' => SchoolYear::getActive()?->id,
                'start_date' => now()->format('Y-m-d'),
            ]);
        }

        AuditLog::log(
            action: 'student.updated',
            entityType: 'Student',
            entityId: $student->id,
            payloadBefore: $oldData,
            payloadAfter: $student->only(['nis', 'name', 'class_id', 'is_active'])
        );

        return redirect()->route('students.index')->with('success', "Data siswa {$student->name} berhasil diperbarui.");
    }

    public function destroy(Student $student): RedirectResponse
    {
        $oldState = ['is_active' => $student->is_active];
        $student->update(['is_active' => false]);
        $student->delete(); // Soft delete

        AuditLog::log(
            action: 'student.archived',
            entityType: 'Student',
            entityId: $student->id,
            payloadBefore: $oldState,
            payloadAfter: ['is_active' => false, 'deleted' => true]
        );

        return redirect()->route('students.index')->with('success', "Siswa {$student->name} berhasil diarsipkan.");
    }
}
