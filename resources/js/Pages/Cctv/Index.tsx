import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Camera,
    Activity,
    ShieldAlert,
    AlertTriangle,
    Save,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Info,
    Lock,
} from 'lucide-react';

interface CctvIndexProps {
    settings: {
        cctv_enabled: boolean;
        cctv_model: string;
        cctv_ip_address: string;
        cctv_rtsp_port: string;
        cctv_status: string;
    };
    feasibility_report: {
        camera_model: string;
        firmware_profile: string;
        evaluation_date: string;
        overall_status: string;
        aspects: Array<{
            aspect: string;
            status: string;
            finding: string;
            risk_level: string;
        }>;
        conclusions: string[];
    };
}

export default function CctvIndex({ settings: initialSettings, feasibility_report }: CctvIndexProps) {
    const [formData, setFormData] = useState(initialSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [isProbing, setIsProbing] = useState(false);
    const [probeResult, setProbeResult] = useState<any>(null);

    const handleProbe = async () => {
        setIsProbing(true);
        try {
            const res = await axios.get(`/cctv/probe?ip=${formData.cctv_ip_address}&port=${formData.cctv_rtsp_port}`);
            setProbeResult(res.data);
            setFormData((prev) => ({ ...prev, cctv_status: res.data.status_label }));
        } catch (e: any) {
            setProbeResult({
                is_online: false,
                status_label: 'Koneksi gagal / Kamera offline',
                details: [e.message || 'Gagal menghubungi probe backend.'],
            });
        } finally {
            setIsProbing(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        router.put('/cctv', formData, {
            onFinish: () => setIsSaving(false),
        });
    };

    return (
        <AuthenticatedLayout title="Integrasi CCTV EZVIZ H8c & Uji Kelayakan Biometrik">
            <Head title="Integrasi CCTV EZVIZ H8c" />

            <div className="space-y-5">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                Fitur Opsional & Terisolasi
                            </span>
                            <span className="text-xs text-slate-500 font-mono">EZVIZ H8c 2K / Pan-Tilt</span>
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-[#14433b]" />
                            <span>Integrasi CCTV Kamera Gerbang & Laporan Kelayakan</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Pengujian koneksi RTSP/ONVIF lokal dan telaah risiko keamanan biometrik wajah siswa
                        </p>
                    </div>

                    <button
                        onClick={handleProbe}
                        disabled={isProbing}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 shadow-xs disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isProbing ? 'animate-spin' : ''}`} />
                        <span>{isProbing ? 'Menguji Jaringan...' : 'Uji Koneksi Kamera'}</span>
                    </button>
                </div>

                {/* Probe Live Status Alert if Available */}
                {probeResult && (
                    <div className={`p-3.5 rounded-lg border text-xs shadow-xs space-y-1 animate-in fade-in ${
                        probeResult.is_online
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                        <div className="flex items-center gap-2 font-semibold text-xs">
                            {probeResult.is_online ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertTriangle className="w-4 h-4 text-amber-700" />}
                            <span>Hasil Uji Real-time: {probeResult.status_label}</span>
                        </div>
                        {probeResult.details?.map((d: string, i: number) => (
                            <p key={i} className="text-[11px] opacity-90 pl-6">· {d}</p>
                        ))}
                    </div>
                )}

                {/* Feasibility Analysis Report */}
                <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-rose-700" />
                                <span>Laporan Uji Kelayakan Biometrik Wajah (Feasibility Study)</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Berdasarkan evaluasi teknis sensor kamera EZVIZ H8c dan kepatuhan UU PDP No. 27/2022
                            </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            {feasibility_report.overall_status}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {feasibility_report.aspects.map((item, idx) => (
                            <div key={idx} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-900">{item.aspect}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                        item.risk_level === 'Kritis' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                        item.risk_level === 'Sangat Tinggi' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                        'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                        Risiko {item.risk_level}
                                    </span>
                                </div>
                                <p className="text-xs font-medium text-[#14433b]">{item.status}</p>
                                <p className="text-[11px] text-slate-600 leading-relaxed">{item.finding}</p>
                            </div>
                        ))}
                    </div>

                    {/* Official Recommendations */}
                    <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 space-y-2">
                        <strong className="text-xs text-slate-900 block font-semibold">
                            Kesimpulan & Rekomendasi Arsitektur Keamanan:
                        </strong>
                        <ul className="space-y-1 text-[11px] text-slate-600 list-disc pl-4">
                            {feasibility_report.conclusions.map((c, i) => (
                                <li key={i}>{c}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* CCTV Hardware Settings Form */}
                <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-xs font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#14433b]" />
                        <span>Konfigurasi Jaringan Kamera EZVIZ H8c</span>
                    </h3>

                    <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="block font-medium text-slate-700 mb-1">Model Kamera</label>
                                <input
                                    type="text"
                                    value={formData.cctv_model}
                                    onChange={(e) => setFormData({ ...formData, cctv_model: e.target.value })}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Alamat IP Kamera Lokal (LAN)
                                </label>
                                <input
                                    type="text"
                                    value={formData.cctv_ip_address}
                                    onChange={(e) => setFormData({ ...formData, cctv_ip_address: e.target.value })}
                                    placeholder="192.168.1.100"
                                    className="w-full rounded-md border-slate-300 text-xs font-mono focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">Port RTSP (Default 554)</label>
                                <input
                                    type="number"
                                    value={formData.cctv_rtsp_port}
                                    onChange={(e) => setFormData({ ...formData, cctv_rtsp_port: e.target.value })}
                                    className="w-full rounded-md border-slate-300 text-xs font-mono focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">Status Kamera</label>
                                <input
                                    type="text"
                                    value={formData.cctv_status}
                                    readOnly
                                    className="w-full rounded-md border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium cursor-not-allowed"
                                />
                            </div>

                            <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 flex items-start gap-2">
                                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                <span className="text-[11px] leading-relaxed">
                                    <strong>Proteksi Kredensial:</strong> Password dan kode verifikasi kamera tidak disimpan di source code frontend maupun diakses oleh JavaScript browser. Akses stream diproteksi secara ketat di jaringan intranet sekolah.
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-4 py-2 rounded-md bg-[#14433b] text-white font-medium text-xs hover:bg-[#1a554a] shadow-xs disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                <Save className="w-3.5 h-3.5 text-[#21c9a4]" />
                                <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi Kamera'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
