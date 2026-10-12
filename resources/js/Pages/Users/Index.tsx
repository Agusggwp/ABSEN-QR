import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import { Head, router } from '@inertiajs/react';
import { ShieldCheck, Plus, Edit2, Search, X } from 'lucide-react';
import { User, UserRole } from '@/types';

interface UsersIndexProps {
    users: {
        data: User[];
        links: any[];
        total: number;
    };
    filters: {
        search?: string;
        role?: string;
    };
    roles: Record<string, string>;
}

export default function UsersIndex({ users, filters, roles }: UsersIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [role, setRole] = useState(filters.role || 'all');
    const isFirstRender = useRef(true);

    // Live debounced filter without loading bar
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                '/users',
                { search, role },
                { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, role]);

    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editUserId, setEditUserId] = useState<number | null>(null);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [userRole, setUserRole] = useState<UserRole>('petugas_absensi');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/users',
            { search, role },
            { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
        );
    };

    const openAddModal = () => {
        setIsEditing(false);
        setEditUserId(null);
        setName('');
        setEmail('');
        setUserRole('petugas_absensi');
        setPhone('');
        setPassword('');
        setIsActive(true);
        setModalOpen(true);
    };

    const openEditModal = (u: User) => {
        setIsEditing(true);
        setEditUserId(u.id);
        setName(u.name);
        setEmail(u.email);
        setUserRole(u.role);
        setPhone(u.phone || '');
        setPassword('');
        setIsActive(u.is_active ?? true);
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload: any = {
            name,
            email,
            role: userRole,
            phone,
            is_active: isActive,
        };

        if (password) {
            payload.password = password;
        }

        if (isEditing && editUserId) {
            router.put(`/users/${editUserId}`, payload, {
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            });
        } else {
            router.post('/users', payload, {
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            });
        }
    };

    return (
        <AuthenticatedLayout title="Pengguna & Hak Akses (RBAC)">
            <Head title="Pengguna & Hak Akses" />

            <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#14433b]" />
                            <span>Pengguna & Hak Akses Sistem ({users.total} Akun)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Role-Based Access Control (Super Admin, Admin Sekolah, Petugas Absensi, Guru, Kepala Sekolah)
                        </p>
                    </div>

                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#14433b] text-white hover:bg-[#1a554a] transition-colors shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5 text-[#21c9a4]" />
                        <span>Tambah Akun Pengguna</span>
                    </button>
                </div>

                {/* Filter */}
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                        <div className="sm:col-span-8 relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama atau email pengguna..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border-slate-300 focus:ring-[#14433b] focus:border-[#14433b]"
                            />
                        </div>

                        <div className="sm:col-span-4">
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full py-1.5 pl-3 pr-8 text-xs rounded-md border-slate-300 focus:ring-[#14433b] focus:border-[#14433b] bg-white"
                            >
                                <option value="all">Semua Role</option>
                                {Object.entries(roles).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </form>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/75">
                                    <th className="py-2.5 px-3.5">Nama Pengguna</th>
                                    <th className="py-2.5 px-3.5">Email Login</th>
                                    <th className="py-2.5 px-3.5">Role Akses</th>
                                    <th className="py-2.5 px-3.5">Nomor HP</th>
                                    <th className="py-2.5 px-3.5 text-center">Status</th>
                                    <th className="py-2.5 px-3.5 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {users.data.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2.5 px-3.5 font-medium text-slate-900">{u.name}</td>
                                        <td className="py-2.5 px-3.5 font-mono text-slate-600">{u.email}</td>
                                        <td className="py-2.5 px-3.5">
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                {roles[u.role] || u.role}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3.5 font-mono text-slate-600">{u.phone || '-'}</td>
                                        <td className="py-2.5 px-3.5 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                                                u.is_active
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                {u.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3.5 text-right">
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                                                title="Edit Akun"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 border-t border-slate-100">
                        <Pagination links={users.links} />
                    </div>
                </div>
            </div>

            {/* Modal Tambah / Edit Pengguna */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-white rounded-lg p-5 shadow-lg border border-slate-200 space-y-4 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold text-slate-900">
                                {isEditing ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Nama Lengkap <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Email Login <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-medium text-slate-700 mb-1">
                                        Hak Akses (Role) <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={userRole}
                                        onChange={(e) => setUserRole(e.target.value as any)}
                                        className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    >
                                        {Object.entries(roles).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-medium text-slate-700 mb-1">Nomor Telepon</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    {isEditing ? 'Kata Sandi Baru (Kosongkan bila tidak diganti)' : 'Kata Sandi (Minimal 8 karakter) *'}
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Minimal 8 karakter"
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required={!isEditing}
                                />
                            </div>

                            {isEditing && (
                                <div>
                                    <label className="block font-medium text-slate-700 mb-1">Status Keaktifan</label>
                                    <select
                                        value={isActive ? '1' : '0'}
                                        onChange={(e) => setIsActive(e.target.value === '1')}
                                        className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    >
                                        <option value="1">Aktif</option>
                                        <option value="0">Nonaktif</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#14433b] rounded-md hover:bg-[#1a554a] shadow-xs disabled:opacity-50 transition-colors"
                                >
                                    {isSaving ? 'Menyimpan...' : 'Simpan Akun'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
