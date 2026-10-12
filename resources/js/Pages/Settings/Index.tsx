import React, { useState, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Settings, Save, School, ShieldCheck, Upload, Trash2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

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
        logo_path?: string | null;
    };
}

export default function SettingsIndex({ settings: initialSettings }: SettingsIndexProps) {
    const [formData, setFormData] = useState(initialSettings);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileError(null);

        if (!file) return;

        // Validasi ukuran berkas (maksimal 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setFileError('Ukuran berkas logo terlalu besar. Maksimal 2MB.');
            return;
        }

        // Validasi tipe berkas
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            setFileError('Format berkas harus berupa PNG, JPG, WebP, atau SVG.');
            return;
        }

        setLogoFile(file);
        setRemoveLogo(false);
        const reader = new FileReader();
        reader.onload = (event) => {
            setLogoPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleTriggerUpload = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        setRemoveLogo(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCancelLogoChange = () => {
        setLogoFile(null);
        setLogoPreview(null);
        setRemoveLogo(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const dataToSend = new FormData();
        dataToSend.append('_method', 'put');
        dataToSend.append('school_name', formData.school_name || '');
        dataToSend.append('school_npsn', formData.school_npsn || '');
        dataToSend.append('school_address', formData.school_address || '');
        dataToSend.append('school_phone', formData.school_phone || '');
        dataToSend.append('school_email', formData.school_email || '');
        dataToSend.append('school_website', formData.school_website || '');
        dataToSend.append('timezone', formData.timezone || 'Asia/Makassar');
        dataToSend.append('headmaster_name', formData.headmaster_name || '');
        dataToSend.append('headmaster_nip', formData.headmaster_nip || '');
        dataToSend.append('anti_titip_require_officer_confirm', formData.anti_titip_require_officer_confirm || '1');
        dataToSend.append('late_tolerance_minutes', String(formData.late_tolerance_minutes || '15'));

        if (logoFile) {
            dataToSend.append('logo', logoFile);
        }

        if (removeLogo) {
            dataToSend.append('remove_logo', '1');
        }

        router.post('/settings', dataToSend, {
            forceFormData: true,
            onSuccess: () => {
                setLogoFile(null);
                setLogoPreview(null);
                setRemoveLogo(false);
            },
            onFinish: () => setIsSaving(false),
        });
    };

    // Tentukan URL logo yang ditampilkan
    const currentStoredLogo = !removeLogo && initialSettings.logo_path ? `/storage/${initialSettings.logo_path}` : null;
    const activeLogoUrl = logoPreview || currentStoredLogo;

    return (
        <AuthenticatedLayout title="Pengaturan Konfigurasi Sekolah">
            <Head title="Pengaturan Sekolah" />

            <div className="space-y-5 max-w-4xl">
                <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div className="p-2.5 rounded-lg bg-[#14433b] text-white">
                        <Settings className="w-5 h-5 text-[#21c9a4]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Pengaturan Profil Sekolah & Logo
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Konfigurasi logo instansi, identitas resmi kop surat laporan, zona waktu, dan aturan validasi anti-titip absen
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Bagian Logo Sekolah */}
                    <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-4">
                        <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <ImageIcon className="w-4 h-4 text-[#14433b]" />
                            <span>Logo Sekolah & Identitas Visual Aplikasi</span>
                        </h3>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                            {/* Kotak Preview Logo */}
                            <div className="relative group shrink-0">
                                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 flex items-center justify-center overflow-hidden p-2">
                                    {activeLogoUrl ? (
                                        <img
                                            src={activeLogoUrl}
                                            alt="Logo Sekolah"
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#14433b] to-[#1c5d52] text-[#21c9a4] font-black text-2xl flex items-center justify-center shadow-xs">
                                            A
                                        </div>
                                    )}
                                </div>
                                {activeLogoUrl && (
                                    <div className="absolute -top-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-xs" title="Logo Aktif">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                )}
                            </div>

                            {/* Tombol Aksi Logo & Keterangan */}
                            <div className="space-y-2 flex-1">
                                <p className="text-xs font-bold text-slate-900">
                                    {logoFile
                                        ? `Berkas Baru: ${logoFile.name}`
                                        : removeLogo
                                        ? 'Logo akan dihapus saat disimpan (menggunakan logo bawaan)'
                                        : activeLogoUrl
                                        ? 'Logo Resmi Sekolah Terpasang'
                                        : 'Belum Ada Logo Kustom Terpasang'}
                                </p>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Logo ini akan otomatis ditampilkan di bilah navigasi (Sidebar), formulir login, portal siswa, dan kop laporan resmi. Gunakan format PNG transparan, JPG, WebP, atau SVG dengan ukuran maksimal 2MB.
                                </p>

                                {fileError && (
                                    <p className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                                        {fileError}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleTriggerUpload}
                                        className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
                                    >
                                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                                        <span>{activeLogoUrl ? 'Ganti Logo' : 'Unggah Logo'}</span>
                                    </button>

                                    {(activeLogoUrl || logoFile) && !removeLogo && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveLogo}
                                            className="px-3 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                            <span>Hapus Logo</span>
                                        </button>
                                    )}

                                    {(logoFile || removeLogo) && (
                                        <button
                                            type="button"
                                            onClick={handleCancelLogoChange}
                                            className="px-3 py-1.5 rounded-md text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors"
                                        >
                                            Batalkan Pilihan
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profil Sekolah */}
                    <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-4">
                        <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <School className="w-4 h-4 text-[#14433b]" />
                            <span>Identitas Sekolah & Kop Surat Laporan</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div className="sm:col-span-2">
                                <label className="block font-medium text-slate-700 mb-1">
                                    Nama Resmi Sekolah <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.school_name}
                                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">NPSN</label>
                                <input
                                    type="text"
                                    value={formData.school_npsn}
                                    onChange={(e) => setFormData({ ...formData, school_npsn: e.target.value })}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">Nomor Telepon</label>
                                <input
                                    type="text"
                                    value={formData.school_phone}
                                    onChange={(e) => setFormData({ ...formData, school_phone: e.target.value })}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block font-medium text-slate-700 mb-1">Alamat Lengkap</label>
                                <input
                                    type="text"
                                    value={formData.school_address}
                                    onChange={(e) => setFormData({ ...formData, school_address: e.target.value })}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">Nama Kepala Sekolah</label>
                                <input
                                    type="text"
                                    value={formData.headmaster_name}
                                    onChange={(e) => setFormData({ ...formData, headmaster_name: e.target.value })}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">NIP Kepala Sekolah</label>
                                <input
                                    type="text"
                                    value={formData.headmaster_nip}
                                    onChange={(e) => setFormData({ ...formData, headmaster_nip: e.target.value })}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Zona Waktu & Aturan Keamanan */}
                    <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-4">
                        <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <ShieldCheck className="w-4 h-4 text-[#14433b]" />
                            <span>Parameter Waktu & Keamanan Anti-Titip Absen</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Zona Waktu Server Sekolah <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                >
                                    <option value="Asia/Makassar">Asia/Makassar (WITA - Bali, NTB, NTT, Sulawesi)</option>
                                    <option value="Asia/Jakarta">Asia/Jakarta (WIB - Jawa, Sumatera, Kalbar, Kalteng)</option>
                                    <option value="Asia/Jayapura">Asia/Jayapura (WIT - Maluku, Papua)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Toleransi Terlambat Default (Menit)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={formData.late_tolerance_minutes}
                                    onChange={(e) => setFormData({ ...formData, late_tolerance_minutes: e.target.value })}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                />
                            </div>

                            <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.anti_titip_require_officer_confirm === '1'}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            anti_titip_require_officer_confirm: e.target.checked ? '1' : '0'
                                        })}
                                        className="rounded border-slate-300 text-[#14433b] focus:ring-[#14433b]"
                                    />
                                    <span className="font-semibold text-slate-900">
                                        Wajibkan Verifikasi Identitas Visual oleh Petugas (Pilar Anti-Titip Absen)
                                    </span>
                                </label>
                                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                                    Jika aktif, setiap scan QR kartu akan menampilkan foto resmi siswa dan memerlukan konfirmasi petugas sebelum absensi dicatat sah.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 rounded-md bg-[#14433b] text-white font-medium text-xs hover:bg-[#1a554a] shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                            <Save className="w-3.5 h-3.5 text-[#21c9a4]" />
                            <span>{isSaving ? 'Menyimpan Pengaturan...' : 'Simpan Pengaturan'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

