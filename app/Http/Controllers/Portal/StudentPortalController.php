<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\SchoolSetting;
use App\Services\QrSecurityService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class StudentPortalController extends Controller
{
    public function __construct(
        protected QrSecurityService $qrSecurityService
    ) {}

    /**
     * Dapatkan siswa milik user terautentikasi (IDOR Protection).
     */
    protected function getAuthenticatedStudent(Request $request)
    {
        $user = $request->user();

        // Cari data student yang terhubung
        $student = $user->student ?? \App\Models\Student::where('user_id', $user->id)->first();

        if (!$student && $user->role === 'super_admin') {
            // Super Admin pratinjau portal murid dengan mengambil murid pertama
            $student = \App\Models\Student::with('schoolClass')->first();
        }

        if (!$student) {
            abort(403, 'Akun Anda belum terhubung dengan data murid sekolah.');
        }

        $student->loadMissing(['schoolClass', 'activeQrCode']);

        return $student;
    }

    /**
     * Dashboard Portal Murid.
     */
    public function dashboard(Request $request): Response
    {
        $student = $this->getAuthenticatedStudent($request);
        $schoolSetting = SchoolSetting::first();

        // Ambil token QR aktif (didekripsi untuk ditampilkan di portal murid)
        $qrData = $this->qrSecurityService->getActiveTokenForStudent($student);

        // Statistik absensi murid
        $attendances = Attendance::where('student_id', $student->id)->get();

        $totalDays = $attendances->count();
        $hadir = $attendances->where('status', 'hadir')->count();
        $terlambat = $attendances->where('status', 'terlambat')->count();
        $izin = $attendances->where('status', 'izin')->count();
        $sakit = $attendances->where('status', 'sakit')->count();
        $alpa = $attendances->where('status', 'alpa')->count();

        $presenceRate = $totalDays > 0 ? round((($hadir + $terlambat) / $totalDays) * 100, 1) : 100.0;

        // Riwayat absensi terbaru (5 terakhir)
        $recentAttendances = Attendance::with('session')
            ->where('student_id', $student->id)
            ->latest('date')
            ->latest('scanned_at')
            ->take(5)
            ->get();

        return Inertia::render('Portal/Dashboard', [
            'student' => $student,
            'school' => [
                'name' => SchoolSetting::get('school_name', 'SMA ARTDEVATA DENPASAR'),
                'logo' => SchoolSetting::get('logo_path', null),
                'address' => SchoolSetting::get('school_address', 'Jl. Bypass Ngurah Rai No. 88, Denpasar, Bali'),
            ],
            'qr' => [
                'raw_token' => $qrData['raw_secret_token'],
                'card_number' => $qrData['qr_code']->card_number,
                'status' => $qrData['qr_code']->status,
                'issued_at' => $qrData['qr_code']->issued_at?->format('d M Y H:i'),
            ],
            'stats' => [
                'total_days' => $totalDays,
                'hadir' => $hadir,
                'terlambat' => $terlambat,
                'izin' => $izin,
                'sakit' => $sakit,
                'alpa' => $alpa,
                'presence_rate' => $presenceRate,
            ],
            'recent_attendances' => $recentAttendances,
            'must_change_password' => (bool) $request->user()->must_change_password,
        ]);
    }

    /**
     * Halaman QR Code Saya & Kartu Absensi.
     */
    public function qrCode(Request $request): Response
    {
        $student = $this->getAuthenticatedStudent($request);
        $qrData = $this->qrSecurityService->getActiveTokenForStudent($student);

        return Inertia::render('Portal/QrCode', [
            'student' => $student,
            'school' => [
                'name' => SchoolSetting::get('school_name', 'SMA ARTDEVATA DENPASAR'),
                'logo' => SchoolSetting::get('logo_path', null),
                'address' => SchoolSetting::get('school_address', 'Jl. Bypass Ngurah Rai No. 88, Denpasar, Bali'),
                'phone' => SchoolSetting::get('school_phone', '(0361) 234567'),
            ],
            'qr' => [
                'raw_token' => $qrData['raw_secret_token'],
                'card_number' => $qrData['qr_code']->card_number,
                'status' => $qrData['qr_code']->status,
                'issued_at' => $qrData['qr_code']->issued_at?->format('d M Y H:i'),
            ],
        ]);
    }

    /**
     * Halaman Riwayat Absensi Murid Pribadi.
     */
    public function attendanceHistory(Request $request): Response
    {
        $student = $this->getAuthenticatedStudent($request);
        $month = $request->input('month', now()->format('Y-m'));

        $query = Attendance::with(['session', 'verifiedByUser'])
            ->where('student_id', $student->id);

        if ($month) {
            $query->where('date', 'like', "{$month}%");
        }

        $attendances = $query->latest('date')->latest('scanned_at')->paginate(20)->withQueryString();

        // Ringkasan kehadiran bulan ini
        $monthlyAll = Attendance::where('student_id', $student->id)
            ->where('date', 'like', "{$month}%")
            ->get();

        $stats = [
            'total' => $monthlyAll->count(),
            'hadir' => $monthlyAll->where('status', 'hadir')->count(),
            'terlambat' => $monthlyAll->where('status', 'terlambat')->count(),
            'izin' => $monthlyAll->where('status', 'izin')->count(),
            'sakit' => $monthlyAll->where('status', 'sakit')->count(),
            'alpa' => $monthlyAll->where('status', 'alpa')->count(),
        ];

        return Inertia::render('Portal/AttendanceHistory', [
            'student' => $student,
            'attendances' => $attendances,
            'stats' => $stats,
            'month' => $month,
        ]);
    }

    /**
     * Ganti Password Akun Murid.
     */
    public function updatePassword(Request $request): RedirectResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => $user->must_change_password ? ['nullable'] : ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(6)],
        ], [
            'password.required' => 'Kata sandi baru wajib diisi.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
            'password.min' => 'Kata sandi minimal berjumlah 6 karakter.',
            'current_password.current_password' => 'Kata sandi saat ini tidak cocok.',
        ]);

        $user->update([
            'password' => Hash::make($request->input('password')),
            'must_change_password' => false,
        ]);

        AuditLog::log(
            action: 'student.password_changed',
            entityType: 'User',
            entityId: $user->id,
            payloadBefore: null,
            payloadAfter: ['user_id' => $user->id]
        );

        return redirect()->back()->with('success', 'Kata sandi Anda berhasil diperbarui!');
    }

    /**
     * Perbarui foto profil murid dari portal.
     */
    public function updatePhoto(Request $request): RedirectResponse
    {
        $request->validate([
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'remove_photo' => 'nullable|boolean',
        ], [
            'photo.image' => 'File harus berupa gambar.',
            'photo.mimes' => 'Format foto harus berupa JPG, PNG, atau WEBP.',
            'photo.max' => 'Ukuran foto maksimal 2MB.',
        ]);

        $student = $this->getAuthenticatedStudent($request);

        if ($request->hasFile('photo')) {
            if ($student->photo_path && Storage::disk('public')->exists($student->photo_path)) {
                Storage::disk('public')->delete($student->photo_path);
            }
            $path = $request->file('photo')->store('students/photos', 'public');
            $student->update(['photo_path' => $path]);

            AuditLog::log(
                action: 'student.photo_updated',
                entityType: 'Student',
                entityId: $student->id,
                payloadBefore: null,
                payloadAfter: ['photo_path' => $path]
            );

            return redirect()->back()->with('success', 'Foto profil berhasil diperbarui.');
        }

        if ($request->boolean('remove_photo')) {
            if ($student->photo_path && Storage::disk('public')->exists($student->photo_path)) {
                Storage::disk('public')->delete($student->photo_path);
            }
            $student->update(['photo_path' => null]);

            AuditLog::log(
                action: 'student.photo_removed',
                entityType: 'Student',
                entityId: $student->id,
                payloadBefore: null,
                payloadAfter: ['photo_path' => null]
            );

            return redirect()->back()->with('success', 'Foto profil berhasil dihapus.');
        }

        return redirect()->back();
    }
}
