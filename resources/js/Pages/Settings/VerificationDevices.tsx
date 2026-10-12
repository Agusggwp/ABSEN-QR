import React, { useState, useEffect, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, CameraDevice, AttendanceSetting, DeviceTestLog } from '@/types';
import {
    Camera,
    Video,
    ShieldCheck,
    Radio,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Plus,
    Save,
    Play,
    Square,
    Eye,
    Trash2,
    Settings,
    Server,
    Wifi,
    Cpu,
    HelpCircle,
    Lock,
    Sliders,
    ArrowRightCircle,
} from 'lucide-react';
import axios from 'axios';

interface VerificationDevicesProps {
    settings: AttendanceSetting;
    devices: CameraDevice[];
    recent_logs: DeviceTestLog[];
    allowed_ports: number[];
}

export default function VerificationDevices({
    settings,
    devices,
    recent_logs,
    allowed_ports,
}: VerificationDevicesProps) {
    const { props } = usePage<PageProps>();

    // State Pengaturan Utama
    const [qrScannerMode, setQrScannerMode] = useState<'browser_camera' | 'usb_scanner'>(
        settings.qr_scanner_mode || 'browser_camera'
    );
    const [verificationMode, setVerificationMode] = useState<
        'officer_manual' | 'webcam_visual' | 'cctv_visual'
    >(settings.identity_verification_mode || 'officer_manual');
    const [activeCameraId, setActiveCameraId] = useState<number | null>(
        settings.active_camera_id || null
    );
    const [faceRecognitionStatus, setFaceRecognitionStatus] = useState<string>(
        settings.face_recognition_status || 'tidak_digunakan'
    );
    const [allowManualFallback, setAllowManualFallback] = useState<boolean>(
        settings.allow_manual_fallback ?? true
    );
    const [requireVisualMatching, setRequireVisualMatching] = useState<boolean>(
        settings.require_visual_photo_matching ?? true
    );

    // State Tambah / Edit Modal CCTV
    const [isCctvModalOpen, setIsCctvModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<CameraDevice | null>(null);
    const [cctvForm, setCctvForm] = useState({
        name: '',
        brand: 'EZVIZ',
        model: 'H8c Outdoor Pan & Tilt',
        location: 'Pintu Gerbang Utama Barat',
        host: '192.168.1.200',
        port: 554,
        protocol: 'rtsp',
        username: 'admin',
        password: '',
        verification_code: '',
    });
    const [isTestingCctv, setIsTestingCctv] = useState(false);
    const [cctvTestResult, setCctvTestResult] = useState<any | null>(null);

    // State Webcam Browser
    const [availableWebcams, setAvailableWebcams] = useState<MediaDeviceInfo[]>([]);
    const [selectedWebcamId, setSelectedWebcamId] = useState<string>('');
    const [webcamResolution, setWebcamResolution] = useState<string>('1280x720');
    const [isWebcamStreaming, setIsWebcamStreaming] = useState(false);
    const [webcamPermissionStatus, setWebcamPermissionStatus] = useState<
        'prompt' | 'granted' | 'denied' | 'in_use' | 'not_found'
    >('prompt');
    const [webcamErrorMessage, setWebcamErrorMessage] = useState<string | null>(null);
    const [webcamSnapshot, setWebcamSnapshot] = useState<string | null>(null);

    // References
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    // Enumerate webcams when user interaction occurs or on mount
    const refreshWebcamList = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            setWebcamPermissionStatus('not_found');
            setWebcamErrorMessage('Browser ini tidak mendukung MediaDevices API.');
            return;
        }

        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
            setAvailableWebcams(videoInputs);
            if (videoInputs.length > 0 && !selectedWebcamId) {
                setSelectedWebcamId(videoInputs[0].deviceId);
            }
        } catch (err: any) {
            console.error('Gagal mendeteksi daftar webcam:', err);
        }
    };

    useEffect(() => {
        refreshWebcamList();

        // Cleanup media stream saat berpindah halaman
        return () => {
            stopWebcamStream();
        };
    }, []);

    // Hentikan Stream Webcam
    const stopWebcamStream = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => {
                track.stop();
            });
            mediaStreamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsWebcamStreaming(false);
    };

    // Jalankan Stream Webcam (Hanya atas aksi klik tombol Aktifkan Kamera)
    const startWebcamStream = async () => {
        setWebcamErrorMessage(null);
        stopWebcamStream();

        const [width, height] = webcamResolution.split('x').map(Number);
        const constraints: MediaStreamConstraints = {
            video: {
                deviceId: selectedWebcamId ? { exact: selectedWebcamId } : undefined,
                width: width ? { ideal: width } : undefined,
                height: height ? { ideal: height } : undefined,
            },
            audio: false,
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsWebcamStreaming(true);
            setWebcamPermissionStatus('granted');
            // Refresh list agar label perangkat muncul setelah izin diberikan
            refreshWebcamList();
        } catch (err: any) {
            console.error('Error memulai webcam:', err);
            setIsWebcamStreaming(false);

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setWebcamPermissionStatus('denied');
                setWebcamErrorMessage('Izin akses kamera ditolak oleh peramban. Silakan klik ikon gembok pada address bar peramban untuk mengizinkan akses kamera.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setWebcamPermissionStatus('not_found');
                setWebcamErrorMessage('Perangkat webcam tidak ditemukan atau terputus.');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setWebcamPermissionStatus('in_use');
                setWebcamErrorMessage('Kamera sedang digunakan oleh aplikasi lain (seperti Zoom, Google Meet, OBS) atau bermasalah.');
            } else {
                setWebcamErrorMessage(`Gagal mengakses kamera: ${err.message || err.name}`);
            }
        }
    };

    // Ambil Snapshot Uji (Hanya render frame ke canvas, TIDAK disimpan ke database)
    const captureTestSnapshot = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setWebcamSnapshot(dataUrl);
        }
    };

    // Simpan Perangkat Webcam ke Database
    const handleSaveWebcamDevice = () => {
        const selectedDevice = availableWebcams.find((d) => d.deviceId === selectedWebcamId);
        const deviceName = selectedDevice?.label || `Webcam (${webcamResolution})`;

        router.post(
            '/settings/verification-devices/devices',
            {
                name: deviceName,
                type: 'webcam',
                brand: 'USB / Built-in Camera',
                model: webcamResolution,
                location: 'Pos Gerbang / Meja Petugas',
                browser_device_id: selectedWebcamId,
                resolution_requested: webcamResolution,
            },
            {
                preserveScroll: true,
            }
        );
    };

    // Uji Koneksi CCTV secara langsung
    const handleTestCctvDirect = async () => {
        setIsTestingCctv(true);
        setCctvTestResult(null);

        try {
            const res = await axios.post('/settings/verification-devices/test-cctv', {
                host: cctvForm.host,
                port: cctvForm.port,
                protocol: cctvForm.protocol,
                username: cctvForm.username,
                password: cctvForm.password,
            });
            setCctvTestResult(res.data);
        } catch (err: any) {
            setCctvTestResult({
                online: false,
                result: 'failed',
                message: err.response?.data?.message || 'Uji koneksi gagal.',
                details: [err.message],
            });
        } finally {
            setIsTestingCctv(false);
        }
    };

    // Simpan CCTV Baru
    const handleSaveCctvDevice = (e: React.FormEvent) => {
        e.preventDefault();

        router.post(
            '/settings/verification-devices/devices',
            {
                name: cctvForm.name,
                type: 'cctv',
                brand: cctvForm.brand,
                model: cctvForm.model,
                location: cctvForm.location,
                host: cctvForm.host,
                port: cctvForm.port,
                protocol: cctvForm.protocol,
                username: cctvForm.username,
                password: cctvForm.password,
                verification_code: cctvForm.verification_code,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCctvModalOpen(false);
                    setCctvForm({
                        name: '',
                        brand: 'EZVIZ',
                        model: 'H8c Outdoor Pan & Tilt',
                        location: 'Pintu Gerbang Utama Barat',
                        host: '192.168.1.200',
                        port: 554,
                        protocol: 'rtsp',
                        username: 'admin',
                        password: '',
                        verification_code: '',
                    });
                    setCctvTestResult(null);
                },
            }
        );
    };

    // Simpan Pengaturan Utama Sistem Absensi
    const handleSaveAttendanceSettings = (e: React.FormEvent) => {
        e.preventDefault();

        // Validasi jika CCTV/Webcam dipilih tapi belum ada activeCameraId
        if (
            (verificationMode === 'webcam_visual' || verificationMode === 'cctv_visual') &&
            !activeCameraId
        ) {
            alert('Silakan pilih salah satu kamera yang terdaftar pada daftar di bawah sebelum menyimpan mode ini.');
            return;
        }

        router.put(
            '/settings/verification-devices/attendance-settings',
            {
                qr_scanner_mode: qrScannerMode,
                identity_verification_mode: verificationMode,
                active_camera_id: activeCameraId,
                face_recognition_status: faceRecognitionStatus,
                allow_manual_fallback: allowManualFallback,
                require_visual_photo_matching: requireVisualMatching,
            },
            {
                preserveScroll: true,
            }
        );
    };

    // Aktifkan Perangkat Tertentu
    const handleActivateDevice = (device: CameraDevice) => {
        if (device.type === 'cctv' && device.status !== 'terhubung') {
            alert('Kamera CCTV belum lolos uji koneksi. Jalankan Uji Koneksi terlebih dahulu sebelum mengaktifkannya.');
            return;
        }

        router.post(
            `/settings/verification-devices/devices/${device.id}/activate`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setActiveCameraId(device.id);
                    setVerificationMode(device.type === 'webcam' ? 'webcam_visual' : 'cctv_visual');
                },
            }
        );
    };

    // Jalankan Uji pada Perangkat yang Sudah Disimpan
    const handleTestSavedDevice = (device: CameraDevice) => {
        router.post(
            `/settings/verification-devices/devices/${device.id}/test`,
            {},
            {
                preserveScroll: true,
            }
        );
    };

    // Hapus Perangkat
    const handleDeleteDevice = (device: CameraDevice) => {
        if (!confirm(`Hapus perangkat "${device.name}" dari sistem?`)) return;

        router.delete(`/settings/verification-devices/devices/${device.id}`, {
            preserveScroll: true,
        });
    };

    // Beralih Cepat ke Fallback Manual Petugas
    const handleSwitchToFallback = () => {
        if (!confirm('Alihkan sistem segera ke Mode Cadangan (QR Code + Verifikasi Manual Petugas)?')) return;

        router.post(
            '/settings/verification-devices/fallback',
            { reason: 'Dialihkan oleh Super Admin melalui Dashboard' },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setVerificationMode('officer_manual');
                },
            }
        );
    };

    return (
        <AuthenticatedLayout title="Pengaturan Perangkat Verifikasi">
            <Head title="Pengaturan Perangkat Verifikasi Kamera & CCTV" />

            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* Header Judul */}
                <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#14433b] uppercase tracking-wider mb-1">
                            <Sliders className="w-4 h-4 text-[#21c9a4]" />
                            <span>Pengaturan Sistem Absensi &bull; Perangkat Verifikasi</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">
                            Konfigurasi Kamera & Metode Verifikasi Identitas
                        </h1>
                        <p className="text-xs text-gray-500 mt-1 max-w-3xl">
                            Pilih dan kelola perangkat kamera (Webcam atau CCTV IP / EZVIZ H8c) yang digunakan petugas untuk memverifikasi identitas fisik siswa. Sedia mode cadangan manual tanpa ketergantungan perangkat.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSwitchToFallback}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all shadow-sm"
                            title="Aktifkan mode darurat manual"
                        >
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                            <span>Mode Cadangan Manual</span>
                        </button>
                    </div>
                </div>

                {/* Banner Status Aktif Saat Ini */}
                <div className="p-5 bg-gradient-to-r from-[#14433b] to-[#1d5b50] rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-[#21c9a4]">
                            {verificationMode === 'webcam_visual' && <Video className="w-6 h-6" />}
                            {verificationMode === 'cctv_visual' && <Camera className="w-6 h-6" />}
                            {verificationMode === 'officer_manual' && <ShieldCheck className="w-6 h-6" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#21c9a4] bg-white/10 px-2.5 py-0.5 rounded-full">
                                    Metode Verifikasi Aktif
                                </span>
                                {settings.active_camera && (
                                    <span className="text-xs text-emerald-200 font-medium">
                                        Perangkat: {settings.active_camera.name}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-lg font-bold mt-1">
                                {verificationMode === 'webcam_visual' && 'Webcam Komputer / Laptop (Visual Wajah Siswa)'}
                                {verificationMode === 'cctv_visual' && 'CCTV IP Camera (Feed Kamera Gerbang)'}
                                {verificationMode === 'officer_manual' && 'QR Code + Verifikasi Manual Petugas (Mode Mandiri)'}
                            </h2>
                            <p className="text-xs text-emerald-100/80 mt-0.5">
                                Mode Scanner QR: <strong className="text-white">{qrScannerMode === 'browser_camera' ? 'Kamera Browser' : 'Barcode/QR USB Scanner Fisik'}</strong> &bull; Status Mesin Biometrik: <strong className="text-white">{faceRecognitionStatus.replace('_', ' ')}</strong>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-[#21c9a4]" />
                            <span>Siap Produksi</span>
                        </span>
                    </div>
                </div>

                {/* Form Utama: Pemilihan Mode & Strategi Absensi */}
                <form onSubmit={handleSaveAttendanceSettings} className="space-y-6">
                    <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-sm space-y-6">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Radio className="w-5 h-5 text-[#14433b]" />
                                <span>1. Pilih Metode Verifikasi Identitas Siswa</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Tentukan bagaimana petugas gerbang memastikan siswa yang hadir adalah pemilik sah kartu QR.
                            </p>
                        </div>

                        {/* 3 Kartu Radio Pilihan Metode */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Opsi 1: Webcam */}
                            <div
                                onClick={() => setVerificationMode('webcam_visual')}
                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
                                    verificationMode === 'webcam_visual'
                                        ? 'border-[#21c9a4] bg-emerald-50/30 shadow-sm'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="p-2.5 bg-emerald-100 text-[#14433b] rounded-lg">
                                        <Video className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="radio"
                                        name="verification_mode"
                                        checked={verificationMode === 'webcam_visual'}
                                        onChange={() => setVerificationMode('webcam_visual')}
                                        className="h-4 w-4 text-[#14433b] focus:ring-[#21c9a4]"
                                    />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mt-3">
                                    Webcam Komputer / Laptop
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Menggunakan webcam USB atau bawaan laptop pos gerbang untuk menampilkan wajah siswa secara langsung di layar saat QR dipindai.
                                </p>
                                <div className="mt-3 text-[11px] font-semibold text-emerald-800 bg-emerald-100/60 px-2 py-1 rounded-md inline-block">
                                    Direkomendasikan untuk Pos Meja
                                </div>
                            </div>

                            {/* Opsi 2: CCTV IP Camera */}
                            <div
                                onClick={() => setVerificationMode('cctv_visual')}
                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
                                    verificationMode === 'cctv_visual'
                                        ? 'border-[#21c9a4] bg-emerald-50/30 shadow-sm'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="p-2.5 bg-blue-100 text-blue-800 rounded-lg">
                                        <Camera className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="radio"
                                        name="verification_mode"
                                        checked={verificationMode === 'cctv_visual'}
                                        onChange={() => setVerificationMode('cctv_visual')}
                                        className="h-4 w-4 text-[#14433b] focus:ring-[#21c9a4]"
                                    />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mt-3">
                                    CCTV IP Camera (EZVIZ H8c / RTSP)
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Mengambil feed visual dari kamera pengawas IP di tiang gerbang sekolah melalui protokol jaringan lokal RTSP/ONVIF.
                                </p>
                                <div className="mt-3 text-[11px] font-semibold text-blue-800 bg-blue-100/60 px-2 py-1 rounded-md inline-block">
                                    Memerlukan Koneksi LAN Stabil
                                </div>
                            </div>

                            {/* Opsi 3: Petugas Manual (Fallback Utama) */}
                            <div
                                onClick={() => setVerificationMode('officer_manual')}
                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
                                    verificationMode === 'officer_manual'
                                        ? 'border-[#21c9a4] bg-emerald-50/30 shadow-sm'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="p-2.5 bg-amber-100 text-amber-800 rounded-lg">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="radio"
                                        name="verification_mode"
                                        checked={verificationMode === 'officer_manual'}
                                        onChange={() => setVerificationMode('officer_manual')}
                                        className="h-4 w-4 text-[#14433b] focus:ring-[#21c9a4]"
                                    />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mt-3">
                                    QR + Verifikasi Manual Petugas
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Layar menampilkan foto resmi siswa dari database. Petugas mencocokkan wajah siswa fisik langsung tanpa kamera tambahan.
                                </p>
                                <div className="mt-3 text-[11px] font-semibold text-amber-800 bg-amber-100/60 px-2 py-1 rounded-md inline-block">
                                    Mode Cadangan 100% Andal
                                </div>
                            </div>
                        </div>

                        {/* Pemilihan Perangkat Kamera Aktif jika Webcam/CCTV dipilih */}
                        {(verificationMode === 'webcam_visual' || verificationMode === 'cctv_visual') && (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                                    Pilih Perangkat Kamera Aktif untuk Mode {verificationMode === 'webcam_visual' ? 'Webcam' : 'CCTV'}:
                                </label>
                                <select
                                    value={activeCameraId || ''}
                                    onChange={(e) => setActiveCameraId(Number(e.target.value) || null)}
                                    className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4] bg-white font-medium"
                                >
                                    <option value="">-- Pilih Kamera Terdaftar --</option>
                                    {devices
                                        .filter((d) => (verificationMode === 'webcam_visual' ? d.type === 'webcam' : d.type === 'cctv'))
                                        .map((dev) => (
                                            <option key={dev.id} value={dev.id}>
                                                {dev.name} ({dev.brand} {dev.model || ''}) &bull; Status: {dev.status}
                                            </option>
                                        ))}
                                </select>
                                {devices.filter((d) => (verificationMode === 'webcam_visual' ? d.type === 'webcam' : d.type === 'cctv')).length === 0 && (
                                    <p className="text-xs text-amber-600 font-medium">
                                        Belum ada perangkat {verificationMode === 'webcam_visual' ? 'Webcam' : 'CCTV'} yang terdaftar. Tambahkan perangkat melalui formulir di bawah.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Pemisahan Metode Pemindaian QR */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                            <div>
                                <label className="block text-xs font-bold text-gray-900 mb-1">
                                    Metode Pemindaian QR Code (Input Token)
                                </label>
                                <p className="text-[11px] text-gray-500 mb-2">
                                    Tentukan perangkat yang membaca fisik kode QR pada kartu siswa.
                                </p>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer text-xs font-medium text-gray-800">
                                        <input
                                            type="radio"
                                            name="qr_scanner_mode"
                                            value="browser_camera"
                                            checked={qrScannerMode === 'browser_camera'}
                                            onChange={() => setQrScannerMode('browser_camera')}
                                            className="text-[#14433b] focus:ring-[#21c9a4]"
                                        />
                                        <span>Kamera Web Browser (HTML5 QR Scanner)</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer text-xs font-medium text-gray-800">
                                        <input
                                            type="radio"
                                            name="qr_scanner_mode"
                                            value="usb_scanner"
                                            checked={qrScannerMode === 'usb_scanner'}
                                            onChange={() => setQrScannerMode('usb_scanner')}
                                            className="text-[#14433b] focus:ring-[#21c9a4]"
                                        />
                                        <span>Barcode Scanner USB Fisik (Keyboard Emulation / Gun Scanner)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Opsi Verifikasi Wajah Otomatis */}
                            <div>
                                <label className="block text-xs font-bold text-gray-900 mb-1">
                                    Status Mesin Verifikasi Wajah Otomatis (Biometrik)
                                </label>
                                <p className="text-[11px] text-gray-500 mb-2">
                                    Pengenalan wajah otomatis memerlukan pengujian akurasi & kepatuhan UU PDP No. 27/2022.
                                </p>
                                <select
                                    value={faceRecognitionStatus}
                                    onChange={(e) => setFaceRecognitionStatus(e.target.value)}
                                    className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4] bg-white font-medium"
                                >
                                    <option value="tidak_digunakan">Tidak Digunakan</option>
                                    <option value="belum_dikonfigurasi">Belum Dikonfigurasi</option>
                                    <option value="sedang_diuji">Sedang Diuji (Tahap Evaluasi Teknis)</option>
                                    <option value="siap_diujicoba">Siap Diujicoba Terbatas</option>
                                    <option value="aktif" disabled>
                                        Aktif (Terkunci: Menunggu Sertifikasi UU PDP)
                                    </option>
                                    <option value="gangguan">Gangguan / Nonaktif Sementara</option>
                                </select>
                                <p className="text-[11px] text-gray-500 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200/60 text-amber-800">
                                    <strong>Perhatian Regulasi:</strong> Status "Aktif" dibatasi sebelum seluruh model deteksi biometrik memenuhi uji anti-spoofing dan persetujuan wali murid.
                                </p>
                            </div>
                        </div>

                        {/* Checkbox Pengaman Tambahan */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-gray-100">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={allowManualFallback}
                                    onChange={(e) => setAllowManualFallback(e.target.checked)}
                                    className="rounded text-[#14433b] focus:ring-[#21c9a4]"
                                />
                                <span>Izinkan peralihan otomatis ke Verifikasi Manual jika kamera offline</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={requireVisualMatching}
                                    onChange={(e) => setRequireVisualMatching(e.target.checked)}
                                    className="rounded text-[#14433b] focus:ring-[#21c9a4]"
                                />
                                <span>Wajibkan konfirmasi visual petugas pada setiap sesi absensi</span>
                            </label>
                        </div>

                        {/* Tombol Simpan Konfigurasi */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14433b] text-white hover:bg-[#1a554a] font-bold text-xs shadow-md transition-all"
                            >
                                <Save className="w-4 h-4 text-[#21c9a4]" />
                                <span>Simpan Pengaturan Absensi</span>
                            </button>
                        </div>
                    </div>
                </form>

                {/* Section B: Pengujian & Konfigurasi Webcam Komputer / Laptop */}
                <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Video className="w-5 h-5 text-[#14433b]" />
                                <span>2. Uji Langsung & Perekaman Webcam Browser</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Uji perangkat kamera komputer atau laptop petugas langsung melalui MediaDevices API tanpa reload.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={refreshWebcamList}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Pindai Perangkat Baru</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* Kontrol Pemilihan Kamera & Resolusi */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Pilih Perangkat Input Video (Webcam):
                                </label>
                                <select
                                    value={selectedWebcamId}
                                    onChange={(e) => setSelectedWebcamId(e.target.value)}
                                    className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4] bg-white font-medium"
                                >
                                    {availableWebcams.length === 0 && (
                                        <option value="">Webcam Default (Belum terdeteksi / Belum ada izin)</option>
                                    )}
                                    {availableWebcams.map((device, idx) => (
                                        <option key={device.deviceId || idx} value={device.deviceId}>
                                            {device.label || `Kamera ${idx + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Resolusi yang Diminta:
                                </label>
                                <select
                                    value={webcamResolution}
                                    onChange={(e) => setWebcamResolution(e.target.value)}
                                    className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4] bg-white font-medium"
                                >
                                    <option value="640x480">VGA 480p (640 &times; 480) - Ringan</option>
                                    <option value="1280x720">HD 720p (1280 &times; 720) - Standar Optimal</option>
                                    <option value="1920x1080">Full HD 1080p (1920 &times; 1080) - Presisi Tinggi</option>
                                </select>
                            </div>

                            {/* Status Izin & Error Banner */}
                            {webcamErrorMessage && (
                                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                                    <p className="leading-relaxed">{webcamErrorMessage}</p>
                                </div>
                            )}

                            {webcamPermissionStatus === 'granted' && (
                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Izin kamera aktif. Stream video berjalan normal.</span>
                                </div>
                            )}

                            {/* Tombol Aksi Webcam */}
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                {!isWebcamStreaming ? (
                                    <button
                                        type="button"
                                        onClick={startWebcamStream}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#14433b] hover:bg-[#1b554b] rounded-xl shadow-sm transition-all"
                                    >
                                        <Play className="w-4 h-4 text-[#21c9a4]" />
                                        <span>Aktifkan Kamera</span>
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={stopWebcamStream}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all"
                                        >
                                            <Square className="w-4 h-4 text-red-600" />
                                            <span>Hentikan Kamera</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={captureTestSnapshot}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all"
                                        >
                                            <Camera className="w-4 h-4 text-blue-600" />
                                            <span>Ambil Gambar Uji</span>
                                        </button>
                                    </>
                                )}

                                <button
                                    type="button"
                                    onClick={handleSaveWebcamDevice}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Simpan ke Daftar</span>
                                </button>
                            </div>
                        </div>

                        {/* Pratinjau Video & Snapshot Canvas */}
                        <div className="space-y-3">
                            <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center border border-gray-300 shadow-inner">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${isWebcamStreaming ? 'block' : 'hidden'}`}
                                />
                                {!isWebcamStreaming && (
                                    <div className="text-center p-6 text-gray-400">
                                        <Video className="w-12 h-12 mx-auto mb-2 opacity-40" />
                                        <p className="text-xs font-semibold">Pratinjau Video Nonaktif</p>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Klik tombol "Aktifkan Kamera" di samping untuk memulai pratinjau live stream.
                                        </p>
                                    </div>
                                )}
                                {isWebcamStreaming && (
                                    <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow">
                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                        <span>LIVE WEBCAM</span>
                                    </span>
                                )}
                            </div>

                            {/* Canvas Tersembunyi untuk Snapshot */}
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Pratinjau Snapshot Uji Sementara */}
                            {webcamSnapshot && (
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={webcamSnapshot}
                                            alt="Snapshot Uji"
                                            className="w-16 h-12 object-cover rounded-lg border border-gray-300 shadow-sm"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">
                                                Hasil Frame Snapshot Uji
                                            </p>
                                            <p className="text-[10px] text-gray-500">
                                                Frame berhasil diambil di memori lokal peramban (tidak disimpan permanen).
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setWebcamSnapshot(null)}
                                        className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section C: Pengaturan CCTV IP Camera & EZVIZ H8c */}
                <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Camera className="w-5 h-5 text-[#14433b]" />
                                <span>3. Konfigurasi CCTV IP Camera & EZVIZ H8c</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Daftarkan kamera CCTV sekolah dan lakukan uji koneksi soket jaringan sebelum aktivasi.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingDevice(null);
                                setIsCctvModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#14433b] hover:bg-[#1a554a] rounded-xl shadow-sm transition-all"
                        >
                            <Plus className="w-4 h-4 text-[#21c9a4]" />
                            <span>Tambah CCTV Baru</span>
                        </button>
                    </div>

                    {/* Informasi Kompatibilitas EZVIZ H8c */}
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/70 text-xs text-emerald-950 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-[#14433b]">
                            <HelpCircle className="w-4 h-4 text-[#21c9a4]" />
                            <span>Panduan Integrasi CCTV EZVIZ H8c Outdoor</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed text-[11.5px]">
                            1. Aktifkan opsi <strong>LAN Live View</strong> pada aplikasi EZVIZ di ponsel Anda agar port RTSP 554 terbuka di jaringan lokal.<br />
                            2. Password default RTSP adalah <strong>Verification Code</strong> (6-8 huruf kapital) yang tercetak pada stiker badan kamera atau buku manual.<br />
                            3. Pastikan IP kamera berada dalam satu subnet LAN sekolah (misal: 192.168.1.xxx) dan uji koneksi soket sebelum mengaktifkan.
                        </p>
                    </div>

                    {/* Daftar Perangkat Terdaftar */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                            Daftar Perangkat Terdaftar di Sistem:
                        </h3>

                        {devices.length === 0 ? (
                            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                                Belum ada perangkat kamera atau CCTV yang tersimpan.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {devices.map((device) => {
                                    const isActive = settings.active_camera_id === device.id;
                                    return (
                                        <div
                                            key={device.id}
                                            className={`p-4 rounded-xl border transition-all ${
                                                isActive
                                                    ? 'border-[#21c9a4] bg-emerald-50/20 shadow-sm'
                                                    : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`p-2 rounded-lg ${
                                                            device.type === 'webcam'
                                                                ? 'bg-emerald-100 text-[#14433b]'
                                                                : 'bg-blue-100 text-blue-800'
                                                        }`}
                                                    >
                                                        {device.type === 'webcam' ? (
                                                            <Video className="w-4 h-4" />
                                                        ) : (
                                                            <Camera className="w-4 h-4" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-900">
                                                            {device.name}
                                                        </h4>
                                                        <p className="text-[11px] text-gray-500">
                                                            {device.brand} &bull; {device.location || 'Lokasi belum diset'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                        device.status === 'terhubung'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : device.status === 'tidak_terhubung'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}
                                                >
                                                    {device.status}
                                                </span>
                                            </div>

                                            {device.type === 'cctv' && (
                                                <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-[11px] text-gray-600 font-mono flex items-center justify-between">
                                                    <span>
                                                        Host: {device.masked_host}:{device.port || 554} ({device.protocol?.toUpperCase()})
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-sans">
                                                        {device.is_credential_configured ? 'Kredensial Terenkripsi' : 'Tanpa Sandi'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTestSavedDevice(device)}
                                                        className="text-xs font-semibold text-[#14433b] hover:text-[#21c9a4] transition-colors"
                                                    >
                                                        Uji Koneksi
                                                    </button>
                                                    <span className="text-gray-300">&bull;</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteDevice(device)}
                                                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>

                                                {isActive ? (
                                                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span>Sedang Aktif</span>
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleActivateDevice(device)}
                                                        className="px-3 py-1 text-xs font-bold text-white bg-[#14433b] hover:bg-[#1d5b50] rounded-lg transition-all"
                                                    >
                                                        Aktifkan
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Section D: Log Riwayat Pengujian Terakhir */}
                <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Server className="w-4 h-4 text-[#14433b]" />
                        <span>Riwayat Audit Pengujian Perangkat Kamera</span>
                    </h3>

                    {recent_logs.length === 0 ? (
                        <p className="text-xs text-gray-400">Belum ada riwayat pengujian perangkat yang tercatat.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="py-2.5 px-3">Waktu</th>
                                        <th className="py-2.5 px-3">Perangkat</th>
                                        <th className="py-2.5 px-3">Tipe Uji</th>
                                        <th className="py-2.5 px-3">Hasil</th>
                                        <th className="py-2.5 px-3">Keterangan</th>
                                        <th className="py-2.5 px-3">Penguji</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recent_logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50/50">
                                            <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600">
                                                {new Date(log.tested_at).toLocaleString('id-ID')}
                                            </td>
                                            <td className="py-2.5 px-3 font-semibold text-gray-800">
                                                {log.camera_device?.name || 'Perangkat Dihapus'}
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600">
                                                {log.test_type}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        log.result === 'success'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {log.result}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate">
                                                {log.message || '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-700">
                                                {log.tested_by_user?.name || 'Sistem'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal Tambah CCTV Baru */}
                {isCctvModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-base font-bold text-gray-900">
                                    Tambah Kamera CCTV IP / EZVIZ H8c
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsCctvModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 font-bold"
                                >
                                    &times;
                                </button>
                            </div>

                            <form onSubmit={handleSaveCctvDevice} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Nama Perangkat CCTV:
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: CCTV EZVIZ H8c Gerbang Barat"
                                        value={cctvForm.name}
                                        onChange={(e) => setCctvForm({ ...cctvForm, name: e.target.value })}
                                        className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Merek:
                                        </label>
                                        <input
                                            type="text"
                                            value={cctvForm.brand}
                                            onChange={(e) => setCctvForm({ ...cctvForm, brand: e.target.value })}
                                            className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Model:
                                        </label>
                                        <input
                                            type="text"
                                            value={cctvForm.model}
                                            onChange={(e) => setCctvForm({ ...cctvForm, model: e.target.value })}
                                            className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Lokasi Pemasangan:
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Pilar Gerbang Masuk Utama"
                                        value={cctvForm.location}
                                        onChange={(e) => setCctvForm({ ...cctvForm, location: e.target.value })}
                                        className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4]"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Alamat IP / Host:
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="192.168.1.200"
                                            value={cctvForm.host}
                                            onChange={(e) => setCctvForm({ ...cctvForm, host: e.target.value })}
                                            className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4] font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Port:
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            value={cctvForm.port}
                                            onChange={(e) => setCctvForm({ ...cctvForm, port: Number(e.target.value) })}
                                            className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4] font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Username Kamera:
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="admin"
                                            value={cctvForm.username}
                                            onChange={(e) => setCctvForm({ ...cctvForm, username: e.target.value })}
                                            className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Password / Verification Code:
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Contoh: L2345678"
                                            value={cctvForm.password}
                                            onChange={(e) => setCctvForm({ ...cctvForm, password: e.target.value })}
                                            className="w-full text-xs rounded-xl border-gray-300 focus:border-[#21c9a4] focus:ring-[#21c9a4]"
                                        />
                                    </div>
                                </div>

                                {/* Uji Koneksi Live Hasil */}
                                {cctvTestResult && (
                                    <div
                                        className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                                            cctvTestResult.online
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                                : 'bg-red-50 border-red-200 text-red-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 font-bold">
                                            {cctvTestResult.online ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-600" />
                                            )}
                                            <span>{cctvTestResult.message}</span>
                                        </div>
                                        {cctvTestResult.details?.map((det: string, i: number) => (
                                            <p key={i} className="text-[11px] opacity-80 font-mono">
                                                &bull; {det}
                                            </p>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={handleTestCctvDirect}
                                        disabled={isTestingCctv || !cctvForm.host}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
                                    >
                                        {isTestingCctv ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Wifi className="w-3.5 h-3.5" />
                                        )}
                                        <span>{isTestingCctv ? 'Menguji...' : 'Uji Koneksi Soket'}</span>
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsCctvModalOpen(false)}
                                            className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 text-xs font-bold text-white bg-[#14433b] hover:bg-[#1a554a] rounded-xl shadow-sm"
                                        >
                                            Simpan Perangkat
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
