<?php

namespace App\Http\Controllers;

use App\Models\SchoolSetting;
use App\Models\AuditLog;
use App\Services\EzvizCctvService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

class EzvizCctvController extends Controller
{
    public function __construct(
        protected EzvizCctvService $cctvService
    ) {}

    public function index(): Response
    {
        $settings = [
            'cctv_enabled' => SchoolSetting::get('cctv_enabled', '0') === '1',
            'cctv_model' => SchoolSetting::get('cctv_model', 'EZVIZ H8c Outdoor Pan & Tilt'),
            'cctv_ip_address' => SchoolSetting::get('cctv_ip_address', '192.168.1.100'),
            'cctv_rtsp_port' => SchoolSetting::get('cctv_rtsp_port', '554'),
            'cctv_status' => SchoolSetting::get('cctv_status', 'Belum didukung (Fitur Opsional)'),
        ];

        $feasibilityReport = $this->cctvService->getFeasibilityAnalysis();

        return Inertia::render('Cctv/Index', [
            'settings' => $settings,
            'feasibility_report' => $feasibilityReport,
        ]);
    }

    public function probe(Request $request): JsonResponse
    {
        $ip = $request->query('ip', SchoolSetting::get('cctv_ip_address', '192.168.1.100'));
        $port = (int) $request->query('port', 554);

        $result = $this->cctvService->probeCctvConnection($ip, $port);

        // Update status di database berdasarkan hasil nyata
        SchoolSetting::set('cctv_status', $result['status_label']);

        AuditLog::log('cctv.probed', null, null, null, [
            'ip' => $ip,
            'port' => $port,
            'status' => $result['status_label'],
            'is_online' => $result['is_online'],
        ]);

        return response()->json($result);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'cctv_enabled' => 'required|boolean',
            'cctv_model' => 'required|string|max:100',
            'cctv_ip_address' => 'required|ip',
            'cctv_rtsp_port' => 'required|integer|min:1|max:65535',
        ]);

        SchoolSetting::set('cctv_enabled', $validated['cctv_enabled'] ? '1' : '0');
        SchoolSetting::set('cctv_model', $validated['cctv_model']);
        SchoolSetting::set('cctv_ip_address', $validated['cctv_ip_address']);
        SchoolSetting::set('cctv_rtsp_port', (string) $validated['cctv_rtsp_port']);

        AuditLog::log('cctv_settings.updated', null, null, null, $validated);

        return redirect()->back()->with('success', 'Konfigurasi integrasi CCTV berhasil disimpan.');
    }
}
