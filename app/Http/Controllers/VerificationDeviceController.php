<?php

namespace App\Http\Controllers;

use App\Models\CameraDevice;
use App\Models\AttendanceSetting;
use App\Models\DeviceTestLog;
use App\Models\AuditLog;
use App\Services\CameraVerificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Exception;

class VerificationDeviceController extends Controller
{
    public function __construct(
        protected CameraVerificationService $cameraService
    ) {}

    /**
     * Tampilkan halaman Pengaturan Perangkat Verifikasi.
     */
    public function index(Request $request): Response
    {
        $settings = AttendanceSetting::getSettings()->load('activeCamera');
        $devices = CameraDevice::with('creator')->latest()->get();
        $recentLogs = DeviceTestLog::with(['cameraDevice', 'testedByUser'])
            ->latest('tested_at')
            ->take(8)
            ->get();

        return Inertia::render('Settings/VerificationDevices', [
            'settings' => $settings,
            'devices' => $devices,
            'recent_logs' => $recentLogs,
            'allowed_ports' => [80, 443, 554, 1935, 8000, 8080, 8081, 8554, 8888, 37777],
        ]);
    }

    /**
     * Simpan pengaturan mode absensi dan verifikasi.
     */
    public function updateAttendanceSettings(Request $request): RedirectResponse
    {
        $request->validate([
            'qr_scanner_mode' => 'required|in:browser_camera,usb_scanner',
            'identity_verification_mode' => 'required|in:officer_manual,webcam_visual,cctv_visual',
            'active_camera_id' => 'nullable|exists:camera_devices,id',
            'face_recognition_status' => 'required|in:tidak_digunakan,belum_dikonfigurasi,sedang_diuji,siap_diujicoba,aktif,gangguan',
            'allow_manual_fallback' => 'boolean',
            'require_visual_photo_matching' => 'boolean',
        ]);

        // Pengaman: Jangan izinkan face_recognition_status = 'aktif' sebelum mesin teruji sah
        if ($request->input('face_recognition_status') === 'aktif') {
            return back()->with('error', 'Status "Aktif" untuk verifikasi wajah otomatis belum dapat diaktifkan sebelum mesin biometrik teruji akurasi, anti-spoofing, dan kepatuhan UU PDP.');
        }

        $verificationMode = $request->input('identity_verification_mode');
        $activeCameraId = $request->input('active_camera_id');

        // Jika mode webcam atau CCTV dipilih, pastikan perangkat kamera dipilih dan valid
        if (in_array($verificationMode, ['webcam_visual', 'cctv_visual'])) {
            if (!$activeCameraId) {
                return back()->with('error', 'Pilih perangkat kamera yang valid untuk mode verifikasi ' . ($verificationMode === 'webcam_visual' ? 'Webcam' : 'CCTV') . '.');
            }

            $device = CameraDevice::find($activeCameraId);
            if (!$device) {
                return back()->with('error', 'Perangkat kamera yang dipilih tidak ditemukan.');
            }

            if ($verificationMode === 'cctv_visual' && $device->type !== 'cctv') {
                return back()->with('error', 'Perangkat yang dipilih bukan tipe CCTV IP Camera.');
            }

            if ($verificationMode === 'webcam_visual' && $device->type !== 'webcam') {
                return back()->with('error', 'Perangkat yang dipilih bukan tipe Webcam.');
            }
        }

        $settings = AttendanceSetting::getSettings();
        $before = $settings->toArray();

        $settings->update([
            'qr_scanner_mode' => $request->input('qr_scanner_mode'),
            'identity_verification_mode' => $verificationMode,
            'active_camera_id' => in_array($verificationMode, ['webcam_visual', 'cctv_visual']) ? $activeCameraId : null,
            'face_recognition_status' => $request->input('face_recognition_status'),
            'allow_manual_fallback' => $request->boolean('allow_manual_fallback', true),
            'require_visual_photo_matching' => $request->boolean('require_visual_photo_matching', true),
            'updated_by' => auth()->id(),
        ]);

        AuditLog::log(
            action: 'attendance_settings.updated',
            entityType: 'AttendanceSetting',
            entityId: $settings->id,
            payloadBefore: $before,
            payloadAfter: $settings->fresh()->toArray(),
            userId: auth()->id()
        );

        return back()->with('success', 'Konfigurasi sistem absensi & perangkat verifikasi berhasil disimpan.');
    }

    /**
     * Tambah perangkat kamera baru (Webcam atau CCTV).
     */
    public function storeDevice(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'type' => 'required|in:webcam,cctv',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:150',
            'host' => 'nullable|required_if:type,cctv|string|max:191',
            'port' => 'nullable|required_if:type,cctv|integer|min:1|max:65535',
            'protocol' => 'nullable|in:browser_stream,rtsp,onvif,http',
            'browser_device_id' => 'nullable|string|max:255',
            'resolution_requested' => 'nullable|string|max:50',
            'username' => 'nullable|string|max:100',
            'password' => 'nullable|string|max:150',
            'verification_code' => 'nullable|string|max:100',
        ]);

        if ($request->input('type') === 'cctv') {
            $validation = $this->cameraService->validateCctvTarget(
                $request->input('host'),
                (int) $request->input('port', 554)
            );

            if (!$validation['is_valid']) {
                return back()->with('error', $validation['message']);
            }
        }

        $device = new CameraDevice([
            'name' => $request->input('name'),
            'type' => $request->input('type'),
            'brand' => $request->input('brand'),
            'model' => $request->input('model'),
            'location' => $request->input('location'),
            'host' => $request->input('host'),
            'port' => $request->input('port') ? (int) $request->input('port') : null,
            'protocol' => $request->input('protocol', $request->input('type') === 'cctv' ? 'rtsp' : 'browser_stream'),
            'browser_device_id' => $request->input('browser_device_id'),
            'resolution_requested' => $request->input('resolution_requested', '1280x720'),
            'status' => 'belum_diuji',
            'created_by' => auth()->id(),
        ]);

        // Simpan kredensial terenkripsi (tidak pernah teks polos)
        if ($request->filled('username') || $request->filled('password') || $request->filled('verification_code')) {
            $device->setEncryptedCredentials([
                'username' => $request->input('username'),
                'password' => $request->input('password'),
                'verification_code' => $request->input('verification_code'),
            ]);
        }

        $device->save();

        AuditLog::log(
            action: 'device.created',
            entityType: 'CameraDevice',
            entityId: $device->id,
            payloadBefore: null,
            payloadAfter: [
                'name' => $device->name,
                'type' => $device->type,
                'location' => $device->location,
            ],
            userId: auth()->id()
        );

        return back()->with('success', "Perangkat {$device->name} berhasil ditambahkan ke daftar.");
    }

    /**
     * Perbarui konfigurasi perangkat kamera.
     */
    public function updateDevice(Request $request, CameraDevice $device): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:150',
            'host' => 'nullable|string|max:191',
            'port' => 'nullable|integer|min:1|max:65535',
            'protocol' => 'nullable|in:browser_stream,rtsp,onvif,http',
            'browser_device_id' => 'nullable|string|max:255',
            'resolution_requested' => 'nullable|string|max:50',
            'username' => 'nullable|string|max:100',
            'password' => 'nullable|string|max:150',
            'verification_code' => 'nullable|string|max:100',
        ]);

        if ($device->type === 'cctv' && $request->filled('host')) {
            $validation = $this->cameraService->validateCctvTarget(
                $request->input('host'),
                (int) $request->input('port', $device->port ?? 554)
            );

            if (!$validation['is_valid']) {
                return back()->with('error', $validation['message']);
            }
        }

        $device->name = $request->input('name');
        $device->brand = $request->input('brand');
        $device->model = $request->input('model');
        $device->location = $request->input('location');

        if ($device->type === 'cctv') {
            $device->host = $request->input('host');
            $device->port = $request->input('port') ? (int) $request->input('port') : 554;
            $device->protocol = $request->input('protocol', 'rtsp');
        } else {
            $device->browser_device_id = $request->input('browser_device_id');
            $device->resolution_requested = $request->input('resolution_requested', '1280x720');
        }

        // Update kredensial jika diisi (jika kosong, pertahankan yang lama)
        if ($request->filled('username') || $request->filled('password') || $request->filled('verification_code')) {
            $existing = $device->getDecryptedCredentials() ?? [];
            $device->setEncryptedCredentials([
                'username' => $request->input('username', $existing['username'] ?? null),
                'password' => $request->filled('password') ? $request->input('password') : ($existing['password'] ?? null),
                'verification_code' => $request->input('verification_code', $existing['verification_code'] ?? null),
            ]);
        }

        $device->save();

        AuditLog::log(
            action: 'device.updated',
            entityType: 'CameraDevice',
            entityId: $device->id,
            payloadBefore: null,
            payloadAfter: [
                'name' => $device->name,
                'location' => $device->location,
            ],
            userId: auth()->id()
        );

        return back()->with('success', "Perangkat {$device->name} berhasil diperbarui.");
    }

    /**
     * Hapus perangkat kamera.
     */
    public function destroyDevice(CameraDevice $device): RedirectResponse
    {
        $settings = AttendanceSetting::getSettings();
        if ($settings->active_camera_id === $device->id) {
            $this->cameraService->switchToFallback(auth()->id(), "Perangkat {$device->name} dihapus dari sistem.");
        }

        $name = $device->name;
        $device->delete();

        AuditLog::log(
            action: 'device.deleted',
            entityType: 'CameraDevice',
            entityId: $device->id,
            payloadBefore: ['name' => $name],
            payloadAfter: null,
            userId: auth()->id()
        );

        return back()->with('success', "Perangkat {$name} berhasil dihapus.");
    }

    /**
     * Jalankan uji koneksi pada perangkat tersimpan.
     */
    public function testDevice(CameraDevice $device): JsonResponse
    {
        $result = $this->cameraService->testAndLogDevice($device, auth()->id());
        return response()->json($result);
    }

    /**
     * Jalankan uji koneksi langsung sebelum form disimpan (Live Diagnostic).
     */
    public function testCctvConnectionDirect(Request $request): JsonResponse
    {
        $request->validate([
            'host' => 'required|string',
            'port' => 'required|integer',
            'protocol' => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        $result = $this->cameraService->testCctvConnection(
            host: $request->input('host'),
            port: (int) $request->input('port'),
            protocol: $request->input('protocol', 'rtsp'),
            username: $request->input('username'),
            password: $request->input('password')
        );

        return response()->json($result);
    }

    /**
     * Aktifkan perangkat sebagai kamera verifikasi aktif.
     */
    public function activateDevice(CameraDevice $device): JsonResponse|RedirectResponse
    {
        try {
            $result = $this->cameraService->activateDevice($device, auth()->id());

            if (request()->wantsJson()) {
                return response()->json($result);
            }

            return back()->with('success', $result['message']);
        } catch (Exception $e) {
            if (request()->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Nonaktifkan kamera dan kembali ke mode manual petugas.
     */
    public function deactivateDevice(CameraDevice $device): JsonResponse|RedirectResponse
    {
        $settings = AttendanceSetting::getSettings();
        if ($settings->active_camera_id === $device->id) {
            $result = $this->cameraService->switchToFallback(auth()->id(), "Perangkat {$device->name} dinonaktifkan.");
            $device->update(['status' => 'nonaktif']);

            if (request()->wantsJson()) {
                return response()->json($result);
            }

            return back()->with('success', "Perangkat {$device->name} dinonaktifkan. Sistem beralih ke verifikasi manual.");
        }

        $device->update(['status' => 'nonaktif']);
        return back()->with('success', "Status perangkat {$device->name} diubah menjadi nonaktif.");
    }

    /**
     * Beralih ke Mode Cadangan Darurat (Fallback Mode).
     */
    public function switchToFallback(Request $request): RedirectResponse
    {
        $result = $this->cameraService->switchToFallback(auth()->id(), $request->input('reason', 'Dialihkan manual oleh admin'));
        return back()->with('success', $result['message']);
    }
}
