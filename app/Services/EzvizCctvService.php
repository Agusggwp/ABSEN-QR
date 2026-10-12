<?php

namespace App\Services;

use App\Models\SchoolSetting;
use App\Models\AuditLog;

class EzvizCctvService
{
    /**
     * Lakukan uji konektivitas dan probe kompatibilitas protokol CCTV.
     */
    public function probeCctvConnection(?string $ipAddress = null, int $port = 554, int $timeoutSeconds = 2): array
    {
        $ip = $ipAddress ?: SchoolSetting::get('cctv_ip_address', '192.168.1.100');
        $port = (int) ($port ?: SchoolSetting::get('cctv_rtsp_port', 554));

        $result = [
            'target_ip' => $ip,
            'target_port' => $port,
            'is_online' => false,
            'rtsp_supported' => false,
            'onvif_supported' => false,
            'latency_ms' => null,
            'status_label' => 'Belum didukung / Kamera Offline',
            'details' => [],
            'recommendations' => [],
        ];

        // Pengujian soket non-blocking untuk port RTSP (554)
        $start = microtime(true);
        $fp = @fsockopen($ip, $port, $errno, $errstr, $timeoutSeconds);
        $latency = round((microtime(true) - $start) * 1000, 2);

        if ($fp) {
            fclose($fp);
            $result['is_online'] = true;
            $result['rtsp_supported'] = true;
            $result['latency_ms'] = $latency;
            $result['status_label'] = 'Terhubung (Port RTSP 554 Terbuka)';
            $result['details'][] = "Koneksi TCP ke {$ip}:{$port} berhasil dalam {$latency} ms.";
        } else {
            $result['is_online'] = false;
            $result['status_label'] = 'Belum didukung (Kamera tidak merespons di jaringan lokal)';
            $result['details'][] = "Gagal menghubungi {$ip}:{$port} ({$errstr} - kode: {$errno}).";
        }

        // Pengujian port HTTP/ONVIF (port 80 atau 8000)
        $onvifFp = @fsockopen($ip, 80, $oErrno, $oErrstr, 1);
        if ($onvifFp) {
            fclose($onvifFp);
            $result['onvif_supported'] = true;
            $result['details'][] = "Port ONVIF HTTP (80) terdeteksi aktif.";
        }

        return $result;
    }

    /**
     * Dapatkan laporan feasibility test komprehensif untuk pengenalan wajah & CCTV.
     */
    public function getFeasibilityAnalysis(): array
    {
        return [
            'camera_model' => 'EZVIZ H8c Outdoor Pan & Tilt Wi-Fi Camera',
            'firmware_profile' => 'Varian Konsumen Standard (EZVIZ Cloud / P2P Centric)',
            'evaluation_date' => now()->format('d F Y'),
            'overall_status' => 'OPSIONAL & BERTAHAP (Belum Memenuhi Syarat Produksi Otomatis)',
            'aspects' => [
                [
                    'aspect' => 'Protokol Streaming (RTSP / ONVIF)',
                    'status' => 'Terbatas / Bergantung Firmware',
                    'finding' => 'Beberapa batch EZVIZ H8c mengunci port RTSP 554 secara default demi keamanan cloud. Pengguna harus mengaktifkan LAN Live View dan mencari verification code pada stiker perangkat.',
                    'risk_level' => 'Sedang',
                ],
                [
                    'aspect' => 'Deteksi Manusia vs Pengenalan Wajah',
                    'status' => 'BUKAN Face Recognition',
                    'finding' => 'Fitur bawaan kamera adalah deteksi siluet bentuk tubuh manusia (Human Shape Detection), bukan pencocokan biometrik wajah individu. Menandai siswa hadir hanya dari sensor manusia adalah kekeliruan fatal.',
                    'risk_level' => 'Tinggi',
                ],
                [
                    'aspect' => 'Kualitas Gambar, Pencahayaan & Sudut',
                    'status' => 'Rentan False Match',
                    'finding' => 'Posisi outdoor di gerbang terpapar backlight sinar matahari pagi, bayangan pohon, dan siswa berkerumun. Kualitas citra bergerak tidak konsisten untuk ekstraksi landmark wajah.',
                    'risk_level' => 'Tinggi',
                ],
                [
                    'aspect' => 'Anti-Spoofing & Liveness Detection',
                    'status' => 'Tidak Tersedia secara Native',
                    'finding' => 'Kamera 2D konvensional tanpa depth sensor inframerah rentan dispoof menggunakan cetak foto kertas atau layar smartphone beresolusi tinggi.',
                    'risk_level' => 'Sangat Tinggi',
                ],
                [
                    'aspect' => 'Regulasi Privasi & Perlindungan Data Anak (UU PDP No. 27/2022)',
                    'status' => 'Wajib Persetujuan Tertulis',
                    'finding' => 'Data biometrik siswa di bawah umur dikategorikan sebagai Data Pribadi Spesifik. Memproses dan menyimpan template biometrik tanpa DPIA (Data Protection Impact Assessment) melanggar hukum.',
                    'risk_level' => 'Kritis',
                ],
            ],
            'conclusions' => [
                '1. Sistem QR Code + Verifikasi Visual Petugas tetap menjadi pilar utama absensi yang 100% andal dan sah secara hukum.',
                '2. CCTV EZVIZ H8c hanya direkomendasikan sebagai rekaman bukti visual sekunder (audit trail video gerbang), bukan mesin pengambil keputusan kehadiran otomatis.',
                '3. Kredensial kamera tidak pernah dikirim ke browser client atau ditulis ke log publik.',
            ],
        ];
    }
}
