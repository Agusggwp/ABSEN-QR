import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link, router } from '@inertiajs/react';
import {
    Users,
    UserPlus,
    FileSpreadsheet,
    CreditCard,
    Search,
    Edit2,
    Trash2,
    X,
    Filter,
} from 'lucide-react';
import { Student, SchoolClass } from '@/types';

interface StudentsIndexProps {
    students: {
        data: Student[];
        links: any[];
        total: number;
        from: number;
        to: number;
    };
    classes: SchoolClass[];
    filters: {
        search?: string;
        class_id?: string;
        status?: string;
        per_page?: number;
    };
}

export default function StudentsIndex({
    students,
    classes,
    filters,
}: StudentsIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [classId, setClassId] = useState(filters.class_id || '');
    const [status, setStatus] = useState(filters.status || 'active');

    // Add / Edit Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editStudentId, setEditStudentId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        nis: '',
        nisn: '',
        name: '',
        gender: 'L' as 'L' | 'P',
        class_id: classes[0]?.id || '',
        is_active: true,
        notes: '',
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Apply filters
    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/students',
            { search, class_id: classId, status },
            { preserveState: true, replace: true }
        );
    };

    const openAddModal = () => {
        setIsEditing(false);
        setEditStudentId(null);
        setFormData({
            nis: '',
            nisn: '',
            name: '',
            gender: 'L',
            class_id: classes[0]?.id || '',
            is_active: true,
            notes: '',
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const openEditModal = (student: Student) => {
        setIsEditing(true);
        setEditStudentId(student.id);
        setFormData({
            nis: student.nis,
            nisn: student.nisn || '',
            name: student.name,
            gender: student.gender,
            class_id: student.class_id || classes[0]?.id || '',
            is_active: student.is_active,
            notes: student.notes || '',
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setFormErrors({});

        if (isEditing && editStudentId) {
            router.put(`/students/${editStudentId}`, formData, {
                onSuccess: () => setModalOpen(false),
                onError: (err) => setFormErrors(err),
                onFinish: () => setIsSaving(false),
            });
        } else {
            router.post('/students', formData, {
                onSuccess: () => setModalOpen(false),
                onError: (err) => setFormErrors(err),
                onFinish: () => setIsSaving(false),
            });
        }
    };

    const handleDelete = (student: Student) => {
        if (confirm(`Apakah Anda yakin ingin mengarsipkan siswa "${student.name}" (NIS: ${student.nis})?`)) {
            router.delete(`/students/${student.id}`);
        }
    };

    return (
        <AuthenticatedLayout title="Manajemen Data Siswa">
            <Head title="Data Siswa" />

            <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">
                            Daftar Siswa Sekolah ({students.total} Terdaftar)
                        </h2>
                        <p className="text-xs text-gray-500">
                            Kelola data siswa, penempatan rombel kelas, dan integrasi token QR unik
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/students/import"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>Impor Excel</span>
                        </Link>

                        <Link
                            href="/qr-cards"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                            <CreditCard className="w-4 h-4 text-[#14433b]" />
                            <span>Cetak Kartu QR</span>
                        </Link>

                        <button
                            onClick={openAddModal}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#14433b] text-white hover:bg-[#1b554b] transition-all shadow-sm active:scale-95"
                        >
                            <UserPlus className="w-4 h-4 text-[#21c9a4]" />
                            <span>Tambah Siswa</span>
                        </button>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        <div className="sm:col-span-5 relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama siswa, NIS, atau NISN..."
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <select
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            >
                                <option value="">Semua Kelas</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            >
                                <option value="active">Status Aktif</option>
                                <option value="inactive">Nonaktif</option>
                                <option value="all">Semua Status</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <button
                                type="submit"
                                className="w-full py-2 px-4 rounded-lg bg-[#14433b] text-white font-bold hover:bg-[#1b554b] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <Filter className="w-3.5 h-3.5 text-[#21c9a4]" />
                                <span>Terapkan</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Students Data Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/70">
                                    <th className="py-3 px-4">NIS / NISN</th>
                                    <th className="py-3 px-4">Nama Lengkap</th>
                                    <th className="py-3 px-4 text-center">L/P</th>
                                    <th className="py-3 px-4">Kelas</th>
                                    <th className="py-3 px-4 text-center">Status Siswa</th>
                                    <th className="py-3 px-4 text-center">Kartu QR</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.data.length > 0 ? (
                                    students.data.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3 px-4 font-mono font-medium text-gray-700">
                                                <div>{student.nis}</div>
                                                {student.nisn && (
                                                    <div className="text-[10px] text-gray-400">NISN: {student.nisn}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-gray-900">{student.name}</div>
                                            </td>
                                            <td className="py-3 px-4 text-center font-semibold text-gray-600">
                                                {student.gender}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-[#14433b]">
                                                    {student.school_class?.name ?? 'Belum ada kelas'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        student.is_active
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-gray-200 text-gray-700'
                                                    }`}
                                                >
                                                    {student.is_active ? 'AKTIF' : 'NONAKTIF'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center font-mono">
                                                {student.active_qr_code ? (
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        {student.active_qr_code.card_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openEditModal(student)}
                                                        className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Edit Data Siswa"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(student)}
                                                        className="p-1.5 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Arsipkan Siswa"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400">
                                            Tidak ada data siswa yang cocok dengan kriteria pencarian.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 border-t border-gray-100">
                        <Pagination links={students.links} />
                    </div>
                </div>
            </div>

            {/* Modal Tambah / Edit Siswa */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900">
                                {isEditing ? 'Perbarui Data Siswa' : 'Tambah Siswa Baru'}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        NIS <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nis}
                                        onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                                        placeholder="Nomor Induk Siswa"
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                        required
                                    />
                                    {formErrors.nis && <p className="text-rose-600 text-[10px] mt-0.5">{formErrors.nis}</p>}
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        NISN (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nisn}
                                        onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                                        placeholder="Nomor Induk Siswa Nasional"
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    />
                                    {formErrors.nisn && <p className="text-rose-600 text-[10px] mt-0.5">{formErrors.nisn}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Nama Lengkap Siswa <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Nama lengkap sesuai ijazah"
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
                                {formErrors.name && <p className="text-rose-600 text-[10px] mt-0.5">{formErrors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Jenis Kelamin <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    >
                                        <option value="L">Laki-Laki (L)</option>
                                        <option value="P">Perempuan (P)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Rombel Kelas <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={formData.class_id}
                                        onChange={(e) => setFormData({ ...formData, class_id: Number(e.target.value) })}
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    >
                                        {classes.map((cls) => (
                                            <option key={cls.id} value={cls.id}>
                                                {cls.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {isEditing && (
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Status Keaktifan
                                    </label>
                                    <select
                                        value={formData.is_active ? '1' : '0'}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' })}
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    >
                                        <option value="1">Aktif</option>
                                        <option value="0">Nonaktif / Keluar</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Catatan Tambahan
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={2}
                                    placeholder="Keterangan khusus (opsional)"
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
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
                                    {isSaving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Siswa & QR'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
