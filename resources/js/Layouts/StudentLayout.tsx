import React, { PropsWithChildren, useState } from 'react';
import { Link, usePage, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import ToastNotification from '@/Components/ToastNotification';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import {
    LayoutDashboard,
    QrCode,
    History,
    LogOut,
    KeyRound,
    AlertCircle,
    Menu,
    X,
} from 'lucide-react';

interface StudentLayoutProps {
    title?: string;
    studentName?: string;
    studentNis?: string;
    className?: string;
    mustChangePassword?: boolean;
}

export default function StudentLayout({
    children,
    title,
    studentName,
    studentNis,
    mustChangePassword = false,
}: PropsWithChildren<StudentLayoutProps>) {
    const { url, props } = usePage<PageProps>();
    const appSettings = props.app_settings;
    const logoUrl = appSettings?.logo_path ? `/storage/${appSettings.logo_path}` : null;
    const schoolName = appSettings?.school_name || 'SMA ARTDEVATA';

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(mustChangePassword);

    const { data, setData, put, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('portal.password.update'), {
            onSuccess: () => {
                reset();
                setPasswordModalOpen(false);
            },
        });
    };

    const navLinks = [
        {
            name: 'Dashboard',
            href: route('portal.dashboard'),
            active: url === '/portal/dashboard',
            icon: LayoutDashboard,
        },
        {
            name: 'QR Code Saya',
            href: route('portal.qr-code'),
            active: url === '/portal/qr-code',
            icon: QrCode,
        },
        {
            name: 'Riwayat Absensi',
            href: route('portal.attendance-history'),
            active: url.startsWith('/portal/attendance-history'),
            icon: History,
        },
    ];

    return (
        <div className="min-h-screen bg-[#f8faf9] flex flex-col text-slate-800">
            {/* Must Change Password Banner */}
            {mustChangePassword && (
                <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                            Anda masih menggunakan kata sandi awal. Demi keamanan akun, segera perbarui kata sandi Anda.
                        </span>
                        <button
                            type="button"
                            onClick={() => setPasswordModalOpen(true)}
                            className="ml-auto underline font-semibold hover:text-amber-100 whitespace-nowrap"
                        >
                            Ganti Sandi &rarr;
                        </button>
                    </div>
                </div>
            )}

            {/* Navigation Header */}
            <header className="bg-[#14433b] text-white sticky top-0 z-40 border-b border-[#0e302a] shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        {/* Logo & School Name */}
                        <div className="flex items-center gap-2.5">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo Sekolah"
                                    className="w-8 h-8 object-contain rounded-lg shrink-0 bg-white p-0.5"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-[#21c9a4] text-[#14433b] font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                                    A
                                </div>
                            )}
                            <div>
                                <span className="font-bold tracking-tight text-sm block leading-tight">
                                    Portal Murid
                                </span>
                                <span className="text-[10px] text-emerald-300 block truncate max-w-[200px]">
                                    {schoolName}
                                </span>
                            </div>
                        </div>

                        {/* Desktop Navigation Links */}
                        <nav className="hidden md:flex items-center space-x-1">
                            {navLinks.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            item.active
                                                ? 'bg-[#1b554b] text-white'
                                                : 'text-emerald-100 hover:bg-[#1b554b]/60 hover:text-white'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 text-[#21c9a4]" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User Actions */}
                        <div className="hidden md:flex items-center gap-3">
                            <div className="text-right">
                                <span className="text-xs font-semibold block text-white truncate max-w-[150px]">
                                    {studentName || 'Siswa'}
                                </span>
                                <span className="text-[10px] text-emerald-300 block font-mono">
                                    NIS: {studentNis || '-'}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPasswordModalOpen(true)}
                                title="Ubah Kata Sandi"
                                className="p-1.5 rounded-lg bg-[#0e302a] hover:bg-[#1b554b] text-emerald-200 hover:text-white transition-colors"
                            >
                                <KeyRound className="w-4 h-4" />
                            </button>

                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                title="Keluar"
                                className="p-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 text-red-200 hover:text-white transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="flex md:hidden items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-1.5 rounded-lg bg-[#0e302a] text-white"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-[#0e302a] bg-[#103730] px-4 pt-2.5 pb-3 space-y-1.5">
                        <div className="pb-2 border-b border-[#1b554b] text-xs">
                            <p className="font-semibold text-white">{studentName || 'Murid'}</p>
                            <p className="text-[11px] text-emerald-300 font-mono">NIS: {studentNis || '-'}</p>
                        </div>

                        {navLinks.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                                        item.active
                                            ? 'bg-[#1b554b] text-white font-semibold'
                                            : 'text-emerald-100 hover:bg-[#1b554b]/50'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 text-[#21c9a4]" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}

                        <div className="pt-2 border-t border-[#1b554b] flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    setPasswordModalOpen(true);
                                }}
                                className="flex items-center gap-1.5 text-xs text-emerald-200 hover:text-white py-1"
                            >
                                <KeyRound className="w-4 h-4" />
                                <span>Ganti Sandi</span>
                            </button>

                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="flex items-center gap-1.5 text-xs text-red-300 hover:text-red-100 py-1"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Keluar</span>
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-3.5 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4">
                    &copy; {new Date().getFullYear()} ARTDEVATA Attendance System &bull; Portal Siswa
                </div>
            </footer>

            {/* Password Change Modal */}
            <Modal show={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                        Ubah Kata Sandi Akun
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Gunakan kombinasi minimal 6 karakter yang aman dan mudah Anda ingat.
                    </p>

                    <form onSubmit={handlePasswordSubmit} className="space-y-3.5 text-xs">
                        {!mustChangePassword && (
                            <div>
                                <InputLabel htmlFor="current_password" value="Kata Sandi Saat Ini" />
                                <TextInput
                                    id="current_password"
                                    type="password"
                                    value={data.current_password}
                                    onChange={(e) => setData('current_password', e.target.value)}
                                    className="mt-1 block w-full text-xs rounded-lg border-slate-300"
                                    required={!mustChangePassword}
                                />
                                <InputError message={errors.current_password} className="mt-1" />
                            </div>
                        )}

                        <div>
                            <InputLabel htmlFor="password" value="Kata Sandi Baru" />
                            <TextInput
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="mt-1 block w-full text-xs rounded-lg border-slate-300"
                                placeholder="Minimal 6 karakter"
                                required
                            />
                            <InputError message={errors.password} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="password_confirmation" value="Ulangi Kata Sandi Baru" />
                            <TextInput
                                id="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                className="mt-1 block w-full text-xs rounded-lg border-slate-300"
                                required
                            />
                            <InputError message={errors.password_confirmation} className="mt-1" />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            {!mustChangePassword && (
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Batal
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 bg-[#14433b] hover:bg-[#1a5349] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Sandi Baru'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            <ToastNotification />
        </div>
    );
}
