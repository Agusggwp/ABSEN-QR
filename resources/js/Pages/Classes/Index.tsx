import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { School, Plus, Edit2, Trash2, Users, X } from 'lucide-react';
import { SchoolClass, User } from '@/types';

interface ClassesIndexProps {
    classes: (SchoolClass & { total_students: number })[];
    teachers: { id: number; name: string }[];
    school_years: any[];
}

export default function ClassesIndex({ classes, teachers, school_years }: ClassesIndexProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editClassId, setEditClassId] = useState<number | null>(null);

    const [name, setName] = useState('');
    const [gradeLevel, setGradeLevel] = useState('10');
    const [homeroomTeacherId, setHomeroomTeacherId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const openAddModal = () => {
        setIsEditing(false);
        setEditClassId(null);
        setName('');
        setGradeLevel('10');
        setHomeroomTeacherId('');
        setModalOpen(true);
    };

    const openEditModal = (cls: any) => {
        setIsEditing(true);
        setEditClassId(cls.id);
        setName(cls.name);
        setGradeLevel(cls.grade_level);
        setHomeroomTeacherId(cls.homeroom_teacher_id ? String(cls.homeroom_teacher_id) : '');
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = {
            name,
            grade_level: gradeLevel,
            homeroom_teacher_id: homeroomTeacherId ? Number(homeroomTeacherId) : null,
        };

        if (isEditing && editClassId) {
            router.put(`/classes/${editClassId}`, payload, {
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            });
        } else {
            router.post('/classes', payload, {
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            });
        }
    };

    const handleDelete = (cls: any) => {
        if (confirm(`Hapus kelas "${cls.name}"?`)) {
            router.delete(`/classes/${cls.id}`);
        }
    };

    return (
        <AuthenticatedLayout title="Manajemen Data Kelas">
            <Head title="Data Kelas" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <School className="w-5 h-5 text-[#14433b]" />
                            <span>Rombel Kelas ({classes.length} Kelas Aktif)</span>
                        </h2>
                        <p className="text-xs text-gray-500">
                            Kelola pembagian rombel belajar siswa dan penugasan guru wali kelas
                        </p>
                    </div>

                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#14433b] text-white hover:bg-[#1b554b] shadow-sm active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4 text-[#21c9a4]" />
                        <span>Tambah Kelas</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map((cls) => (
                        <div key={cls.id} className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#14433b]/10 text-[#14433b] uppercase">
                                        Tingkat {cls.grade_level}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditModal(cls)}
                                            className="p-1 text-gray-400 hover:text-emerald-700 rounded-md"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cls)}
                                            className="p-1 text-gray-400 hover:text-rose-600 rounded-md"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-base font-bold text-gray-900">{cls.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Wali Kelas: <strong className="text-gray-700">{cls.homeroom_teacher?.name || '(Belum Ditugaskan)'}</strong>
                                </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                <span className="text-gray-500 flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                    <span>Total Siswa:</span>
                                </span>
                                <span className="font-extrabold text-[#14433b] text-sm">
                                    {cls.total_students} Siswa
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Tambah / Edit Kelas */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900">
                                {isEditing ? 'Edit Data Kelas' : 'Tambah Rombel Kelas Baru'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Nama Kelas <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Contoh: X MIPA 1, XI IPS 2"
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Tingkat</label>
                                    <select
                                        value={gradeLevel}
                                        onChange={(e) => setGradeLevel(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    >
                                        <option value="10">Kelas 10 (X)</option>
                                        <option value="11">Kelas 11 (XI)</option>
                                        <option value="12">Kelas 12 (XII)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Guru Wali Kelas</label>
                                    <select
                                        value={homeroomTeacherId}
                                        onChange={(e) => setHomeroomTeacherId(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    >
                                        <option value="">Pilih Wali Kelas</option>
                                        {teachers.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

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
                                    {isSaving ? 'Menyimpan...' : 'Simpan Kelas'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
