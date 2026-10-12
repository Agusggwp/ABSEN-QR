import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatCard from '@/Components/StatCard';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import {
    Users,
    UserCheck,
    Clock,
    HeartPulse,
    UserX,
    QrCode,
    Camera,
    Radio,
    Calendar,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
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
        <AuthenticatedLayout title="Dashboard Kehadiran Siswa">
            <Head title="Dashboard Kehadiran" />

            <div className="space-y-6">
                {/* Active Session & School Clock Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-[#14433b] to-[#1c554b] rounded-2xl p-6 text-white shadow-sm border border-emerald-950/20">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#21c9a4] text-[#14433b]">
                                    {session ? `SESI ${session.type.toUpperCase()} DIBUKA` : 'SESI STANDBY'}
                                </span>
                                <span className="text-xs text-white/80">{current_date}</span>
                            </div>
                            <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">
                                ARTDEVATA School Attendance System
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm text-emerald-100/90 max-w-xl">
                                Sistem pemantauan absensi terverifikasi dengan proteksi anti-titip absen untuk 1.000 siswa sekolah.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                href="/scanner"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#21c9a4] text-[#14433b] font-bold text-xs sm:text-sm hover:bg-[#1eb694] transition-all shadow-md active:scale-95"
                            >
                                <QrCode className="w-4 h-4" />
                                <span>Buka Scanner QR</span>
                            </Link>
                        </div>
                    </div>

                    {/* Quick Session Schedule Indicators */}
                    {session && (
                        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                                <span className="text-white/60">Jam Mulai Sesi:</span>
                                <p className="font-bold font-mono text-[#21c9a4]">{session.start_time.slice(0, 5)} WITA</p>
                            </div>
                            <div>
                                <span className="text-white/60">Batas Toleransi Terlambat:</span>
                                <p className="font-bold font-mono text-amber-300">{session.late_time.slice(0, 5)} WITA</p>
                            </div>
                            <div>
                                <span className="text-white/60">Penutupan Sesi:</span>
                                <p className="font-bold font-mono text-white">{session.end_time.slice(0, 5)} WITA</p>
                            </div>
                            <div>
                                <span className="text-white/60">Tingkat Kehadiran:</span>
                                <p className="font-bold text-[#21c9a4]">{metrics.attendance_percentage}%</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Siswa Aktif"
                        value={metrics.total_students}
                        subtitle="Kapasitas 1.000 Siswa Terdaftar"
                        icon={Users}
                        color="brand"
                    />
                    <StatCard
                        title="Hadir Tepat Waktu"
                        value={metrics.hadir}
                        subtitle={`${metrics.attendance_percentage}% dari total siswa`}
                        icon={UserCheck}
                        color="accent"
                    />
                    <StatCard
                        title="Terlambat Hadir"
                        value={metrics.terlambat}
                        subtitle="Lewat dari batas jam sekolah"
                        icon={Clock}
                        color="amber"
                    />
                    <StatCard
                        title="Izin / Sakit / Dispensasi"
                        value={metrics.izin + metrics.sakit + metrics.dispensasi}
                        subtitle={`${metrics.izin} Izin | ${metrics.sakit} Sakit`}
                        icon={HeartPulse}
                        color="blue"
                    />
                </div>

                {/* Secondary Status Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div className="p-4 bg-white rounded-xl border border-gray-200">
                        <span className="text-xs text-gray-500 font-medium">Belum Melakukan Absen</span>
                        <p className="mt-1 text-xl font-extrabold text-gray-800">{metrics.belum_absen}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-rose-200 bg-rose-50/20">
                        <span className="text-xs text-rose-600 font-medium">Alpa (Tanpa Keterangan)</span>
                        <p className="mt-1 text-xl font-extrabold text-rose-700">{metrics.alpa}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-amber-200 bg-amber-50/20">
                        <span className="text-xs text-amber-700 font-medium">Perlu Verifikasi</span>
                        <p className="mt-1 text-xl font-extrabold text-amber-800">{metrics.perlu_verifikasi}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20">
                        <span className="text-xs text-emerald-700 font-medium">Persentase Kehadiran</span>
                        <p className="mt-1 text-xl font-extrabold text-emerald-800">{metrics.attendance_percentage}%</p>
                    </div>
                </div>

                {/* Charts & Recent Scans Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Weekly Trend Chart (2 cols) */}
                    <div className="lg:col-span-2 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Tren Kehadiran Harian (7 Hari Terakhir)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Perbandingan siswa hadir tepat, terlambat, izin, dan alpa
                                </p>
                            </div>
                        </div>

                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weekly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    <Bar dataKey="hadir" name="Hadir" fill="#14433b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="terlambat" name="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="izin_sakit" name="Izin / Sakit" fill="#0284c7" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="alpa" name="Alpa" fill="#e11d48" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Live Recent Scans (1 col) */}
                    <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-900">
                                Pemindaian Terbaru Hari Ini
                            </h3>
                            <Link href="/attendance-history" className="text-xs text-[#14433b] font-semibold hover:underline flex items-center gap-1">
                                <span>Lihat Semua</span>
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-72">
                            {recent_scans.length > 0 ? (
                                recent_scans.map((scan) => (
                                    <div key={scan.id} className="py-2.5 flex items-center justify-between text-xs">
                                        <div className="min-w-0 pr-2">
                                            <p className="font-semibold text-gray-900 truncate">{scan.student_name}</p>
                                            <p className="text-[11px] text-gray-500">
                                                NIS: {scan.nis} &bull; {scan.class_name}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <StatusBadge status={scan.status} size="sm" />
                                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{scan.time}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-xs text-gray-400">
                                    Belum ada pemindaian tercatat untuk sesi hari ini.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Class Attendance Summary & Device/CCTV Status */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Class Stats Table (2 cols) */}
                    <div className="lg:col-span-2 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Statistik Kehadiran per Kelas
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Distribusi siswa hadir hari ini di seluruh 15 rombel kelas
                                </p>
                            </div>
                            <Link href="/classroom" className="text-xs text-[#14433b] font-semibold hover:underline">
                                Konfirmasi Kelas &rarr;
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/50">
                                        <th className="py-2.5 px-3">Kelas</th>
                                        <th className="py-2.5 px-3 text-center">Total Siswa</th>
                                        <th className="py-2.5 px-3 text-center">Hadir</th>
                                        <th className="py-2.5 px-3 text-center">Terlambat</th>
                                        <th className="py-2.5 px-3 text-right">Persentase</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {class_stats.slice(0, 8).map((cls) => (
                                        <tr key={cls.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-2.5 px-3 font-semibold text-gray-900">{cls.name}</td>
                                            <td className="py-2.5 px-3 text-center text-gray-600">{cls.total_students}</td>
                                            <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{cls.present}</td>
                                            <td className="py-2.5 px-3 text-center text-amber-700 font-medium">{cls.late}</td>
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-[#21c9a4] h-1.5 rounded-full"
                                                            style={{ width: `${Math.min(100, cls.attendance_rate)}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-bold font-mono text-gray-700 w-10 text-right">
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
                        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Radio className="w-4 h-4 text-[#14433b]" />
                                    <span>Perangkat Scanner</span>
                                </h3>
                                <Link href="/devices" className="text-[11px] text-[#14433b] font-semibold hover:underline">
                                    Kelola
                                </Link>
                            </div>

                            <div className="space-y-2.5 text-xs">
                                {scanner_devices.map((dev) => (
                                    <div key={dev.id} className="p-2.5 rounded-lg border border-gray-100 bg-gray-50/60 flex items-center justify-between">
                                        <div className="min-w-0 pr-2">
                                            <p className="font-semibold text-gray-900 truncate">{dev.device_name}</p>
                                            <p className="text-[11px] text-gray-500 truncate">{dev.location || 'Pos Scanner'}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                                dev.is_online ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {dev.is_online ? 'ONLINE' : 'STANDBY'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CCTV Integration Status */}
                        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-[#14433b]" />
                                    <span>Integrasi CCTV EZVIZ H8c</span>
                                </h3>
                                <Link href="/cctv" className="text-[11px] text-[#14433b] font-semibold hover:underline">
                                    Detail
                                </Link>
                            </div>

                            <p className="text-xs text-gray-500 mb-3">
                                Perangkat pendukung rekaman audit video gerbang sekolah
                            </p>

                            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-amber-900">Status Modul:</span>
                                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">
                                        OPSIONAL
                                    </span>
                                </div>
                                <p className="text-[11px] text-amber-800 leading-snug pt-1">
                                    {cctv_status.status_label}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
