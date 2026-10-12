import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import Modal from '@/Components/Modal';
import {
    ShieldCheck,
    Search,
    RotateCcw,
    UserPlus,
    CheckCircle2,
    XCircle,
    UserX,
} from 'lucide-react';

interface StudentItem {
    id: number;
    name: string;
    nis: string;
    nisn?: string;
    gender: string;
    is_active: boolean;
    school_class?: {
        id: number;
        name: string;
    };
    user?: {
        id: number;
        username: string;
        email: string;
        is_active: boolean;
        must_change_password: boolean;
        created_at: string;
    };
}

interface AccountsPageProps {
    students: {
        data: StudentItem[];
        links: any[];
        total: number;
        from: number;
        to: number;
    };
    classes: Array<{ id: number; name: string }>;
    filters: {
        search?: string;
        class_id?: string;
        status?: string;
        per_page?: number;
    };
    stats: {
        total_students: number;
        has_account: number;
        no_account: number;
        active_accounts: number;
        inactive_accounts: number;
    };
}

export default function StudentAccountsIndex({
    students,
    classes,
    filters,
    stats,
}: AccountsPageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [classId, setClassId] = useState(filters.class_id || '');
    const [status, setStatus] = useState(filters.status || '');
    const [confirmBulkModal, setConfirmBulkModal] = useState(false);
    const isFirstRender = useRef(true);

    const handleFilterChange = (newFilters: {
        search?: string;
        class_id?: string;
        status?: string;
    }) => {
        router.get(
            route('students.accounts'),
            {
                search: newFilters.search !== undefined ? newFilters.search : search,
                class_id: newFilters.class_id !== undefined ? newFilters.class_id : classId,
                status: newFilters.status !== undefined ? newFilters.status : status,
            },
            { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
        );
    };

    // Live debounced filter without loading bar
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            handleFilterChange({ search, class_id: classId, status });
        }, 300);

        return () => clearTimeout(timer);
    }, [search, classId, status]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange({ search });
    };

    const handleCreateSingle = (studentId: number) => {
        router.post(route('students.account.create', studentId), {}, { preserveScroll: true });
    };

    const handleResetPassword = (studentId: number) => {
        if (confirm('Reset kata sandi siswa ini ke kata sandi bawaan (Siswa@{NIS})?')) {
            router.post(route('students.account.reset-password', studentId), {}, { preserveScroll: true });
        }
    };

    const handleToggleStatus = (studentId: number) => {
        router.post(route('students.account.toggle-status', studentId), {}, { preserveScroll: true });
    };

    const handleBulkCreateAll = () => {
        router.post(
            route('students.accounts.bulk-create'),
            {},
            {
                preserveScroll: true,
                onSuccess: () => setConfirmBulkModal(false),
            }
        );
    };

    return (
        <AuthenticatedLayout title="Akun Portal Murid">
            <Head title="Pengelolaan Akun Murid" />

            <div className="space-y-4 text-slate-800">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                            Pengelolaan Akun Portal Murid
                        </h1>
                        <p className="text-xs text-slate-500">
                            Kelola hak akses login portal, reset kata sandi, dan status akun siswa
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {stats.no_account > 0 && (
                            <button
                                type="button"
                                onClick={() => setConfirmBulkModal(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#14433b] hover:bg-[#1a5349] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                            >
                                <UserPlus className="w-4 h-4 text-[#21c9a4]" />
                                <span>Buat Akun Massal ({stats.no_account} Siswa)</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Stat Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-xs font-medium text-slate-500">Total Siswa</span>
                        <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total_students}</p>
                    </div>

                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-xs font-medium text-slate-500">Memiliki Akun</span>
                        <p className="text-xl font-bold text-emerald-700 mt-0.5">{stats.has_account}</p>
                    </div>

                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-xs font-medium text-slate-500">Belum Ada Akun</span>
                        <p className="text-xl font-bold text-amber-700 mt-0.5">{stats.no_account}</p>
                    </div>

                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-xs font-medium text-slate-500">Akun Aktif</span>
                        <p className="text-xl font-bold text-slate-900 mt-0.5">
                            {stats.active_accounts}{' '}
                            <span className="text-xs font-normal text-slate-400">
                                ({stats.inactive_accounts} Nonaktif)
                            </span>
                        </p>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Cari nama atau NIS siswa..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                        />
                    </form>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <select
                            value={classId}
                            onChange={(e) => {
                                setClassId(e.target.value);
                                handleFilterChange({ class_id: e.target.value });
                            }}
                            className="py-2 pl-3 pr-8 rounded-lg border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b] bg-white"
                        >
                            <option value="">Semua Kelas</option>
                            {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    {cls.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                handleFilterChange({ status: e.target.value });
                            }}
                            className="py-2 pl-3 pr-8 rounded-lg border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b] bg-white"
                        >
                            <option value="">Semua Status Akun</option>
                            <option value="has_account">Memiliki Akun</option>
                            <option value="no_account">Belum Ada Akun</option>
                            <option value="active">Akun Aktif</option>
                            <option value="inactive">Akun Nonaktif</option>
                        </select>

                        {(search || classId || status) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setClassId('');
                                    setStatus('');
                                    router.get(route('students.accounts'));
                                }}
                                className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60 text-[11px]">
                                    <th className="py-2.5 px-3">Nama Siswa</th>
                                    <th className="py-2.5 px-3">NIS / NISN</th>
                                    <th className="py-2.5 px-3">Kelas</th>
                                    <th className="py-2.5 px-3">Username Login</th>
                                    <th className="py-2.5 px-3">Status Akun</th>
                                    <th className="py-2.5 px-3">Sandi Awal</th>
                                    <th className="py-2.5 px-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {students.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            Tidak ada data siswa yang cocok dengan kriteria pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    students.data.map((student) => {
                                        const hasAccount = !!student.user;
                                        const isActive = student.user?.is_active ?? false;

                                        return (
                                            <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                                                    {student.name}
                                                </td>

                                                <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                                                    <span className="font-semibold text-slate-900">{student.nis}</span>
                                                    {student.nisn && (
                                                        <span className="block text-[10px] text-slate-400">
                                                            {student.nisn}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                                                    {student.school_class?.name || '-'}
                                                </td>

                                                <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                                                    {hasAccount ? (
                                                        <span className="text-slate-800">
                                                            {student.user?.username || student.nis}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Belum dibuat</span>
                                                    )}
                                                </td>

                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    {hasAccount ? (
                                                        isActive ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                <span>Aktif</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                <span>Nonaktif</span>
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                                            Belum Ada Akun
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                                                    {hasAccount && student.user?.must_change_password ? (
                                                        <span className="text-amber-700 font-medium">
                                                            Belum diganti
                                                        </span>
                                                    ) : hasAccount ? (
                                                        <span className="text-slate-400">Sudah diganti</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>

                                                <td className="py-2.5 px-3 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {!hasAccount ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCreateSingle(student.id)}
                                                                className="px-2.5 py-1 rounded-md bg-[#14433b] hover:bg-[#1a5349] text-white text-[11px] font-medium shadow-xs transition-colors"
                                                            >
                                                                Buat Akun
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleResetPassword(student.id)}
                                                                    title="Reset sandi ke Siswa@{NIS}"
                                                                    className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                                                >
                                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleStatus(student.id)}
                                                                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${isActive
                                                                            ? 'text-rose-700 hover:bg-rose-50'
                                                                            : 'text-emerald-700 hover:bg-emerald-50'
                                                                        }`}
                                                                >
                                                                    {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>
                            Menampilkan {students.from || 0} - {students.to || 0} dari {students.total} data
                        </span>
                        <Pagination links={students.links} />
                    </div>
                </div>
            </div>

            {/* Modal Konfirmasi Buat Akun Massal */}
            <Modal show={confirmBulkModal} onClose={() => setConfirmBulkModal(false)} maxWidth="sm">
                <div className="p-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                        Buat Akun Massal Murid
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Menghubungkan {stats.no_account} murid yang saat ini belum memiliki akun login.
                    </p>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1 mb-5">
                        <p className="font-semibold text-slate-800">Format Akun Default:</p>
                        <p className="text-[11px] text-slate-600">&bull; Username: NIS masing-masing murid</p>
                        <p className="text-[11px] text-slate-600">&bull; Kata Sandi Awal: Siswa@[NIS]</p>
                        <p className="text-[11px] text-slate-600">&bull; Wajib ganti sandi saat login pertama</p>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setConfirmBulkModal(false)}
                            className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkCreateAll}
                            className="px-4 py-2 rounded-lg bg-[#14433b] hover:bg-[#1a5349] text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                            Buat Sekarang
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
