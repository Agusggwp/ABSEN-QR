<?php

namespace Tests\Feature;

use App\Models\SchoolSetting;
use App\Models\User;
use App\Services\EzvizCctvService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EzvizCctvTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        SchoolSetting::set('cctv_ip_address', '192.168.1.100');
        SchoolSetting::set('cctv_rtsp_port', '554');
        SchoolSetting::set('cctv_enabled', '0');

        $this->admin = User::factory()->create([
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);
    }

    public function test_cctv_diagnostics_returns_honest_unsupported_status_when_offline()
    {
        $response = $this->actingAs($this->admin)->getJson('/cctv/probe?ip=127.0.0.1&port=554');

        $response->assertOk();
        $data = $response->json();

        $this->assertArrayHasKey('is_online', $data);
        $this->assertArrayHasKey('target_ip', $data);
        $this->assertArrayHasKey('status_label', $data);
        $this->assertFalse($data['is_online']);
    }

    public function test_cctv_service_generates_comprehensive_feasibility_analysis()
    {
        $service = new EzvizCctvService();
        $analysis = $service->getFeasibilityAnalysis();

        $this->assertArrayHasKey('camera_model', $analysis);
        $this->assertArrayHasKey('aspects', $analysis);
        $this->assertArrayHasKey('conclusions', $analysis);
        $this->assertStringContainsString('EZVIZ H8c', $analysis['camera_model']);
        $this->assertStringContainsString('OPSIONAL & BERTAHAP', $analysis['overall_status']);
    }
}
