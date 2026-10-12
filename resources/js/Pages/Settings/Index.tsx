import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Settings, Save, School, ShieldCheck, Clock } from 'lucide-react';

interface SettingsIndexProps {
    settings: {
        school_name: string;
        school_npsn: string;
        school_address: string;
        school_phone: string;
        school_email: string;
        school_website: string;
        timezone: string;
        headmaster_name: string;
        headmaster_nip: string;
        anti_titip_require_officer_confirm: string;
        late_tolerance_minutes: string;
    };
}

export default function SettingsIndex({ settings: initialSettings }: SettingsIndexProps) {
    const [formData, setFormData] = useState(initialSettings);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        router.put('/settings', formData, {
            onFinish: () => setIsSaving(false),
        });
    };

    return (
        <AuthenticatedLayout title="Pengaturan Konfigurasi Sekolah">
            <Head title="Pengaturan Sekolah" />

            <div className="space-y-6 max-w-4xl">
                <div className="flex items-center gap-3 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-3 rounded-xl bg-[#14433b] text-white">
                        <Settings className="w-6 h-6 text-[#21c9a4]" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900">
                            Pengaturan Profil Sekolah & Parameter Keamanan
                        </h2>
                        <p className="text-xs text-gray-500">
                            Konfigurasi identitas kop surat laporan resmi, zona waktu, dan aturan validasi anti-titip absen
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Profil Sekolah */}
                    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <School className="w-4 h-4 text-[#14433b]" />
                            <span>Identitas Sekolah & Kop Surat Laporan</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="sm:col-span-2">
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Nama Resmi Sekolah <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.school_name}
                                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">NPSN</label>
                                <input
                                    type="text"
                                    value={formData.school_npsn}
                                    onChange={(e) => setFormData({ ...formData, school_npsn: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Nomor Telepon</label>
                                <input
                                    type="text"
                                    value={formData.school_phone}
                                    onChange={(e) => setFormData({ ...formData, school_phone: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block font-semibold text-gray-700 mb-1">Alamat Lengkap</label>
                                <input
                                    type="text"
                                    value={formData.school_address}
                                    onChange={(e) => setFormData({ ...formData, school_address: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Nama Kepala Sekolah</label>
                                <input
                                    type="text"
                                    value={formData.headmaster_name}
                                    onChange={(e) => setFormData({ ...formData, headmaster_name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">NIP Kepala Sekolah</label>
                                <input
                                    type="text"
                                    value={formData.headmaster_nip}
                                    onChange={(e) => setFormData({ ...formData, headmaster_nip: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Zona Waktu & Aturan Keamanan */}
                    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <ShieldCheck className="w-4 h-4 text-[#14433b]" />
                            <span>Parameter Waktu & Keamanan Anti-Titip Absen</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Zona Waktu Server Sekolah <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                >
                                    <option value="Asia/Makassar">Asia/Makassar (WITA - Bali, NTB, NTT, Sulawesi)</option>
                                    <option value="Asia/Jakarta">Asia/Jakarta (WIB - Jawa, Sumatera, Kalbar, Kalteng)</option>
                                    <option value="Asia/Jayapura">Asia/Jayapura (WIT - Maluku, Papua)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Toleransi Terlambat Default (Menit)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={formData.late_tolerance_minutes}
                                    onChange={(e) => setFormData({ ...formData, late_tolerance_minutes: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                />
                            </div>

                            <div className="sm:col-span-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.anti_titip_require_officer_confirm === '1'}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            anti_titip_require_officer_confirm: e.target.checked ? '1' : '0'
                                        })}
                                        className="rounded border-emerald-300 text-[#14433b] focus:ring-[#21c9a4]"
                                    />
                                    <span className="font-bold">
                                        Wajibkan Verifikasi Identitas Visual oleh Petugas (Pilar Anti-Titip Absen)
                                    </span>
                                </label>
                                <p className="text-[11px] text-emerald-800 mt-1 pl-6">
                                    Jika aktif, setiap scan QR kartu akan menampilkan foto resmi siswa dan memerlukan konfirmasi petugas sebelum absensi dicatat sah.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-xl bg-[#14433b] text-white font-bold text-xs hover:bg-[#1b554b] shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4 text-[#21c9a4]" />
                            <span>{isSaving ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Pengaturan'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
