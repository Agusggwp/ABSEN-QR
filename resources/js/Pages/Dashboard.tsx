import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatCard from '@/Components/StatCard';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import {
    Users,
    UserCheck,
    Clock,
    AlertCircle,
    QrCode,
    Camera,
    Radio,
    Calendar,
    ArrowRight,
    ChevronRight,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface MetricProps {
    total_students: number;
    hadir: number;
    terlambat: number;
    izin: number;
    sakit: number;
    dispensasi: number;
    alpa: number;
    perlu_verifikasi: number;
    belum_absen: number;
    attendance_percentage: number;
}

interface DashboardProps {
    metrics: MetricProps;
    session: {
        id: number;
        date: string;
        type: string;
        start_time: string;
        end_time: string;
        late_time: string;
        status: string;
    } | null;
    class_stats: Array<{
        id: number;
        name: string;
        grade_level: string;
        total_students: number;
        present: number;
        late: number;
        attendance_rate: number;
    }>;
    weekly_trend: Array<{
        date: string;
        hadir: number;
        terlambat: number;
        izin_sakit: number;
        alpa: number;
    }>;
    recent_scans: Array<{
        id: number;
        student_name: string;
        nis: string;
        class_name: string;
        status: string;
        time: string;
        officer: string;
    }>;
    scanner_devices: Array<{
        id: number;
        device_name: string;
        location: string;
        is_active: boolean;
        is_online: boolean;
        last_heartbeat: string;
    }>;
    cctv_status: {
        is_enabled: boolean;
        model: string;
        status_label: string;
    };
    current_time: string;
    current_date: string;
}

export default function Dashboard({
    metrics,
    session,
    class_stats,
    weekly_trend,
    recent_scans,
    scanner_devices,
    cctv_status,
    current_time,
    current_date,
}: DashboardProps) {
    return (
        <AuthenticatedLayout title="Dashboard Presensi Siswa">
            <Head title="Dashboard Presensi" />

            <div className="space-y-5 text-slate-800">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                            Ringkasan Presensi Siswa
                        </h1>
                        <p className="text-xs text-slate-500">
                            Pemantauan absensi terverifikasi dan aktivitas presensi hari ini ({current_date})
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/scanner"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#14433b] hover:bg-[#1a5349] text-white font-medium text-xs shadow-xs transition-colors"
                        >
                            <QrCode className="w-4 h-4 text-[#21c9a4]" />
                            <span>Buka Terminal Scanner</span>
                        </Link>
                    </div>
                </div>

                {/* Session Status Strip */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                        <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                session
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    session ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                            />
                            {session ? `Sesi ${session.type} Dibuka` : 'Sesi Standby'}
                        </span>
                        {session && (
                            <span className="text-slate-600 font-mono text-[11px]">
                                {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)} WITA (Batas Terlambat: {session.late_time.slice(0, 5)} WITA)
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        <span>
                            Tingkat Kehadiran:{' '}
                            <strong className="text-slate-900 font-bold">
                                {metrics.attendance_percentage}%
                            </strong>
                        </span>
                        <span>
                            Belum Absen:{' '}
                            <strong className="text-slate-900 font-bold">
                                {metrics.belum_absen}
                            </strong>
                        </span>
                    </div>
                </div>

                {/* Primary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard
                        title="Total Siswa Aktif"
                        value={metrics.total_students}
                        subtitle="Kapasitas siswa terdaftar"
                        icon={Users}
                    />
                    <StatCard
                        title="Hadir Tepat Waktu"
                        value={metrics.hadir}
                        subtitle={`${metrics.attendance_percentage}% dari total siswa`}
                        icon={UserCheck}
                        badge="Tepat Waktu"
                    />
                    <StatCard
                        title="Terlambat"
                        value={metrics.terlambat}
                        subtitle="Melewati batas jam sesi"
                        icon={Clock}
                    />
                    <StatCard
                        title="Izin / Sakit / Alpa"
                        value={metrics.izin + metrics.sakit + metrics.alpa}
                        subtitle={`${metrics.izin + metrics.sakit} Berizin, ${metrics.alpa} Alpa`}
                        icon={AlertCircle}
                    />
                </div>

                {/* Charts & Recent Scans Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Weekly Trend Chart (2 cols) */}
                    <div className="lg:col-span-2 p-5 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Tren Kehadiran (7 Hari Terakhir)
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Perbandingan jumlah siswa hadir, terlambat, izin/sakit, dan alpa
                                </p>
                            </div>
                        </div>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={weekly_trend}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: '6px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '11px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                    <Bar dataKey="hadir" name="Hadir" fill="#14433b" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="terlambat" name="Terlambat" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="izin_sakit" name="Izin / Sakit" fill="#0284c7" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="alpa" name="Alpa" fill="#e11d48" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Live Recent Scans (1 col) */}
                    <div className="p-5 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                            <h2 className="text-sm font-semibold text-slate-900">
                                Pemindaian Terbaru
                            </h2>
                            <Link
                                href="/attendance-history"
                                className="text-xs text-[#14433b] hover:underline font-medium flex items-center gap-1"
                            >
                                <span>Semua</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-64">
                            {recent_scans.length > 0 ? (
                                recent_scans.map((scan) => (
                                    <div
                                        key={scan.id}
                                        className="py-2 flex items-center justify-between text-xs"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="font-medium text-slate-900 truncate">
                                                {scan.student_name}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                {scan.nis} &bull; {scan.class_name}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <StatusBadge status={scan.status} size="sm" />
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                                {scan.time}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center text-xs text-slate-400">
                                    Belum ada pemindaian tercatat untuk sesi hari ini.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Class Attendance Summary & Device/CCTV Status */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Class Stats Table (2 cols) */}
                    <div className="lg:col-span-2 p-5 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Statistik Kehadiran per Kelas
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Rekapitulasi kehadiran di seluruh rombel kelas hari ini
                                </p>
                            </div>
                            <Link
                                href="/classroom"
                                className="text-xs text-[#14433b] hover:underline font-medium"
                            >
                                Konfirmasi Kelas &rarr;
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 font-medium bg-slate-50/50">
                                        <th className="py-2 px-3">Kelas</th>
                                        <th className="py-2 px-3 text-center">Siswa</th>
                                        <th className="py-2 px-3 text-center">Hadir</th>
                                        <th className="py-2 px-3 text-center">Terlambat</th>
                                        <th className="py-2 px-3 text-right">Persentase</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {class_stats.slice(0, 8).map((cls) => (
                                        <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2 px-3 font-medium text-slate-900">
                                                {cls.name}
                                            </td>
                                            <td className="py-2 px-3 text-center text-slate-600">
                                                {cls.total_students}
                                            </td>
                                            <td className="py-2 px-3 text-center text-emerald-800 font-medium">
                                                {cls.present}
                                            </td>
                                            <td className="py-2 px-3 text-center text-amber-800 font-medium">
                                                {cls.late}
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-[#14433b] h-1.5 rounded-full"
                                                            style={{
                                                                width: `${Math.min(100, cls.attendance_rate)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="font-mono text-slate-700 w-10 text-right">
                                                        {cls.attendance_rate}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Hardware & CCTV Status Panel (1 col) */}
                    <div className="space-y-4">
                        {/* Scanner Devices Status */}
                        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                                <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                                    <Radio className="w-4 h-4 text-slate-600" />
                                    <span>Perangkat Scanner</span>
                                </h2>
                                <Link
                                    href="/devices"
                                    className="text-[11px] text-[#14433b] hover:underline font-medium"
                                >
                                    Kelola
                                </Link>
                            </div>

                            <div className="space-y-2 text-xs">
                                {scanner_devices.map((dev) => (
                                    <div
                                        key={dev.id}
                                        className="p-2 rounded border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="font-medium text-slate-900 truncate">
                                                {dev.device_name}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate">
                                                {dev.location || 'Pos Scanner'}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                dev.is_online
                                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}
                                        >
                                            {dev.is_online ? 'Online' : 'Standby'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CCTV Integration Status */}
                        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                                <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                                    <Camera className="w-4 h-4 text-slate-600" />
                                    <span>Integrasi CCTV (EZVIZ)</span>
                                </h2>
                                <Link
                                    href="/cctv"
                                    className="text-[11px] text-[#14433b] hover:underline font-medium"
                                >
                                    Detail
                                </Link>
                            </div>

                            <p className="text-[11px] text-slate-500 mb-2">
                                Kamera pemantauan gerbang untuk dokumentasi visual
                            </p>

                            <div className="p-2.5 rounded border border-slate-200 bg-slate-50 text-xs flex items-center justify-between">
                                <span className="text-slate-600 text-[11px]">
                                    {cctv_status.status_label}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    Opsional
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
