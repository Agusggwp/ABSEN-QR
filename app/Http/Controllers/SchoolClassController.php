<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class SchoolClassController extends Controller
{
    public function index(Request $request): Response
    {
        $classes = SchoolClass::with(['homeroomTeacher'])
            ->withCount(['students as total_students' => function ($q) {
                $q->where('is_active', true);
            }])
            ->orderBy('name')
            ->get();

        $teachers = User::where('role', 'guru_wali')->where('is_active', true)->get(['id', 'name']);
        $schoolYears = SchoolYear::orderByDesc('name')->get();

        return Inertia::render('Classes/Index', [
            'classes' => $classes,
            'teachers' => $teachers,
            'school_years' => $schoolYears,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'grade_level' => 'required|string|max:20',
            'homeroom_teacher_id' => 'nullable|exists:users,id',
            'school_year_id' => 'nullable|exists:school_years,id',
        ]);

        $class = SchoolClass::create([
            ...$validated,
            'school_year_id' => $validated['school_year_id'] ?? SchoolYear::getActive()?->id,
        ]);

        AuditLog::log('class.created', 'SchoolClass', $class->id, null, $class->toArray());

        return redirect()->back()->with('success', "Kelas {$class->name} berhasil ditambahkan.");
    }

    public function update(Request $request, SchoolClass $class): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'grade_level' => 'required|string|max:20',
            'homeroom_teacher_id' => 'nullable|exists:users,id',
        ]);

        $old = $class->toArray();
        $class->update($validated);

        AuditLog::log('class.updated', 'SchoolClass', $class->id, $old, $class->toArray());

        return redirect()->back()->with('success', "Data kelas {$class->name} berhasil diperbarui.");
    }

    public function destroy(SchoolClass $class): RedirectResponse
    {
        if ($class->students()->where('is_active', true)->exists()) {
            return redirect()->back()->with('error', "Tidak dapat menghapus kelas {$class->name} karena masih memiliki siswa aktif.");
        }

        $old = $class->toArray();
        $class->delete();

        AuditLog::log('class.deleted', 'SchoolClass', $class->id, $old, null);

        return redirect()->back()->with('success', "Kelas {$class->name} berhasil dihapus.");
    }
}
