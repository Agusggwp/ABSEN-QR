import React, { useState, useRef, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    School,
    Calendar,
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
    ChevronRight,
    Loader2,
    ExternalLink,
    Terminal,
} from 'lucide-react';

interface SidebarProps {
    sidebarOpen?: boolean;
    setSidebarOpen?: (open: boolean) => void;
    sidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
    user?: any;
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({
    sidebarOpen: propSidebarOpen,
    setSidebarOpen: propSetSidebarOpen,
    sidebarCollapsed = false,
    toggleSidebar,
    user: propUser,
    isOpen,
    onClose,
}: SidebarProps) {
    const { props, url } = usePage<PageProps>();
    const authUser = props.auth?.user;
    const appSettings = props.app_settings;

    const sidebarOpen = propSidebarOpen !== undefined ? propSidebarOpen : !!isOpen;
    const setSidebarOpen =
        propSetSidebarOpen ||
        (onClose
            ? (val: boolean) => {
                  if (!val) onClose();
              }
            : () => {});

    const user = propUser || authUser || { name: 'Administrator', email: 'admin@artdevata.sch.id', role: 'admin_sekolah' };
    const schoolName = appSettings?.school_name || 'SMA ARTDEVATA DENPASAR';
    const logoUrl = appSettings?.logo_path ? `/storage/${appSettings.logo_path}` : null;
    const portalSubtitle = 'SISTEM ABSENSI QR CODE';

    const [logoutOpen, setLogoutOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navRef = useRef<HTMLElement>(null);

    // Auto-scroll active item into view when url changes
    useEffect(() => {
        if (navRef.current) {
            const activeEl = navRef.current.querySelector('[data-sidebar-active="true"]');
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [url]);

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Role visibility rules
    const role = user?.role;
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = isSuperAdmin || role === 'admin_sekolah';
    const isPetugas = role === 'petugas_absensi';
    const isGuru = role === 'guru_wali';
    const isKepsek = role === 'kepala_sekolah';

    const navigation = [
        {
            group: 'UTAMA',
            items: [
                {
                    name: 'Dashboard',
                    href: '/dashboard',
                    icon: LayoutDashboard,
                    show: true,
                },
                {
                    name: 'Scanner QR',
                    href: '/scanner',
                    icon: QrCode,
                    badge: 'Anti-Titip',
                    show: isSuperAdmin || isAdmin || isPetugas,
                },
                {
                    name: 'Konfirmasi Kelas',
                    href: '/classroom',
                    icon: CheckSquare,
                    show: isSuperAdmin || isAdmin || isGuru,
                },
            ],
        },
        {
            group: 'AKADEMIK & SISWA',
            items: [
                {
                    name: 'Data Siswa',
                    href: '/students',
                    icon: Users,
                    show: isAdmin,
                },
                {
                    name: 'Akun Login Siswa',
                    href: '/students/accounts',
                    icon: ShieldCheck,
                    badge: 'Portal',
                    show: isAdmin,
                },
                {
                    name: 'Data Kelas',
                    href: '/classes',
                    icon: School,
                    show: isAdmin,
                },
                {
                    name: 'Data Guru',
                    href: '/teachers',
                    icon: GraduationCap,
                    show: isAdmin,
                },
                {
                    name: 'Kartu QR Siswa',
                    href: '/qr-cards',
                    icon: CreditCard,
                    show: isAdmin,
                },
            ],
        },
        {
            group: 'ABSENSI & JADWAL',
            items: [
                {
                    name: 'Jadwal Sekolah',
                    href: '/schedules',
                    icon: Calendar,
                    show: isAdmin,
                },
                {
                    name: 'Riwayat Absensi',
                    href: '/attendance-history',
                    icon: History,
                    show: true,
                },
                {
                    name: 'Izin dan Sakit',
                    href: '/exceptions',
                    icon: FileHeart,
                    show: isAdmin || isGuru,
                },
                {
                    name: 'Laporan',
                    href: '/reports',
                    icon: FileSpreadsheet,
                    show: isAdmin || isGuru || isKepsek,
                },
            ],
        },
        {
            group: 'PERANGKAT & SISTEM',
            items: [
                {
                    name: 'Perangkat Scanner',
                    href: '/devices',
                    icon: Radio,
                    show: isAdmin,
                },
                {
                    name: 'Perangkat Verifikasi',
                    href: '/settings/verification-devices',
                    icon: Video,
                    badge: 'Kamera',
                    show: isAdmin,
                },
                {
                    name: 'Integrasi CCTV',
                    href: '/cctv',
                    icon: Camera,
                    badge: 'EZVIZ',
                    show: isAdmin,
                },
                {
                    name: 'Pengguna & Role',
                    href: '/users',
                    icon: ShieldCheck,
                    show: isSuperAdmin,
                },
                {
                    name: 'Audit Log',
                    href: '/audit-logs',
                    icon: ScrollText,
                    show: isSuperAdmin,
                },
                {
                    name: 'Pengaturan Sekolah',
                    href: '/settings',
                    icon: Settings,
                    show: isAdmin,
                },
            ],
        },
        {
            group: 'DEVELOPER & LAB',
            items: [
                {
                    name: 'Developer Tools',
                    href: '/dev-mode',
                    icon: Terminal,
                    badge: 'Super Admin',
                    show: isSuperAdmin,
                },
            ],
        },
    ];

    const allNavPaths = navigation
        .flatMap((group) => group.items)
        .map((item) => item.href.split('?')[0].replace(/\/$/, ''));

    const isActive = (path: string) => {
        if (path === '/dashboard') return url === '/dashboard' || url === '/dashboard/';
        if (path === '/') return false;

        const currentPath = url.split('?')[0].replace(/\/$/, '');
        const targetPath = path.split('?')[0].replace(/\/$/, '');

        // 1. Exact match selalu aktif
        if (currentPath === targetPath) return true;

        // 2. Jika currentPath persis sama dengan menu lain di sidebar (misal /students/accounts),
        // jangan aktifkan menu parent/prefix-nya (/students) agar tidak terjadi double active
        if (allNavPaths.includes(currentPath)) {
            return false;
        }

        // 3. Untuk halaman sub/detail (misal /students/create atau /students/1/edit),
        // hanya aktifkan jika targetPath adalah prefix terpanjang yang cocok
        if (currentPath.startsWith(`${targetPath}/`)) {
            const hasMoreSpecificNav = allNavPaths.some(
                (p) => p !== targetPath && p.startsWith(targetPath) && currentPath.startsWith(`${p}/`)
            );
            return !hasMoreSpecificNav;
        }

        return false;
    };

    const handleLogout = () => {
        setIsLoggingOut(true);
        router.post(
            route('logout'),
            {},
            {
                onFinish: () => {
                    setIsLoggingOut(false);
                    setLogoutOpen(false);
                },
            }
        );
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Desktop & Mobile */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out lg:z-30 shrink-0 ${
                    sidebarOpen
                        ? 'translate-x-0 w-64 shadow-2xl lg:shadow-none'
                        : '-translate-x-full lg:translate-x-0'
                } ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
            >
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Logo Brand Header */}
                    <div
                        className={`h-16 border-b border-slate-200 dark:border-slate-800 flex items-center shrink-0 ${
                            sidebarCollapsed ? 'lg:justify-center lg:px-2 px-4' : 'px-4'
                        }`}
                    >
                        <div className="flex items-center space-x-3 overflow-hidden">
                            {/* Logo Mark (Always visible) */}
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    className={`h-9 w-9 object-contain shrink-0 cursor-pointer transition-transform hover:scale-105 ${
                                        sidebarCollapsed ? 'mx-auto' : ''
                                    }`}
                                    onClick={sidebarCollapsed ? toggleSidebar : undefined}
                                    title={sidebarCollapsed ? 'Buka / Perluas Sidebar' : schoolName}
                                />
                            ) : (
                                <div
                                    className={`h-9 w-9 rounded-xl bg-gradient-to-br from-[#14433b] to-[#1c5d52] text-[#21c9a4] font-black flex items-center justify-center text-sm shadow-xs shrink-0 cursor-pointer transition-transform hover:scale-105 ${
                                        sidebarCollapsed ? 'mx-auto' : ''
                                    }`}
                                    onClick={sidebarCollapsed ? toggleSidebar : undefined}
                                    title={sidebarCollapsed ? 'Buka / Perluas Sidebar' : schoolName}
                                >
                                    A
                                </div>
                            )}

                            {/* Brand Text (hidden when collapsed on desktop) */}
                            <div className={`truncate ${sidebarCollapsed ? 'lg:hidden block' : 'block'}`}>
                                <h1 className="font-extrabold text-slate-900 dark:text-white tracking-tight text-sm leading-tight truncate">
                                    {schoolName}
                                </h1>
                                <p className="text-[10px] text-[#14433b] dark:text-[#21c9a4] font-bold tracking-wide uppercase truncate">
                                    {portalSubtitle}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <nav
                        ref={navRef}
                        className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth ${
                            sidebarCollapsed ? 'p-2 lg:px-2 lg:py-3 space-y-4 pb-8' : 'p-4 space-y-5 pb-12'
                        }`}
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(100, 116, 139, 0.35) transparent',
                        }}
                    >
                        {navigation.map((group, idx) => {
                            const visibleItems = group.items.filter((item) => item.show);
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={idx}>
                                    {/* Group Title or subtle separator when collapsed on desktop */}
                                    {sidebarCollapsed ? (
                                        <div className="hidden lg:block">
                                            {idx > 0 && (
                                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-1" />
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 px-2">
                                            {group.group}
                                        </p>
                                    )}

                                    {/* Always show group title on mobile drawer */}
                                    {sidebarCollapsed && (
                                        <p className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 px-2 lg:hidden">
                                            {group.group}
                                        </p>
                                    )}

                                    <div className="space-y-1">
                                        {visibleItems.map((item) => {
                                            const Icon = item.icon;
                                            const active = isActive(item.href);

                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    data-sidebar-active={active ? 'true' : 'false'}
                                                    onClick={() => setSidebarOpen(false)}
                                                    title={sidebarCollapsed ? item.name : undefined}
                                                    className={`flex items-center rounded-lg transition-colors group relative cursor-pointer ${
                                                        sidebarCollapsed
                                                            ? 'lg:justify-center lg:p-2.5 lg:h-10 lg:w-10 lg:mx-auto px-3 py-2 justify-between'
                                                            : 'px-3 py-2 justify-between'
                                                    } ${
                                                        active
                                                            ? 'bg-[#14433b] dark:bg-emerald-700 text-white shadow-xs font-semibold'
                                                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                                                    }`}
                                                >
                                                    <div
                                                        className={`flex items-center min-w-0 ${
                                                            sidebarCollapsed ? 'lg:space-x-0 space-x-3' : 'space-x-3'
                                                        }`}
                                                    >
                                                        <Icon
                                                            className={`h-4 w-4 shrink-0 ${
                                                                active
                                                                    ? 'text-[#21c9a4]'
                                                                    : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                                                            }`}
                                                        />
                                                        <span
                                                            className={`text-xs font-medium whitespace-nowrap truncate ${
                                                                sidebarCollapsed ? 'lg:hidden block' : 'block'
                                                            }`}
                                                        >
                                                            {item.name}
                                                        </span>
                                                    </div>

                                                    {/* Badge & Chevron Indicator */}
                                                    <div
                                                        className={`flex items-center gap-1.5 ${
                                                            sidebarCollapsed ? 'lg:hidden flex' : 'flex'
                                                        }`}
                                                    >
                                                        {item.badge && (
                                                            <span
                                                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide ${
                                                                    active
                                                                        ? 'bg-[#21c9a4] text-[#14433b]'
                                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                }`}
                                                            >
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                        {active && (
                                                            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                                                        )}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>

                    {/* User Profile & Logout in Sidebar Footer */}
                    <div
                        className={`border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 shrink-0 ${
                            sidebarCollapsed ? 'p-2 lg:py-3 lg:px-1' : 'p-3'
                        }`}
                    >
                        {/* Compact Profile for Desktop Collapsed State */}
                        {sidebarCollapsed && (
                            <div className="hidden lg:flex flex-col items-center space-y-2.5">
                                <div
                                    className="h-9 w-9 rounded-full bg-[#14433b] text-[#21c9a4] flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-slate-800 shadow-2xs cursor-pointer"
                                    title={`${user?.name} (${user?.email})`}
                                >
                                    {getInitials(user?.name)}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLogoutOpen(true)}
                                    title="Keluar (Logout)"
                                    disabled={isLoggingOut}
                                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                                >
                                    {isLoggingOut ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <LogOut className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Full Profile on Mobile or Expanded Desktop */}
                        <div
                            className={`flex flex-col gap-2.5 ${
                                sidebarCollapsed ? 'lg:hidden flex' : 'flex'
                            }`}
                        >
                            <div className="flex items-center space-x-3 overflow-hidden min-w-0">
                                <div className="h-9 w-9 shrink-0 rounded-full bg-[#14433b] text-[#21c9a4] flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-slate-800 shadow-2xs">
                                    {getInitials(user?.name)}
                                </div>
                                <div className="truncate min-w-0">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {user?.name || 'Administrator'}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate uppercase">
                                        {user?.role?.replace('_', ' ') || user?.email}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setLogoutOpen(true)}
                                title="Logout"
                                className="w-full py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                        <span>Mengeluarkan...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="h-4 w-4 shrink-0" />
                                        <span>Keluar</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Logout Confirmation Dialog Modal */}
            <Modal show={logoutOpen} onClose={() => setLogoutOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-3 text-red-600">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                            <LogOut className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Konfirmasi Keluar</h3>
                            <p className="text-xs text-gray-500">Sistem Absensi ARTDEVATA</p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-600 mb-6">
                        Apakah Anda yakin ingin keluar dari sistem administrasi <strong>{schoolName}</strong>? Sesi login Anda akan diakhiri.
                    </p>

                    <div className="flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setLogoutOpen(false)}
                            disabled={isLoggingOut}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoggingOut ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Mengeluarkan...</span>
                                </>
                            ) : (
                                <span>Ya, Keluar</span>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
