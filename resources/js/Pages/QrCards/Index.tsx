import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link, router } from '@inertiajs/react';
import {
    CreditCard,
    Printer,
    RefreshCw,
    ShieldOff,
    Search,
    Filter,
    X,
    FileDown,
    AlertCircle,
} from 'lucide-react';
import { SchoolClass } from '@/types';

interface QrCardItem {
    id: number;
    student_id: number;
    card_number: string;
    raw_token_masked?: string | null;
    status: 'active' | 'revoked' | 'replaced';
    issued_at: string;
    student: {
        id: number;
        nis: string;
        name: string;
        school_class?: { name: string } | null;
    };
}

interface QrCardsIndexProps {
    cards: {
        data: QrCardItem[];
        links: any[];
        total: number;
    };
    classes: SchoolClass[];
    filters: {
        search?: string;
        class_id?: string;
        status?: string;
    };
}

export default function QrCardsIndex({ cards, classes, filters }: QrCardsIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [classId, setClassId] = useState(filters.class_id || '');
    const [status, setStatus] = useState(filters.status || 'active');
    const isFirstRender = useRef(true);

    // Live debounced filter without loading bar
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                '/qr-cards',
                { search, class_id: classId, status },
                { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, classId, status]);

    // Revoke Modal state
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState<QrCardItem | null>(null);
    const [revokeReason, setRevokeReason] = useState('Kartu hilang / rusak fisik');

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/qr-cards',
            { search, class_id: classId, status },
            { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
        );
    };

    const handleRegenerate = (studentId: number, studentName: string) => {
        if (confirm(`Terbitkan kartu QR baru untuk siswa "${studentName}"? Kartu aktif sebelumnya akan otomatis dinonaktifkan.`)) {
            router.post(`/qr-cards/${studentId}/regenerate`);
        }
    };

    const openRevokeModal = (card: QrCardItem) => {
        setSelectedCard(card);
        setRevokeReason('Kartu hilang / rusak fisik');
        setRevokeModalOpen(true);
    };

    const handleRevokeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCard) return;

        router.post(`/qr-cards/${selectedCard.id}/revoke`, { reason: revokeReason }, {
            onSuccess: () => setRevokeModalOpen(false),
        });
    };

    return (
        <AuthenticatedLayout title="Manajemen Kartu QR Siswa">
            <Head title="Kartu QR Siswa" />

            <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">
                            Kartu QR & Identitas Siswa ({cards.total} Kartu)
                        </h2>
                        <p className="text-xs text-gray-500">
                            Penerbitan kartu, token SHA-256 terenkripsi, pencabutan kartu hilang, dan pencetakan PDF
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href={`/qr-cards/print-bulk${classId ? `?class_id=${classId}` : ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#14433b] text-white hover:bg-[#1b554b] shadow-sm active:scale-95 transition-all"
                        >
                            <Printer className="w-4 h-4 text-[#21c9a4]" />
                            <span>Cetak Massal PDF</span>
                        </a>
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
                                placeholder="Cari nomor kartu, nama siswa, atau NIS..."
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <select
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                className="w-full py-2 pl-3 pr-8 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4] bg-white"
                            >
                                <option value="">Semua Kelas</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full py-2 pl-3 pr-8 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4] bg-white"
                            >
                                <option value="active">Kartu Aktif</option>
                                <option value="revoked">Dicabut</option>
                                <option value="replaced">Diganti Baru</option>
                                <option value="all">Semua Status</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <button
                                type="submit"
                                className="w-full py-2 px-4 rounded-lg bg-[#14433b] text-white font-bold hover:bg-[#1b554b] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <Filter className="w-3.5 h-3.5 text-[#21c9a4]" />
                                <span>Filter</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* QR Cards Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/70">
                                    <th className="py-3 px-4">Nomor Kartu</th>
                                    <th className="py-3 px-4">Nama Siswa</th>
                                    <th className="py-3 px-4">NIS</th>
                                    <th className="py-3 px-4">Kelas</th>
                                    <th className="py-3 px-4">Token Masking</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cards.data.length > 0 ? (
                                    cards.data.map((card) => (
                                        <tr key={card.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-gray-800">
                                                {card.card_number}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-gray-900">
                                                {card.student?.name}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-gray-600">
                                                {card.student?.nis}
                                            </td>
                                            <td className="py-3 px-4 text-gray-700 font-semibold">
                                                {card.student?.school_class?.name ?? '-'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-gray-400 text-[11px]">
                                                {card.raw_token_masked || 'ARTDEVATA-***'}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <StatusBadge status={card.status} size="sm" />
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Print Single PDF Card */}
                                                    <a
                                                        href={`/qr-cards/${card.student_id}/print`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Cetak Kartu PDF"
                                                    >
                                                        <FileDown className="w-3.5 h-3.5" />
                                                    </a>

                                                    {/* Regenerate New Card */}
                                                    <button
                                                        onClick={() => handleRegenerate(card.student_id, card.student?.name)}
                                                        className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Ganti / Terbitkan Kartu Baru"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                    </button>

                                                    {/* Revoke Card */}
                                                    {card.status === 'active' && (
                                                        <button
                                                            onClick={() => openRevokeModal(card)}
                                                            className="p-1.5 text-gray-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Cabut Kartu (Hilang/Rusak)"
                                                        >
                                                            <ShieldOff className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400">
                                            Tidak ada data kartu QR yang ditemukan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 border-t border-gray-100">
                        <Pagination links={cards.links} />
                    </div>
                </div>
            </div>

            {/* Revoke Card Modal */}
            {revokeModalOpen && selectedCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 text-rose-600 border-b border-gray-100 pb-3">
                            <ShieldOff className="w-6 h-6" />
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Cabut Kartu QR Siswa</h3>
                                <p className="text-xs text-gray-500">{selectedCard.card_number} - {selectedCard.student?.name}</p>
                            </div>
                        </div>

                        <form onSubmit={handleRevokeSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Alasan Pencabutan Kartu:
                                </label>
                                <select
                                    value={revokeReason}
                                    onChange={(e) => setRevokeReason(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:ring-rose-500 focus:border-rose-500"
                                >
                                    <option value="Kartu hilang / tercecer">Kartu hilang / tercecer</option>
                                    <option value="Kartu rusak fisik tidak terbaca">Kartu rusak fisik tidak terbaca</option>
                                    <option value="Kecurigaan penyalahgunaan / duplikasi ilegal">Kecurigaan penyalahgunaan / duplikasi ilegal</option>
                                    <option value="Siswa mutasi / keluar sekolah">Siswa mutasi / keluar sekolah</option>
                                </select>
                            </div>

                            <p className="text-[11px] text-gray-500">
                                *Setelah dicabut, kartu ini akan langsung <strong>ditolak</strong> oleh seluruh scanner gerbang sekolah. Riwayat absensi sebelumnya tetap tersimpan aman.
                            </p>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setRevokeModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-100"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-sm"
                                >
                                    Cabut Kartu Sekarang
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
