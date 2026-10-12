<?php

use App\Models\User;
use App\Models\SchoolSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can view school settings page', function () {
    $admin = User::factory()->create([
        'role' => 'admin_sekolah',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)->get('/settings');

    $response->assertStatus(200);
});

test('admin can upload school logo and update settings', function () {
    Storage::fake('public');

    $admin = User::factory()->create([
        'role' => 'admin_sekolah',
        'is_active' => true,
    ]);

    $file = UploadedFile::fake()->image('school_logo.png', 200, 200);

    $response = $this->actingAs($admin)->post('/settings', [
        '_method' => 'put',
        'school_name' => 'SMA KEBANGSAAN ARTDEVATA',
        'school_npsn' => '50102030',
        'school_address' => 'Jl. Pendidikan No. 12',
        'school_phone' => '(0361) 998877',
        'school_email' => 'admin@artdevata.sch.id',
        'school_website' => 'https://artdevata.sch.id',
        'timezone' => 'Asia/Makassar',
        'headmaster_name' => 'Dr. Suryani, M.Pd.',
        'headmaster_nip' => '197505122000032001',
        'anti_titip_require_officer_confirm' => '1',
        'late_tolerance_minutes' => '15',
        'logo' => $file,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $logoPath = SchoolSetting::get('logo_path');
    expect($logoPath)->not->toBeNull();
    Storage::disk('public')->assertExists($logoPath);
});

test('admin can remove school logo', function () {
    Storage::fake('public');

    $admin = User::factory()->create([
        'role' => 'admin_sekolah',
        'is_active' => true,
    ]);

    // Set an initial logo
    $file = UploadedFile::fake()->image('old_logo.png');
    $path = $file->store('logos', 'public');
    SchoolSetting::set('logo_path', $path);

    expect(SchoolSetting::get('logo_path'))->toBe($path);

    // Request remove logo
    $response = $this->actingAs($admin)->post('/settings', [
        '_method' => 'put',
        'school_name' => 'SMA KEBANGSAAN ARTDEVATA',
        'school_npsn' => '50102030',
        'school_address' => 'Jl. Pendidikan No. 12',
        'timezone' => 'Asia/Makassar',
        'headmaster_name' => 'Dr. Suryani, M.Pd.',
        'anti_titip_require_officer_confirm' => '1',
        'late_tolerance_minutes' => '15',
        'remove_logo' => '1',
    ]);

    $response->assertRedirect();
    expect(SchoolSetting::get('logo_path'))->toBeNull();
    Storage::disk('public')->assertMissing($path);
});
