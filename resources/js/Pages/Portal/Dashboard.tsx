import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import StudentLayout from '@/Layouts/StudentLayout';
import StatusBadge from '@/Components/StatusBadge';
import Modal from '@/Components/Modal';
import QRCode from 'qrcode';
import {
    QrCode as QrIcon,
    Download,
    Printer,
    Maximize2,
    CheckCircle2,
    Clock,
    AlertCircle,
    User,
    History,
    ChevronRight,
    Camera,
    Upload,
    Trash2,
    X,
} from 'lucide-react';

interface StudentProps {
    id: number;
    name: string;
    nis: string;
    nisn?: string;
    gender: string;
    photo_path?: string;
    is_active: boolean;
    school_class?: {
        id: number;
        name: string;
    };
}

interface DashboardProps {
    student: StudentProps;
    school: {
        name: string;
        logo?: string;
        address: string;
    };
    qr: {
        raw_token: string;
        card_number: string;
        status: string;
        issued_at?: string;
    };
    stats: {
        total_days: number;
        hadir: number;
        terlambat: number;
        izin: number;
        sakit: number;
        alpa: number;
        presence_rate: number;
    };
    recent_attendances: Array<{
        id: number;
        date: string;
        scanned_at?: string;
        status: string;
        session?: {
            title: string;
            type: string;
        };
    }>;
    must_change_password: boolean;
}

export default function StudentDashboard({
    student,
    school,
    qr,
    stats,
    recent_attendances,
    must_change_password,
}: DashboardProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [zoomModalOpen, setZoomModalOpen] = useState(false);

    // Photo change modal state
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    const openPhotoModal = () => {
        setPhotoFile(null);
        setPhotoPreview(
            student.photo_path
                ? student.photo_path.startsWith('/') || student.photo_path.startsWith('http')
                    ? student.photo_path
                    : `/storage/${student.photo_path}`
                : null
        );
        setPhotoError(null);
        setPhotoModalOpen(true);
    };

    const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setPhotoError('Ukuran file foto maksimal 2MB.');
            return;
        }

        setPhotoError(null);
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSavePhoto = (e: React.FormEvent) => {
        e.preventDefault();
        if (!photoFile) {
            setPhotoError('Silakan pilih file foto terlebih dahulu.');
            return;
        }

        setIsUploadingPhoto(true);
        setPhotoError(null);

        router.post(
            route('portal.photo.update'),
            { photo: photoFile },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setPhotoModalOpen(false);
                    setPhotoFile(null);
                },
                onError: (errs) => {
                    setPhotoError(errs.photo || 'Gagal mengunggah foto. Silakan coba lagi.');
                },
                onFinish: () => setIsUploadingPhoto(false),
            }
        );
    };

    const handleRemovePhoto = () => {
        if (!confirm('Apakah Anda yakin ingin menghapus foto profil?')) return;

        setIsUploadingPhoto(true);
        setPhotoError(null);

        router.post(
            route('portal.photo.update'),
            { remove_photo: 1 },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setPhotoModalOpen(false);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                },
                onError: (errs) => {
                    setPhotoError(errs.photo || 'Gagal menghapus foto.');
                },
                onFinish: () => setIsUploadingPhoto(false),
            }
        );
    };

    useEffect(() => {
        if (qr.raw_token) {
            QRCode.toDataURL(qr.raw_token, {
                errorCorrectionLevel: 'H',
                margin: 2,
                width: 320,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff',
                },
            }).then((url) => {
                setQrDataUrl(url);
            });
        }
    }, [qr.raw_token]);

    const handleDownloadQr = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.download = `QR_ABSENSI_${student.nis}_${student.name.replace(/\s+/g, '_')}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    return (
        <StudentLayout
            title="Portal Murid"
            studentName={student.name}
            studentNis={student.nis}
            mustChangePassword={must_change_password}
        >
            <Head title="Dashboard Murid" />

            <div className="space-y-5 text-slate-800">
                {/* Clean Profile Header Strip */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="relative group shrink-0">
                            <div className="w-14 h-18 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden shadow-2xs">
                                {student.photo_path ? (
                                    <img
                                        src={
                                            student.photo_path.startsWith('/') ||
                                            student.photo_path.startsWith('http')
                                                ? student.photo_path
                                                : `/storage/${student.photo_path}`
                                        }
                                        alt={student.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400 p-1">
                                        <User className="w-6 h-6 text-slate-300 mb-0.5" />
                                        <span className="text-[9px] font-semibold text-slate-400">3x4</span>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={openPhotoModal}
                                className="absolute -bottom-1 -right-1 p-1 bg-[#14433b] hover:bg-[#1b554b] text-white rounded-full shadow-md transition-transform active:scale-90"
                                title="Ganti Pasfoto Profil"
                            >
                                <Camera className="w-3 h-3 text-[#21c9a4]" />
                            </button>
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                                    {student.name}
                                </h1>
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    Murid Aktif
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                NIS: {student.nis} {student.nisn ? `| NISN: ${student.nisn}` : ''} &bull; Kelas: <span className="font-sans font-medium text-slate-700">{student.school_class?.name || '-'}</span>
                            </p>
                            <button
                                type="button"
                                onClick={openPhotoModal}
                                className="mt-1 text-[11px] font-semibold text-[#14433b] hover:text-[#1b554b] hover:underline flex items-center gap-1"
                            >
                                <Camera className="w-3 h-3 text-[#21c9a4]" />
                                <span>{student.photo_path ? 'Ganti Pasfoto Profil (3x4)' : 'Unggah Pasfoto Profil (3x4)'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={openPhotoModal}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors"
                        >
                            <Camera className="w-3.5 h-3.5 text-[#14433b]" />
                            <span>Ganti Foto</span>
                        </button>

                        <Link
                            href={route('portal.qr-code')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#14433b] hover:bg-[#1a5349] text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
                        >
                            <QrIcon className="w-4 h-4 text-[#21c9a4]" />
                            <span>Buka QR Penuh</span>
                        </Link>
                    </div>
                </div>

                {/* Grid: Left Column QR Widget, Right Column Attendance Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* QR Code Personal Widget */}
                    <div className="lg:col-span-5 bg-white rounded-lg p-5 border border-slate-200 shadow-xs flex flex-col items-center text-center">
                        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="text-left">
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                    QR Code Presensi Pribadi
                                </h2>
                                <p className="text-[11px] text-slate-500">
                                    Tunjukkan ke pemindai saat sesi absensi
                                </p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {qr.status === 'active' ? 'Aktif' : 'Nonaktif'}
                            </span>
                        </div>

                        {/* QR Image Box */}
                        <div className="relative group my-4 p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                            {qrDataUrl ? (
                                <img
                                    src={qrDataUrl}
                                    alt={`QR Code ${student.name}`}
                                    className="w-48 h-48 object-contain"
                                />
                            ) : (
                                <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                                    Memuat QR Code...
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setZoomModalOpen(true)}
                                className="absolute inset-0 bg-slate-900/60 text-white rounded-lg flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Maximize2 className="w-6 h-6 mb-1" />
                                <span className="text-xs font-medium">Perbesar Tampilan</span>
                            </button>
                        </div>

                        <p className="text-[11px] text-slate-500 font-mono">
                            No. Kartu: <strong className="text-slate-800">{qr.card_number}</strong>
                        </p>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-2 w-full mt-4">
                            <button
                                type="button"
                                onClick={() => setZoomModalOpen(true)}
                                className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition-colors"
                            >
                                <Maximize2 className="w-4 h-4 mb-1 text-slate-500" />
                                <span>Perbesar</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleDownloadQr}
                                className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition-colors"
                            >
                                <Download className="w-4 h-4 mb-1 text-slate-500" />
                                <span>Unduh PNG</span>
                            </button>

                            <Link
                                href={route('portal.qr-code')}
                                className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition-colors"
                            >
                                <Printer className="w-4 h-4 mb-1 text-slate-500" />
                                <span>Cetak Kartu</span>
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Attendance Overview & Recent Scans */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                                <span className="text-xs font-medium text-slate-500">Tingkat Hadir</span>
                                <div className="text-xl font-bold text-slate-900 mt-1">
                                    {stats.presence_rate}%
                                </div>
                                <span className="text-[10px] text-slate-400">
                                    Dari {stats.total_days} hari
                                </span>
                            </div>

                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                                <span className="text-xs font-medium text-slate-500">Tepat Waktu</span>
                                <div className="text-xl font-bold text-emerald-700 mt-1">
                                    {stats.hadir}
                                </div>
                                <span className="text-[10px] text-slate-400">Hari hadir</span>
                            </div>

                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                                <span className="text-xs font-medium text-slate-500">Terlambat</span>
                                <div className="text-xl font-bold text-amber-700 mt-1">
                                    {stats.terlambat}
                                </div>
                                <span className="text-[10px] text-slate-400">Hari terlambat</span>
                            </div>

                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                                <span className="text-xs font-medium text-slate-500">Izin / Sakit / Alpa</span>
                                <div className="text-xl font-bold text-slate-900 mt-1">
                                    {stats.izin + stats.sakit} / <span className="text-rose-600">{stats.alpa}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">Izin/Sakit &bull; Alpa</span>
                            </div>
                        </div>

                        {/* Recent Attendances Card */}
                        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs">
                            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <History className="w-4 h-4 text-slate-500" />
                                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                        Riwayat Absensi Terkini
                                    </h2>
                                </div>

                                <Link
                                    href={route('portal.attendance-history')}
                                    className="text-xs font-medium text-[#14433b] hover:underline flex items-center gap-1"
                                >
                                    <span>Lihat Semua</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            {recent_attendances.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-400">
                                    Belum ada catatan absensi.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {recent_attendances.map((item) => (
                                        <div
                                            key={item.id}
                                            className="py-2.5 flex items-center justify-between text-xs"
                                        >
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {item.session?.title || 'Sesi Masuk'}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    {item.date} &bull;{' '}
                                                    {item.scanned_at
                                                        ? `${item.scanned_at.substring(11, 16)} WITA`
                                                        : 'Tanpa jam scan'}
                                                </p>
                                            </div>

                                            <StatusBadge status={item.status} size="sm" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Perbesar QR Code */}
            <Modal show={zoomModalOpen} onClose={() => setZoomModalOpen(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                        QR Code Presensi - {student.name}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        NIS: {student.nis} &bull; {student.school_class?.name || '-'}
                    </p>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs inline-block my-2">
                        {qrDataUrl && (
                            <img
                                src={qrDataUrl}
                                alt={`QR Code ${student.name}`}
                                className="w-60 h-60 object-contain"
                            />
                        )}
                    </div>

                    <p className="text-[11px] text-slate-400 font-mono mt-2">
                        {qr.card_number}
                    </p>

                    <div className="mt-5 flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={handleDownloadQr}
                            className="px-4 py-2 bg-[#14433b] hover:bg-[#1a5349] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                        >
                            <Download className="w-4 h-4 text-[#21c9a4]" />
                            <span>Unduh PNG</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setZoomModalOpen(false)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Modal Ganti Pasfoto Profil Siswa */}
            <Modal show={photoModalOpen} onClose={() => setPhotoModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-[#14433b]" />
                            <span>Ubah Pasfoto Profil Siswa</span>
                        </h3>
                        <button
                            type="button"
                            onClick={() => setPhotoModalOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSavePhoto} className="space-y-4 text-xs">
                        {photoError && (
                            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                                {photoError}
                            </div>
                        )}

                        <div className="flex flex-col items-center text-center">
                            {/* Pasfoto 3x4 Frame */}
                            <div className="w-28 h-36 rounded-lg border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center shadow-xs relative mb-3">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Preview Pasfoto"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="p-2 text-slate-400 text-center">
                                        <Camera className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                                        <span className="text-[11px] font-semibold block text-slate-500">Pasfoto 3x4</span>
                                        <span className="text-[10px] text-slate-400">Belum ada foto</span>
                                    </div>
                                )}
                            </div>

                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer shadow-2xs transition-colors">
                                <Upload className="w-3.5 h-3.5 text-[#14433b]" />
                                <span>{photoPreview ? 'Pilih Pasfoto Lain' : 'Pilih Pasfoto 3x4'}</span>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/jpg,image/webp"
                                    onChange={handlePhotoFileChange}
                                    className="hidden"
                                />
                            </label>

                            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed max-w-xs">
                                Disarankan mengunggah pasfoto resmi dengan seragam sekolah berlatar polos (merah/biru). Format JPG, PNG, WEBP (maks. 2MB).
                            </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            {student.photo_path ? (
                                <button
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    disabled={isUploadingPhoto}
                                    className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus</span>
                                </button>
                            ) : <div />}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPhotoModalOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!photoFile || isUploadingPhoto}
                                    className="px-4 py-1.5 bg-[#14433b] hover:bg-[#1a5349] text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                                >
                                    {isUploadingPhoto ? 'Menyimpan...' : 'Simpan Foto'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </Modal>
        </StudentLayout>
    );
}
