<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\StudentQrCode;
use App\Models\User;
use App\Services\QrSecurityService;
use App\Services\StudentAccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StudentPortalTest extends TestCase
{
    use RefreshDatabase;

    protected QrSecurityService $qrService;
    protected StudentAccountService $accountService;
    protected User $admin;
    protected SchoolYear $academicYear;
    protected SchoolClass $class;
    protected \App\Models\ScannerDevice $device;
    protected Student $student;
    protected User $studentUser;

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
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);

        $this->student = Student::create([
            'nis' => '20261001',
            'nisn' => '0089123456',
            'name' => 'Gede Agus Pratama',
            'gender' => 'L',
            'class_id' => $this->class->id,
            'is_active' => true,
        ]);

        $this->studentUser = $this->accountService->createAccountForStudent($this->student);
    }

    public function test_student_can_login_using_nis_and_default_password()
    {
        $response = $this->post(route('login'), [
            'email' => '20261001',
            'password' => 'Siswa@20261001',
        ]);

        $response->assertRedirect(route('portal.dashboard'));
        $this->assertAuthenticatedAs($this->studentUser);
    }

    public function test_student_can_access_portal_dashboard()
    {
        $response = $this->actingAs($this->studentUser)->get(route('portal.dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('Portal/Dashboard')
                ->where('student.name', 'Gede Agus Pratama')
                ->where('student.nis', '20261001')
                ->has('qr.raw_token')
        );
    }

    public function test_student_can_access_personal_qr_code_page()
    {
        $response = $this->actingAs($this->studentUser)->get(route('portal.qr-code'));

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('Portal/QrCode')
                ->where('student.nis', '20261001')
                ->has('qr.raw_token')
        );
    }

    public function test_student_can_access_personal_attendance_history()
    {
        $session = AttendanceSession::create([
            'school_year_id' => $this->academicYear->id,
            'date' => now()->format('Y-m-d'),
            'type' => 'masuk',
            'start_time' => '06:00:00',
            'end_time' => '08:00:00',
            'late_time' => '07:00:00',
            'status' => 'open',
        ]);

        Attendance::create([
            'student_id' => $this->student->id,
            'class_id' => $this->class->id,
            'session_id' => $session->id,
            'date' => now()->format('Y-m-d'),
            'scanned_at' => now(),
            'status' => 'hadir',
            'verification_method' => 'manual',
        ]);

        $response = $this->actingAs($this->studentUser)->get(route('portal.attendance-history'));

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('Portal/AttendanceHistory')
                ->has('attendances.data', 1)
                ->where('stats.hadir', 1)
        );
    }

    public function test_student_cannot_access_admin_dashboard_and_is_redirected_to_portal()
    {
        $response = $this->actingAs($this->studentUser)->get(route('dashboard'));

        $response->assertRedirect(route('portal.dashboard'));
    }

    public function test_student_is_blocked_from_admin_management_routes_with_403()
    {
        // Akses data siswa
        $this->actingAs($this->studentUser)->get(route('students.index'))->assertForbidden();

        // Akses akun siswa
        $this->actingAs($this->studentUser)->get(route('students.accounts'))->assertForbidden();

        // Akses terminal scanner
        $this->actingAs($this->studentUser)->get(route('scanner.index'))->assertForbidden();

        // Akses pengaturan sekolah
        $this->actingAs($this->studentUser)->get(route('settings.index'))->assertForbidden();
    }

    public function test_scanner_terminal_can_scan_student_portal_decrypted_qr_token()
    {
        $session = AttendanceSession::create([
            'school_year_id' => $this->academicYear->id,
            'date' => now()->format('Y-m-d'),
            'type' => 'masuk',
            'start_time' => '06:00:00',
            'end_time' => '08:00:00',
            'late_time' => '07:00:00',
            'status' => 'open',
        ]);

        // Dapatkan token QR yang tampil di portal murid
        $qrData = $this->qrService->getActiveTokenForStudent($this->student);
        $rawSecretToken = $qrData['raw_secret_token'];

        // Petugas melakukan prescan
        $response = $this->actingAs($this->admin)->postJson(route('scanner.pre-scan'), [
            'qr_token' => $rawSecretToken,
            'session_id' => $session->id,
            'device_id' => $this->device->id,
        ]);

        $response->assertOk();
        $response->assertJson([
            'status' => 'ready_for_verification',
            'code' => 'VERIFY_IDENTITY',
            'student' => [
                'nis' => '20261001',
                'name' => 'Gede Agus Pratama',
            ],
        ]);
    }

    public function test_revoked_qr_code_is_rejected_by_scanner()
    {
        $session = AttendanceSession::create([
            'school_year_id' => $this->academicYear->id,
            'date' => now()->format('Y-m-d'),
            'type' => 'masuk',
            'start_time' => '06:00:00',
            'end_time' => '08:00:00',
            'late_time' => '07:00:00',
            'status' => 'open',
        ]);

        $qrData = $this->qrService->getActiveTokenForStudent($this->student);
        $rawSecretToken = $qrData['raw_secret_token'];

        // Cabut kartu
        $this->qrService->revokeCard($qrData['qr_code']->id, 'Kartu dilaporkan hilang');

        $response = $this->actingAs($this->admin)->postJson(route('scanner.pre-scan'), [
            'qr_token' => $rawSecretToken,
            'session_id' => $session->id,
            'device_id' => $this->device->id,
        ]);

        $response->assertOk();
        $response->assertJson([
            'status' => 'rejected',
            'code' => 'QR_REVOKED',
        ]);
    }

    public function test_admin_can_manage_student_accounts()
    {
        $secondStudent = Student::create([
            'nis' => '20261002',
            'name' => 'Ni Kadek Ayu',
            'gender' => 'P',
            'class_id' => $this->class->id,
            'is_active' => true,
        ]);

        // 1. Buat single akun
        $this->actingAs($this->admin)->post(route('students.account.create', $secondStudent->id));
        $secondStudent->refresh();
        $this->assertNotNull($secondStudent->user_id);
        $this->assertEquals('20261002', $secondStudent->user->username);

        // 2. Reset password
        $this->actingAs($this->admin)->post(route('students.account.reset-password', $secondStudent->id));
        $secondStudent->user->refresh();
        $this->assertTrue(Hash::check('Siswa@20261002', $secondStudent->user->password));
        $this->assertTrue($secondStudent->user->must_change_password);

        // 3. Toggle status akun
        $this->actingAs($this->admin)->post(route('students.account.toggle-status', $secondStudent->id));
        $secondStudent->user->refresh();
        $this->assertFalse($secondStudent->user->is_active);
    }

    public function test_deactivated_student_cannot_login()
    {
        $this->studentUser->update(['is_active' => false]);

        $response = $this->post(route('login'), [
            'email' => '20261001',
            'password' => 'Siswa@20261001',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_student_can_update_password()
    {
        $response = $this->actingAs($this->studentUser)->put(route('portal.password.update'), [
            'password' => 'RahasiaBaru123',
            'password_confirmation' => 'RahasiaBaru123',
        ]);

        $response->assertSessionHasNoErrors();
        $this->studentUser->refresh();
        $this->assertTrue(Hash::check('RahasiaBaru123', $this->studentUser->password));
        $this->assertFalse($this->studentUser->must_change_password);
    }

    public function test_student_can_upload_and_remove_profile_photo_from_portal()
    {
        \Illuminate\Support\Facades\Storage::fake('public');

        $file = \Illuminate\Http\UploadedFile::fake()->image('pasfoto_portal.jpg', 300, 400);

        $response = $this->actingAs($this->studentUser)->post(route('portal.photo.update'), [
            'photo' => $file,
        ]);

        $response->assertSessionHas('success');
        $this->student->refresh();
        $this->assertNotNull($this->student->photo_path);
        \Illuminate\Support\Facades\Storage::disk('public')->assertExists($this->student->photo_path);

        // Remove photo
        $responseRemove = $this->actingAs($this->studentUser)->post(route('portal.photo.update'), [
            'remove_photo' => 1,
        ]);

        $responseRemove->assertSessionHas('success');
        $this->student->refresh();
        $this->assertNull($this->student->photo_path);
    }
}
