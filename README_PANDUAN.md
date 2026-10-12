# PANDUAN DEPLOYMENT, OPERASIONAL & ARSITEKTUR KEAMANAN
## ARTDEVATA SCHOOL ATTENDANCE SYSTEM (ANTI-TITIP ABSEN)

Silakan lihat panduan operasional dan arsitektur lengkap yang tersimpan pada:
- Dokumen Desain Sistem & ERD: `system_architecture_and_design.md`
- Panduan Deployment & Checklist Produksi: `deployment_and_operations_guide.md`

### Akun Login Demo (Password: password123)
- Super Admin: `superadmin@artdevata.sch.id`
- Admin Sekolah: `admin@artdevata.sch.id`
- Petugas Scanner: `petugas.gerbang@artdevata.sch.id`
- Guru / Wali Kelas: `guru.wali@artdevata.sch.id`
- Kepala Sekolah: `kepsek@artdevata.sch.id`

### Menjalankan Sistem Lokal
1. Server MySQL/MariaDB: Port 3306 (database `artdevata_absen_qr`)
2. Laravel Server: `php artisan serve`
3. Frontend Dev Server: `npm run dev` atau produksi `npm run build`
4. Menjalankan Automated Tests: `php artisan test` (53 Tests, 166 assertions passing 100%)

### Modul Pengaturan Perangkat Verifikasi (Kamera & CCTV):
- Menu Sidebar: **Pengaturan → Perangkat Verifikasi** (`/settings/verification-devices`)
- Pilihan Metode: Webcam Laptop/PC, CCTV IP (EZVIZ H8c / RTSP), Mode Fallback Petugas Manual.
- Pemisahan Mode Pemindaian QR (Browser Camera vs USB Scanner) dan Mode Verifikasi Identitas.
- Proteksi SSRF, kredensial CCTV terenkripsi (Crypt::encryptString), dan MediaDevices API webcam dengan frame test snapshot.
