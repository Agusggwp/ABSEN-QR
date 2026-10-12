<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ClassroomConfirmation;
use App\Models\SchoolClass;
use App\Models\SchoolSetting;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassroomConfirmationTest extends TestCase
{
    use RefreshDatabase;

    protected User $guru;
    protected SchoolClass $class;
    protected AttendanceSession $session;
    protected Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        SchoolSetting::set('school_name', 'SMK TI ARTDEVATA BALI');
        SchoolSetting::set('npsn', '50102030');
        SchoolSetting::set('timezone', 'Asia/Makassar');

        SchoolYear::create([
            'name' => '2026/2027',
            'start_date' => '2026-07-15',
            'end_date' => '2027-06-20',
            'is_active' => true,
        ]);

        $this->class = SchoolClass::create([
            'name' => 'X-RPL-1',
            'grade_level' => 10,
            'major' => 'Rekayasa Perangkat Lunak',
            'is_active' => true,
        ]);

        $this->guru = User::factory()->create([
            'role' => 'guru_wali',
            'is_active' => true,
        ]);

        $this->session = AttendanceSession::create([
            'name' => 'Sesi Masuk - ' . Carbon::today()->toDateString(),
            'date' => Carbon::today()->toDateString(),
            'type' => 'masuk',
            'start_time' => '06:00:00',
            'end_time' => '12:00:00',
            'late_time' => '07:15:00',
            'status' => 'open',
        ]);

        $this->student = Student::create([
            'nis' => '20261080',
            'name' => 'I Gede Bayu',
            'gender' => 'L',
            'class_id' => $this->class->id,
            'is_active' => true,
        ]);
    }

    public function test_teacher_can_confirm_classroom_attendance()
    {
        // Student had scanned at gate
        Attendance::create([
            'student_id' => $this->student->id,
            'session_id' => $this->session->id,
            'class_id' => $this->class->id,
            'date' => Carbon::today()->toDateString(),
            'scanned_at' => now(),
            'status' => 'hadir',
            'verified_by_user_id' => $this->guru->id,
        ]);

        $response = $this->actingAs($this->guru)->post('/classroom', [
            'class_id' => $this->class->id,
            'session_id' => $this->session->id,
            'confirmations' => [
                [
                    'student_id' => $this->student->id,
                    'class_status' => 'present_in_class',
                    'notes' => 'Hadir aktif di kelas',
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();
        $this->assertDatabaseHas('classroom_confirmations', [
            'class_id' => $this->class->id,
            'student_id' => $this->student->id,
            'session_id' => $this->session->id,
            'status' => 'present_in_class',
            'teacher_user_id' => $this->guru->id,
            'gate_match_status' => 'matched',
        ]);
    }

    public function test_mismatch_flags_discrepancy()
    {
        // Student scanned at gate
        Attendance::create([
            'student_id' => $this->student->id,
            'session_id' => $this->session->id,
            'class_id' => $this->class->id,
            'date' => Carbon::today()->toDateString(),
            'scanned_at' => now(),
            'status' => 'hadir',
            'verified_by_user_id' => $this->guru->id,
        ]);

        // But teacher flags student as absent in classroom
        $response = $this->actingAs($this->guru)->post('/classroom', [
            'class_id' => $this->class->id,
            'session_id' => $this->session->id,
            'confirmations' => [
                [
                    'student_id' => $this->student->id,
                    'class_status' => 'absent_in_class',
                    'notes' => 'Tidak terlihat di dalam kelas setelah jam istirahat',
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $confirmation = ClassroomConfirmation::where('student_id', $this->student->id)
            ->where('session_id', $this->session->id)
            ->first();

        $this->assertNotNull($confirmation);
        $this->assertEquals('absent_in_class', $confirmation->status);
        $this->assertEquals('gate_only_missing_class', $confirmation->gate_match_status);
    }
}
