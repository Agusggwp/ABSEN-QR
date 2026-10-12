import React, { useState, useEffect, useRef } from 'react';
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
    const isFirstRender = useRef(true);

    // Live filter without progress bar
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                '/reports',
                { start_date: startDate, end_date: endDate, class_id: classId, status, type: reportType },
                { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [startDate, endDate, classId, status, reportType]);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/reports',
            { start_date: startDate, end_date: endDate, class_id: classId, status, type: reportType },
            { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
        );
    };

    return (
        <AuthenticatedLayout title="Laporan & Rekapitulasi Absensi">
            <Head title="Laporan Absensi" />

            <div className="space-y-5">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-[#14433b]" />
                            <span>Pusat Laporan & Rekapitulasi Presensi Siswa</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Unduh laporan resmi sekolah berstandar Dapodik dalam format Excel dan PDF
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={`/reports/export-excel?start_date=${startDate}&end_date=${endDate}${classId ? `&class_id=${classId}` : ''}${status !== 'all' ? `&status=${status}` : ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Unduh Excel (.xlsx)</span>
                        </a>

                        <a
                            href={`/reports/export-pdf?start_date=${startDate}&end_date=${endDate}${classId ? `&class_id=${classId}` : ''}${status !== 'all' ? `&status=${status}` : ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#14433b] text-white hover:bg-[#1a554a] transition-colors shadow-xs"
                        >
                            <FileText className="w-3.5 h-3.5 text-[#21c9a4]" />
                            <span>Cetak PDF Resmi</span>
                        </a>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                        <div className="sm:col-span-3">
                            <label className="block text-slate-600 font-medium mb-1">Tanggal Mulai:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full py-1.5 px-3 text-xs rounded-md border-slate-300 focus:ring-[#14433b] focus:border-[#14433b]"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-slate-600 font-medium mb-1">Tanggal Selesai:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full py-1.5 px-3 text-xs rounded-md border-slate-300 focus:ring-[#14433b] focus:border-[#14433b]"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-slate-600 font-medium mb-1">Filter Kelas:</label>
                            <select
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                className="w-full py-1.5 pl-3 pr-8 text-xs rounded-md border-slate-300 focus:ring-[#14433b] focus:border-[#14433b] bg-white"
                            >
                                <option value="">Seluruh Kelas</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-slate-600 font-medium mb-1">Status Kehadiran:</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full py-1.5 pl-3 pr-8 text-xs rounded-md border-slate-300 focus:ring-[#14433b] focus:border-[#14433b] bg-white"
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
                                aria-label="Terapkan Filter"
                                className="w-full py-1.5 px-3 rounded-md bg-[#14433b] text-white hover:bg-[#1a554a] transition-colors flex items-center justify-center shadow-xs"
                                title="Terapkan Filter"
                            >
                                <Filter className="w-3.5 h-3.5 text-[#21c9a4]" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Summary Statistics Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-[11px] text-slate-500 font-medium">Total Rekaman</span>
                        <p className="mt-1 text-xl font-bold text-slate-900">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-[11px] text-emerald-700 font-medium">Hadir Tepat</span>
                        <p className="mt-1 text-xl font-bold text-emerald-700">{stats.hadir}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-[11px] text-amber-700 font-medium">Terlambat</span>
                        <p className="mt-1 text-xl font-bold text-amber-700">{stats.terlambat}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-[11px] text-blue-700 font-medium">Izin</span>
                        <p className="mt-1 text-xl font-bold text-blue-700">{stats.izin}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-[11px] text-indigo-700 font-medium">Sakit</span>
                        <p className="mt-1 text-xl font-bold text-indigo-700">{stats.sakit}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-[11px] text-rose-700 font-medium">Alpa</span>
                        <p className="mt-1 text-xl font-bold text-rose-700">{stats.alpa}</p>
                    </div>
                </div>

                {/* Report Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/75">
                                    <th className="py-2.5 px-3.5">Tanggal</th>
                                    <th className="py-2.5 px-3.5">NIS</th>
                                    <th className="py-2.5 px-3.5">Nama Siswa</th>
                                    <th className="py-2.5 px-3.5">Kelas</th>
                                    <th className="py-2.5 px-3.5">Jam Masuk</th>
                                    <th className="py-2.5 px-3.5 text-center">Status</th>
                                    <th className="py-2.5 px-3.5">Petugas Verifikator</th>
                                    <th className="py-2.5 px-3.5">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {attendances.data.length > 0 ? (
                                    attendances.data.map((att) => (
                                        <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-2.5 px-3.5 font-mono font-medium text-slate-900">{att.date}</td>
                                            <td className="py-2.5 px-3.5 font-mono text-slate-600">{att.student?.nis}</td>
                                            <td className="py-2.5 px-3.5 font-medium text-slate-900">{att.student?.name}</td>
                                            <td className="py-2.5 px-3.5 text-slate-700">{att.school_class?.name ?? '-'}</td>
                                            <td className="py-2.5 px-3.5 font-mono text-slate-700">
                                                {att.scanned_at ? new Date(att.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center">
                                                <StatusBadge status={att.status} size="sm" />
                                            </td>
                                            <td className="py-2.5 px-3.5 text-slate-600">
                                                {att.verified_by_user?.name ?? 'Petugas'}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-slate-500 max-w-xs truncate">
                                                {att.notes || '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400">
                                            Tidak ada data rekaman absensi untuk rentang tanggal ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 border-t border-slate-100">
                        <Pagination links={attendances.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
