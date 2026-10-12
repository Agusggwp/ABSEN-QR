<?php

namespace App\Http\Controllers;

use App\Models\SchoolSchedule;
use App\Models\AttendanceSession;
use App\Models\Holiday;
use App\Models\SchoolYear;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class ScheduleSessionController extends Controller
{
    public function index(): Response
    {
        $schoolYear = SchoolYear::getActive();
        $schedules = SchoolSchedule::where('school_year_id', $schoolYear?->id)
            ->orderBy('day_of_week')
            ->get();

        $sessions = AttendanceSession::with('closedByUser')
            ->latest('date')
            ->take(30)
            ->get();

        $holidays = Holiday::where('school_year_id', $schoolYear?->id)
            ->orderBy('date')
            ->get();

        $today = now()->format('Y-m-d');
        $todaySession = $sessions->firstWhere('date', $today);

        return Inertia::render('Schedules/Index', [
            'school_year' => $schoolYear,
            'schedules' => $schedules,
            'sessions' => $sessions,
            'holidays' => $holidays,
            'today_session' => $todaySession,
        ]);
    }

    public function updateSchedule(Request $request, SchoolSchedule $schedule): RedirectResponse
    {
        $validated = $request->validate([
            'check_in_start' => 'required|date_format:H:i',
            'check_in_end' => 'required|date_format:H:i|after:check_in_start',
            'late_tolerance_time' => 'required|date_format:H:i',
            'check_out_start' => 'required|date_format:H:i',
            'check_out_end' => 'required|date_format:H:i|after:check_out_start',
            'is_school_day' => 'required|boolean',
        ]);

        $old = $schedule->toArray();
        $schedule->update($validated);

        AuditLog::log('schedule.updated', 'SchoolSchedule', $schedule->id, $old, $schedule->toArray());

        return redirect()->back()->with('success', 'Jadwal jam sekolah berhasil diperbarui.');
    }

    public function toggleSession(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|exists:attendance_sessions,id',
            'action' => 'required|in:open,close,cancel',
        ]);

        $session = AttendanceSession::findOrFail($validated['session_id']);
        $newStatus = match ($validated['action']) {
            'open' => 'open',
            'close' => 'closed',
            'cancel' => 'cancelled',
        };

        $old = ['status' => $session->status];
        $session->update([
            'status' => $newStatus,
            'closed_by_user_id' => ($newStatus === 'closed' ? auth()->id() : null),
        ]);

        AuditLog::log('session.status_changed', 'AttendanceSession', $session->id, $old, ['status' => $newStatus]);

        return redirect()->back()->with('success', "Status sesi absensi berhasil diubah menjadi " . strtoupper($newStatus) . '.');
    }

    public function storeSession(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'type' => 'required|in:masuk,pulang',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'late_time' => 'required|date_format:H:i',
        ]);

        $session = AttendanceSession::create([
            ...$validated,
            'school_year_id' => SchoolYear::getActive()?->id,
            'status' => 'open',
        ]);

        AuditLog::log('session.created', 'AttendanceSession', $session->id, null, $session->toArray());

        return redirect()->back()->with('success', "Sesi absensi baru tanggal {$session->date} berhasil dibuka.");
    }
}
