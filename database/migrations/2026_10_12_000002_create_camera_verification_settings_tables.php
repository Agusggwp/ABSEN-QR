<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Camera Devices (Webcam & CCTV IP Cameras)
        Schema::create('camera_devices', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->enum('type', ['webcam', 'cctv'])->default('webcam')->index();
            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('location', 150)->nullable();
            $table->string('host', 191)->nullable();
            $table->unsignedInteger('port')->nullable();
            $table->string('protocol', 50)->nullable()->default('browser_stream'); // 'browser_stream', 'rtsp', 'onvif', 'http'
            $table->longText('credential_reference')->nullable(); // Encrypted JSON (username, password, verification code)
            $table->enum('status', [
                'terhubung',
                'tidak_terhubung',
                'belum_diuji',
                'tidak_memiliki_izin',
                'stream_tidak_tersedia',
                'konfigurasi_tidak_valid',
                'nonaktif',
                'gangguan'
            ])->default('belum_diuji')->index();
            $table->string('browser_device_id', 255)->nullable();
            $table->string('resolution_requested', 50)->nullable()->default('1280x720');
            $table->timestamp('last_checked_at')->nullable();
            $table->json('last_test_result')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Attendance Settings (Pemisahan Mode Pemindaian QR & Mode Verifikasi Identitas)
        Schema::create('attendance_settings', function (Blueprint $table) {
            $table->id();
            // Mode Pemindaian QR: Kamera Browser vs Barcode Scanner USB
            $table->enum('qr_scanner_mode', ['browser_camera', 'usb_scanner'])->default('browser_camera');
            // Mode Verifikasi Identitas: Petugas Manual, Webcam Visual, CCTV Visual
            $table->enum('identity_verification_mode', ['officer_manual', 'webcam_visual', 'cctv_visual'])->default('officer_manual');
            $table->foreignId('active_camera_id')->nullable()->constrained('camera_devices')->nullOnDelete();
            $table->enum('fallback_mode', ['officer_manual'])->default('officer_manual');
            $table->enum('face_recognition_status', [
                'tidak_digunakan',
                'belum_dikonfigurasi',
                'sedang_diuji',
                'siap_diujicoba',
                'aktif',
                'gangguan'
            ])->default('tidak_digunakan');
            $table->boolean('allow_manual_fallback')->default(true);
            $table->boolean('require_visual_photo_matching')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 3. Device Test Logs (Audit pengujian perangkat kamera & CCTV)
        Schema::create('device_test_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('camera_device_id')->constrained('camera_devices')->cascadeOnDelete();
            $table->foreignId('tested_by')->constrained('users')->cascadeOnDelete();
            $table->string('test_type', 50); // e.g. 'socket_probe', 'browser_permission', 'rtsp_stream', 'snapshot_test'
            $table->enum('result', ['success', 'failed', 'warning'])->default('success');
            $table->string('error_code', 100)->nullable();
            $table->text('message')->nullable();
            $table->json('details')->nullable();
            $table->timestamp('tested_at')->useCurrent()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('device_test_logs');
        Schema::dropIfExists('attendance_settings');
        Schema::dropIfExists('camera_devices');
    }
};
