import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Calendar, Clock, Plus, Edit2, Play, Square, CheckCircle2, AlertCircle } from 'lucide-react';
import { AttendanceSession } from '@/types';

interface ScheduleItem {
    id: number;
    day_of_week: number;
    check_in_start: string;
    check_in_end: string;
    late_tolerance_time: string;
    check_out_start: string;
    check_out_end: string;
    is_school_day: boolean;
}

interface SchedulesIndexProps {
    school_year: any;
    schedules: ScheduleItem[];
    sessions: AttendanceSession[];
    holidays: any[];
    today_session: AttendanceSession | null;
}

export default function SchedulesIndex({
    school_year,
    schedules,
    sessions,
    holidays,
    today_session,
}: SchedulesIndexProps) {
    const dayNames = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    const handleToggleSession = (sessionId: number, action: 'open' | 'close' | 'cancel') => {
        const actionLabel = action === 'open' ? 'buka' : (action === 'close' ? 'tutup' : 'batalkan');
        if (confirm(`Apakah Anda yakin ingin me-${actionLabel} sesi absensi ini?`)) {
            router.post('/sessions/toggle', { session_id: sessionId, action });
        }
    };

    return (
        <AuthenticatedLayout title="Jadwal Jam Sekolah & Sesi Absensi">
            <Head title="Jadwal & Sesi Absensi" />

            <div className="space-y-6">
                {/* Active Session Today Banner */}
                <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                today_session?.status === 'open'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-700'
                            }`}>
                                {today_session ? `STATUS: ${today_session.status.toUpperCase()}` : 'BELUM DIBUKA HARI INI'}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">Tahun Ajaran {school_year?.name}</span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mt-1">
                            Sesi Absensi Hari Ini ({today_session?.date || new Date().toISOString().slice(0, 10)})
                        </h2>
                        {today_session && (
                            <p className="text-xs text-gray-500 mt-0.5 font-mono">
                                Jam Masuk: {today_session.start_time.slice(0, 5)} - {today_session.end_time.slice(0, 5)} WITA &bull; Toleransi Terlambat: {today_session.late_time.slice(0, 5)} WITA
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {today_session?.status === 'open' ? (
                            <button
                                onClick={() => handleToggleSession(today_session.id, 'close')}
                                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Tutup Sesi Sekarang</span>
                            </button>
                        ) : today_session ? (
                            <button
                                onClick={() => handleToggleSession(today_session.id, 'open')}
                                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Buka Ulang Sesi</span>
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Regular Weekly Operational Schedule */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-sm font-bold text-gray-900">
                            Konfigurasi Jam Masuk & Batas Toleransi Keterlambatan
                        </h3>
                        <p className="text-xs text-gray-500">
                            Waktu server yang menentukan otomatisasi penentuan status Hadir vs Terlambat
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/70">
                                    <th className="py-3 px-4">Hari Sekolah</th>
                                    <th className="py-3 px-4">Mulai Scan Masuk</th>
                                    <th className="py-3 px-4">Batas Toleransi Terlambat</th>
                                    <th className="py-3 px-4">Penutupan Sesi Masuk</th>
                                    <th className="py-3 px-4">Sesi Jam Pulang</th>
                                    <th className="py-3 px-4 text-center">Status Hari</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {schedules.map((sch) => (
                                    <tr key={sch.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-3 px-4 font-bold text-gray-900">
                                            {dayNames[sch.day_of_week]}
                                        </td>
                                        <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                                            {sch.check_in_start.slice(0, 5)} WITA
                                        </td>
                                        <td className="py-3 px-4 font-mono font-bold text-amber-700">
                                            {sch.late_tolerance_time.slice(0, 5)} WITA
                                        </td>
                                        <td className="py-3 px-4 font-mono text-gray-700">
                                            {sch.check_in_end.slice(0, 5)} WITA
                                        </td>
                                        <td className="py-3 px-4 font-mono text-gray-600">
                                            {sch.check_out_start.slice(0, 5)} - {sch.check_out_end.slice(0, 5)} WITA
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                sch.is_school_day ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {sch.is_school_day ? 'HARI EFEKTIF' : 'LIBUR'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Sessions List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-sm font-bold text-gray-900">
                            Riwayat Sesi Absensi Terbuka & Tertutup (30 Hari Terakhir)
                        </h3>
                    </div>

                    <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/70">
                                    <th className="py-2.5 px-4">Tanggal</th>
                                    <th className="py-2.5 px-4">Tipe Sesi</th>
                                    <th className="py-2.5 px-4">Jam Sesi</th>
                                    <th className="py-2.5 px-4">Toleransi Terlambat</th>
                                    <th className="py-2.5 px-4 text-center">Status</th>
                                    <th className="py-2.5 px-4">Ditutup Oleh</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sessions.map((sess) => (
                                    <tr key={sess.id} className="hover:bg-gray-50">
                                        <td className="py-2.5 px-4 font-mono font-bold text-gray-900">{sess.date}</td>
                                        <td className="py-2.5 px-4 font-semibold uppercase text-[#14433b]">{sess.type}</td>
                                        <td className="py-2.5 px-4 font-mono text-gray-600">{sess.start_time.slice(0, 5)} - {sess.end_time.slice(0, 5)}</td>
                                        <td className="py-2.5 px-4 font-mono text-amber-700 font-semibold">{sess.late_time.slice(0, 5)}</td>
                                        <td className="py-2.5 px-4 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                sess.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {sess.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-500">{(sess as any).closed_by_user?.name || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
