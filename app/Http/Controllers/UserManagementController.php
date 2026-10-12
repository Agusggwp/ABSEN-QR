<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;

class UserManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $role = $request->query('role');

        $query = User::latest();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role && $role !== 'all') {
            $query->where('role', $role);
        }

        $users = $query->paginate(20)->withQueryString();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'role' => $role,
            ],
            'roles' => [
                'super_admin' => 'Super Administrator',
                'admin_sekolah' => 'Admin Sekolah',
                'petugas_absensi' => 'Petugas Absensi',
                'guru_wali' => 'Guru / Wali Kelas',
                'kepala_sekolah' => 'Kepala Sekolah',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:150|unique:users,email',
            'role' => 'required|in:super_admin,admin_sekolah,petugas_absensi,guru_wali,kepala_sekolah',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
        ], [
            'email.unique' => 'Alamat email ini sudah terdaftar.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'is_active' => true,
        ]);

        AuditLog::log('user.created', 'User', $user->id, null, ['name' => $user->name, 'email' => $user->email, 'role' => $user->role]);

        return redirect()->back()->with('success', "Pengguna {$user->name} berhasil ditambahkan dengan role " . strtoupper($user->role) . '.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:150|unique:users,email,' . $user->id,
            'role' => 'required|in:super_admin,admin_sekolah,petugas_absensi,guru_wali,kepala_sekolah',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'required|boolean',
            'password' => 'nullable|string|min:8',
        ]);

        $old = $user->only(['name', 'email', 'role', 'phone', 'is_active']);

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'phone' => $validated['phone'],
            'is_active' => $validated['is_active'],
        ];

        if (!empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        AuditLog::log('user.updated', 'User', $user->id, $old, $user->only(['name', 'email', 'role', 'phone', 'is_active']));

        return redirect()->back()->with('success', "Data pengguna {$user->name} berhasil diperbarui.");
    }
}
