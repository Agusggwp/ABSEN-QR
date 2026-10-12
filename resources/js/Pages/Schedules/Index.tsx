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

            <div className="space-y-5">
                {/* Active Session Today Banner */}
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                                today_session?.status === 'open'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                                {today_session ? `Status: ${today_session.status === 'open' ? 'Sesi Terbuka' : 'Sesi Ditutup'}` : 'Belum dibuka hari ini'}
                            </span>
                            <span className="text-xs text-slate-500">Tahun Ajaran {school_year?.name}</span>
                        </div>
                        <h2 className="text-base font-bold text-slate-900 mt-1">
                            Sesi Presensi Hari Ini ({today_session?.date || new Date().toISOString().slice(0, 10)})
                        </h2>
                        {today_session && (
                            <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                Jam Masuk: {today_session.start_time.slice(0, 5)} - {today_session.end_time.slice(0, 5)} WITA · Toleransi: {today_session.late_time.slice(0, 5)} WITA
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {today_session?.status === 'open' ? (
                            <button
                                onClick={() => handleToggleSession(today_session.id, 'close')}
                                className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-rose-700 text-white hover:bg-rose-800 flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Tutup Sesi Sekarang</span>
                            </button>
                        ) : today_session ? (
                            <button
                                onClick={() => handleToggleSession(today_session.id, 'open')}
                                className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-[#14433b] text-white hover:bg-[#1a554a] flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Buka Ulang Sesi</span>
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Regular Weekly Operational Schedule */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <h3 className="text-xs font-semibold text-slate-800">
                            Konfigurasi Jam Masuk & Batas Toleransi Keterlambatan
                        </h3>
                        <p className="text-[11px] text-slate-500">
                            Waktu server yang menentukan otomatisasi status Hadir vs Terlambat
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/75">
                                    <th className="py-2.5 px-3.5">Hari Sekolah</th>
                                    <th className="py-2.5 px-3.5">Mulai Scan Masuk</th>
                                    <th className="py-2.5 px-3.5">Batas Toleransi Terlambat</th>
                                    <th className="py-2.5 px-3.5">Penutupan Sesi Masuk</th>
                                    <th className="py-2.5 px-3.5">Sesi Jam Pulang</th>
                                    <th className="py-2.5 px-3.5 text-center">Status Hari</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {schedules.map((sch) => (
                                    <tr key={sch.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2.5 px-3.5 font-medium text-slate-900">
                                            {dayNames[sch.day_of_week]}
                                        </td>
                                        <td className="py-2.5 px-3.5 font-mono text-emerald-700 font-medium">
                                            {sch.check_in_start.slice(0, 5)} WITA
                                        </td>
                                        <td className="py-2.5 px-3.5 font-mono font-medium text-amber-700">
                                            {sch.late_tolerance_time.slice(0, 5)} WITA
                                        </td>
                                        <td className="py-2.5 px-3.5 font-mono text-slate-600">
                                            {sch.check_in_end.slice(0, 5)} WITA
                                        </td>
                                        <td className="py-2.5 px-3.5 font-mono text-slate-500">
                                            {sch.check_out_start.slice(0, 5)} - {sch.check_out_end.slice(0, 5)} WITA
                                        </td>
                                        <td className="py-2.5 px-3.5 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                                                sch.is_school_day
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                {sch.is_school_day ? 'Hari Efektif' : 'Libur'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Sessions List */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <h3 className="text-xs font-semibold text-slate-800">
                            Riwayat Sesi Absensi Terbuka & Tertutup (30 Hari Terakhir)
                        </h3>
                    </div>

                    <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/75">
                                    <th className="py-2.5 px-3.5">Tanggal</th>
                                    <th className="py-2.5 px-3.5">Tipe Sesi</th>
                                    <th className="py-2.5 px-3.5">Jam Sesi</th>
                                    <th className="py-2.5 px-3.5">Toleransi Terlambat</th>
                                    <th className="py-2.5 px-3.5 text-center">Status</th>
                                    <th className="py-2.5 px-3.5">Ditutup Oleh</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {sessions.map((sess) => (
                                    <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2.5 px-3.5 font-mono font-medium text-slate-900">{sess.date}</td>
                                        <td className="py-2.5 px-3.5 capitalize text-slate-800 font-medium">{sess.type}</td>
                                        <td className="py-2.5 px-3.5 font-mono text-slate-500">{sess.start_time.slice(0, 5)} - {sess.end_time.slice(0, 5)}</td>
                                        <td className="py-2.5 px-3.5 font-mono text-amber-700 font-medium">{sess.late_time.slice(0, 5)}</td>
                                        <td className="py-2.5 px-3.5 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                                                sess.status === 'open'
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                {sess.status === 'open' ? 'Terbuka' : 'Ditutup'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3.5 text-slate-500">{(sess as any).closed_by_user?.name || '-'}</td>
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
