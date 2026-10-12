import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Radio, Plus, Edit2, Trash2, X, Wifi, WifiOff } from 'lucide-react';
import { ScannerDevice, User } from '@/types';

interface DevicesIndexProps {
    devices: (ScannerDevice & { assigned_user?: User | null })[];
    officers: { id: number; name: string }[];
}

export default function DevicesIndex({ devices, officers }: DevicesIndexProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editDeviceId, setEditDeviceId] = useState<number | null>(null);

    const [deviceName, setDeviceName] = useState('');
    const [locationDescription, setLocationDescription] = useState('');
    const [assignedUserId, setAssignedUserId] = useState<string>('');
    const [ipAddress, setIpAddress] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const openAddModal = () => {
        setIsEditing(false);
        setEditDeviceId(null);
        setDeviceName('');
        setLocationDescription('');
        setAssignedUserId('');
        setIpAddress('');
        setIsActive(true);
        setModalOpen(true);
    };

    const openEditModal = (dev: any) => {
        setIsEditing(true);
        setEditDeviceId(dev.id);
        setDeviceName(dev.device_name);
        setLocationDescription(dev.location_description || '');
        setAssignedUserId(dev.assigned_user_id ? String(dev.assigned_user_id) : '');
        setIpAddress(dev.ip_address || '');
        setIsActive(dev.is_active);
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload: any = {
            device_name: deviceName,
            location_description: locationDescription,
            assigned_user_id: assignedUserId ? Number(assignedUserId) : null,
            ip_address: ipAddress || null,
            is_active: isActive,
        };

        if (isEditing && editDeviceId) {
            router.put(`/devices/${editDeviceId}`, payload, {
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            });
        } else {
            router.post('/devices', payload, {
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            });
        }
    };

    const handleDelete = (dev: any) => {
        if (confirm(`Hapus perangkat "${dev.device_name}"?`)) {
            router.delete(`/devices/${dev.id}`);
        }
    };

    return (
        <AuthenticatedLayout title="Manajemen Perangkat Scanner">
            <Head title="Perangkat Scanner" />

            <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Radio className="w-4 h-4 text-[#14433b]" />
                            <span>Stasiun & Terminal Scanner ({devices.length} Perangkat)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Kelola pos penjagaan, identifier otorisasi hardware, dan penugasan petugas scanner
                        </p>
                    </div>

                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#14433b] text-white hover:bg-[#1a554a] transition-colors shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5 text-[#21c9a4]" />
                        <span>Daftarkan Scanner Baru</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {devices.map((dev) => (
                        <div key={dev.id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                        {dev.device_identifier}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditModal(dev)}
                                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                                            title="Edit Perangkat"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(dev)}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                                            title="Hapus Perangkat"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">{dev.device_name}</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Lokasi: <span className="text-slate-700 font-medium">{dev.location_description || 'Gerbang'}</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Petugas: <span className="text-slate-700 font-medium">{dev.assigned_user?.name || '(Semua Petugas)'}</span>
                                </p>
                            </div>

                            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-mono text-[11px]">{dev.ip_address || 'DHCP'}</span>
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                                    dev.is_active
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                    {dev.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Tambah / Edit Perangkat */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-white rounded-lg p-5 shadow-lg border border-slate-200 space-y-4 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold text-slate-900">
                                {isEditing ? 'Edit Perangkat Scanner' : 'Daftarkan Scanner Baru'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Nama Perangkat <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={deviceName}
                                    onChange={(e) => setDeviceName(e.target.value)}
                                    placeholder="Contoh: Gerbang Utama Pos 1"
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">Lokasi Pemasangan</label>
                                <input
                                    type="text"
                                    value={locationDescription}
                                    onChange={(e) => setLocationDescription(e.target.value)}
                                    placeholder="Pos Penjagaan Depan / Lobi Gedung Barat"
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">Petugas Otoritas Khusus</label>
                                <select
                                    value={assignedUserId}
                                    onChange={(e) => setAssignedUserId(e.target.value)}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                >
                                    <option value="">Semua Petugas Resmi</option>
                                    {officers.map((o) => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">Alamat IP Lokal (Opsional)</label>
                                <input
                                    type="text"
                                    value={ipAddress}
                                    onChange={(e) => setIpAddress(e.target.value)}
                                    placeholder="192.168.1.50"
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                />
                            </div>

                            {isEditing && (
                                <div>
                                    <label className="block font-medium text-slate-700 mb-1">Status Keaktifan</label>
                                    <select
                                        value={isActive ? '1' : '0'}
                                        onChange={(e) => setIsActive(e.target.value === '1')}
                                        className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    >
                                        <option value="1">Aktif</option>
                                        <option value="0">Nonaktif</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#14433b] rounded-md hover:bg-[#1a554a] shadow-xs disabled:opacity-50 transition-colors"
                                >
                                    {isSaving ? 'Menyimpan...' : 'Simpan Perangkat'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
