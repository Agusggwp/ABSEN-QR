<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\StudentImportController;
use App\Http\Controllers\StudentQrCardController;
use App\Http\Controllers\AttendanceScannerController;
use App\Http\Controllers\AttendanceHistoryController;
use App\Http\Controllers\AttendanceCorrectionController;
use App\Http\Controllers\AttendanceExceptionController;
use App\Http\Controllers\ClassroomConfirmationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SchoolClassController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\ScheduleSessionController;
use App\Http\Controllers\ScannerDeviceController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\SchoolSettingController;
use App\Http\Controllers\VerificationDeviceController;
use App\Http\Controllers\EzvizCctvController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

// Redirect Home to Dashboard or Login
Route::get('/', function () {
    return auth()->check() ? redirect()->route('dashboard') : redirect()->route('login');
});

Route::middleware(['auth'])->group(function () {
    // 1. Dashboard (All authenticated roles)
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // 2. Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // 3. Scanner QR Terminal (Petugas, Admin Sekolah, Super Admin)
    Route::middleware(['role:super_admin,admin_sekolah,petugas_absensi'])->group(function () {
        Route::get('/scanner', [AttendanceScannerController::class, 'index'])->name('scanner.index');
        Route::post('/scanner/pre-scan', [AttendanceScannerController::class, 'preScan'])->middleware('throttle:60,1')->name('scanner.pre-scan');
        Route::post('/scanner/confirm', [AttendanceScannerController::class, 'confirm'])->middleware('throttle:60,1')->name('scanner.confirm');
        Route::post('/scanner/reject', [AttendanceScannerController::class, 'reject'])->name('scanner.reject');
    });

    // 4. Data Siswa & Impor (Admin Sekolah, Super Admin)
    Route::middleware(['role:super_admin,admin_sekolah'])->group(function () {
        Route::get('/students/import', [StudentImportController::class, 'index'])->name('students.import');
        Route::get('/students/import/template', [StudentImportController::class, 'downloadTemplate'])->name('students.import.template');
        Route::post('/students/import/preview', [StudentImportController::class, 'preview'])->name('students.import.preview');
        Route::post('/students/import/commit', [StudentImportController::class, 'commit'])->name('students.import.commit');
        Route::resource('students', StudentController::class);

        // Kartu QR Siswa
        Route::get('/qr-cards', [StudentQrCardController::class, 'index'])->name('qr-cards.index');
        Route::post('/qr-cards/{student}/regenerate', [StudentQrCardController::class, 'regenerate'])->name('qr-cards.regenerate');
        Route::post('/qr-cards/{card}/revoke', [StudentQrCardController::class, 'revoke'])->name('qr-cards.revoke');
        Route::get('/qr-cards/{student}/print', [StudentQrCardController::class, 'printSingle'])->name('qr-cards.print-single');
        Route::get('/qr-cards/print-bulk', [StudentQrCardController::class, 'printBulk'])->name('qr-cards.print-bulk');

        // Data Kelas
        Route::resource('classes', SchoolClassController::class)->except(['create', 'edit', 'show']);

        // Data Guru
        Route::resource('teachers', TeacherController::class)->except(['create', 'edit', 'show']);

        // Jadwal & Sesi Absensi
        Route::get('/schedules', [ScheduleSessionController::class, 'index'])->name('schedules.index');
        Route::put('/schedules/{schedule}', [ScheduleSessionController::class, 'updateSchedule'])->name('schedules.update');
        Route::post('/sessions/toggle', [ScheduleSessionController::class, 'toggleSession'])->name('sessions.toggle');
        Route::post('/sessions', [ScheduleSessionController::class, 'storeSession'])->name('sessions.store');

        // Perangkat Scanner
        Route::resource('devices', ScannerDeviceController::class)->except(['create', 'edit', 'show']);

        // Pengaturan Sistem Absensi -> Perangkat Verifikasi (Kamera & CCTV)
        Route::get('/settings/verification-devices', [VerificationDeviceController::class, 'index'])->name('verification-devices.index');
        Route::put('/settings/verification-devices/attendance-settings', [VerificationDeviceController::class, 'updateAttendanceSettings'])->name('verification-devices.update-settings');
        Route::post('/settings/verification-devices/devices', [VerificationDeviceController::class, 'storeDevice'])->name('verification-devices.store-device');
        Route::put('/settings/verification-devices/devices/{device}', [VerificationDeviceController::class, 'updateDevice'])->name('verification-devices.update-device');
        Route::delete('/settings/verification-devices/devices/{device}', [VerificationDeviceController::class, 'destroyDevice'])->name('verification-devices.destroy-device');
        Route::post('/settings/verification-devices/devices/{device}/test', [VerificationDeviceController::class, 'testDevice'])->name('verification-devices.test-device');
        Route::post('/settings/verification-devices/devices/{device}/activate', [VerificationDeviceController::class, 'activateDevice'])->name('verification-devices.activate-device');
        Route::post('/settings/verification-devices/devices/{device}/deactivate', [VerificationDeviceController::class, 'deactivateDevice'])->name('verification-devices.deactivate-device');
        Route::post('/settings/verification-devices/test-cctv', [VerificationDeviceController::class, 'testCctvConnectionDirect'])->name('verification-devices.test-cctv-direct');
        Route::post('/settings/verification-devices/fallback', [VerificationDeviceController::class, 'switchToFallback'])->name('verification-devices.fallback');

        // Pengaturan Sekolah
        Route::get('/settings', [SchoolSettingController::class, 'index'])->name('settings.index');
        Route::put('/settings', [SchoolSettingController::class, 'update'])->name('settings.update');

        // Integrasi CCTV
        Route::get('/cctv', [EzvizCctvController::class, 'index'])->name('cctv.index');
        Route::get('/cctv/probe', [EzvizCctvController::class, 'probe'])->name('cctv.probe');
        Route::put('/cctv', [EzvizCctvController::class, 'update'])->name('cctv.update');
    });

    // Fallback switch route for Scanner Terminal
    Route::middleware(['role:super_admin,admin_sekolah,petugas_absensi'])->group(function () {
        Route::post('/scanner/fallback', [VerificationDeviceController::class, 'switchToFallback'])->name('scanner.fallback');
    });

    // 5. Konfirmasi Kehadiran Kelas (Guru / Wali Kelas, Admin, Super Admin)
    Route::middleware(['role:super_admin,admin_sekolah,guru_wali'])->group(function () {
        Route::get('/classroom', [ClassroomConfirmationController::class, 'index'])->name('classroom.index');
        Route::post('/classroom', [ClassroomConfirmationController::class, 'store'])->name('classroom.store');

        // Izin dan Sakit
        Route::get('/exceptions', [AttendanceExceptionController::class, 'index'])->name('exceptions.index');
        Route::post('/exceptions', [AttendanceExceptionController::class, 'store'])->name('exceptions.store');
        Route::delete('/exceptions/{exception}', [AttendanceExceptionController::class, 'destroy'])->name('exceptions.destroy');
    });

    // 6. Riwayat Absensi & Koreksi (Admin, Super Admin, Guru, Kepala Sekolah)
    Route::middleware(['role:super_admin,admin_sekolah,guru_wali,kepala_sekolah'])->group(function () {
        Route::get('/attendance-history', [AttendanceHistoryController::class, 'index'])->name('attendance-history.index');
    });

    // Koreksi Absensi (Khusus Admin Sekolah & Super Admin, Wajib Catat Alasan)
    Route::middleware(['role:super_admin,admin_sekolah'])->group(function () {
        Route::post('/attendances/{attendance}/correct', [AttendanceCorrectionController::class, 'store'])->name('attendances.correct');
    });

    // 7. Laporan & Ekspor (Admin, Super Admin, Kepala Sekolah, Guru)
    Route::middleware(['role:super_admin,admin_sekolah,guru_wali,kepala_sekolah'])->group(function () {
        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('/reports/export-excel', [ReportController::class, 'exportExcel'])->name('reports.export-excel');
        Route::get('/reports/export-pdf', [ReportController::class, 'exportPdf'])->name('reports.export-pdf');
    });

    // 8. Pengguna & Hak Akses (Super Admin Only)
    Route::middleware(['role:super_admin'])->group(function () {
        Route::resource('users', UserManagementController::class)->except(['create', 'edit', 'show']);
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    });
});

require __DIR__.'/auth.php';
