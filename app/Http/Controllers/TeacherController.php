<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\SchoolClass;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;

class TeacherController extends Controller
{
    public function index(): Response
    {
        $teachers = User::where('role', 'guru_wali')
            ->with(['homeroomClasses'])
            ->latest()
            ->get();

        $classes = SchoolClass::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Teachers/Index', [
            'teachers' => $teachers,
            'classes' => $classes,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:150|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:6',
        ], [
            'email.unique' => 'Email ini sudah terdaftar di sistem.',
        ]);

        $teacher = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'role' => 'guru_wali',
            'is_active' => true,
        ]);

        AuditLog::log('teacher.created', 'User', $teacher->id, null, ['name' => $teacher->name, 'email' => $teacher->email]);

        return redirect()->back()->with('success', "Akun guru {$teacher->name} berhasil ditambahkan.");
    }

    public function update(Request $request, User $teacher): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:150|unique:users,email,' . $teacher->id,
            'phone' => 'nullable|string|max:20',
            'is_active' => 'required|boolean',
            'password' => 'nullable|string|min:6',
        ]);

        $old = $teacher->toArray();

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'is_active' => $validated['is_active'],
        ];

        if (!empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $teacher->update($data);

        AuditLog::log('teacher.updated', 'User', $teacher->id, $old, $teacher->toArray());

        return redirect()->back()->with('success', "Data guru {$teacher->name} berhasil diperbarui.");
    }
}
