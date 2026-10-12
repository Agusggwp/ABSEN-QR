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

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Radio className="w-5 h-5 text-[#14433b]" />
                            <span>Stasiun & Terminal Scanner ({devices.length} Perangkat)</span>
                        </h2>
                        <p className="text-xs text-gray-500">
                            Kelola pos penjagaan, identifier otorisasi hardware, dan penugasan petugas scanner
                        </p>
                    </div>

                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#14433b] text-white hover:bg-[#1b554b] shadow-sm active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4 text-[#21c9a4]" />
                        <span>Daftarkan Scanner Baru</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devices.map((dev) => (
                        <div key={dev.id} className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                        {dev.device_identifier}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditModal(dev)}
                                            className="p-1 text-gray-400 hover:text-emerald-700 rounded-md"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(dev)}
                                            className="p-1 text-gray-400 hover:text-rose-600 rounded-md"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-base font-bold text-gray-900">{dev.device_name}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Lokasi: <span className="text-gray-700 font-medium">{dev.location_description || 'Gerbang'}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Petugas: <strong className="text-gray-700">{dev.assigned_user?.name || '(Siapa saja)'}</strong>
                                </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                <span className="text-gray-400 font-mono text-[11px]">{dev.ip_address || 'DHCP'}</span>
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    dev.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {dev.is_active ? 'AKTIF' : 'NONAKTIF'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Tambah / Edit Perangkat */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900">
                                {isEditing ? 'Edit Perangkat Scanner' : 'Daftarkan Scanner Baru'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Nama Perangkat <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={deviceName}
                                    onChange={(e) => setDeviceName(e.target.value)}
                                    placeholder="Contoh: Gerbang Utama Pos 1"
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Lokasi Pemasangan</label>
                                <input
                                    type="text"
                                    value={locationDescription}
                                    onChange={(e) => setLocationDescription(e.target.value)}
                                    placeholder="Pos Penjagaan Depan / Lobi Gedung Barat"
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Petugas Otoritas Khusus</label>
                                <select
                                    value={assignedUserId}
                                    onChange={(e) => setAssignedUserId(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                >
                                    <option value="">Semua Petugas Resmi</option>
                                    {officers.map((o) => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Alamat IP Lokal (Opsional)</label>
                                <input
                                    type="text"
                                    value={ipAddress}
                                    onChange={(e) => setIpAddress(e.target.value)}
                                    placeholder="192.168.1.50"
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                />
                            </div>

                            {isEditing && (
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Status Keaktifan</label>
                                    <select
                                        value={isActive ? '1' : '0'}
                                        onChange={(e) => setIsActive(e.target.value === '1')}
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    >
                                        <option value="1">Aktif</option>
                                        <option value="0">Nonaktif</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-100"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 text-xs font-bold text-white bg-[#14433b] rounded-lg hover:bg-[#1b554b] shadow-sm disabled:opacity-50"
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
