<?php

namespace App\Services;

use App\Models\SchoolClass;
use App\Models\AttendanceSession;
use App\Models\Attendance;
use App\Models\ClassroomConfirmation;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;

class ClassroomConfirmationService
{
    /**
     * Ambil data perbandingan kehadiran gerbang vs kehadiran kelas.
     */
    public function getClassroomAttendanceComparison(int $classId, ?int $sessionId = null): array
    {
        $schoolClass = SchoolClass::with('homeroomTeacher')->findOrFail($classId);
        $today = now()->format('Y-m-d');

        $session = $sessionId
            ? AttendanceSession::findOrFail($sessionId)
            : AttendanceSession::where('date', $today)->where('status', 'open')->first();

        if (!$session) {
            $session = AttendanceSession::where('date', $today)->latest()->first();
        }

        // Ambil semua siswa aktif di kelas ini
        $students = $schoolClass->students()->where('is_active', true)->orderBy('name')->get();

        // Ambil data scan gerbang pada sesi ini
        $gateAttendances = $session
            ? Attendance::where('session_id', $session->id)
                ->whereIn('student_id', $students->pluck('id'))
                ->get()
                ->keyBy('student_id')
            : collect();

        // Ambil data konfirmasi kelas yang sudah disimpan jika ada
        $existingConfirmations = $session
            ? ClassroomConfirmation::where('session_id', $session->id)
                ->where('class_id', $classId)
                ->get()
                ->keyBy('student_id')
            : collect();

        $comparisonList = $students->map(function ($student) use ($gateAttendances, $existingConfirmations) {
            $gate = $gateAttendances->get($student->id);
            $confirmed = $existingConfirmations->get($student->id);

            $hasGateScan = ($gate !== null);
            $gateStatus = $gate?->status;
            $gateScannedAt = $gate?->scanned_at ? $gate->scanned_at->format('H:i:s') : null;

            // Tentukan status match
            $classStatus = $confirmed?->status ?? ($hasGateScan ? 'present_in_class' : 'absent_in_class');
            
            $matchStatus = 'matched';
            if ($hasGateScan && $classStatus === 'absent_in_class') {
                $matchStatus = 'gate_only_missing_class'; // Scan di gerbang tapi tidak ada di kelas!
            } elseif (!$hasGateScan && $classStatus === 'present_in_class') {
                $matchStatus = 'class_only_missing_gate'; // Hadir di kelas tapi tidak scan gerbang
            }

            return [
                'student_id' => $student->id,
                'nis' => $student->nis,
                'name' => $student->name,
                'gender' => $student->gender,
                'has_gate_scan' => $hasGateScan,
                'gate_status' => $gateStatus,
                'gate_scanned_at' => $gateScannedAt,
                'class_status' => $classStatus,
                'match_status' => $matchStatus,
                'notes' => $confirmed?->notes ?? null,
                'is_confirmed' => ($confirmed !== null),
            ];
        });

        // Ringkasan anomali
        $discrepanciesCount = $comparisonList->whereIn('match_status', ['gate_only_missing_class', 'class_only_missing_gate'])->count();

        return [
            'class' => $schoolClass,
            'session' => $session,
            'students_comparison' => $comparisonList,
            'discrepancies_count' => $discrepanciesCount,
        ];
    }

    /**
     * Simpan konfirmasi kehadiran kelas oleh Guru.
     */
    public function saveClassroomConfirmation(
        int $classId,
        int $sessionId,
        int $teacherUserId,
        array $confirmationsData
    ): array {
        return DB::transaction(function () use ($classId, $sessionId, $teacherUserId, $confirmationsData) {
            $savedCount = 0;
            $suspiciousCount = 0;

            foreach ($confirmationsData as $item) {
                $studentId = $item['student_id'];
                $status = $item['class_status']; // present_in_class, absent_in_class, with_excuse
                $notes = $item['notes'] ?? null;

                // Cek data gerbang
                $hasGate = Attendance::where('session_id', $sessionId)
                    ->where('student_id', $studentId)
                    ->exists();

                $matchStatus = 'matched';
                if ($hasGate && $status === 'absent_in_class') {
                    $matchStatus = 'gate_only_missing_class';
                    $suspiciousCount++;
                } elseif (!$hasGate && $status === 'present_in_class') {
                    $matchStatus = 'class_only_missing_gate';
                }

                ClassroomConfirmation::updateOrCreate(
                    [
                        'session_id' => $sessionId,
                        'class_id' => $classId,
                        'student_id' => $studentId,
                    ],
                    [
                        'teacher_user_id' => $teacherUserId,
                        'status' => $status,
                        'gate_match_status' => $matchStatus,
                        'notes' => $notes,
                        'confirmed_at' => now(),
                    ]
                );

                $savedCount++;
            }

            AuditLog::log(
                action: 'classroom.confirmed',
                entityType: 'SchoolClass',
                entityId: $classId,
                payloadBefore: null,
                payloadAfter: [
                    'class_id' => $classId,
                    'session_id' => $sessionId,
                    'total_confirmed' => $savedCount,
                    'anomalies_detected' => $suspiciousCount,
                ],
                userId: $teacherUserId
            );

            return [
                'success' => true,
                'message' => "Konfirmasi kehadiran kelas berhasil disimpan ({$savedCount} siswa).",
                'anomalies_detected' => $suspiciousCount,
            ];
        });
    }
}
