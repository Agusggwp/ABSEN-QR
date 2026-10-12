<?php

namespace Tests\Feature;

use App\Models\CameraDevice;
use App\Models\AttendanceSetting;
use App\Models\DeviceTestLog;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\CameraVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VerificationDeviceSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $adminSekolah;
    protected User $petugas;
    protected CameraVerificationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new CameraVerificationService();

        $this->superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $this->adminSekolah = User::factory()->create([
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);

        $this->petugas = User::factory()->create([
            'role' => 'petugas_absensi',
            'is_active' => true,
        ]);
    }

    public function test_super_admin_and_admin_sekolah_can_access_verification_devices_page()
    {
        $this->actingAs($this->superAdmin)
            ->get('/settings/verification-devices')
            ->assertOk();

        $this->actingAs($this->adminSekolah)
            ->get('/settings/verification-devices')
            ->assertOk();
    }

    public function test_petugas_cannot_access_or_modify_verification_device_settings()
    {
        $this->actingAs($this->petugas)
            ->get('/settings/verification-devices')
            ->assertForbidden();

        $this->actingAs($this->petugas)
            ->put('/settings/verification-devices/attendance-settings', [
                'qr_scanner_mode' => 'usb_scanner',
                'identity_verification_mode' => 'officer_manual',
                'face_recognition_status' => 'tidak_digunakan',
            ])
            ->assertForbidden();
    }

    public function test_ssrf_protection_blocks_cloud_metadata_and_forbidden_ports()
    {
        // 1. AWS/GCP/Azure Cloud Metadata IP blocked
        $response = $this->actingAs($this->superAdmin)
            ->postJson('/settings/verification-devices/test-cctv', [
                'host' => '169.254.169.254',
                'port' => 554,
                'protocol' => 'rtsp',
            ]);

        $response->assertOk();
        $data = $response->json();
        $this->assertFalse($data['online']);
        $this->assertEquals('SSRF_BLOCKED', $data['error_code']);

        // 2. Sensitive server port blocked (e.g. MySQL port 3306 or SSH port 22)
        $responsePort = $this->actingAs($this->superAdmin)
            ->postJson('/settings/verification-devices/test-cctv', [
                'host' => '192.168.1.100',
                'port' => 3306,
                'protocol' => 'rtsp',
            ]);

        $responsePort->assertOk();
        $dataPort = $responsePort->json();
        $this->assertFalse($dataPort['online']);
        $this->assertEquals('PORT_NOT_ALLOWED', $dataPort['error_code']);
    }

    public function test_cctv_password_is_encrypted_and_never_exposed_in_json()
    {
        $this->actingAs($this->superAdmin)
            ->post('/settings/verification-devices/devices', [
                'name' => 'CCTV Gerbang Barat Test',
                'type' => 'cctv',
                'brand' => 'EZVIZ',
                'model' => 'H8c',
                'location' => 'Pilar Pintu Barat',
                'host' => '192.168.1.205',
                'port' => 554,
                'protocol' => 'rtsp',
                'username' => 'admin',
                'password' => 'SECRET_PASSWORD_123',
                'verification_code' => 'VERIF789',
            ]);

        $device = CameraDevice::where('name', 'CCTV Gerbang Barat Test')->first();
        $this->assertNotNull($device);

        // Raw password must not match plain text in raw DB column
        $this->assertNotEquals('SECRET_PASSWORD_123', $device->credential_reference);
        $this->assertStringNotContainsString('SECRET_PASSWORD_123', $device->credential_reference);

        // Password MUST NOT be present in json serialization
        $json = $device->toArray();
        $this->assertArrayNotHasKey('credential_reference', $json);
        $this->assertArrayNotHasKey('password', $json);
        $this->assertTrue($device->is_credential_configured);

        // Can be securely decrypted on server for authorized test probe
        $creds = $device->getDecryptedCredentials();
        $this->assertEquals('SECRET_PASSWORD_123', $creds['password']);
        $this->assertEquals('VERIF789', $creds['verification_code']);
    }

    public function test_cctv_activation_fails_if_device_is_not_connected()
    {
        $device = CameraDevice::create([
            'name' => 'CCTV Belum Diuji',
            'type' => 'cctv',
            'host' => '192.168.1.99',
            'port' => 554,
            'status' => 'belum_diuji',
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->postJson("/settings/verification-devices/devices/{$device->id}/activate");

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
        ]);
        $this->assertStringContainsString('belum terverifikasi terhubung', $response->json('message'));
    }

    public function test_webcam_can_be_activated_and_updates_attendance_settings()
    {
        $webcam = CameraDevice::create([
            'name' => 'Webcam Pos Masuk',
            'type' => 'webcam',
            'status' => 'terhubung',
            'resolution_requested' => '1280x720',
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->postJson("/settings/verification-devices/devices/{$webcam->id}/activate");

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $settings = AttendanceSetting::getSettings();
        $this->assertEquals($webcam->id, $settings->active_camera_id);
        $this->assertEquals('webcam_visual', $settings->identity_verification_mode);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'device.activated',
            'entity_type' => 'CameraDevice',
            'entity_id' => $webcam->id,
        ]);
    }

    public function test_emergency_fallback_switches_instantly_to_manual_officer_verification()
    {
        $webcam = CameraDevice::create([
            'name' => 'Webcam Aktif',
            'type' => 'webcam',
            'status' => 'terhubung',
        ]);

        AttendanceSetting::updateOrCreate(['id' => 1], [
            'identity_verification_mode' => 'webcam_visual',
            'active_camera_id' => $webcam->id,
            'qr_scanner_mode' => 'browser_camera',
            'fallback_mode' => 'officer_manual',
        ]);

        // Fallback triggered by petugas or admin
        $response = $this->actingAs($this->petugas)
            ->post('/scanner/fallback', [
                'reason' => 'Webcam freeze saat jam sibuk',
            ]);

        $response->assertRedirect();

        $settings = AttendanceSetting::getSettings();
        $this->assertEquals('officer_manual', $settings->identity_verification_mode);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'verification.switched_fallback',
        ]);
    }

    public function test_face_recognition_status_cannot_be_set_to_active_before_certified()
    {
        $response = $this->actingAs($this->superAdmin)
            ->put('/settings/verification-devices/attendance-settings', [
                'qr_scanner_mode' => 'browser_camera',
                'identity_verification_mode' => 'officer_manual',
                'face_recognition_status' => 'aktif',
            ]);

        $response->assertSessionHas('error');
        $this->assertEquals(
            'tidak_digunakan',
            AttendanceSetting::getSettings()->face_recognition_status
        );
    }
}
