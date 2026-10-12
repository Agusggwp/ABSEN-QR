<?php

namespace App\Http\Controllers;

use App\Models\SchoolSetting;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class SchoolSettingController extends Controller
{
    public function index(): Response
    {
        $settings = [
            'school_name' => SchoolSetting::get('school_name', 'SMA ARTDEVATA DENPASAR'),
            'school_npsn' => SchoolSetting::get('school_npsn', '50102030'),
            'school_address' => SchoolSetting::get('school_address', 'Jl. Bypass Ngurah Rai No. 88, Denpasar, Bali'),
            'school_phone' => SchoolSetting::get('school_phone', '(0361) 234567'),
            'school_email' => SchoolSetting::get('school_email', 'info@artdevata.sch.id'),
            'school_website' => SchoolSetting::get('school_website', 'https://artdevata.sch.id'),
            'timezone' => SchoolSetting::get('timezone', 'Asia/Makassar'),
            'headmaster_name' => SchoolSetting::get('headmaster_name', 'Dr. Ni Ketut Suryani, M.Pd.'),
            'headmaster_nip' => SchoolSetting::get('headmaster_nip', '197505122000032001'),
            'anti_titip_require_officer_confirm' => SchoolSetting::get('anti_titip_require_officer_confirm', '1'),
            'late_tolerance_minutes' => SchoolSetting::get('late_tolerance_minutes', '15'),
        ];

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'school_name' => 'required|string|max:150',
            'school_npsn' => 'required|string|max:30',
            'school_address' => 'required|string|max:255',
            'school_phone' => 'nullable|string|max:30',
            'school_email' => 'nullable|email|max:100',
            'school_website' => 'nullable|string|max:150',
            'timezone' => 'required|string|in:Asia/Makassar,Asia/Jakarta,Asia/Jayapura',
            'headmaster_name' => 'required|string|max:100',
            'headmaster_nip' => 'nullable|string|max:30',
            'anti_titip_require_officer_confirm' => 'required|in:0,1',
            'late_tolerance_minutes' => 'required|integer|min:0|max:120',
        ]);

        foreach ($validated as $key => $value) {
            SchoolSetting::set($key, (string) $value);
        }

        AuditLog::log('school_settings.updated', 'SchoolSetting', null, null, $validated);

        return redirect()->back()->with('success', 'Pengaturan sekolah berhasil diperbarui.');
    }
}
