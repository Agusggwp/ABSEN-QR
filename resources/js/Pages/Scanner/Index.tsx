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
    session,
    devices,
    default_device_id,
    recent_scans: initialRecentScans,
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
                session_id: session?.id,
            });

            const data = response.data;

            if (data.status === 'ready_for_verification') {
                playSound('alert'); // Bunyi perhatian untuk verifikasi wajah
                setVerifiedStudent(data.student);
                setVerificationDetails(data);
                setPhase('verifying');
                setStatusMessage('Token VALID. Cocokkan wajah siswa fisik dengan foto resmi di bawah!');
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
        if (!verifiedStudent || !session) return;

        setIsSubmitting(true);
        try {
            const response = await axios.post('/scanner/confirm', {
                student_id: verifiedStudent.id,
                session_id: session.id,
                device_id: selectedDevice,
                qr_code_id: verificationDetails?.qr_code_id,
                status: verificationDetails?.suggested_status || 'hadir',
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
                    officer_name: 'Saya (Petugas)',
                };
                setRecentScans([newRecord, ...recentScans.slice(0, 14)]);

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
        if (!verifiedStudent || !session) return;

        setIsSubmitting(true);
        try {
            await axios.post('/scanner/reject', {
                student_id: verifiedStudent.id,
                session_id: session.id,
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

            <div className="space-y-6">
                {/* Header Station Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-[#14433b] text-white">
                            <Camera className="w-5 h-5 text-[#21c9a4]" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">
                                Terminal Pemindaian Kartu Siswa
                            </h2>
                            <p className="text-xs text-gray-500">
                                {session ? `Sesi ${session.type.toUpperCase()} &bull; Tanggal ${session.date}` : 'Tidak ada sesi terbuka'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Device Selector */}
                        <div className="flex items-center gap-2 text-xs">
                            <label className="font-semibold text-gray-600">Perangkat:</label>
                            <select
                                value={selectedDevice}
                                onChange={(e) => setSelectedDevice(Number(e.target.value))}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border-gray-300 bg-gray-50 text-[#14433b] focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            >
                                {devices.map((dev) => (
                                    <option key={dev.id} value={dev.id}>
                                        {dev.device_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Mode Verifikasi Badge & Fallback Button */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-semibold text-gray-700">
                            <span className="text-gray-400">Verifikasi:</span>
                            <span className="font-bold text-[#14433b]">
                                {currentVerificationMode === 'webcam_visual' && 'Webcam Visual'}
                                {currentVerificationMode === 'cctv_visual' && 'CCTV Visual'}
                                {currentVerificationMode === 'officer_manual' && 'Manual Petugas'}
                            </span>
                        </div>

                        {currentVerificationMode !== 'officer_manual' && (
                            <button
                                type="button"
                                onClick={handleTriggerFallback}
                                className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs"
                                title="Ganti segera ke mode verifikasi manual petugas jika kamera terganggu"
                            >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                <span>Mode Fallback</span>
                            </button>
                        )}

                        {/* Sound Toggle */}
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                soundEnabled
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                            title="Aktifkan/Nonaktifkan Suara Ding Scanner"
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
                            <span className="hidden sm:inline">{soundEnabled ? 'Suara Aktif' : 'Senyap'}</span>
                        </button>
                    </div>
                </div>

                {/* Main Scanning Arena (2 Columns) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Camera Viewport & Manual Input (7 Cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="relative bg-gray-950 rounded-2xl overflow-hidden shadow-md border border-gray-800 min-h-[380px] flex flex-col justify-between p-4">
                            {/* Camera Header Status */}
                            <div className="flex items-center justify-between text-xs text-white z-10">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                    <span className="font-mono">{cameraActive ? 'KAMERA AKTIF (15 FPS)' : 'KAMERA NONAKTIF'}</span>
                                </div>
                                <div className="text-gray-400 font-mono text-[11px]">
                                    {server_clock} WITA
                                </div>
                            </div>

                            {/* Viewport for Html5Qrcode Reader */}
                            <div className="relative flex-1 flex items-center justify-center my-2">
                                <div
                                    id={readerId}
                                    className={`w-full max-w-[320px] rounded-xl overflow-hidden ${!cameraActive ? 'hidden' : ''}`}
                                />

                                {!cameraActive && (
                                    <div className="text-center py-12 px-4 text-gray-400">
                                        <CameraOff className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                                        <p className="text-sm font-semibold text-gray-300">Kamera Scanner Belum Diaktifkan</p>
                                        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                                            Klik tombol di bawah untuk menyalakan kamera web/HP atau gunakan pembaca barcode manual.
                                        </p>
                                        <button
                                            onClick={startCamera}
                                            className="mt-4 px-5 py-2.5 rounded-xl bg-[#21c9a4] text-[#14433b] font-bold text-xs hover:bg-[#1eb694] transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
                                        >
                                            <Camera className="w-4 h-4" />
                                            <span>Mulai Kamera Scanner</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Camera Action Buttons */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs">
                                {cameraActive ? (
                                    <button
                                        onClick={stopCamera}
                                        className="px-3 py-1.5 rounded-lg bg-red-900/60 text-red-200 border border-red-800 hover:bg-red-900 transition-colors flex items-center gap-1.5 font-medium"
                                    >
                                        <CameraOff className="w-3.5 h-3.5" />
                                        <span>Matikan Kamera</span>
                                    </button>
                                ) : (
                                    <span className="text-gray-500 text-[11px]">Mode kamera offline</span>
                                )}

                                {phase !== 'idle' && (
                                    <button
                                        onClick={resetScannerForNext}
                                        className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-1.5 font-medium ml-auto"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Reset Scanner</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Manual Token / Barcode Gun Input (Alternative Mode) */}
                        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <form onSubmit={handleManualSubmit} className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualToken}
                                    onChange={(e) => setManualToken(e.target.value)}
                                    placeholder="Input / scan token barcode manual..."
                                    className="flex-1 px-3 py-2 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !manualToken.trim()}
                                    className="px-4 py-2 bg-[#14433b] text-white text-xs font-bold rounded-lg hover:bg-[#1b554b] disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                                >
                                    <Send className="w-3.5 h-3.5 text-[#21c9a4]" />
                                    <span>Periksa</span>
                                </button>
                            </form>
                            <p className="text-[11px] text-gray-500 mt-2">
                                *Mendukung pembaca scanner barcode USB eksternal (tekan Enter otomatis).
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Identity Verification & Anti-Titip Absen Decision Box (5 Cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between min-h-[460px]">
                            {/* Verification Stage Banner */}
                            <div className="border-b border-gray-100 pb-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        VERIFIKASI IDENTITAS FISIK
                                    </span>
                                    {phase === 'verifying' && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                                            PERIKSA WAJAH SISWA
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Verification Body Content */}
                            <div className="my-auto py-4 text-center">
                                {phase === 'verifying' && verifiedStudent && (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                                        {/* Student Official Photo */}
                                        <div className="w-28 h-36 mx-auto rounded-xl border-2 border-[#14433b] overflow-hidden shadow-md bg-gray-100 flex items-center justify-center">
                                            {verifiedStudent.photo_path ? (
                                                <img
                                                    src={verifiedStudent.photo_path}
                                                    alt={verifiedStudent.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="text-gray-400 text-xs font-semibold flex flex-col items-center">
                                                    <UserCheck className="w-8 h-8 text-gray-300 mb-1" />
                                                    <span>FOTO RESMI</span>
                                                    <span className="text-[10px] text-gray-400">3 x 4</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Student Data */}
                                        <div>
                                            <h3 className="text-lg font-extrabold text-gray-900">
                                                {verifiedStudent.name}
                                            </h3>
                                            <p className="text-xs font-bold text-[#14433b] mt-0.5">
                                                NIS: {verifiedStudent.nis} &bull; Kelas: {verifiedStudent.class_name}
                                            </p>
                                        </div>

                                        {/* Time & Attendance Status Preview */}
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold">
                                            <span>Status Kedatangan:</span>
                                            <StatusBadge
                                                status={verificationDetails?.suggested_status || 'hadir'}
                                                size="sm"
                                            />
                                        </div>

                                        {/* Verification Security Notice */}
                                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                                            <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <strong>Instruksi Anti-Titip Absen:</strong>
                                                <p className="text-[11px] text-amber-800 mt-0.5">
                                                    Pastikan siswa yang berdiri di hadapan Anda benar-benar sesuai dengan foto resmi di atas. Jika kartu dibawa oleh temannya, klik <strong>Tolak</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Decision Buttons (Confirm or Reject) */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={handleConfirmAttendance}
                                                disabled={isSubmitting}
                                                className="w-full py-3 px-4 rounded-xl bg-[#14433b] text-white font-bold text-xs sm:text-sm hover:bg-[#1b554b] shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-[#21c9a4]" />
                                                <span>Konfirmasi Hadir</span>
                                            </button>

                                            <button
                                                onClick={() => setRejectionModalOpen(true)}
                                                disabled={isSubmitting}
                                                className="w-full py-3 px-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm hover:bg-rose-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4 text-rose-600" />
                                                <span>Tolak / Curiga</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {phase === 'success' && (
                                    <div className="space-y-3 py-8 animate-in fade-in zoom-in-95">
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                                            <CheckCircle2 className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-base font-extrabold text-emerald-900">
                                            ABSENSI SAH TERCATAT
                                        </h3>
                                        <p className="text-xs text-gray-600 max-w-xs mx-auto">
                                            {statusMessage}
                                        </p>
                                        <div className="pt-4">
                                            <button
                                                onClick={resetScannerForNext}
                                                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
                                            >
                                                Pindai Siswa Berikutnya &rarr;
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {phase === 'duplicate' && verifiedStudent && (
                                    <div className="space-y-3 py-6 animate-in fade-in">
                                        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                                            <AlertTriangle className="w-9 h-9" />
                                        </div>
                                        <h3 className="text-base font-extrabold text-amber-900">
                                            DUPLIKAT: SUDAH ABSEN
                                        </h3>
                                        <p className="text-xs text-gray-600 max-w-xs mx-auto">
                                            Siswa <strong>{verifiedStudent.name}</strong> ({verifiedStudent.nis}) sudah tercatat hadir pada sesi ini sebelumnya.
                                        </p>
                                        <button
                                            onClick={resetScannerForNext}
                                            className="px-4 py-2 mt-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700"
                                        >
                                            Siap Scan Berikutnya
                                        </button>
                                    </div>
                                )}

                                {phase === 'rejected' && (
                                    <div className="space-y-3 py-6 animate-in fade-in">
                                        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                                            <XCircle className="w-9 h-9" />
                                        </div>
                                        <h3 className="text-base font-extrabold text-rose-900">
                                            PEMINDAIAN DITOLAK
                                        </h3>
                                        <p className="text-xs text-rose-700 font-medium max-w-xs mx-auto">
                                            {statusMessage}
                                        </p>
                                        <button
                                            onClick={resetScannerForNext}
                                            className="px-4 py-2 mt-2 rounded-lg bg-gray-200 text-gray-800 text-xs font-bold hover:bg-gray-300"
                                        >
                                            Pindai Ulang
                                        </button>
                                    </div>
                                )}

                                {phase === 'idle' && (
                                    <div className="py-12 text-gray-400">
                                        <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-xs font-semibold text-gray-600">Menunggu Pemindaian Kartu Siswa</p>
                                        <p className="text-[11px] text-gray-400 mt-1">
                                            Dekatkan kode QR siswa ke kamera scanner.
                                        </p>
                                    </div>
                                )}

                                {phase === 'scanning' && (
                                    <div className="py-12 text-[#14433b]">
                                        <div className="w-10 h-10 border-4 border-[#21c9a4] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-xs font-bold">Kamera Siap Menerima Kartu</p>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Arahkan QR Code tepat di dalam kotak fokus kamera.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Status Bottom Footer */}
                            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                                <span>Protokol Keamanan: SHA-256 Auth</span>
                                <span>Anti-Titip Absen V1.0</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Session History on this Scanner Station */}
                <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">
                        Pemindaian Terkonfirmasi di Stasiun Ini ({recentScans.length} Siswa Terakhir)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/50">
                                    <th className="py-2 px-3">Jam Scan</th>
                                    <th className="py-2 px-3">NIS</th>
                                    <th className="py-2 px-3">Nama Siswa</th>
                                    <th className="py-2 px-3">Kelas</th>
                                    <th className="py-2 px-3">Status</th>
                                    <th className="py-2 px-3">Petugas Otoritas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentScans.slice(0, 10).map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="py-2 px-3 font-mono font-bold text-gray-700">{r.time}</td>
                                        <td className="py-2 px-3 font-mono text-gray-600">{r.nis}</td>
                                        <td className="py-2 px-3 font-semibold text-gray-900">{r.name}</td>
                                        <td className="py-2 px-3 text-gray-600">{r.class_name}</td>
                                        <td className="py-2 px-3"><StatusBadge status={r.status} size="sm" /></td>
                                        <td className="py-2 px-3 text-gray-500">{r.officer_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Rejection / Titip Absen Dialog */}
            {rejectionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="p-2.5 rounded-xl bg-rose-100">
                                <UserX className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Tolak & Laporkan Kecurigaan</h3>
                                <p className="text-xs text-gray-500">Pencatatan pelanggaran atau anomali identitas</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Pilih Alasan Penolakan:
                                </label>
                                <select
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-rose-500 focus:border-rose-500"
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
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Catatan Tambahan (Opsional):
                                </label>
                                <textarea
                                    value={rejectionNote}
                                    onChange={(e) => setRejectionNote(e.target.value)}
                                    rows={3}
                                    placeholder="Contoh: Kartu dibawa oleh siswa kelas X MIPA 2 atas nama Budi..."
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-rose-500 focus:border-rose-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setRejectionModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-100"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleRejectAttendance}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-sm"
                            >
                                Catat Penolakan ke Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
