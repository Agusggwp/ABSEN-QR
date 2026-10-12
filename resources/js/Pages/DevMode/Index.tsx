import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Terminal,
    Zap,
    Play,
    Dice5,
    Layers,
    Trash2,
    Calendar,
    Search,
    ShieldCheck,
    Unlock,
    Lock,
    RefreshCw,
    Users,
    CheckCircle2,
    AlertTriangle,
    Database,
    Code,
    Clock,
    Copy,
    Check,
    BarChart3,
    Eye,
} from 'lucide-react';

interface DevModeProps {
    session: {
        id: number;
        date: string;
        type: string;
        status: string;
        start_time: string;
        end_time: string;
        late_time: string;
    } | null;
    students: Array<{
        id: number;
        name: string;
        nis: string;
        class_name: string;
        card_number: string;
        has_qr: boolean;
    }>;
    devices: Array<{
        id: number;
        device_name: string;
        device_identifier: string;
    }>;
    stats: {
        total_students: number;
        total_classes: number;
        today_attendances: number;
        total_dev_scans: number;
        total_audit_logs: number;
    };
    recent_dev_scans: Array<{
        id: number;
        student_name: string;
        nis: string;
        class_name: string;
        status: string;
        date: string;
        time: string;
        notes: string;
    }>;
}

export default function DevModeIndex({
    session: initialSession,
    students = [],
    devices = [],
    stats: initialStats,
    recent_dev_scans = [],
}: DevModeProps) {
    const [currentSession, setCurrentSession] = useState(initialSession);
    const [stats, setStats] = useState(initialStats);
    const [recentScans, setRecentScans] = useState(recent_dev_scans);

    // Active Tab: 'simulator' | 'burst' | 'inspector' | 'maintenance'
    const [activeTab, setActiveTab] = useState<'simulator' | 'burst' | 'inspector' | 'maintenance'>('simulator');

    // Single Simulator Form
    const [selectedStudentId, setSelectedStudentId] = useState<number>(students[0]?.id || 0);
    const [targetStatus, setTargetStatus] = useState<string>('hadir');
    const [customNote, setCustomNote] = useState<string>('Uji coba Super Admin');
    const [studentSearch, setStudentSearch] = useState<string>('');

    // Burst Generator State
    const [burstCount, setBurstCount] = useState<number>(5);
    const [historyDays, setHistoryDays] = useState<number>(7);

    // Inspector State
    const [inspectorQuery, setInspectorQuery] = useState<string>('');
    const [inspectedData, setInspectedData] = useState<any>(null);
    const [copiedToken, setCopiedToken] = useState<boolean>(false);

    // Loading & Feedback
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 5000);
    };

    // 1. Toggle Session
    const handleToggleSession = async () => {
        setLoadingAction('toggle-session');
        try {
            const res = await axios.post('/dev-mode/toggle-session');
            if (res.data.success && res.data.session) {
                setCurrentSession(res.data.session);
                showFeedback('success', res.data.message);
            }
        } catch (err: any) {
            showFeedback('error', err.response?.data?.message || err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    // 2. Single Attendance Simulation
    const handleSimulateScan = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedStudentId) {
            showFeedback('error', 'Silakan pilih siswa terlebih dahulu.');
            return;
        }

        setLoadingAction('simulate-scan');
        try {
            const res = await axios.post('/dev-mode/simulate-scan', {
                student_id: selectedStudentId,
                status: targetStatus,
                custom_note: customNote,
            });
            if (res.data.success) {
                showFeedback('success', res.data.message);
                router.reload({ only: ['stats', 'recent_dev_scans'] });
            }
        } catch (err: any) {
            showFeedback('error', err.response?.data?.message || err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    // Pick Random Student
    const handlePickRandomStudent = () => {
        if (students.length === 0) return;
        const randomItem = students[Math.floor(Math.random() * students.length)];
        setSelectedStudentId(randomItem.id);
    };

    // 3. Burst Scan
    const handleBurstScan = async () => {
        setLoadingAction('burst-scan');
        try {
            const res = await axios.post('/dev-mode/burst-scan', {
                count: burstCount,
            });
            if (res.data.success) {
                showFeedback('success', res.data.message);
                router.reload({ only: ['stats', 'recent_dev_scans'] });
            }
        } catch (err: any) {
            showFeedback('error', err.response?.data?.message || err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    // 4. Generate Historical Data
    const handleGenerateHistory = async () => {
        if (!confirm(`Generate data absensi historis selama ${historyDays} hari ke belakang? Fitur ini akan membuat rekod absensi otomatis untuk mengisi grafik dan laporan.`)) return;

        setLoadingAction('generate-history');
        try {
            const res = await axios.post('/dev-mode/generate-history', {
                days: historyDays,
            });
            if (res.data.success) {
                showFeedback('success', res.data.message);
                router.reload({ only: ['stats', 'recent_dev_scans'] });
            }
        } catch (err: any) {
            showFeedback('error', err.response?.data?.message || err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    // 5. Inspect Token
    const handleInspectToken = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inspectorQuery.trim()) return;

        setLoadingAction('inspect-token');
        setInspectedData(null);
        try {
            const res = await axios.post('/dev-mode/inspect-token', {
                query: inspectorQuery.trim(),
            });
            if (res.data.success) {
                setInspectedData(res.data.data);
                showFeedback('success', 'Data token dan kartu berhasil dianalisis.');
            }
        } catch (err: any) {
            showFeedback('error', err.response?.data?.message || 'Token atau siswa tidak ditemukan.');
        } finally {
            setLoadingAction(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
    };

    // 6. Reset Today
    const handleResetToday = async () => {
        if (!confirm('Peringatan: Seluruh data absensi hari ini akan DIHAPUS. Lanjutkan reset?')) return;

        setLoadingAction('reset-today');
        try {
            const res = await axios.post('/dev-mode/reset-today');
            if (res.data.success) {
                showFeedback('success', res.data.message);
                router.reload({ only: ['stats', 'recent_dev_scans'] });
            }
        } catch (err: any) {
            showFeedback('error', err.response?.data?.message || err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    // 7. Reset Dev / Simulation Data Only
    const handleResetDevData = async () => {
        if (!confirm('Hapus semua data absensi yang memiliki tanda [DEV MODE] atau [SIMULASI]? Rekod resmi siswa tidak akan tersentuh.')) return;

        setLoadingAction('reset-dev-data');
        try {
            const res = await axios.post('/dev-mode/reset-dev-data');
            if (res.data.success) {
                showFeedback('success', res.data.message);
                router.reload({ only: ['stats', 'recent_dev_scans'] });
            }
        } catch (err: any) {
            showFeedback('error', err.response?.data?.message || err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    const filteredStudents = students.filter((s) => {
        if (!studentSearch) return true;
        const q = studentSearch.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.nis.includes(q) || s.class_name.toLowerCase().includes(q);
    });

    return (
        <AuthenticatedLayout title="Developer Tools & Mode Dev">
            <Head title="Developer Tools Center" />

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-xl border border-slate-800 shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    <Terminal className="w-5 h-5" />
                                </span>
                                <h1 className="text-xl font-bold tracking-tight">
                                    Developer Testing & Simulation Center
                                </h1>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                                    Super Admin Only
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 max-w-2xl">
                                Alat pengembang untuk bypass batasan duplikasi absensi, simulasi presensi massal, time travel sesi, inspeksi kriptografi QR code, dan regenerasi data testing.
                            </p>
                        </div>

                        {/* Session Status & Quick Toggle */}
                        <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-700/60 shrink-0">
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status Sesi Hari Ini</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`w-2 h-2 rounded-full ${currentSession?.status === 'open' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                                    <span className="font-bold text-xs uppercase">
                                        {currentSession ? currentSession.status : 'TIDAK AKTIF'}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleToggleSession}
                                disabled={loadingAction === 'toggle-session'}
                                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                {loadingAction === 'toggle-session' ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : currentSession?.status === 'open' ? (
                                    <>
                                        <Lock className="w-3.5 h-3.5" />
                                        <span>Tutup Sesi</span>
                                    </>
                                ) : (
                                    <>
                                        <Unlock className="w-3.5 h-3.5" />
                                        <span>Buka Sesi</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Feedback Toast Banner */}
                {feedback && (
                    <div className={`p-4 rounded-lg border text-xs font-medium flex items-center gap-2.5 transition-all ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-rose-50 text-rose-900 border-rose-300'
                    }`}>
                        {feedback.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{feedback.message}</span>
                    </div>
                )}

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <p className="text-[11px] font-medium text-slate-500">Total Siswa Aktif</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{stats.total_students}</p>
                    </div>
                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <p className="text-[11px] font-medium text-slate-500">Total Rombel / Kelas</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{stats.total_classes}</p>
                    </div>
                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <p className="text-[11px] font-medium text-slate-500">Absensi Hari Ini</p>
                        <p className="text-xl font-bold text-[#14433b] mt-1">{stats.today_attendances}</p>
                    </div>
                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <p className="text-[11px] font-medium text-slate-500">Rekod Simulasi Dev</p>
                        <p className="text-xl font-bold text-amber-600 mt-1">{stats.total_dev_scans}</p>
                    </div>
                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <p className="text-[11px] font-medium text-slate-500">Audit Logs Sistem</p>
                        <p className="text-xl font-bold text-slate-700 mt-1">{stats.total_audit_logs}</p>
                    </div>
                </div>

                {/* Main Tab Navigation */}
                <div className="border-b border-slate-200 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('simulator')}
                        className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'simulator'
                                ? 'border-amber-600 text-amber-800'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Zap className="w-4 h-4" />
                        <span>1. Simulator Absensi Siswa</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('burst')}
                        className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'burst'
                                ? 'border-amber-600 text-amber-800'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        <span>2. Generator Massal & Historis</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('inspector')}
                        className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'inspector'
                                ? 'border-amber-600 text-amber-800'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Code className="w-4 h-4" />
                        <span>3. Sandbox Kriptografi QR</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('maintenance')}
                        className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'maintenance'
                                ? 'border-amber-600 text-amber-800'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Database className="w-4 h-4" />
                        <span>4. Pembersihan Data & Reset</span>
                    </button>
                </div>

                {/* TAB 1: Single Simulator */}
                {activeTab === 'simulator' && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-5">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">
                                Simulasi Presensi Satuan Siswa
                            </h2>
                            <p className="text-xs text-slate-500">
                                Catat absensi siswa dengan status yang Anda pilih secara instan tanpa perlu memindai kartu QR dengan kamera.
                            </p>
                        </div>

                        <form onSubmit={handleSimulateScan} className="space-y-4 max-w-2xl">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-medium text-slate-700">Pilih Siswa Target:</label>
                                    <button
                                        type="button"
                                        onClick={handlePickRandomStudent}
                                        className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
                                    >
                                        <Dice5 className="w-3.5 h-3.5" />
                                        <span>Pilih Siswa Acak</span>
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Cari nama atau NIS siswa..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        className="w-full text-xs py-1.5 px-3 rounded-md border-slate-300 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                    <select
                                        value={selectedStudentId}
                                        onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                                        className="w-full text-xs py-2 px-3 rounded-md border-slate-300 focus:ring-amber-500 focus:border-amber-500"
                                        size={5}
                                    >
                                        {filteredStudents.map((s) => (
                                            <option key={s.id} value={s.id} className="py-1">
                                                {s.nis} - {s.name} ({s.class_name}) [{s.card_number}]
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Status Presensi:</label>
                                    <select
                                        value={targetStatus}
                                        onChange={(e) => setTargetStatus(e.target.value)}
                                        className="w-full text-xs py-2 px-3 rounded-md border-slate-300 focus:ring-amber-500 focus:border-amber-500"
                                    >
                                        <option value="hadir">Hadir (Tepat Waktu)</option>
                                        <option value="terlambat">Terlambat</option>
                                        <option value="izin">Izin</option>
                                        <option value="sakit">Sakit</option>
                                        <option value="alpa">Alpa / Tanpa Keterangan</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Catatan Uji Coba:</label>
                                    <input
                                        type="text"
                                        value={customNote}
                                        onChange={(e) => setCustomNote(e.target.value)}
                                        placeholder="Catatan pengetesan..."
                                        className="w-full text-xs py-2 px-3 rounded-md border-slate-300 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={loadingAction === 'simulate-scan'}
                                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                                >
                                    {loadingAction === 'simulate-scan' ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Zap className="w-4 h-4" />
                                    )}
                                    <span>Eksekusi Presensi Siswa</span>
                                </button>
                                <span className="text-[11px] text-slate-500">
                                    Siswa yang sudah absen tetap bisa diabsen ulang berkali-kali tanpa error duplikat.
                                </span>
                            </div>
                        </form>
                    </div>
                )}

                {/* TAB 2: Burst & Historical Data */}
                {activeTab === 'burst' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Burst Scan Generator */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-amber-600" />
                                    <span>Simulasi Presensi Massal (Burst Scan)</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Mensimulasikan beberapa siswa hadir sekaligus dalam 1 detik untuk menguji load performa dan pembaruan tabel riwayat.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-medium text-slate-700">Jumlah Siswa:</label>
                                <div className="flex flex-wrap gap-2">
                                    {[5, 10, 20, 50].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setBurstCount(num)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${
                                                burstCount === num
                                                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {num} Siswa
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleBurstScan}
                                    disabled={loadingAction === 'burst-scan'}
                                    className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                                >
                                    {loadingAction === 'burst-scan' ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Play className="w-4 h-4" />
                                    )}
                                    <span>Jalankan Burst Scan ({burstCount} Siswa)</span>
                                </button>
                            </div>
                        </div>

                        {/* Historical Data Generator */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                                    <span>Generator Data Historis (Isi Grafik & Laporan)</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Membuat rekod absensi lampau secara otomatis untuk menguji grafik dashboard mingguan/bulanan dan ekspor PDF/Excel.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-medium text-slate-700">Rentang Waktu:</label>
                                <div className="flex flex-wrap gap-2">
                                    {[7, 14, 30].map((days) => (
                                        <button
                                            key={days}
                                            type="button"
                                            onClick={() => setHistoryDays(days)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${
                                                historyDays === days
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {days} Hari Lampau
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleGenerateHistory}
                                    disabled={loadingAction === 'generate-history'}
                                    className="px-4 py-2 rounded-lg bg-[#14433b] hover:bg-[#1a554a] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                                >
                                    {loadingAction === 'generate-history' ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Calendar className="w-4 h-4 text-[#21c9a4]" />
                                    )}
                                    <span>Generate Rekod Absensi {historyDays} Hari</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: Cryptography & QR Inspector */}
                {activeTab === 'inspector' && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-5">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Code className="w-4 h-4 text-indigo-600" />
                                <span>Sandbox & Inspektor Kriptografi QR Code Siswa</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Periksa struktur token kriptografi, validasi hash SHA-256, dan dekripsi AES-256 rahasia kartu siswa secara real-time.
                            </p>
                        </div>

                        <form onSubmit={handleInspectToken} className="max-w-xl flex gap-2">
                            <input
                                type="text"
                                placeholder="Masukkan NIS, Nama Siswa, Nomor Kartu, atau Token..."
                                value={inspectorQuery}
                                onChange={(e) => setInspectorQuery(e.target.value)}
                                className="flex-1 text-xs py-2 px-3 rounded-md border-slate-300 focus:ring-amber-500 focus:border-amber-500"
                            />
                            <button
                                type="submit"
                                disabled={loadingAction === 'inspect-token' || !inspectorQuery.trim()}
                                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                {loadingAction === 'inspect-token' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                <span>Inspeksi</span>
                            </button>
                        </form>

                        {inspectedData && (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 font-mono text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                                    <div>
                                        <span className="text-slate-400 text-[11px] block">Pemilik Kartu:</span>
                                        <strong className="text-slate-900 font-sans text-sm">{inspectedData.student?.name}</strong>
                                        <p className="text-slate-500 font-sans text-xs">
                                            NIS: {inspectedData.student?.nis} · Kelas: {inspectedData.student?.class_name}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 text-[11px] block">Nomor Kartu Fisik:</span>
                                        <strong className="text-slate-900 font-sans text-sm">{inspectedData.card_number}</strong>
                                        <p className="text-slate-500 font-sans text-xs">
                                            Status: <span className="uppercase font-bold text-emerald-700">{inspectedData.status}</span> · Diterbitkan: {inspectedData.issued_at}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <span className="text-slate-500 text-[11px] block font-sans">Token Mentah Didekripsi (Payload Kartu Asli):</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="p-2 bg-white rounded border border-slate-300 text-slate-800 break-all flex-1 select-all">
                                                {inspectedData.decrypted_token}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(inspectedData.decrypted_token)}
                                                className="p-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors shrink-0"
                                                title="Salin Token Mentah"
                                            >
                                                {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-slate-500 text-[11px] block font-sans">Hash Verifikasi (SHA-256 yang tersimpan di database):</span>
                                        <code className="p-2 bg-white rounded border border-slate-300 text-slate-800 break-all block mt-1 text-[11px]">
                                            {inspectedData.qr_token_hash}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: Maintenance & Reset */}
                {activeTab === 'maintenance' && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-5">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Database className="w-4 h-4 text-rose-600" />
                                <span>Pembersihan Database & Reset Pengujian</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Utilitas untuk membersihkan data testing setelah uji coba selesai agar sistem kembali bersih dan siap untuk produksi.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Reset Today */}
                            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/60 space-y-3">
                                <div>
                                    <h3 className="text-xs font-bold text-amber-950">1. Reset Presensi Hari Ini</h3>
                                    <p className="text-[11px] text-amber-800 mt-0.5">
                                        Menghapus seluruh rekod absensi sesi hari ini untuk menguji ulang alur pemindaian gerbang dari nol.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleResetToday}
                                    disabled={loadingAction === 'reset-today'}
                                    className="px-3.5 py-1.5 rounded-md bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                    {loadingAction === 'reset-today' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    <span>Reset Absensi Hari Ini</span>
                                </button>
                            </div>

                            {/* Reset Dev Data Only */}
                            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/60 space-y-3">
                                <div>
                                    <h3 className="text-xs font-bold text-rose-950">2. Bersihkan Rekod Simulasi Dev</h3>
                                    <p className="text-[11px] text-rose-800 mt-0.5">
                                        Menghapus semua baris absensi yang memiliki label <code className="bg-rose-100 px-1 rounded">[DEV MODE]</code> atau <code className="bg-rose-100 px-1 rounded">[SIMULASI]</code>. Rekod asli sekolah tidak terhapus.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleResetDevData}
                                    disabled={loadingAction === 'reset-dev-data'}
                                    className="px-3.5 py-1.5 rounded-md bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                    {loadingAction === 'reset-dev-data' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    <span>Hapus Semua Rekod Simulasi Dev</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Dev Simulations Activity */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                15 Presensi Simulasi / Dev Mode Terakhir
                            </h2>
                        </div>
                        <span className="text-[11px] text-slate-400">Auto-logged</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-2.5 px-3">Siswa</th>
                                    <th className="py-2.5 px-3">Kelas</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3">Waktu Scan</th>
                                    <th className="py-2.5 px-3">Catatan Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentScans.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-6 text-center text-slate-400">
                                            Belum ada rekod pengujian dev mode tercatat.
                                        </td>
                                    </tr>
                                ) : (
                                    recentScans.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/60">
                                            <td className="py-2 px-3 font-medium text-slate-900">
                                                {r.student_name} <span className="text-slate-400 text-[11px]">({r.nis})</span>
                                            </td>
                                            <td className="py-2 px-3 text-slate-600">{r.class_name}</td>
                                            <td className="py-2 px-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    r.status === 'hadir'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : r.status === 'terlambat'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-slate-100 text-slate-800'
                                                }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-slate-500">{r.date} · {r.time}</td>
                                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600 truncate max-w-xs" title={r.notes}>
                                                {r.notes || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
