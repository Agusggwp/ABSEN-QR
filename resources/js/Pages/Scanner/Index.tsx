import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
    Camera,
    CameraOff,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ShieldAlert,
    UserCheck,
    Volume2,
    VolumeX,
    Clock,
    RefreshCw,
    Send,
    UserX,
    Terminal,
    Zap,
    Trash2,
    Dice5,
    Unlock,
    Lock,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerProps {
    session: {
        id: number;
        date: string;
        type: string;
        start_time: string;
        end_time: string;
        late_time: string;
        status: string;
    } | null;
    devices: Array<{
        id: number;
        device_name: string;
        device_identifier: string;
        location_description?: string;
    }>;
    default_device_id?: number;
    recent_scans: Array<{
        id: number;
        student_id: number;
        name: string;
        nis: string;
        class_name: string;
        status: string;
        time: string;
        officer_name: string;
    }>;
    dev_students?: Array<{
        id: number;
        name: string;
        nis: string;
        class_name: string;
        photo_path?: string | null;
        token: string;
    }>;
    is_super_admin?: boolean;
    server_clock: string;
    server_date: string;
    attendance_settings?: any;
}

type ScanPhase = 'idle' | 'scanning' | 'verifying' | 'success' | 'rejected' | 'duplicate';

interface StudentIdentity {
    id: number;
    nis: string;
    name: string;
    gender: 'L' | 'P';
    class_name: string;
    photo_path?: string | null;
}

export default function ScannerTerminal({
    session: initialSession,
    devices,
    default_device_id,
    recent_scans: initialRecentScans,
    dev_students = [],
    is_super_admin = false,
    server_clock,
    server_date,
    attendance_settings,
}: ScannerProps) {
    const [selectedDevice, setSelectedDevice] = useState<number>(default_device_id || (devices[0]?.id ?? 1));
    const [phase, setPhase] = useState<ScanPhase>('idle');
    const [cameraActive, setCameraActive] = useState<boolean>(false);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [manualToken, setManualToken] = useState<string>('');
    const [recentScans, setRecentScans] = useState(initialRecentScans);
    const [currentSession, setCurrentSession] = useState(initialSession);

    // Realtime Scanner Clock (sinkron dengan Topbar)
    const [scannerClock, setScannerClock] = useState<string>(() => {
        const now = new Date();
        return now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    });

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setScannerClock(
                now.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                })
            );
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Dev Mode States
    const [isDevMode, setIsDevMode] = useState<boolean>(() => {
        return localStorage.getItem('artdevata_dev_mode') === 'true';
    });
    const [devSelectedStudentId, setDevSelectedStudentId] = useState<number>(0);
    const [isBursting, setIsBursting] = useState<boolean>(false);

    const toggleDevMode = () => {
        const nextVal = !isDevMode;
        setIsDevMode(nextVal);
        localStorage.setItem('artdevata_dev_mode', String(nextVal));
    };

    // Active verification student data
    const [verifiedStudent, setVerifiedStudent] = useState<StudentIdentity | null>(null);
    const [verificationDetails, setVerificationDetails] = useState<any>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [rejectionModalOpen, setRejectionModalOpen] = useState<boolean>(false);
    const [rejectionReason, setRejectionReason] = useState<string>('Kartu dititipkan (Pemilik kartu tidak hadir)');
    const [rejectionNote, setRejectionNote] = useState<string>('');

    // Verification Mode & Fallback
    const [currentVerificationMode, setCurrentVerificationMode] = useState<string>(
        attendance_settings?.identity_verification_mode || 'officer_manual'
    );

    const handleTriggerFallback = async () => {
        if (!confirm('Alihkan sistem segera ke Mode Cadangan (Verifikasi Manual Petugas)?')) return;
        try {
            await axios.post('/scanner/fallback', { reason: 'Peralihan darurat oleh petugas di pos scanner' });
            setCurrentVerificationMode('officer_manual');
            alert('Sistem berhasil dialihkan ke Mode Cadangan Manual.');
        } catch (err: any) {
            alert('Gagal mengalihkan mode: ' + (err.response?.data?.message || err.message));
        }
    };

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const readerId = 'html5-qr-reader';

    // Audio effects synthesizing with Web Audio API for zero-dependency reliable sound
    const playSound = (kind: 'success' | 'alert' | 'error') => {
        if (!soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (kind === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
            } else if (kind === 'alert') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                osc.frequency.setValueAtTime(330, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc.start();
                osc.stop(ctx.currentTime + 0.4);
            } else {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, ctx.currentTime);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch (e) {
            // Audio context unsupported or blocked by browser policy
        }
    };

    // Camera Lifecycle
    const startCamera = async () => {
        try {
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(readerId);
            }

            setCameraActive(true);
            setPhase('scanning');

            await scannerRef.current.start(
                { facingMode: 'environment' },
                {
                    fps: 15,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                (error) => {
                    // QR searching frame by frame
                }
            );
        } catch (err: any) {
            setCameraActive(false);
            setPhase('idle');
            setStatusMessage('Kamera tidak dapat diakses atau izin ditolak: ' + (err?.message || err));
        }
    };

    const stopCamera = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
            } catch (err) {
                // Ignore stop error
            }
        }
        setCameraActive(false);
        setPhase('idle');
    };

    useEffect(() => {
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    // Tahap 1: Validasi QR Token ke Backend
    const handleScanSuccess = async (qrToken: string) => {
        // Hentikan sementara pembacaan agar tidak terus men-trigger
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.pause(true);
        }

        setIsSubmitting(true);
        setStatusMessage('Memvalidasi token kriptografis dan izin sesi...');

        try {
            const response = await axios.post('/scanner/pre-scan', {
                qr_token: qrToken,
                device_id: selectedDevice,
                session_id: currentSession?.id,
                dev_mode: isDevMode,
            });

            const data = response.data;

            if (data.status === 'ready_for_verification') {
                playSound('alert'); // Bunyi perhatian untuk verifikasi wajah
                setVerifiedStudent(data.student);
                setVerificationDetails(data);
                setPhase('verifying');
                setStatusMessage(data.message || 'Token VALID. Cocokkan wajah siswa fisik dengan foto resmi di bawah!');
            } else if (data.status === 'duplicate') {
                playSound('alert');
                setVerifiedStudent(data.student);
                setPhase('duplicate');
                setStatusMessage(data.message);
            } else {
                playSound('error');
                setPhase('rejected');
                setStatusMessage(data.message || 'Token QR tidak valid atau dicabut.');
            }
        } catch (error: any) {
            playSound('error');
            setPhase('rejected');
            setStatusMessage(error.response?.data?.message || 'Terjadi kesalahan validasi token di server.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Tahap 2: Petugas Mengonfirmasi Wajah Cocok (Absensi Dicatat)
    const handleConfirmAttendance = async () => {
        if (!verifiedStudent || !currentSession) return;

        setIsSubmitting(true);
        try {
            const response = await axios.post('/scanner/confirm', {
                student_id: verifiedStudent.id,
                session_id: currentSession.id,
                device_id: selectedDevice,
                qr_code_id: verificationDetails?.qr_code_id,
                status: verificationDetails?.suggested_status || 'hadir',
                dev_mode: isDevMode,
            });

            if (response.data.success) {
                playSound('success');
                setPhase('success');
                setStatusMessage(`Absensi ${verifiedStudent.name} BERHASIL dicatat.`);

                // Tambahkan ke riwayat pemindaian lokal
                const newRecord = {
                    id: Date.now(),
                    student_id: verifiedStudent.id,
                    name: verifiedStudent.name,
                    nis: verifiedStudent.nis,
                    class_name: verifiedStudent.class_name,
                    status: verificationDetails?.suggested_status || 'hadir',
                    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    officer_name: isDevMode ? 'Mode Dev (Uji Coba)' : 'Saya (Petugas)',
                };
                setRecentScans([newRecord, ...recentScans.slice(0, 19)]);

                // Otomatis bersiap memindai siswa berikutnya dalam 2 detik
                setTimeout(() => {
                    resetScannerForNext();
                }, 2000);
            } else {
                playSound('error');
                setPhase('rejected');
                setStatusMessage(response.data.message || 'Gagal menyimpan absensi.');
            }
        } catch (error: any) {
            playSound('error');
            setPhase('rejected');
            setStatusMessage(error.response?.data?.message || 'Kesalahan pencatatan kehadiran.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Tahap 2 Alternatif: Petugas Menolak Identitas (Titip Absen)
    const handleRejectAttendance = async () => {
        if (!verifiedStudent || !currentSession) return;

        setIsSubmitting(true);
        try {
            await axios.post('/scanner/reject', {
                student_id: verifiedStudent.id,
                session_id: currentSession.id,
                device_id: selectedDevice,
                rejection_reason: rejectionReason,
                notes: rejectionNote,
            });

            playSound('error');
            setPhase('rejected');
            setStatusMessage(`Verifikasi DITOLAK: ${rejectionReason}. Insiden telah dicatat dalam Audit Log.`);
            setRejectionModalOpen(false);

            setTimeout(() => {
                resetScannerForNext();
            }, 3000);
        } catch (error: any) {
            setStatusMessage(error.response?.data?.message || 'Gagal mencatat penolakan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Aksi Mode Pengembang (Dev Mode Handlers)
    const handleDevQuickScan = (tokenToScan?: string) => {
        let token = tokenToScan;
        if (!token && devSelectedStudentId) {
            const student = dev_students?.find((s) => s.id === devSelectedStudentId);
            token = student?.token;
        }
        if (!token) {
            alert('Pilih siswa terlebih dahulu dari daftar simulasi.');
            return;
        }
        handleScanSuccess(token);
    };

    const handleDevRandomScan = () => {
        if (!dev_students || dev_students.length === 0) {
            alert('Daftar siswa untuk simulasi belum tersedia.');
            return;
        }
        const randomStudent = dev_students[Math.floor(Math.random() * dev_students.length)];
        setDevSelectedStudentId(randomStudent.id);
        handleScanSuccess(randomStudent.token);
    };

    const handleDevBurstScan = async () => {
        if (!currentSession) {
            alert('Sesi hari ini belum aktif.');
            return;
        }
        setIsBursting(true);
        try {
            const res = await axios.post('/scanner/dev/burst-scan', {
                session_id: currentSession.id,
                device_id: selectedDevice,
                count: 5,
            });
            if (res.data.success && res.data.scans) {
                playSound('success');
                const newRecords = res.data.scans.map((s: any) => ({
                    id: s.id || Date.now() + Math.random(),
                    student_id: s.id,
                    name: s.name,
                    nis: s.nis,
                    class_name: s.class_name,
                    status: s.status,
                    time: s.time,
                    officer_name: 'Simulasi Dev Burst',
                }));
                setRecentScans((prev) => [...newRecords, ...prev].slice(0, 24));
                setStatusMessage(`Berhasil mensimulasikan scan 5 siswa sekaligus!`);
                setPhase('idle');
            }
        } catch (err: any) {
            alert('Gagal burst scan: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsBursting(false);
        }
    };

    const handleDevResetToday = async () => {
        if (!currentSession) return;
        if (!confirm('Apakah Anda yakin ingin MENGHAPUS SEMUA DATA ABSENSI HARI INI untuk pengujian ulang dari awal?')) return;
        try {
            const res = await axios.post('/scanner/dev/reset-today', {
                session_id: currentSession.id,
            });
            if (res.data.success) {
                setRecentScans([]);
                setVerifiedStudent(null);
                setPhase('idle');
                setStatusMessage(`Data absensi hari ini berhasil direset (${res.data.deleted_count} rekod dihapus).`);
                playSound('alert');
            }
        } catch (err: any) {
            alert('Gagal mereset absensi: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDevToggleSession = async () => {
        try {
            const res = await axios.post('/scanner/dev/toggle-session');
            if (res.data.success && res.data.session) {
                setCurrentSession(res.data.session);
                setStatusMessage(`Status sesi sekarang: ${res.data.session.status.toUpperCase()}`);
            }
        } catch (err: any) {
            alert('Gagal mengubah status sesi: ' + (err.response?.data?.message || err.message));
        }
    };

    const resetScannerForNext = () => {
        setVerifiedStudent(null);
        setVerificationDetails(null);
        setPhase(cameraActive ? 'scanning' : 'idle');
        setStatusMessage('');
        setManualToken('');

        if (scannerRef.current && cameraActive) {
            try {
                scannerRef.current.resume();
            } catch (e) {}
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualToken.trim()) {
            handleScanSuccess(manualToken.trim());
        }
    };

    return (
        <AuthenticatedLayout title="Terminal Scanner Anti-Titip Absen">
            <Head title="Scanner Terminal Absensi" />

            <div className="space-y-5">
                {/* Header Station Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-lg border border-slate-200 shadow-xs gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-[#14433b] text-white">
                            <Camera className="w-5 h-5 text-[#21c9a4]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">
                                Terminal Pemindaian Presensi Siswa
                            </h2>
                            <p className="text-xs text-slate-500">
                                {currentSession ? `Sesi ${currentSession.type.toUpperCase()} · Tanggal ${currentSession.date}` : 'Tidak ada sesi terbuka'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Device Selector */}
                        <div className="flex items-center gap-2 text-xs">
                            <label className="font-medium text-slate-600">Perangkat:</label>
                            <select
                                value={selectedDevice}
                                onChange={(e) => setSelectedDevice(Number(e.target.value))}
                                aria-label="Pilih Perangkat Kamera Scanner"
                                className="pl-2.5 pr-8 py-1.5 text-xs font-medium rounded-md border-slate-200 bg-white text-slate-800 focus:ring-[#14433b] focus:border-[#14433b]"
                            >
                                {devices.map((dev) => (
                                    <option key={dev.id} value={dev.id}>
                                        {dev.device_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Mode Verifikasi Badge & Fallback Button */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                            <span className="text-slate-400">Verifikasi:</span>
                            <span className="font-semibold text-slate-800">
                                {currentVerificationMode === 'webcam_visual' && 'Webcam Visual'}
                                {currentVerificationMode === 'cctv_visual' && 'CCTV Visual'}
                                {currentVerificationMode === 'officer_manual' && 'Manual Petugas'}
                            </span>
                        </div>

                        {currentVerificationMode !== 'officer_manual' && (
                            <button
                                type="button"
                                onClick={handleTriggerFallback}
                                className="px-2.5 py-1.5 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                title="Ganti segera ke mode verifikasi manual petugas jika kamera terganggu"
                            >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                <span>Mode Darurat</span>
                            </button>
                        )}

                        {/* Sound Toggle */}
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`px-2.5 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                soundEnabled
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                            title="Aktifkan/Nonaktifkan Suara Scanner"
                        >
                            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{soundEnabled ? 'Suara Aktif' : 'Senyap'}</span>
                        </button>

                        {/* Mode Dev Toggle Button (Hanya Super Admin) */}
                        {is_super_admin && (
                            <button
                                type="button"
                                onClick={toggleDevMode}
                                className={`px-3 py-1.5 rounded-md border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                    isDevMode
                                        ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300'
                                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                }`}
                                title="Mode Pengembang: Bypass batas absen berulang, simulasi scan cepat, dan kontrol testing (Khusus Super Admin)"
                            >
                                <Terminal className={`w-3.5 h-3.5 ${isDevMode ? 'text-white' : 'text-amber-700'}`} />
                                <span>Mode Dev: {isDevMode ? 'AKTIF' : 'NONAKTIF'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* DEV MODE TOOLBAR & CONTROL PANEL (Hanya Super Admin) */}
                {is_super_admin && isDevMode && (
                    <div className="p-4 bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50 border-2 border-amber-400 rounded-lg shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white rounded">
                                    DEVELOPER TESTING MODE
                                </span>
                                <span className="text-xs font-medium text-amber-900">
                                    Bypass Batasan Absen Berulang & Simulasi Scanner
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-amber-800 font-medium">Status Sesi:</span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    currentSession?.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                    {currentSession ? currentSession.status.toUpperCase() : 'TIDAK ADA SESI'}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleDevToggleSession}
                                    className="px-2 py-1 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium text-xs flex items-center gap-1 shadow-2xs transition-colors"
                                >
                                    {currentSession?.status === 'open' ? (
                                        <>
                                            <Lock className="w-3 h-3 text-rose-600" />
                                            <span>Paksa Tutup Sesi</span>
                                        </>
                                    ) : (
                                        <>
                                            <Unlock className="w-3 h-3 text-emerald-600" />
                                            <span>Paksa Buka Sesi</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Quick Simulator Tools */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            {/* Pick student and Scan */}
                            <div className="md:col-span-6 flex items-center gap-2">
                                <select
                                    value={devSelectedStudentId || ''}
                                    onChange={(e) => setDevSelectedStudentId(Number(e.target.value))}
                                    className="flex-1 py-1.5 px-2.5 text-xs rounded-md border-amber-300 bg-white text-slate-800 focus:ring-amber-500 focus:border-amber-500"
                                >
                                    <option value="">-- Pilih Siswa untuk Scan Cepat --</option>
                                    {dev_students?.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.nis} - {s.name} ({s.class_name})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => handleDevQuickScan()}
                                    disabled={!devSelectedStudentId || isSubmitting}
                                    className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-2xs whitespace-nowrap"
                                >
                                    <Zap className="w-3.5 h-3.5" />
                                    <span>Scan Siswa</span>
                                </button>
                            </div>

                            {/* Random Scan & Burst Scan Buttons */}
                            <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleDevRandomScan}
                                    disabled={isSubmitting || !dev_students || dev_students.length === 0}
                                    className="px-2.5 py-1.5 rounded-md bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-2xs"
                                >
                                    <Dice5 className="w-3.5 h-3.5 text-amber-700" />
                                    <span>Scan Acak</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDevBurstScan}
                                    disabled={isBursting || isSubmitting}
                                    className="px-2.5 py-1.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-2xs"
                                    title="Simulasi 5 siswa absen otomatis sekaligus"
                                >
                                    <span>{isBursting ? 'Memproses 5 Siswa...' : 'Burst Scan (5 Siswa)'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDevResetToday}
                                    className="px-2.5 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                                    title="Hapus rekod absensi hari ini agar bisa mengulang pengujian dari awal"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Reset Absen Hari Ini</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-amber-800/80 bg-amber-100/60 px-2.5 py-1 rounded">
                            <span><strong>Mode Dev Aktif:</strong> Siswa yang sudah absen bisa di-scan berulang kali tanpa error "Sudah Absen", sesi otomatis dibuka jika tertutup, dan log tersimpan dengan keterangan dev re-scan.</span>
                        </div>
                    </div>
                )}

                {/* Main Scanning Arena (2 Columns) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column: Camera Viewport & Manual Input (7 Cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="relative bg-slate-950 rounded-lg overflow-hidden border border-slate-800 min-h-[380px] flex flex-col justify-between p-4 shadow-xs">
                            {/* Camera Header Status */}
                            <div className="flex items-center justify-between text-xs text-white z-10">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                    <span className="font-mono text-[11px] tracking-wide">{cameraActive ? 'KAMERA AKTIF (15 FPS)' : 'KAMERA NONAKTIF'}</span>
                                </div>
                                <div className="text-slate-400 font-mono text-[11px]">
                                    {scannerClock} WITA
                                </div>
                            </div>

                            {/* Viewport for Html5Qrcode Reader */}
                            <div className="relative flex-1 flex items-center justify-center my-3">
                                <div
                                    id={readerId}
                                    className={`w-full max-w-[320px] rounded-lg overflow-hidden ${!cameraActive ? 'hidden' : ''}`}
                                />

                                {!cameraActive && (
                                    <div className="text-center py-10 px-4 text-slate-400">
                                        <CameraOff className="w-10 h-10 mx-auto text-slate-600 mb-2.5" />
                                        <p className="text-sm font-semibold text-slate-200">Kamera Scanner Belum Diaktifkan</p>
                                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                                            Klik tombol di bawah untuk menyalakan kamera atau gunakan pembaca barcode kartu manual.
                                        </p>
                                        <button
                                            onClick={startCamera}
                                            className="mt-4 px-4 py-2 rounded-lg bg-[#14433b] text-white font-medium text-xs hover:bg-[#1a554a] transition-colors inline-flex items-center gap-2 shadow-xs"
                                        >
                                            <Camera className="w-4 h-4 text-[#21c9a4]" />
                                            <span>Mulai Kamera Scanner</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Camera Action Buttons */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-xs">
                                {cameraActive ? (
                                    <button
                                        onClick={stopCamera}
                                        className="px-2.5 py-1.5 rounded-md bg-rose-950/70 text-rose-300 border border-rose-800/60 hover:bg-rose-900 transition-colors flex items-center gap-1.5 text-xs font-medium"
                                    >
                                        <CameraOff className="w-3.5 h-3.5" />
                                        <span>Matikan Kamera</span>
                                    </button>
                                ) : (
                                    <span className="text-slate-500 text-[11px]">Mode kamera offline</span>
                                )}

                                {phase !== 'idle' && (
                                    <button
                                        onClick={resetScannerForNext}
                                        className="px-2.5 py-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium ml-auto"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Reset Scanner</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Manual Token / Barcode Gun Input (Alternative Mode) */}
                        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                            <form onSubmit={handleManualSubmit} className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualToken}
                                    onChange={(e) => setManualToken(e.target.value)}
                                    placeholder="Input atau scan token barcode kartu..."
                                    className="flex-1 px-3 py-1.5 text-xs rounded-md border-slate-300 focus:ring-[#14433b] focus:border-[#14433b]"
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !manualToken.trim()}
                                    className="px-3.5 py-1.5 bg-[#14433b] text-white text-xs font-medium rounded-md hover:bg-[#1a554a] disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-xs"
                                >
                                    <Send className="w-3.5 h-3.5 text-[#21c9a4]" />
                                    <span>Periksa</span>
                                </button>
                            </form>
                            <p className="text-[11px] text-slate-400 mt-1.5">
                                Mendukung barcode scanner USB eksternal (input otomatis saat kartu di-scan).
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Identity Verification & Anti-Titip Absen Decision Box (5 Cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col justify-between min-h-[460px]">
                            {/* Verification Stage Banner */}
                            <div className="border-b border-slate-100 pb-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-700">
                                        Verifikasi Identitas Fisik
                                    </span>
                                    {phase === 'verifying' && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                            Periksa Kesesuaian Wajah
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Verification Body Content */}
                            <div className="my-auto py-4 text-center">
                                {phase === 'verifying' && verifiedStudent && (
                                    <div className="space-y-4 animate-in fade-in">
                                        {/* Student Official Photo */}
                                        <div className="w-24 h-32 mx-auto rounded-lg border border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center">
                                            {verifiedStudent.photo_path ? (
                                                <img
                                                    src={
                                                        verifiedStudent.photo_path.startsWith('/') ||
                                                        verifiedStudent.photo_path.startsWith('http')
                                                            ? verifiedStudent.photo_path
                                                            : `/storage/${verifiedStudent.photo_path}`
                                                    }
                                                    alt={verifiedStudent.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="text-slate-400 text-xs font-medium flex flex-col items-center">
                                                    <UserCheck className="w-6 h-6 text-slate-400 mb-1" />
                                                    <span>Foto Siswa</span>
                                                    <span className="text-[10px] text-slate-400">3 x 4</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Student Data */}
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900">
                                                {verifiedStudent.name}
                                            </h3>
                                            <p className="text-xs text-slate-600 mt-0.5">
                                                NIS: <span className="font-mono">{verifiedStudent.nis}</span> · Kelas: {verifiedStudent.class_name}
                                            </p>
                                        </div>

                                        {/* Time & Attendance Status Preview */}
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                                            <span>Status:</span>
                                            <StatusBadge
                                                status={verificationDetails?.suggested_status || 'hadir'}
                                                size="sm"
                                            />
                                        </div>

                                        {/* Verification Security Notice */}
                                        <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 text-left text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                                            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="font-semibold">Verifikasi Anti-Titip Absen:</strong>
                                                <p className="text-[11px] text-amber-800 mt-0.5">
                                                    Pastikan siswa yang hadir di depan Anda sesuai dengan foto resmi di atas. Jika kartu dititipkan, tolak presensi.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Decision Buttons (Confirm or Reject) */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={handleConfirmAttendance}
                                                disabled={isSubmitting}
                                                className="w-full py-2.5 px-3 rounded-lg bg-[#14433b] text-white font-medium text-xs hover:bg-[#1a554a] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-[#21c9a4]" />
                                                <span>Konfirmasi Hadir</span>
                                            </button>

                                            <button
                                                onClick={() => setRejectionModalOpen(true)}
                                                disabled={isSubmitting}
                                                className="w-full py-2.5 px-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-medium text-xs hover:bg-rose-100 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4 text-rose-600" />
                                                <span>Tolak / Titip Absen</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {phase === 'success' && (
                                    <div className="space-y-3 py-8 animate-in fade-in">
                                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                                            <CheckCircle2 className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-sm font-bold text-emerald-900">
                                            Presensi Berhasil Dicatat
                                        </h3>
                                        <p className="text-xs text-slate-600 max-w-xs mx-auto">
                                            {statusMessage}
                                        </p>
                                        <div className="pt-3">
                                            <button
                                                onClick={resetScannerForNext}
                                                className="px-3.5 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors"
                                            >
                                                Pindai Siswa Berikutnya →
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {phase === 'duplicate' && verifiedStudent && (
                                    <div className="space-y-3 py-6 animate-in fade-in">
                                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                                            <AlertTriangle className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-sm font-bold text-amber-900">
                                            Duplikat: Sudah Absen
                                        </h3>
                                        <p className="text-xs text-slate-600 max-w-xs mx-auto">
                                            Siswa <strong>{verifiedStudent.name}</strong> ({verifiedStudent.nis}) sudah tercatat hadir pada sesi ini sebelumnya.
                                        </p>
                                        <div className="flex items-center justify-center gap-2 pt-2">
                                            <button
                                                onClick={resetScannerForNext}
                                                className="px-3 py-1.5 rounded-md bg-amber-700 text-white text-xs font-medium hover:bg-amber-800 transition-colors"
                                            >
                                                Siap Scan Berikutnya
                                            </button>
                                            {isDevMode && (
                                                <button
                                                    onClick={handleConfirmAttendance}
                                                    disabled={isSubmitting}
                                                    className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-2xs"
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                    <span>Absen Ulang (Dev Mode)</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {phase === 'rejected' && (
                                    <div className="space-y-3 py-6 animate-in fade-in">
                                        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                                            <XCircle className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-sm font-bold text-rose-900">
                                            Pemindaian Ditolak
                                        </h3>
                                        <p className="text-xs text-rose-700 max-w-xs mx-auto">
                                            {statusMessage}
                                        </p>
                                        <button
                                            onClick={resetScannerForNext}
                                            className="px-3 py-1.5 mt-2 rounded-md bg-slate-200 text-slate-800 text-xs font-medium hover:bg-slate-300 transition-colors"
                                        >
                                            Pindai Ulang
                                        </button>
                                    </div>
                                )}

                                {phase === 'idle' && (
                                    <div className="py-12 text-slate-400">
                                        <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs font-medium text-slate-600">Menunggu Pemindaian Kartu Siswa</p>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Dekatkan QR code siswa ke kamera scanner atau masukkan token manual.
                                        </p>
                                    </div>
                                )}

                                {phase === 'scanning' && (
                                    <div className="py-12 text-[#14433b]">
                                        <div className="w-8 h-8 border-2 border-[#14433b] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-xs font-semibold text-slate-800">Kamera Siap Menerima Kartu</p>
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Arahkan QR Code ke area kotak fokus kamera.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Status Bottom Footer */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                <span>Autentikasi SHA-256</span>
                                <span>Verifikasi Anti-Titip Absen</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Session History on this Scanner Station */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-slate-800">
                            Pemindaian Terkonfirmasi di Stasiun Ini ({recentScans.length} Siswa Terakhir)
                        </h3>
                        <span className="text-[11px] text-slate-400">Pembaruan otomatis realtime</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/75">
                                    <th className="py-2.5 px-3">Jam Scan</th>
                                    <th className="py-2.5 px-3">NIS</th>
                                    <th className="py-2.5 px-3">Nama Siswa</th>
                                    <th className="py-2.5 px-3">Kelas</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3">Petugas Otoritas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {recentScans.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-6 text-center text-slate-400">
                                            Belum ada presensi yang tercatat di stasiun ini pada sesi berjalan.
                                        </td>
                                    </tr>
                                ) : (
                                    recentScans.slice(0, 10).map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{r.time}</td>
                                            <td className="py-2.5 px-3 font-mono text-slate-600">{r.nis}</td>
                                            <td className="py-2.5 px-3 font-medium text-slate-900">{r.name}</td>
                                            <td className="py-2.5 px-3 text-slate-600">{r.class_name}</td>
                                            <td className="py-2.5 px-3"><StatusBadge status={r.status} size="sm" /></td>
                                            <td className="py-2.5 px-3 text-slate-500">{r.officer_name}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Rejection / Titip Absen Dialog */}
            {rejectionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-white rounded-lg p-5 shadow-lg border border-slate-200 space-y-4 animate-in fade-in">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                                <UserX className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Tolak & Laporkan Presensi</h3>
                                <p className="text-xs text-slate-500">Pencatatan pelanggaran atau indikasi titip absen</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Alasan Penolakan <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                >
                                    <option value="Kartu dititipkan (Pemilik kartu tidak hadir)">
                                        Kartu dititipkan (Pemilik kartu tidak hadir fisik)
                                    </option>
                                    <option value="Wajah siswa tidak cocok dengan foto resmi">
                                        Wajah siswa tidak cocok dengan foto resmi di sistem
                                    </option>
                                    <option value="Kartu tertukar dengan siswa lain">
                                        Kartu tertukar dengan siswa lain
                                    </option>
                                    <option value="Siswa menolak konfirmasi identitas">
                                        Siswa menolak konfirmasi identitas fisik
                                    </option>
                                    <option value="Lainnya">Lainnya (Tuliskan di catatan)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Catatan Tambahan (Opsional)
                                </label>
                                <textarea
                                    value={rejectionNote}
                                    onChange={(e) => setRejectionNote(e.target.value)}
                                    rows={3}
                                    placeholder="Contoh: Kartu dibawa oleh siswa kelas X MIPA 2..."
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setRejectionModalOpen(false)}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleRejectAttendance}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-rose-700 rounded-md hover:bg-rose-800 transition-colors shadow-xs"
                            >
                                Catat Penolakan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
