<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ScannerDevice;
use App\Models\SchoolClass;
use App\Models\SchoolSetting;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\StudentQrCode;
use App\Models\User;
use App\Services\QrSecurityService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceScannerTest extends TestCase
{
    use RefreshDatabase;

    protected User $petugas;
    protected User $admin;
    protected ScannerDevice $device;
    protected AttendanceSession $session;
    protected Student $student;
    protected StudentQrCode $qrCard;
    protected string $rawSecret;

    protected function setUp(): void
    {
        parent::setUp();

        SchoolSetting::set('school_name', 'SMK TI ARTDEVATA BALI');
        SchoolSetting::set('npsn', '50102030');
        SchoolSetting::set('timezone', 'Asia/Makassar');
        SchoolSetting::set('gate_open_time', '06:00:00');
        SchoolSetting::set('late_threshold_time', '07:15:00');
        SchoolSetting::set('gate_close_time', '17:00:00');

        $year = SchoolYear::create([
            'name' => '2026/2027',
            'start_date' => '2026-07-15',
            'end_date' => '2027-06-20',
            'is_active' => true,
        ]);

        $class = SchoolClass::create([
            'name' => 'X-RPL-1',
            'grade_level' => 10,
            'major' => 'Rekayasa Perangkat Lunak',
            'is_active' => true,
        ]);

        $this->petugas = User::factory()->create([
            'role' => 'petugas_absensi',
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);

        $this->device = ScannerDevice::create([
            'device_identifier' => 'SCAN-POS-1',
            'device_name' => 'Scanner Gerbang Barat',
            'location_description' => 'Pintu Gerbang Utama Barat',
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
            'nis' => '20261050',
            'nisn' => '0098765432',
            'name' => 'Kadek Arta Wijaya',
            'gender' => 'L',
            'current_class_id' => $class->id,
            'is_active' => true,
        ]);

        $qrService = new QrSecurityService();
        $res = $qrService->generateTokenForStudent($this->student);
        $this->qrCard = $res['qr_code'];
        $this->rawSecret = $res['raw_secret_token'];
    }

    public function test_pre_scan_returns_student_information_for_visual_verification()
    {
        $response = $this->actingAs($this->petugas)->postJson('/scanner/pre-scan', [
            'qr_token' => $this->rawSecret,
            'session_id' => $this->session->id,
            'device_id' => $this->device->id,
        ]);

        $response->assertOk();
        $response->assertJson([
            'status' => 'ready_for_verification',
            'code' => 'VERIFY_IDENTITY',
            'student' => [
                'id' => $this->student->id,
                'nis' => '20261050',
                'name' => 'Kadek Arta Wijaya',
            ],
        ]);
    }

    public function test_confirm_attendance_commits_and_logs_audit()
    {
        $response = $this->actingAs($this->petugas)->postJson('/scanner/confirm', [
            'qr_code_id' => $this->qrCard->id,
            'session_id' => $this->session->id,
            'device_id' => $this->device->id,
            'student_id' => $this->student->id,
            'status' => 'hadir',
        ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('attendances', [
            'student_id' => $this->student->id,
            'session_id' => $this->session->id,
            'verified_by_user_id' => $this->petugas->id,
            'status' => 'hadir',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'attendance.scanned',
            'user_id' => $this->petugas->id,
        ]);
    }

    public function test_duplicate_attendance_is_strictly_rejected()
    {
        // First attendance confirmed
        $this->actingAs($this->petugas)->postJson('/scanner/confirm', [
            'qr_code_id' => $this->qrCard->id,
            'session_id' => $this->session->id,
            'device_id' => $this->device->id,
            'student_id' => $this->student->id,
            'status' => 'hadir',
        ]);

        // Second duplicate scan attempt at pre-scan
        $response = $this->actingAs($this->petugas)->postJson('/scanner/pre-scan', [
            'qr_token' => $this->rawSecret,
            'session_id' => $this->session->id,
            'device_id' => $this->device->id,
        ]);

        $response->assertOk();
        $response->assertJson([
            'status' => 'duplicate',
            'code' => 'ALREADY_SCANNED',
        ]);
    }

    public function test_inactive_student_is_rejected()
    {
        $this->student->update(['is_active' => false]);

        $response = $this->actingAs($this->petugas)->postJson('/scanner/pre-scan', [
            'qr_token' => $this->rawSecret,
            'session_id' => $this->session->id,
            'device_id' => $this->device->id,
        ]);

        $response->assertOk();
        $response->assertJson([
            'status' => 'rejected',
            'code' => 'STUDENT_INACTIVE',
        ]);
    }

    public function test_admin_can_correct_attendance_with_mandatory_reason()
    {
        // First record attendance
        $this->actingAs($this->petugas)->postJson('/scanner/confirm', [
            'qr_code_id' => $this->qrCard->id,
            'session_id' => $this->session->id,
            'device_id' => $this->device->id,
            'student_id' => $this->student->id,
            'status' => 'hadir',
        ]);

        $attendance = Attendance::where('student_id', $this->student->id)->first();

        // Correction by admin
        $response = $this->actingAs($this->admin)->postJson("/attendances/{$attendance->id}/correct", [
            'new_status' => 'izin',
            'reason' => 'Siswa mendadak izin dinas lomba sains setelah scan pagi.',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('attendances', [
            'id' => $attendance->id,
            'status' => 'izin',
        ]);

        $this->assertDatabaseHas('attendance_corrections', [
            'attendance_id' => $attendance->id,
            'previous_status' => 'hadir',
            'new_status' => 'izin',
            'corrected_by_user_id' => $this->admin->id,
        ]);
    }
}
