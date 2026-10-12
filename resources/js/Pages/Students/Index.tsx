import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import Modal from '@/Components/Modal';
import { Head, Link, router } from '@inertiajs/react';
import {
    Users,
    UserPlus,
    FileSpreadsheet,
    CreditCard,
    Search,
    Edit2,
    Trash2,
    Filter,
    X,
    Camera,
    Upload,
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
    const isFirstRender = useRef(true);

    // Debounced live filter without progress bar/loading
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                '/students',
                { search, class_id: classId, status },
                { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, classId, status]);

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

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Apply filters
    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/students',
            { search, class_id: classId, status },
            { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
        );
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran file foto maksimal 2MB.');
            return;
        }

        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        setRemovePhoto(false);
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview(null);
        setRemovePhoto(true);
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
        setPhotoFile(null);
        setPhotoPreview(null);
        setRemovePhoto(false);
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
        setPhotoFile(null);
        setPhotoPreview(
            student.photo_path
                ? student.photo_path.startsWith('/') || student.photo_path.startsWith('http')
                    ? student.photo_path
                    : `/storage/${student.photo_path}`
                : null
        );
        setRemovePhoto(false);
        setFormErrors({});
        setModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setFormErrors({});

        const dataToSend: Record<string, any> = {
            ...formData,
            is_active: formData.is_active ? 1 : 0,
        };

        if (photoFile) {
            dataToSend.photo = photoFile;
        }

        if (removePhoto) {
            dataToSend.remove_photo = 1;
        }

        if (isEditing && editStudentId) {
            dataToSend._method = 'put';
            router.post(`/students/${editStudentId}`, dataToSend, {
                forceFormData: true,
                preserveScroll: true,
                onError: (errors) => setFormErrors(errors),
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            });
        } else {
            router.post('/students', dataToSend, {
                forceFormData: true,
                preserveScroll: true,
                onError: (errors) => setFormErrors(errors),
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            });
        }
    };

    const handleDelete = (student: Student) => {
        if (
            confirm(
                `Apakah Anda yakin ingin mengarsipkan data siswa "${student.name}" (NIS: ${student.nis})?`
            )
        ) {
            router.delete(`/students/${student.id}`);
        }
    };

    return (
        <AuthenticatedLayout title="Data Siswa">
            <Head title="Data Siswa" />

            <div className="space-y-4 text-slate-800">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                            Manajemen Data Siswa ({students.total} Siswa)
                        </h1>
                        <p className="text-xs text-slate-500">
                            Kelola data pokok siswa, penempatan rombel kelas, dan kartu QR presensi
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/students/import"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                            <span>Impor Excel</span>
                        </Link>

                        <Link
                            href="/qr-cards"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                        >
                            <CreditCard className="w-4 h-4 text-slate-600" />
                            <span>Cetak Kartu QR</span>
                        </Link>

                        <button
                            onClick={openAddModal}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#14433b] text-white hover:bg-[#1a5349] transition-colors shadow-xs"
                        >
                            <UserPlus className="w-4 h-4 text-[#21c9a4]" />
                            <span>Tambah Siswa</span>
                        </button>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                        <div className="sm:col-span-5 relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama siswa, NIS, atau NISN..."
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border-slate-300 focus:ring-[#14433b] focus:border-[#14433b]"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <select
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                className="w-full py-2 pl-3 pr-8 text-xs rounded-lg border-slate-300 focus:ring-[#14433b] focus:border-[#14433b] bg-white"
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
                                className="w-full py-2 pl-3 pr-8 text-xs rounded-lg border-slate-300 focus:ring-[#14433b] focus:border-[#14433b] bg-white"
                            >
                                <option value="active">Status Aktif</option>
                                <option value="inactive">Nonaktif</option>
                                <option value="all">Semua Status</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <button
                                type="submit"
                                className="w-full py-2 px-3 rounded-lg bg-[#14433b] text-white font-medium hover:bg-[#1a5349] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                            >
                                <Filter className="w-3.5 h-3.5 text-[#21c9a4]" />
                                <span>Terapkan</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Students Data Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60 text-[11px]">
                                    <th className="py-2.5 px-3">NIS / NISN</th>
                                    <th className="py-2.5 px-3">Nama Lengkap</th>
                                    <th className="py-2.5 px-3 text-center">L/P</th>
                                    <th className="py-2.5 px-3">Kelas</th>
                                    <th className="py-2.5 px-3 text-center">Status Siswa</th>
                                    <th className="py-2.5 px-3 text-center">Kartu QR</th>
                                    <th className="py-2.5 px-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {students.data.length > 0 ? (
                                    students.data.map((student) => (
                                        <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-2.5 px-3 font-mono text-slate-700">
                                                <div className="font-semibold text-slate-900">{student.nis}</div>
                                                {student.nisn && (
                                                    <div className="text-[10px] text-slate-400">NISN: {student.nisn}</div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 font-medium text-slate-900">
                                                <div className="flex items-center gap-2.5">
                                                    {student.photo_path ? (
                                                        <img
                                                            src={
                                                                student.photo_path.startsWith('/') ||
                                                                student.photo_path.startsWith('http')
                                                                    ? student.photo_path
                                                                    : `/storage/${student.photo_path}`
                                                            }
                                                            alt={student.name}
                                                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center justify-center text-xs shrink-0">
                                                            {student.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span>{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-slate-600">
                                                {student.gender}
                                            </td>
                                            <td className="py-2.5 px-3 font-medium text-slate-800">
                                                {student.school_class?.name ?? 'Belum ada kelas'}
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <StatusBadge
                                                    status={student.is_active ? 'active' : 'inactive'}
                                                    size="sm"
                                                />
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-mono">
                                                {student.active_qr_code ? (
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono text-slate-700 bg-slate-50 border border-slate-200">
                                                        {student.active_qr_code.card_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-[10px]">-</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openEditModal(student)}
                                                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                                        title="Edit Data Siswa"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(student)}
                                                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
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
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            Tidak ada data siswa yang cocok dengan kriteria pencarian.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>
                            Menampilkan {students.from || 0} - {students.to || 0} dari {students.total} siswa
                        </span>
                        <Pagination links={students.links} />
                    </div>
                </div>
            </div>

            {/* Modal Tambah / Edit Siswa */}
            <Modal show={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <h3 className="text-sm font-bold text-slate-900">
                            {isEditing ? 'Perbarui Data Siswa' : 'Tambah Siswa Baru'}
                        </h3>
                        <button
                            onClick={() => setModalOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                        {/* Foto Profil Siswa (Pasfoto 3x4) */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                            <div className="w-20 h-28 rounded-lg border border-slate-300 overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-2xs relative">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Foto Siswa"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-slate-400 text-center p-1">
                                        <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                        <span className="text-[10px] block font-semibold leading-tight">Foto 3x4</span>
                                        <span className="text-[9px] text-slate-300">Belum ada</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-1.5">
                                <div className="text-xs font-bold text-slate-800">
                                    Foto Profil Siswa (3x4)
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Akan muncul di layar verifikasi Terminal Scanner dan Kartu QR Siswa.
                                </p>

                                <div className="flex items-center gap-2 pt-1">
                                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 text-xs font-semibold cursor-pointer shadow-2xs transition-colors">
                                        <Upload className="w-3.5 h-3.5 text-[#14433b]" />
                                        <span>{photoPreview ? 'Ganti Foto' : 'Pilih Foto'}</span>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/jpg,image/webp"
                                            onChange={handlePhotoChange}
                                            className="hidden"
                                        />
                                    </label>

                                    {photoPreview && (
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                                        >
                                            Hapus Foto
                                        </button>
                                    )}
                                </div>
                                {formErrors.photo && (
                                    <p className="text-rose-600 text-[10px] mt-1">{formErrors.photo}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    NIS <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.nis}
                                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                                    placeholder="Nomor Induk Siswa"
                                    className="w-full rounded-lg border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                    required
                                />
                                {formErrors.nis && (
                                    <p className="text-rose-600 text-[10px] mt-0.5">{formErrors.nis}</p>
                                )}
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    NISN (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.nisn}
                                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                                    placeholder="NISN Siswa"
                                    className="w-full rounded-lg border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                />
                                {formErrors.nisn && (
                                    <p className="text-rose-600 text-[10px] mt-0.5">{formErrors.nisn}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block font-medium text-slate-700 mb-1">
                                Nama Lengkap <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nama lengkap siswa"
                                className="w-full rounded-lg border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                required
                            />
                            {formErrors.name && (
                                <p className="text-rose-600 text-[10px] mt-0.5">{formErrors.name}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Jenis Kelamin <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) =>
                                        setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })
                                    }
                                    className="w-full rounded-lg border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                >
                                    <option value="L">Laki-Laki (L)</option>
                                    <option value="P">Perempuan (P)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-1">
                                    Rombel Kelas <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={formData.class_id}
                                    onChange={(e) =>
                                        setFormData({ ...formData, class_id: Number(e.target.value) })
                                    }
                                    className="w-full rounded-lg border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
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
                                <label className="block font-medium text-slate-700 mb-1">
                                    Status Keaktifan
                                </label>
                                <select
                                    value={formData.is_active ? '1' : '0'}
                                    onChange={(e) =>
                                        setFormData({ ...formData, is_active: e.target.value === '1' })
                                    }
                                    className="w-full rounded-lg border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                                >
                                    <option value="1">Aktif</option>
                                    <option value="0">Nonaktif / Keluar</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block font-medium text-slate-700 mb-1">
                                Catatan Tambahan (Opsional)
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={2}
                                placeholder="Keterangan khusus siswa"
                                className="w-full rounded-lg border-slate-300 text-xs focus:ring-[#14433b] focus:border-[#14433b]"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="px-3.5 py-2 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-4 py-2 text-xs font-semibold text-white bg-[#14433b] hover:bg-[#1a5349] rounded-lg shadow-xs disabled:opacity-50 transition-colors"
                            >
                                {isSaving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Siswa & QR'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
