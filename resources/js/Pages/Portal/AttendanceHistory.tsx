import React from 'react';
import { Head, router } from '@inertiajs/react';
import StudentLayout from '@/Layouts/StudentLayout';
import StatusBadge from '@/Components/StatusBadge';
import Pagination from '@/Components/Pagination';
import {
    History,
    Calendar,
    Filter,
    CheckCircle2,
    Clock,
    AlertCircle,
    UserX,
    FileText,
} from 'lucide-react';

interface AttendanceRecord {
    id: number;
    date: string;
    scanned_at?: string;
    status: string;
    verification_method?: string;
    notes?: string;
    is_corrected?: boolean;
    correction_reason?: string;
    session?: {
        id: number;
        title: string;
        type: string;
        start_time: string;
        end_time: string;
    };
    verified_by_user?: {
        name: string;
    };
}

interface HistoryPageProps {
    student: {
        id: number;
        name: string;
        nis: string;
        school_class?: {
            name: string;
        };
    };
    attendances: {
        data: AttendanceRecord[];
        links: any[];
        total: number;
        from: number;
        to: number;
    };
    stats: {
        total: number;
        hadir: number;
        terlambat: number;
        izin: number;
        sakit: number;
        alpa: number;
    };
    month: string;
}

export default function StudentAttendanceHistory({
    student,
    attendances,
    stats,
    month,
}: HistoryPageProps) {
    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        router.get(
            route('portal.attendance-history'),
            { month: e.target.value },
            { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
        );
    };

    return (
        <StudentLayout
            title="Riwayat Absensi"
            studentName={student.name}
            studentNis={student.nis}
        >
            <Head title="Riwayat Absensi Saya - ARTDEVATA" />

            <div className="space-y-5">
                {/* Header and Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Riwayat Absensi
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Catatan presensi lengkap siswa {student.name} ({student.nis})
                        </p>
                    </div>

                    {/* Month Filter */}
                    <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500 font-medium">Bulan:</span>
                        <input
                            type="month"
                            value={month}
                            onChange={handleMonthChange}
                            aria-label="Pilih Bulan Absensi"
                            className="border-none p-0 text-xs font-semibold text-slate-800 focus:ring-0 cursor-pointer bg-transparent"
                        />
                    </div>
                </div>

                {/* Monthly Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="text-[11px] font-medium text-slate-500">Total Absensi</div>
                        <div className="text-xl font-bold text-slate-900 mt-1">{stats.total}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Hari terekam</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="text-[11px] font-medium text-emerald-700">Hadir Tepat</div>
                        <div className="text-xl font-bold text-emerald-700 mt-1">{stats.hadir}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Hari</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="text-[11px] font-medium text-amber-700">Terlambat</div>
                        <div className="text-xl font-bold text-amber-700 mt-1">{stats.terlambat}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Hari</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="text-[11px] font-medium text-blue-700">Izin & Sakit</div>
                        <div className="text-xl font-bold text-blue-700 mt-1">{stats.izin + stats.sakit}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{stats.izin} izin · {stats.sakit} sakit</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="text-[11px] font-medium text-rose-700">Alpa</div>
                        <div className="text-xl font-bold text-rose-700 mt-1">{stats.alpa}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Hari tanpa keterangan</div>
                    </div>
                </div>

                {/* Table Card */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-slate-800">
                            Daftar Presensi Harian
                        </h2>
                        <span className="text-[11px] text-slate-400">
                            {attendances.total} catatan ditemukan
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/75 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-2.5 px-4">Tanggal</th>
                                    <th className="py-2.5 px-4">Sesi & Jadwal</th>
                                    <th className="py-2.5 px-4">Waktu Pindai</th>
                                    <th className="py-2.5 px-4">Status</th>
                                    <th className="py-2.5 px-4">Verifikator / Metode</th>
                                    <th className="py-2.5 px-4">Catatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {attendances.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400">
                                            Tidak ada data absensi untuk bulan yang dipilih.
                                        </td>
                                    </tr>
                                ) : (
                                    attendances.data.map((record) => (
                                        <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-900">
                                                {new Date(record.date).toLocaleDateString('id-ID', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </td>

                                            <td className="py-2.5 px-4 whitespace-nowrap">
                                                <span className="font-medium text-slate-800">
                                                    {record.session?.title || 'Sesi Masuk'}
                                                </span>
                                                {record.session?.start_time && (
                                                    <span className="block text-[11px] text-slate-400 font-mono">
                                                        {record.session.start_time.substring(0, 5)} - {record.session.end_time.substring(0, 5)} WITA
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px]">
                                                {record.scanned_at ? (
                                                    <span className="text-slate-900 font-medium">
                                                        {record.scanned_at.substring(11, 19)} WITA
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>

                                            <td className="py-2.5 px-4 whitespace-nowrap">
                                                <StatusBadge status={record.status} size="sm" />
                                                {record.is_corrected && (
                                                    <span className="block text-[10px] text-amber-700 font-medium mt-0.5">
                                                        (Dikoreksi Admin)
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                                                {record.verified_by_user ? (
                                                    <span>{record.verified_by_user.name}</span>
                                                ) : record.verification_method ? (
                                                    <span className="capitalize">{record.verification_method}</span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>

                                            <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">
                                                {record.correction_reason ? (
                                                    <span className="text-amber-800 italic">
                                                        {record.correction_reason}
                                                    </span>
                                                ) : record.notes ? (
                                                    <span>{record.notes}</span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {attendances.links && attendances.links.length > 3 && (
                        <div className="p-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Menampilkan {attendances.from || 0} - {attendances.to || 0} dari {attendances.total} data
                            </span>
                            <Pagination links={attendances.links} />
                        </div>
                    )}
                </div>
            </div>
        </StudentLayout>
    );
}
