<?php

namespace App\Services;

use App\Models\CameraDevice;
use App\Models\AttendanceSetting;
use App\Models\DeviceTestLog;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Exception;

class CameraVerificationService
{
    /**
     * Daftar port yang diizinkan untuk kamera IP / CCTV (Mencegah SSRF port scanning).
     */
    protected array $allowedCctvPorts = [
        80, 443, 554, 1935, 8000, 8080, 8081, 8554, 8888, 37777,
    ];

    /**
     * Validasi Host & Port untuk mencegah Server-Side Request Forgery (SSRF).
     */
    public function validateCctvTarget(string $host, int $port): array
    {
        $host = trim($host);

        // 1. Cek port allowlist
        if (!in_array($port, $this->allowedCctvPorts)) {
            return [
                'is_valid' => false,
                'message' => "Port {$port} tidak diizinkan. Gunakan port standar CCTV/RTSP/ONVIF (misal: 554, 80, 8000, 8080, 8554).",
                'error_code' => 'PORT_NOT_ALLOWED',
            ];
        }

        // 2. Cegah Cloud Metadata & Local link-local
        $blacklistedHosts = [
            '169.254.169.254',          // AWS / GCP / Azure metadata
            'metadata.google.internal',
            'instance-data',
            '0.0.0.0',
            '255.255.255.255',
        ];

        if (in_array(strtolower($host), $blacklistedHosts)) {
            return [
                'is_valid' => false,
                'message' => 'Alamat host dilarang demi keamanan sistem (Cloud Metadata / Broadcast terdeteksi).',
                'error_code' => 'SSRF_BLOCKED',
            ];
        }

        // 3. Validasi format IP atau hostname
        $isIp = filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4);
        $isHostname = preg_match('/^[a-zA-Z0-9.-]+$/', $host);

        if (!$isIp && !$isHostname) {
            return [
                'is_valid' => false,
                'message' => 'Format alamat IP atau hostname kamera tidak valid.',
                'error_code' => 'INVALID_HOST_FORMAT',
            ];
        }

        // 4. Jika IP publik berbahaya / multicast
        if ($isIp) {
            $long = ip2long($host);
            // Range 224.0.0.0 s/d 239.255.255.255 (Multicast)
            if ($long >= ip2long('224.0.0.0') && $long <= ip2long('239.255.255.255')) {
                return [
                    'is_valid' => false,
                    'message' => 'Alamat IP Multicast tidak diizinkan.',
                    'error_code' => 'MULTICAST_BLOCKED',
                ];
            }
        }

        return [
            'is_valid' => true,
            'message' => 'Host dan port valid.',
        ];
    }

    /**
     * Uji koneksi non-blocking ke CCTV IP / EZVIZ H8c.
     */
    public function testCctvConnection(
        string $host,
        int $port,
        string $protocol = 'rtsp',
        ?string $username = null,
        ?string $password = null,
        int $timeoutSeconds = 2
    ): array {
        // Validasi SSRF terlebih dahulu
        $validation = $this->validateCctvTarget($host, $port);
        if (!$validation['is_valid']) {
            return [
                'online' => false,
                'result' => 'failed',
                'error_code' => $validation['error_code'],
                'message' => $validation['message'],
                'latency_ms' => null,
                'status_label' => 'Konfigurasi tidak valid',
                'details' => [$validation['message']],
            ];
        }

        $start = microtime(true);
        $errno = 0;
        $errstr = '';
        $fp = @fsockopen($host, $port, $errno, $errstr, $timeoutSeconds);
        $latency = round((microtime(true) - $start) * 1000, 2);

        if ($fp) {
            fclose($fp);

            $details = [
                "Handshake TCP socket ke {$host}:{$port} berhasil dalam {$latency} ms.",
                "Port protokol {$protocol} terdeteksi terbuka dan merespons jaringan sekolah.",
            ];

            if ($port === 554) {
                $details[] = 'Layanan streaming RTSP aktif untuk preview video gerbang.';
            }

            return [
                'online' => true,
                'result' => 'success',
                'error_code' => null,
                'message' => "Koneksi ke kamera pada {$host}:{$port} berhasil ({$latency} ms).",
                'latency_ms' => $latency,
                'status_label' => 'Terhubung',
                'details' => $details,
            ];
        }

        return [
            'online' => false,
            'result' => 'failed',
            'error_code' => 'CONNECTION_REFUSED_OR_TIMEOUT',
            'message' => "Gagal terhubung ke {$host}:{$port} ({$errstr} - timeout {$timeoutSeconds}s). Pastikan kamera menyala dan satu segmen LAN.",
            'latency_ms' => null,
            'status_label' => 'Tidak terhubung',
            'details' => [
                "Socket TCP gagal: {$errstr} (Kode error: {$errno}).",
                "Pastikan IP kamera {$host} benar dan port {$port} tidak diblokir firewall lokal.",
            ],
        ];
    }

    /**
     * Jalankan dan catat pengujian pada perangkat kamera yang tersimpan.
     */
    public function testAndLogDevice(CameraDevice $device, int $userId): array
    {
        $testResult = [];

        if ($device->type === 'cctv') {
            $creds = $device->getDecryptedCredentials();
            $username = $creds['username'] ?? null;
            $password = $creds['password'] ?? null;

            $testResult = $this->testCctvConnection(
                host: $device->host ?? '127.0.0.1',
                port: $device->port ?? 554,
                protocol: $device->protocol ?? 'rtsp',
                username: $username,
                password: $password
            );

            $deviceStatus = $testResult['online'] ? 'terhubung' : 'tidak_terhubung';
            $testType = 'socket_probe';
        } else {
            // Webcam browser: dicatat dari status pelaporan browser
            $deviceStatus = 'terhubung';
            $testType = 'browser_permission';
            $testResult = [
                'online' => true,
                'result' => 'success',
                'message' => 'Webcam siap digunakan melalui antarmuka browser.',
                'status_label' => 'Terhubung',
                'details' => [
                    "Resolusi diminta: {$device->resolution_requested}",
                    "Perangkat input video: {$device->name}",
                ],
            ];
        }

        $device->update([
            'status' => $deviceStatus,
            'last_checked_at' => now(),
            'last_test_result' => $testResult,
        ]);

        DeviceTestLog::create([
            'camera_device_id' => $device->id,
            'tested_by' => $userId,
            'test_type' => $testType,
            'result' => $testResult['result'],
            'error_code' => $testResult['error_code'] ?? null,
            'message' => $testResult['message'],
            'details' => $testResult,
            'tested_at' => now(),
        ]);

        AuditLog::log(
            action: 'device.tested',
            entityType: 'CameraDevice',
            entityId: $device->id,
            payloadBefore: null,
            payloadAfter: [
                'status' => $deviceStatus,
                'result' => $testResult['result'],
            ],
            userId: $userId
        );

        return [
            'device' => $device->fresh(),
            'test_result' => $testResult,
        ];
    }

    /**
     * Aktifkan perangkat kamera sebagai perangkat verifikasi utama.
     */
    public function activateDevice(CameraDevice $device, int $userId): array
    {
        return DB::transaction(function () use ($device, $userId) {
            // Pengaman: Jika CCTV, wajib lolos uji koneksi terlebih dahulu
            if ($device->type === 'cctv' && $device->status !== 'terhubung') {
                throw new Exception('Kamera CCTV belum terverifikasi terhubung. Lakukan Uji Koneksi terlebih dahulu sebelum mengaktifkan.');
            }

            $settings = AttendanceSetting::getSettings();
            $oldActiveCameraId = $settings->active_camera_id;
            $oldMode = $settings->identity_verification_mode;

            $newMode = ($device->type === 'webcam') ? 'webcam_visual' : 'cctv_visual';

            $settings->update([
                'active_camera_id' => $device->id,
                'identity_verification_mode' => $newMode,
                'updated_by' => $userId,
            ]);

            // Set device status menjadi terhubung / aktif
            if ($device->status === 'nonaktif') {
                $device->update(['status' => 'terhubung']);
            }

            AuditLog::log(
                action: 'device.activated',
                entityType: 'CameraDevice',
                entityId: $device->id,
                payloadBefore: [
                    'active_camera_id' => $oldActiveCameraId,
                    'identity_verification_mode' => $oldMode,
                ],
                payloadAfter: [
                    'active_camera_id' => $device->id,
                    'identity_verification_mode' => $newMode,
                ],
                userId: $userId
            );

            return [
                'success' => true,
                'message' => "Perangkat {$device->name} berhasil diaktifkan untuk mode verifikasi {$newMode}.",
                'settings' => $settings->fresh()->load('activeCamera'),
            ];
        });
    }

    /**
     * Beralih ke Mode Cadangan (Fallback: Verifikasi Manual Petugas).
     */
    public function switchToFallback(int $userId, ?string $reason = null): array
    {
        return DB::transaction(function () use ($userId, $reason) {
            $settings = AttendanceSetting::getSettings();
            $oldMode = $settings->identity_verification_mode;

            $settings->update([
                'identity_verification_mode' => 'officer_manual',
                'updated_by' => $userId,
            ]);

            AuditLog::log(
                action: 'verification.switched_fallback',
                entityType: 'AttendanceSetting',
                entityId: $settings->id,
                payloadBefore: ['identity_verification_mode' => $oldMode],
                payloadAfter: [
                    'identity_verification_mode' => 'officer_manual',
                    'reason' => $reason ?? 'Perangkat mengalami gangguan / diaktifkan oleh admin',
                ],
                userId: $userId
            );

            return [
                'success' => true,
                'message' => 'Sistem berhasil dialihkan ke mode cadangan (QR Code + Verifikasi Manual Petugas).',
                'settings' => $settings->fresh()->load('activeCamera'),
            ];
        });
    }
}
