import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    School,
    Calendar,
    Clock,
    QrCode,
    History,
    FileSpreadsheet,
    CreditCard,
    Radio,
    ShieldCheck,
    ScrollText,
    Settings,
    Camera,
    Video,
    CheckSquare,
    FileHeart,
    LogOut,
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { props, url } = usePage<PageProps>();
    const user = props.auth?.user;
    const role = user?.role;

    // Helper to check route active
    const isActive = (path: string) => {
        if (path === '/dashboard') return url === '/dashboard';
        return url.startsWith(path);
    };

    // Role visibility rules
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = isSuperAdmin || role === 'admin_sekolah';
    const isPetugas = role === 'petugas_absensi';
    const isGuru = role === 'guru_wali';
    const isKepsek = role === 'kepala_sekolah';

    const menuGroups = [
        {
            title: 'UTAMA',
            items: [
                {
                    label: 'Dashboard',
                    href: '/dashboard',
                    icon: LayoutDashboard,
                    show: true,
                },
                {
                    label: 'Scanner QR',
                    href: '/scanner',
                    icon: QrCode,
                    badge: 'Anti-Titip',
                    show: isSuperAdmin || isAdmin || isPetugas,
                },
                {
                    label: 'Konfirmasi Kelas',
                    href: '/classroom',
                    icon: CheckSquare,
                    show: isSuperAdmin || isAdmin || isGuru,
                },
            ],
        },
        {
            title: 'AKADEMIK & SISWA',
            items: [
                {
                    label: 'Data Siswa',
                    href: '/students',
                    icon: Users,
                    show: isAdmin,
                },
                {
                    label: 'Data Kelas',
                    href: '/classes',
                    icon: School,
                    show: isAdmin,
                },
                {
                    label: 'Data Guru',
                    href: '/teachers',
                    icon: GraduationCap,
                    show: isAdmin,
                },
                {
                    label: 'Kartu QR Siswa',
                    href: '/qr-cards',
                    icon: CreditCard,
                    show: isAdmin,
                },
            ],
        },
        {
            title: 'ABSENSI & JADWAL',
            items: [
                {
                    label: 'Jadwal Sekolah',
                    href: '/schedules',
                    icon: Calendar,
                    show: isAdmin,
                },
                {
                    label: 'Riwayat Absensi',
                    href: '/attendance-history',
                    icon: History,
                    show: true,
                },
                {
                    label: 'Izin dan Sakit',
                    href: '/exceptions',
                    icon: FileHeart,
                    show: isAdmin || isGuru,
                },
                {
                    label: 'Laporan',
                    href: '/reports',
                    icon: FileSpreadsheet,
                    show: isAdmin || isGuru || isKepsek,
                },
            ],
        },
        {
            title: 'PERANGKAT & SISTEM',
            items: [
                {
                    label: 'Perangkat Scanner',
                    href: '/devices',
                    icon: Radio,
                    show: isAdmin,
                },
                {
                    label: 'Perangkat Verifikasi',
                    href: '/settings/verification-devices',
                    icon: Video,
                    badge: 'Kamera',
                    show: isAdmin,
                },
                {
                    label: 'Integrasi CCTV',
                    href: '/cctv',
                    icon: Camera,
                    badge: 'EZVIZ H8c',
                    show: isAdmin,
                },
                {
                    label: 'Pengguna & Role',
                    href: '/users',
                    icon: ShieldCheck,
                    show: isSuperAdmin,
                },
                {
                    label: 'Audit Log',
                    href: '/audit-logs',
                    icon: ScrollText,
                    show: isSuperAdmin,
                },
                {
                    label: 'Pengaturan Sekolah',
                    href: '/settings',
                    icon: Settings,
                    show: isAdmin,
                },
            ],
        },
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Element */}
            <aside
                className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 bg-[#14433b] text-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* School Header Brand */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10 bg-[#0f352f]">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#21c9a4] text-[#14433b] font-extrabold text-xl shadow-md">
                        A
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-bold tracking-tight text-white uppercase truncate">
                            ARTDEVATA
                        </h1>
                        <p className="text-xs text-[#21c9a4] font-medium tracking-wide">
                            ATTENDANCE SYSTEM
                        </p>
                    </div>
                </div>

                {/* User Role Card in Sidebar */}
                <div className="px-5 py-3 border-b border-white/10 bg-[#14433b]/70">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-[#21c9a4]">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                            <span className="inline-block px-2 py-0.5 mt-0.5 text-[10px] font-medium rounded-full bg-[#21c9a4]/20 text-[#21c9a4] uppercase">
                                {user?.role?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto scrollbar-thin">
                    {menuGroups.map((group, gIdx) => {
                        const visibleItems = group.items.filter((item) => item.show);
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={gIdx} className="space-y-1">
                                <h3 className="px-3 text-[11px] font-bold tracking-wider text-[#21c9a4]/80 uppercase">
                                    {group.title}
                                </h3>
                                <div className="space-y-0.5 pt-1">
                                    {visibleItems.map((item) => {
                                        const active = isActive(item.href);
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={onClose}
                                                className={`group flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                                                    active
                                                        ? 'bg-[#21c9a4] text-[#14433b] font-bold shadow-sm'
                                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Icon
                                                        className={`w-4 h-4 flex-shrink-0 ${
                                                            active
                                                                ? 'text-[#14433b]'
                                                                : 'text-white/60 group-hover:text-white'
                                                        }`}
                                                    />
                                                    <span className="truncate">{item.label}</span>
                                                </div>
                                                {item.badge && (
                                                    <span
                                                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wide ${
                                                            active
                                                                ? 'bg-[#14433b] text-[#21c9a4]'
                                                                : 'bg-[#21c9a4]/20 text-[#21c9a4]'
                                                        }`}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Bottom Logout */}
                <div className="p-4 border-t border-white/10 bg-[#0f352f]/50">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex items-center w-full gap-3 px-3 py-2 text-xs font-medium text-white/80 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                        <LogOut className="w-4 h-4 text-red-400" />
                        <span>Keluar (Logout)</span>
                    </Link>
                </div>
            </aside>
        </>
    );
}
