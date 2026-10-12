import React, { FormEventHandler, useState } from 'react';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { PageProps } from '@/types';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { props } = usePage<PageProps>();
    const appSettings = props.app_settings;
    const logoUrl = appSettings?.logo_path ? `/storage/${appSettings.logo_path}` : null;
    const schoolName = appSettings?.school_name || 'ARTDEVATA ATTENDANCE';

    const [showPassword, setShowPassword] = useState(false);

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

    const handleQuickRole = (email: string, password = 'password123') => {
        setData((prev) => ({
            ...prev,
            email,
            password,
        }));
    };

    return (
        <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-800">
            <Head title="Masuk Sistem Absensi" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt="Logo Sekolah"
                        className="mx-auto h-14 w-14 object-contain mb-3"
                    />
                ) : (
                    <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#14433b] text-[#21c9a4] font-bold text-lg shadow-xs mb-3">
                        A
                    </div>
                )}
                <h1 className="text-lg font-bold text-slate-900 tracking-tight uppercase">
                    {schoolName}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                    Sistem Presensi Sekolah & Portal Siswa
                </p>
            </div>

            <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-6 px-6 sm:px-8 border border-slate-200 rounded-xl shadow-xs space-y-5">
                    {status && (
                        <div className="p-3 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4 text-xs">
                        <div>
                            <InputLabel htmlFor="email" value="Alamat Email atau NIS / Username" />
                            <TextInput
                                id="email"
                                type="text"
                                name="email"
                                value={data.email}
                                className="mt-1 block w-full text-xs rounded-lg border-slate-300 focus:border-[#14433b] focus:ring-[#14433b]"
                                autoComplete="username"
                                isFocused={true}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="Email admin atau NIS siswa (contoh: 20261001)"
                                required
                            />
                            <InputError message={errors.email} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="password" value="Kata Sandi" />
                            <div className="relative mt-1">
                                <TextInput
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={data.password}
                                    className="block w-full text-xs pr-10 rounded-lg border-slate-300 focus:border-[#14433b] focus:ring-[#14433b]"
                                    autoComplete="current-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                    title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <InputError message={errors.password} className="mt-1" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center cursor-pointer">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) =>
                                        setData('remember', (e.target.checked || false) as false)
                                    }
                                />
                                <span className="ms-2 text-xs text-slate-600">
                                    Ingat saya di perangkat ini
                                </span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-xs text-[#14433b] hover:underline font-medium"
                                >
                                    Lupa kata sandi?
                                </Link>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-2.5 px-4 bg-[#14433b] hover:bg-[#1b554b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-4 h-4 text-[#21c9a4]" />
                            <span>{processing ? 'Memproses Masuk...' : 'Masuk ke Sistem'}</span>
                        </button>
                    </form>

                    {/* Quick Demo Role Picker for Testing */}
                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2">
                            Pilih Akses Pengujian Cepat
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                            <button
                                type="button"
                                onClick={() => handleQuickRole('admin@artdevata.sch.id', 'password123')}
                                className="p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-left truncate transition-colors"
                            >
                                Admin Sekolah
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickRole('20261001', 'Siswa@20261001')}
                                className="p-2 rounded-md border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 font-medium text-left truncate transition-colors"
                            >
                                Portal Murid (20261001)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickRole('petugas@artdevata.sch.id', 'password123')}
                                className="p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-left truncate transition-colors"
                            >
                                Petugas Scanner
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickRole('guru@artdevata.sch.id', 'password123')}
                                className="p-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-left truncate transition-colors"
                            >
                                Guru / Wali Kelas
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickRole('superadmin@artdevata.sch.id', 'password123')}
                                className="col-span-2 p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 text-center transition-colors text-[10px]"
                            >
                                Super Administrator
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} ARTDEVATA Attendance System &bull; Versi 2.4 Production
                </div>
            </div>
        </div>
    );
}
