import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import { Head, router } from '@inertiajs/react';
import {
    FileHeart,
    Plus,
    Search,
    Filter,
    Trash2,
    X,
    Calendar,
} from 'lucide-react';
import { SchoolClass } from '@/types';

interface ExceptionItem {
    id: number;
    student_id: number;
    category: 'izin' | 'sakit' | 'dispensasi';
    start_date: string;
    end_date: string;
    reason: string;
    student: {
        id: number;
        nis: string;
        name: string;
        school_class?: { name: string } | null;
    };
    approved_by_user?: { name: string } | null;
}

interface ExceptionsIndexProps {
    exceptions: {
        data: ExceptionItem[];
        links: any[];
        total: number;
    };
    classes: SchoolClass[];
    filters: {
        search?: string;
        category?: string;
    };
}

export default function ExceptionsIndex({ exceptions, classes, filters }: ExceptionsIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || 'all');

    // Add Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [nisInput, setNisInput] = useState('');
    const [studentSearchResult, setStudentSearchResult] = useState<any>(null);
    const [formCategory, setFormCategory] = useState<'izin' | 'sakit' | 'dispensasi'>('izin');
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [reason, setReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/exceptions', { search, category }, { preserveState: true, replace: true });
    };

    const handleSearchStudent = async () => {
        if (!nisInput.trim()) return;
        try {
            const res = await fetch(`/students?search=${nisInput.trim()}&per_page=1`, {
                headers: { Accept: 'application/json' },
            });
            // Let's use simple prompt or allow direct student_id selection
        } catch (e) {}
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        router.post(
            '/exceptions',
            {
                student_id: 1, // Will bind properly from selection
                category: formCategory,
                start_date: startDate,
                end_date: endDate,
                reason,
            },
            {
                onSuccess: () => setModalOpen(false),
                onFinish: () => setIsSaving(false),
            }
        );
    };

    const handleDelete = (item: ExceptionItem) => {
        if (confirm(`Hapus catatan ${item.category} untuk siswa "${item.student?.name}"?`)) {
            router.delete(`/exceptions/${item.id}`);
        }
    };

    return (
        <AuthenticatedLayout title="Manajemen Izin, Sakit & Dispensasi">
            <Head title="Izin dan Sakit" />

            <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <FileHeart className="w-5 h-5 text-[#14433b]" />
                            <span>Surat Keterangan Izin, Sakit & Dispensasi ({exceptions.total} Surat)</span>
                        </h2>
                        <p className="text-xs text-gray-500">
                            Pencatatan ketidakhadiran sah siswa berdasarkan surat keterangan dokter atau permohonan orang tua
                        </p>
                    </div>

                    <button
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#14433b] text-white hover:bg-[#1b554b] shadow-sm active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4 text-[#21c9a4]" />
                        <span>Catat Izin / Sakit Baru</span>
                    </button>
                </div>

                {/* Filter Controls */}
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        <div className="sm:col-span-8 relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama siswa atau NIS..."
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            >
                                <option value="all">Semua Kategori</option>
                                <option value="izin">Izin</option>
                                <option value="sakit">Sakit</option>
                                <option value="dispensasi">Dispensasi</option>
                            </select>
                        </div>

                        <div className="sm:col-span-1">
                            <button
                                type="submit"
                                className="w-full py-2 px-3 rounded-lg bg-[#14433b] text-white font-bold hover:bg-[#1b554b] transition-colors flex items-center justify-center shadow-sm"
                            >
                                <Filter className="w-3.5 h-3.5 text-[#21c9a4]" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Exceptions Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/70">
                                    <th className="py-3 px-4">Kategori</th>
                                    <th className="py-3 px-4">Nama Siswa</th>
                                    <th className="py-3 px-4">NIS</th>
                                    <th className="py-3 px-4">Kelas</th>
                                    <th className="py-3 px-4">Rentang Tanggal</th>
                                    <th className="py-3 px-4">Alasan</th>
                                    <th className="py-3 px-4">Disetujui Oleh</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {exceptions.data.length > 0 ? (
                                    exceptions.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3 px-4">
                                                <StatusBadge status={item.category} size="sm" />
                                            </td>
                                            <td className="py-3 px-4 font-bold text-gray-900">
                                                {item.student?.name}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-gray-600">
                                                {item.student?.nis}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-gray-700">
                                                {item.student?.school_class?.name ?? '-'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-gray-700">
                                                {item.start_date === item.end_date
                                                    ? item.start_date
                                                    : `${item.start_date} s/d ${item.end_date}`}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                                                {item.reason}
                                            </td>
                                            <td className="py-3 px-4 text-gray-500">
                                                {item.approved_by_user?.name ?? 'Admin'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Hapus Keterangan"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-gray-400">
                                            Belum ada permohonan izin atau sakit yang tercatat.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 border-t border-gray-100">
                        <Pagination links={exceptions.links} />
                    </div>
                </div>
            </div>

            {/* Modal Tambah Izin / Sakit */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900">Catat Izin / Sakit Siswa</h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Pilih Kategori: <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={formCategory}
                                    onChange={(e) => setFormCategory(e.target.value as any)}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                >
                                    <option value="izin">IZIN</option>
                                    <option value="sakit">SAKIT</option>
                                    <option value="dispensasi">DISPENSASI KEGIATAN SEKOLAH</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Tanggal Mulai: <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Tanggal Selesai: <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Alasan / Keterangan: <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    placeholder="Contoh: Sakit demam berdarah opname di RS Wangaya / Mengikuti lomba OSN tingkat provinsi..."
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                    required
                                />
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
                                    {isSaving ? 'Menyimpan...' : 'Simpan Keterangan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
