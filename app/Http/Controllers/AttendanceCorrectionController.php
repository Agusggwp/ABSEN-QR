<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Services\AttendanceService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;

class AttendanceCorrectionController extends Controller
{
    public function __construct(
        protected AttendanceService $attendanceService
    ) {}

    public function store(Request $request, Attendance $attendance): RedirectResponse
    {
        $validated = $request->validate([
            'new_status' => 'required|in:hadir,terlambat,izin,sakit,dispensasi,alpa,perlu_verifikasi',
            'reason' => 'required|string|min:5|max:500',
        ], [
            'new_status.required' => 'Pilih status baru yang diinginkan.',
            'reason.required' => 'Wajib mengisi alasan koreksi absensi secara jelas.',
            'reason.min' => 'Alasan koreksi minimal 5 karakter.',
        ]);

        $this->attendanceService->correctAttendance(
            attendanceId: $attendance->id,
            newStatus: $validated['new_status'],
            reason: $validated['reason'],
            adminUserId: auth()->id()
        );

        return redirect()->back()->with('success', "Status absensi siswa {$attendance->student?->name} berhasil dikoreksi menjadi " . strtoupper($validated['new_status']) . '.');
    }
}
