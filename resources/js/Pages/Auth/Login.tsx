import React, { FormEventHandler } from 'react';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';
import { Shield, KeyRound, LogIn, UserCheck, School } from 'lucide-react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: 'admin@artdevata.sch.id',
        password: 'password123',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const handleQuickRole = (email: string) => {
        setData((prev) => ({
            ...prev,
            email,
            password: 'password123',
        }));
    };

    return (
        <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <Head title="Masuk Sistem Absensi" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#14433b] text-[#21c9a4] font-extrabold text-2xl shadow-lg ring-4 ring-[#21c9a4]/30 mb-3">
                    A
                </div>
                <h1 className="text-xl font-extrabold tracking-tight text-[#14433b]">
                    ARTDEVATA SCHOOL ATTENDANCE
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                    Sistem Absensi QR Code Anti-Titip Absen &bull; SMA ARTDEVATA
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
                <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-2xl sm:px-10 space-y-6">
                    {status && (
                        <div className="p-3 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4 text-xs">
                        <div>
                            <InputLabel htmlFor="email" value="Alamat Email Akun" />
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="mt-1 block w-full text-xs"
                                autoComplete="username"
                                isFocused={true}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="nama@artdevata.sch.id"
                                required
                            />
                            <InputError message={errors.email} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="password" value="Kata Sandi (Password)" />
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="mt-1 block w-full text-xs"
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                                required
                            />
                            <InputError message={errors.password} className="mt-1" />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) =>
                                        setData('remember', (e.target.checked || false) as false)
                                    }
                                />
                                <span className="ms-2 text-xs text-gray-600">
                                    Ingat saya di perangkat ini
                                </span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-xs text-[#14433b] font-semibold hover:underline"
                                >
                                    Lupa sandi?
                                </Link>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-2.5 px-4 bg-[#14433b] hover:bg-[#1b554b] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-4 h-4 text-[#21c9a4]" />
                            <span>{processing ? 'Memproses Masuk...' : 'Masuk ke Sistem'}</span>
                        </button>
                    </form>

                    {/* Quick Demo Role Picker for Testing */}
                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2">
                            PILIH ROLE UNTUK PENGUJIAN CEPAT:
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                            <button
                                type="button"
                                onClick={() => handleQuickRole('superadmin@artdevata.sch.id')}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-left truncate"
                            >
                                👑 Super Admin
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickRole('admin@artdevata.sch.id')}
                                className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 font-bold text-left truncate"
                            >
                                🏫 Admin Sekolah
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickRole('petugas@artdevata.sch.id')}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-left truncate"
                            >
                                📷 Petugas Scanner
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickRole('guru@artdevata.sch.id')}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-left truncate"
                            >
                                👨‍🏫 Guru / Wali Kelas
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickRole('kepsek@artdevata.sch.id')}
                                className="col-span-2 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-center"
                            >
                                🎓 Kepala Sekolah (Laporan & Monitoring)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center text-xs text-gray-400">
                    ARTDEVATA School Attendance &bull; Proteksi Anti-Titip Absen &bull; 2026
                </div>
            </div>
        </div>
    );
}
