<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login()
    {
        $response = $this->get('/dashboard');
        $response->assertRedirect('/login');
    }

    public function test_super_admin_can_access_all_modules()
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $this->actingAs($superAdmin);

        $this->get('/dashboard')->assertOk();
        $this->get('/students')->assertOk();
        $this->get('/scanner')->assertOk();
        $this->get('/attendance-history')->assertOk();
        $this->get('/reports')->assertOk();
        $this->get('/users')->assertOk();
        $this->get('/audit-logs')->assertOk();
        $this->get('/settings')->assertOk();
        $this->get('/cctv')->assertOk();
    }

    public function test_petugas_absensi_restricted_from_settings_and_users()
    {
        $petugas = User::factory()->create([
            'role' => 'petugas_absensi',
            'is_active' => true,
        ]);

        $this->actingAs($petugas);

        // Can access scanner and dashboard
        $this->get('/dashboard')->assertOk();
        $this->get('/scanner')->assertOk();

        // Forbidden from settings and user management
        $this->get('/settings')->assertForbidden();
        $this->get('/users')->assertForbidden();
        $this->get('/audit-logs')->assertForbidden();
    }

    public function test_guru_wali_can_access_classroom_and_reports_but_not_device_settings()
    {
        $guru = User::factory()->create([
            'role' => 'guru_wali',
            'is_active' => true,
        ]);

        $this->actingAs($guru);

        $this->get('/dashboard')->assertOk();
        $this->get('/classroom')->assertOk();
        $this->get('/reports')->assertOk();

        $this->get('/devices')->assertForbidden();
        $this->get('/settings')->assertForbidden();
    }

    public function test_kepala_sekolah_can_view_reports_and_dashboard()
    {
        $kepsek = User::factory()->create([
            'role' => 'kepala_sekolah',
            'is_active' => true,
        ]);

        $this->actingAs($kepsek);

        $this->get('/dashboard')->assertOk();
        $this->get('/reports')->assertOk();
        $this->get('/attendance-history')->assertOk();

        $this->get('/students')->assertForbidden();
        $this->get('/settings')->assertForbidden();
        $this->get('/users')->assertForbidden();
    }
}
