<?php

namespace Database\Seeders;

use App\Models\CameraDevice;
use App\Models\AttendanceSetting;
use App\Models\User;
use Illuminate\Database\Seeder;

class VerificationDeviceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superAdmin = User::where('role', 'super_admin')->first();
        $adminId = $superAdmin?->id;

        // 1. Webcam Bawaan / USB Pos Gerbang
        $webcam = CameraDevice::updateOrCreate(
            ['name' => 'Webcam HD Komputer / Laptop Pos Gerbang'],
            [
                'type' => 'webcam',
                'brand' => 'Logitech / Built-in',
                'model' => 'HD 720p / 1080p Video Capture',
                'location' => 'Pos Penjagaan Gerbang Utama',
                'host' => null,
                'port' => null,
                'protocol' => 'browser_stream',
                'status' => 'terhubung',
                'browser_device_id' => 'default',
                'resolution_requested' => '1280x720',
                'last_checked_at' => now(),
                'created_by' => $adminId,
            ]
        );

        // 2. CCTV EZVIZ H8c Gerbang Barat
        $cctv = CameraDevice::updateOrCreate(
            ['name' => 'CCTV EZVIZ H8c Gerbang Barat'],
            [
                'type' => 'cctv',
                'brand' => 'EZVIZ',
                'model' => 'H8c Outdoor Pan & Tilt',
                'location' => 'Pilar Pintu Gerbang Barat (Arah Masuk)',
                'host' => '192.168.1.200',
                'port' => 554,
                'protocol' => 'rtsp',
                'status' => 'belum_diuji',
                'browser_device_id' => null,
                'resolution_requested' => '1920x1080',
                'last_checked_at' => null,
                'created_by' => $adminId,
            ]
        );

        // Set kredensial terenkripsi contoh untuk CCTV
        $cctv->setEncryptedCredentials([
            'username' => 'admin',
            'password' => 'L2345678', // Verification code pada stiker EZVIZ
            'verification_code' => 'L2345678',
        ]);
        $cctv->save();

        // 3. Konfigurasi Sistem Absensi Awal
        AttendanceSetting::updateOrCreate(
            ['id' => 1],
            [
                'qr_scanner_mode' => 'browser_camera',
                'identity_verification_mode' => 'webcam_visual',
                'active_camera_id' => $webcam->id,
                'fallback_mode' => 'officer_manual',
                'face_recognition_status' => 'sedang_diuji',
                'allow_manual_fallback' => true,
                'require_visual_photo_matching' => true,
                'updated_by' => $adminId,
            ]
        );
    }
}
