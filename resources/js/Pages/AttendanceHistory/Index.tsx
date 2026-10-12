import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import { Head, router, usePage } from '@inertiajs/react';
import {
    History,
    Search,
    Filter,
    Edit3,
    Calendar,
    X,
    FileSpreadsheet,
    FileText,
    ShieldCheck,
} from 'lucide-react';
import { Attendance, SchoolClass, PageProps } from '@/types';

interface AttendanceHistoryProps {
    attendances: {
        data: Attendance[];
        links: any[];
        total: number;
    };
    classes: SchoolClass[];
    total_count: number;
    filters: {
        search?: string;
        class_id?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
    };
}

export default function AttendanceHistoryIndex({
    attendances,
    classes,
    total_count,
    filters,
}: AttendanceHistoryProps) {
    const { props } = usePage<PageProps>();
    const { auth } = props;
    const userRole = auth.user.role;
    const canCorrect = userRole === 'super_admin' || userRole === 'admin_sekolah';

    const [search, setSearch] = useState(filters.search || '');
    const [classId, setClassId] = useState(filters.class_id || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    // Correction Modal State
    const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
    const [newStatus, setNewStatus] = useState<string>('hadir');
    const [correctionReason, setCorrectionReason] = useState<string>('');
    const [isSavingCorrection, setIsSavingCorrection] = useState<boolean>(false);
    const [correctionError, setCorrectionError] = useState<string | null>(null);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/attendance-history',
            { search, class_id: classId, status, start_date: startDate, end_date: endDate },
            { preserveState: true, replace: true }
        );
    };

    const openCorrectionModal = (att: Attendance) => {
        setSelectedAttendance(att);
        setNewStatus(att.status);
        setCorrectionReason('');
        setCorrectionError(null);
        setCorrectionModalOpen(true);
    };

    const handleCorrectionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAttendance) return;

        if (!correctionReason.trim() || correctionReason.trim().length < 5) {
            setCorrectionError('Alasan koreksi wajib diisi minimal 5 karakter.');
            return;
        }

        setIsSavingCorrection(true);
        setCorrectionError(null);

        router.post(
            `/attendances/${selectedAttendance.id}/correct`,
            {
                new_status: newStatus,
                reason: correctionReason.trim(),
            },
            {
                onSuccess: () => setCorrectionModalOpen(false),
                onError: (err) => setCorrectionError(err.reason || 'Gagal menyimpan koreksi.'),
                onFinish: () => setIsSavingCorrection(false),
            }
        );
    };

    return (
        <AuthenticatedLayout title="Riwayat & Audit Log Kehadiran">
            <Head title="Riwayat Absensi" />

            <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">
                            Riwayat Absensi Terverifikasi ({total_count} Catatan)
                        </h2>
                        <p className="text-xs text-gray-500">
                            Pencatatan waktu server resmi, data stasiun scanner, audit identitas petugas, dan riwayat koreksi
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={`/reports/export-excel?start_date=${startDate}&end_date=${endDate}${classId ? `&class_id=${classId}` : ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>Ekspor Excel</span>
                        </a>

                        <a
                            href={`/reports/export-pdf?start_date=${startDate}&end_date=${endDate}${classId ? `&class_id=${classId}` : ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                            <FileText className="w-4 h-4 text-[#14433b]" />
                            <span>Ekspor PDF</span>
                        </a>
                    </div>
                </div>

                {/* Filter Controls Bar */}
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        <div className="sm:col-span-3 relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari siswa atau NIS..."
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                title="Tanggal Mulai"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                title="Tanggal Akhir"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <select
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            >
                                <option value="">Semua Kelas</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            >
                                <option value="all">Semua Status</option>
                                <option value="hadir">Hadir Tepat</option>
                                <option value="terlambat">Terlambat</option>
                                <option value="izin">Izin</option>
                                <option value="sakit">Sakit</option>
                                <option value="dispensasi">Dispensasi</option>
                                <option value="alpa">Alpa</option>
                                <option value="perlu_verifikasi">Perlu Verifikasi</option>
                            </select>
                        </div>

                        <div className="sm:col-span-1">
                            <button
                                type="submit"
                                className="w-full py-2 px-2 rounded-lg bg-[#14433b] text-white font-bold hover:bg-[#1b554b] transition-colors flex items-center justify-center shadow-sm"
                            >
                                <Filter className="w-3.5 h-3.5 text-[#21c9a4]" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Attendances Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/70">
                                    <th className="py-3 px-4">Tanggal & Jam</th>
                                    <th className="py-3 px-4">NIS</th>
                                    <th className="py-3 px-4">Nama Siswa</th>
                                    <th className="py-3 px-4">Kelas</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4">Verifikasi & Petugas</th>
                                    <th className="py-3 px-4">Keterangan / Koreksi</th>
                                    {canCorrect && <th className="py-3 px-4 text-right">Koreksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {attendances.data.length > 0 ? (
                                    attendances.data.map((att) => (
                                        <tr key={att.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3 px-4 font-mono">
                                                <div className="font-semibold text-gray-900">{att.date}</div>
                                                <div className="text-[10px] text-gray-500">
                                                    {att.scanned_at ? new Date(att.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-mono font-medium text-gray-600">
                                                {att.student?.nis}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-gray-900">
                                                {att.student?.name}
                                            </td>
                                            <td className="py-3 px-4 text-gray-700 font-semibold">
                                                {att.school_class?.name ?? '-'}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <StatusBadge status={att.status} size="sm" />
                                                {att.is_corrected && (
                                                    <span className="block text-[9px] font-bold text-amber-600 mt-0.5">
                                                        (DIKOREKSI)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-gray-900 font-medium">{att.verified_by_user?.name ?? 'Petugas'}</div>
                                                <div className="text-[10px] text-gray-400">
                                                    {att.scanner_device?.device_name || 'Gerbang'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 max-w-xs text-gray-500 text-[11px] truncate">
                                                {att.notes || '-'}
                                            </td>
                                            {canCorrect && (
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => openCorrectionModal(att)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                                                    >
                                                        <Edit3 className="w-3 h-3 text-amber-600" />
                                                        <span>Koreksi</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={canCorrect ? 8 : 7} className="py-12 text-center text-gray-400">
                                            Tidak ada catatan absensi untuk filter yang dipilih.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 border-t border-gray-100">
                        <Pagination links={attendances.links} />
                    </div>
                </div>
            </div>

            {/* Modal Koreksi Absensi (Wajib Catat Alasan) */}
            {correctionModalOpen && selectedAttendance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Koreksi Absensi Siswa</h3>
                                <p className="text-xs text-gray-500">
                                    {selectedAttendance.student?.name} ({selectedAttendance.student?.nis})
                                </p>
                            </div>
                            <button
                                onClick={() => setCorrectionModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCorrectionSubmit} className="space-y-4 text-xs">
                            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 space-y-1">
                                <div className="flex justify-between">
                                    <span>Status Sebelumnya:</span>
                                    <span className="font-bold uppercase text-gray-900">{selectedAttendance.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tanggal Absen:</span>
                                    <span className="font-mono">{selectedAttendance.date}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Pilih Status Baru: <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                >
                                    <option value="hadir">HADIR</option>
                                    <option value="terlambat">TERLAMBAT</option>
                                    <option value="izin">IZIN</option>
                                    <option value="sakit">SAKIT</option>
                                    <option value="dispensasi">DISPENSASI</option>
                                    <option value="alpa">ALPA</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Alasan Wajib Koreksi: <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    value={correctionReason}
                                    onChange={(e) => setCorrectionReason(e.target.value)}
                                    rows={3}
                                    placeholder="Contoh: Surat keterangan dokter baru diserahkan oleh orang tua siswa..."
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
                                {correctionError && (
                                    <p className="text-rose-600 text-[10px] mt-1">{correctionError}</p>
                                )}
                            </div>

                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 leading-snug flex items-start gap-2">
                                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <span>
                                    <strong>Ketentuan Audit Keamanan:</strong> Perubahan status, nama administrator pelaku, dan alasan koreksi ini akan dicatat permanen dalam Audit Log sistem sekolah.
                                </span>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setCorrectionModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-100"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingCorrection}
                                    className="px-4 py-2 text-xs font-bold text-white bg-[#14433b] rounded-lg hover:bg-[#1b554b] shadow-sm disabled:opacity-50"
                                >
                                    {isSavingCorrection ? 'Menyimpan...' : 'Simpan Koreksi & Catat Audit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
