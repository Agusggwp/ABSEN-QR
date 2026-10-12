import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { GraduationCap, Plus, Edit2, X, Phone, Mail } from 'lucide-react';
import { User, SchoolClass } from '@/types';

interface TeachersIndexProps {
    teachers: (User & { homeroom_classes: SchoolClass[] })[];
    classes: SchoolClass[];
}

export default function TeachersIndex({ teachers, classes }: TeachersIndexProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTeacherId, setEditTeacherId] = useState<number | null>(null);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const openAddModal = () => {
        setIsEditing(false);
        setEditTeacherId(null);
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setIsActive(true);
        setModalOpen(true);
    };

    const openEditModal = (t: any) => {
        setIsEditing(true);
        setEditTeacherId(t.id);
        setName(t.name);
        setEmail(t.email);
        setPhone(t.phone || '');
        setPassword('');
        setIsActive(t.is_active);
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload: any = {
            name,
            email,
            phone,
            is_active: isActive,
        };

        if (password) {
            payload.password = password;
        }

        if (isEditing && editTeacherId) {
            router.put(`/teachers/${editTeacherId}`, payload, {
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            });
        } else {
            router.post('/teachers', payload, {
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            });
        }
    };

    return (
        <AuthenticatedLayout title="Manajemen Data Guru & Wali Kelas">
            <Head title="Data Guru" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-[#14433b]" />
                            <span>Dewan Guru & Wali Kelas ({teachers.length} Guru)</span>
                        </h2>
                        <p className="text-xs text-gray-500">
                            Kelola data pengajar dan hak akses verifikasi kehadiran di ruang kelas
                        </p>
                    </div>

                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#14433b] text-white hover:bg-[#1b554b] shadow-sm active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4 text-[#21c9a4]" />
                        <span>Tambah Guru Baru</span>
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/70">
                                    <th className="py-3 px-4">Nama Lengkap</th>
                                    <th className="py-3 px-4">Email Akun</th>
                                    <th className="py-3 px-4">Nomor HP / WhatsApp</th>
                                    <th className="py-3 px-4">Wali Kelas Dari</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {teachers.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-3 px-4 font-bold text-gray-900">{t.name}</td>
                                        <td className="py-3 px-4 font-mono text-gray-600">{t.email}</td>
                                        <td className="py-3 px-4 font-mono text-gray-600">{t.phone || '-'}</td>
                                        <td className="py-3 px-4 font-semibold text-[#14433b]">
                                            {t.homeroom_classes && t.homeroom_classes.length > 0
                                                ? t.homeroom_classes.map((c) => c.name).join(', ')
                                                : '(Belum ada kelas)'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                t.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {t.is_active ? 'AKTIF' : 'NONAKTIF'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => openEditModal(t)}
                                                className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title="Edit Data Guru"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Tambah / Edit Guru */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900">
                                {isEditing ? 'Edit Akun Guru' : 'Tambah Guru & Wali Kelas'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Contoh: I Made Wirata, S.Pd."
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Email Login <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="guru@artdevata.sch.id"
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Nomor Telepon / WhatsApp
                                </label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="081234567890"
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    {isEditing ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi *'}
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Minimal 6 karakter"
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required={!isEditing}
                                />
                            </div>

                            {isEditing && (
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Status Akun</label>
                                    <select
                                        value={isActive ? '1' : '0'}
                                        onChange={(e) => setIsActive(e.target.value === '1')}
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    >
                                        <option value="1">Aktif</option>
                                        <option value="0">Nonaktif</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-100"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 text-xs font-bold text-white bg-[#14433b] rounded-lg hover:bg-[#1b554b] shadow-sm disabled:opacity-50"
                                >
                                    {isSaving ? 'Menyimpan...' : 'Simpan Akun Guru'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
