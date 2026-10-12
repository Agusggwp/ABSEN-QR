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

            <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <School className="w-4 h-4 text-[#14433b]" />
                            <span>Rombel Kelas ({classes.length} Kelas Aktif)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Kelola pembagian rombel belajar siswa dan penugasan guru wali kelas
                        </p>
                    </div>

                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#14433b] text-white hover:bg-[#1a554a] transition-colors shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5 text-[#21c9a4]" />
                        <span>Tambah Kelas</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {classes.map((cls) => (
                        <div key={cls.id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        Tingkat {cls.grade_level}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditModal(cls)}
                                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                                            title="Edit Kelas"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cls)}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                                            title="Hapus Kelas"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">{cls.name}</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Wali Kelas: <span className="text-slate-700 font-medium">{cls.homeroom_teacher?.name || '(Belum Ditugaskan)'}</span>
                                </p>
                            </div>

                            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Total Siswa:</span>
                                </span>
                                <span className="font-semibold text-slate-900 text-xs">
                                    {cls.total_students} Siswa
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Tambah / Edit Kelas */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-white rounded-lg p-5 shadow-lg border border-slate-200 space-y-4 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold text-slate-900">
                                {isEditing ? 'Edit Data Kelas' : 'Tambah Rombel Kelas Baru'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Nama Kelas <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Contoh: X MIPA 1, XI IPS 2"
                                    className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-medium text-slate-700 mb-1">Tingkat</label>
                                    <select
                                        value={gradeLevel}
                                        onChange={(e) => setGradeLevel(e.target.value)}
                                        className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    >
                                        <option value="10">Kelas 10 (X)</option>
                                        <option value="11">Kelas 11 (XI)</option>
                                        <option value="12">Kelas 12 (XII)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-medium text-slate-700 mb-1">Guru Wali Kelas</label>
                                    <select
                                        value={homeroomTeacherId}
                                        onChange={(e) => setHomeroomTeacherId(e.target.value)}
                                        className="w-full rounded-md border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    >
                                        <option value="">Pilih Wali Kelas</option>
                                        {teachers.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

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
