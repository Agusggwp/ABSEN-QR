<?php

namespace App\Http\Controllers;

use App\Models\ScannerDevice;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;

class ScannerDeviceController extends Controller
{
    public function index(): Response
    {
        $devices = ScannerDevice::with('assignedUser')->get();
        $officers = User::whereIn('role', ['petugas_absensi', 'admin_sekolah'])->where('is_active', true)->get(['id', 'name']);

        return Inertia::render('Devices/Index', [
            'devices' => $devices,
            'officers' => $officers,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'device_name' => 'required|string|max:100',
            'location_description' => 'nullable|string|max:150',
            'assigned_user_id' => 'nullable|exists:users,id',
            'ip_address' => 'nullable|ip',
        ]);

        $deviceIdentifier = 'DEV-' . Str::upper(Str::random(8));

        $device = ScannerDevice::create([
            ...$validated,
            'device_identifier' => $deviceIdentifier,
            'is_active' => true,
        ]);

        AuditLog::log('device.created', 'ScannerDevice', $device->id, null, $device->toArray());

        return redirect()->back()->with('success', "Perangkat scanner {$device->device_name} berhasil didaftarkan.");
    }

    public function update(Request $request, ScannerDevice $device): RedirectResponse
    {
        $validated = $request->validate([
            'device_name' => 'required|string|max:100',
            'location_description' => 'nullable|string|max:150',
            'assigned_user_id' => 'nullable|exists:users,id',
            'ip_address' => 'nullable|ip',
            'is_active' => 'required|boolean',
        ]);

        $old = $device->toArray();
        $device->update($validated);

        AuditLog::log('device.updated', 'ScannerDevice', $device->id, $old, $device->toArray());

        return redirect()->back()->with('success', "Perangkat scanner {$device->device_name} berhasil diperbarui.");
    }

    public function destroy(ScannerDevice $device): RedirectResponse
    {
        $old = $device->toArray();
        $device->delete();

        AuditLog::log('device.deleted', 'ScannerDevice', $device->id, $old, null);

        return redirect()->back()->with('success', "Perangkat {$device->device_name} berhasil dihapus.");
    }
}
