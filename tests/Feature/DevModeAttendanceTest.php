<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use App\Services\QrSecurityService;
use App\Services\StudentAccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DevModeAttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected QrSecurityService $qrService;
    protected StudentAccountService $accountService;
    protected User $admin;
    protected SchoolYear $academicYear;
    protected SchoolClass $class;
    protected \App\Models\ScannerDevice $device;
    protected Student $student;
    protected string $rawToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->qrService = new QrSecurityService();
        $this->accountService = new StudentAccountService();

        $this->academicYear = SchoolYear::create([
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

        $this->device = \App\Models\ScannerDevice::create([
            'device_identifier' => 'SCAN-POS-TEST',
            'device_name' => 'Scanner Gerbang Utama',
            'location_description' => 'Pos Satpam',
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $this->student = Student::create([
            'nis' => '10001',
            'nisn' => '0011223344',
            'name' => 'Siswa Pengujian Dev',
            'gender' => 'L',
            'class_id' => $this->class->id,
            'school_year_id' => $this->academicYear->id,
            'is_active' => true,
        ]);

        $qrData = $this->qrService->generateTokenForStudent($this->student);
        $this->rawToken = $qrData['raw_secret_token'];
    }

    public function test_dev_mode_allows_continuous_repeated_attendance(): void
    {
        $session = AttendanceSession::create([
            'school_year_id' => $this->academicYear->id,
            'date' => now()->toDateString(),
            'type' => 'masuk',
            'start_time' => '06:00:00',
            'end_time' => '08:00:00',
            'late_time' => '07:15:00',
            'status' => 'open',
        ]);

        // First Scan (Normal Dev Mode)
        $pre1 = $this->actingAs($this->admin)->postJson('/scanner/pre-scan', [
            'qr_token' => $this->rawToken,
            'device_id' => $this->device->id,
            'session_id' => $session->id,
            'dev_mode' => true,
        ]);
        $pre1->assertOk()->assertJson(['status' => 'ready_for_verification']);

        $confirm1 = $this->actingAs($this->admin)->postJson('/scanner/confirm', [
            'student_id' => $this->student->id,
            'session_id' => $session->id,
            'device_id' => $this->device->id,
            'status' => 'hadir',
            'dev_mode' => true,
        ]);
        $confirm1->assertOk()->assertJson(['success' => true]);

        $this->assertDatabaseHas('attendances', [
            'session_id' => $session->id,
            'student_id' => $this->student->id,
            'status' => 'hadir',
        ]);

        // Second Scan with dev_mode = true: Must NOT be blocked!
        $pre2 = $this->actingAs($this->admin)->postJson('/scanner/pre-scan', [
            'qr_token' => $this->rawToken,
            'device_id' => $this->device->id,
            'session_id' => $session->id,
            'dev_mode' => true,
        ]);
        $pre2->assertOk()->assertJson([
            'status' => 'ready_for_verification',
            'is_dev_re_scan' => true,
        ]);

        // Confirm second scan: updates existing record and succeeds
        $confirm2 = $this->actingAs($this->admin)->postJson('/scanner/confirm', [
            'student_id' => $this->student->id,
            'session_id' => $session->id,
            'device_id' => $this->device->id,
            'status' => 'hadir',
            'dev_mode' => true,
        ]);
        $confirm2->assertOk()->assertJson([
            'success' => true,
            'is_dev_re_scan' => true,
        ]);
    }

    public function test_dev_toggle_session_toggles_between_open_and_closed(): void
    {
        $session = AttendanceSession::create([
            'school_year_id' => $this->academicYear->id,
            'date' => now()->toDateString(),
            'type' => 'masuk',
            'start_time' => '06:00:00',
            'end_time' => '08:00:00',
            'late_time' => '07:15:00',
            'status' => 'open',
        ]);

        $resp = $this->actingAs($this->admin)->postJson('/scanner/dev/toggle-session');
        $resp->assertOk()->assertJson([
            'success' => true,
            'session' => ['status' => 'closed'],
        ]);

        $resp2 = $this->actingAs($this->admin)->postJson('/scanner/dev/toggle-session');
        $resp2->assertOk()->assertJson([
            'success' => true,
            'session' => ['status' => 'open'],
        ]);
    }

    public function test_dev_burst_scan_simulates_multiple_attendances(): void
    {
        $session = AttendanceSession::create([
            'school_year_id' => $this->academicYear->id,
            'date' => now()->toDateString(),
            'type' => 'masuk',
            'start_time' => '06:00:00',
            'end_time' => '08:00:00',
            'late_time' => '07:15:00',
            'status' => 'open',
        ]);

        // Create 4 more students
        for ($i = 2; $i <= 5; $i++) {
            $s = Student::create([
                'nis' => '1000' . $i,
                'name' => 'Siswa Test ' . $i,
                'gender' => 'P',
                'class_id' => $this->class->id,
                'school_year_id' => $this->academicYear->id,
                'is_active' => true,
            ]);
            $this->qrService->generateTokenForStudent($s);
        }

        $resp = $this->actingAs($this->admin)->postJson('/scanner/dev/burst-scan', [
            'session_id' => $session->id,
            'device_id' => $this->device->id,
            'count' => 3,
        ]);

        $resp->assertOk()->assertJson(['success' => true]);
        $this->assertEquals(3, Attendance::where('session_id', $session->id)->count());
    }

    public function test_dev_reset_today_cleans_attendance_records(): void
    {
        $session = AttendanceSession::create([
            'school_year_id' => $this->academicYear->id,
            'date' => now()->toDateString(),
            'type' => 'masuk',
            'start_time' => '06:00:00',
            'end_time' => '08:00:00',
            'late_time' => '07:15:00',
            'status' => 'open',
        ]);

        Attendance::create([
            'session_id' => $session->id,
            'student_id' => $this->student->id,
            'device_id' => $this->device->id,
            'user_id' => $this->admin->id,
            'date' => now()->toDateString(),
            'scanned_at' => now(),
            'status' => 'hadir',
            'method' => 'qr_code',
        ]);

        $this->assertEquals(1, Attendance::where('session_id', $session->id)->count());

        $resp = $this->actingAs($this->admin)->postJson('/scanner/dev/reset-today', [
            'session_id' => $session->id,
        ]);

        $resp->assertOk()->assertJson([
            'success' => true,
            'deleted_count' => 1,
        ]);

        $this->assertEquals(0, Attendance::where('session_id', $session->id)->count());
    }

    public function test_non_super_admin_is_forbidden_from_dev_mode(): void
    {
        $petugas = User::factory()->create([
            'role' => 'petugas_absensi',
            'is_active' => true,
        ]);

        $this->actingAs($petugas)->get('/dev-mode')->assertForbidden();
        $this->actingAs($petugas)->postJson('/dev-mode/toggle-session')->assertForbidden();
        $this->actingAs($petugas)->postJson('/scanner/dev/toggle-session')->assertForbidden();
    }

    public function test_super_admin_can_access_dev_mode_center(): void
    {
        $resp = $this->actingAs($this->admin)->get('/dev-mode');
        $resp->assertOk();
    }

    public function test_super_admin_can_inspect_token_in_dev_mode(): void
    {
        $resp = $this->actingAs($this->admin)->postJson('/dev-mode/inspect-token', [
            'query' => $this->student->nis,
        ]);

        $resp->assertOk()->assertJson([
            'success' => true,
            'data' => [
                'card_number' => 'KARTU-00001',
            ],
        ]);
    }

    public function test_super_admin_can_simulate_single_scan_in_dev_mode(): void
    {
        $resp = $this->actingAs($this->admin)->postJson('/dev-mode/simulate-scan', [
            'student_id' => $this->student->id,
            'status' => 'hadir',
            'custom_note' => 'Uji coba dev console',
        ]);

        $resp->assertOk()->assertJson(['success' => true]);
        $this->assertDatabaseHas('attendances', [
            'student_id' => $this->student->id,
            'status' => 'hadir',
        ]);
    }
}
