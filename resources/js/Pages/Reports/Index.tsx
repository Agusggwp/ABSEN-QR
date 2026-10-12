import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import { Head, router } from '@inertiajs/react';
import {
    FileSpreadsheet,
    FileText,
    Filter,
    Calendar,
    Users,
    Clock,
    AlertCircle,
    CheckCircle2,
    HeartPulse,
} from 'lucide-react';
import { Attendance, SchoolClass } from '@/types';

interface ReportsIndexProps {
    attendances: {
        data: Attendance[];
        links: any[];
        total: number;
    };
    classes: SchoolClass[];
    stats: {
        total: number;
        hadir: number;
        terlambat: number;
        izin: number;
        sakit: number;
        dispensasi: number;
        alpa: number;
    };
    filters: {
        start_date: string;
        end_date: string;
        class_id?: string;
        status?: string;
        type?: string;
    };
}

export default function ReportsIndex({
    attendances,
    classes,
    stats,
    filters,
}: ReportsIndexProps) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [classId, setClassId] = useState(filters.class_id || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [reportType, setReportType] = useState(filters.type || 'daily');

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/reports',
            { start_date: startDate, end_date: endDate, class_id: classId, status, type: reportType },
            { preserveState: true, replace: true }
        );
    };

    return (
        <AuthenticatedLayout title="Laporan & Rekapitulasi Absensi">
            <Head title="Laporan Absensi" />

            <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-[#14433b]" />
                            <span>Pusat Laporan & Rekapitulasi Kehadiran Siswa</span>
                        </h2>
                        <p className="text-xs text-gray-500">
                            Unduh laporan resmi sekolah berstandar Dapodik dalam format Excel dan PDF
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={`/reports/export-excel?start_date=${startDate}&end_date=${endDate}${classId ? `&class_id=${classId}` : ''}${status !== 'all' ? `&status=${status}` : ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all shadow-sm"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>Unduh Excel (.xlsx)</span>
                        </a>

                        <a
                            href={`/reports/export-pdf?start_date=${startDate}&end_date=${endDate}${classId ? `&class_id=${classId}` : ''}${status !== 'all' ? `&status=${status}` : ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#14433b] text-white hover:bg-[#1b554b] transition-all shadow-sm active:scale-95"
                        >
                            <FileText className="w-4 h-4 text-[#21c9a4]" />
                            <span>Cetak PDF Resmi</span>
                        </a>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        <div className="sm:col-span-3">
                            <label className="block text-gray-500 font-semibold mb-1">Tanggal Mulai:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-gray-500 font-semibold mb-1">Tanggal Selesai:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-gray-500 font-semibold mb-1">Filter Kelas:</label>
                            <select
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            >
                                <option value="">Seluruh Kelas</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-gray-500 font-semibold mb-1">Status Kehadiran:</label>
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
                                <option value="alpa">Alpa</option>
                            </select>
                        </div>

                        <div className="sm:col-span-1 flex items-end">
                            <button
                                type="submit"
                                className="w-full py-2 px-3 rounded-lg bg-[#14433b] text-white font-bold hover:bg-[#1b554b] transition-colors flex items-center justify-center shadow-sm"
                                title="Terapkan Filter"
                            >
                                <Filter className="w-4 h-4 text-[#21c9a4]" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Summary Statistics Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-4 bg-white rounded-xl border border-gray-200">
                        <span className="text-[11px] text-gray-500 font-bold uppercase">Total Rekaman</span>
                        <p className="mt-1 text-2xl font-extrabold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-[11px] text-emerald-700 font-bold uppercase">Hadir Tepat</span>
                        <p className="mt-1 text-2xl font-extrabold text-emerald-800">{stats.hadir}</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="text-[11px] text-amber-700 font-bold uppercase">Terlambat</span>
                        <p className="mt-1 text-2xl font-extrabold text-amber-800">{stats.terlambat}</p>
                    </div>
                    <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                        <span className="text-[11px] text-sky-700 font-bold uppercase">Izin</span>
                        <p className="mt-1 text-2xl font-extrabold text-sky-800">{stats.izin}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <span className="text-[11px] text-purple-700 font-bold uppercase">Sakit</span>
                        <p className="mt-1 text-2xl font-extrabold text-purple-800">{stats.sakit}</p>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                        <span className="text-[11px] text-rose-700 font-bold uppercase">Alpa</span>
                        <p className="mt-1 text-2xl font-extrabold text-rose-800">{stats.alpa}</p>
                    </div>
                </div>

                {/* Report Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/70">
                                    <th className="py-3 px-4">Tanggal</th>
                                    <th className="py-3 px-4">NIS</th>
                                    <th className="py-3 px-4">Nama Siswa</th>
                                    <th className="py-3 px-4">Kelas</th>
                                    <th className="py-3 px-4">Jam Masuk</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4">Petugas Verifikator</th>
                                    <th className="py-3 px-4">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {attendances.data.length > 0 ? (
                                    attendances.data.map((att) => (
                                        <tr key={att.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3 px-4 font-mono font-medium text-gray-900">{att.date}</td>
                                            <td className="py-3 px-4 font-mono text-gray-600">{att.student?.nis}</td>
                                            <td className="py-3 px-4 font-bold text-gray-900">{att.student?.name}</td>
                                            <td className="py-3 px-4 text-gray-700 font-semibold">{att.school_class?.name ?? '-'}</td>
                                            <td className="py-3 px-4 font-mono text-gray-700">
                                                {att.scanned_at ? new Date(att.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <StatusBadge status={att.status} size="sm" />
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 font-medium">
                                                {att.verified_by_user?.name ?? 'Petugas'}
                                            </td>
                                            <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                                                {att.notes || '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-gray-400">
                                            Tidak ada data rekaman absensi untuk rentang tanggal ini.
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
        </AuthenticatedLayout>
    );
}
