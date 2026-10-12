import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import { Head, router } from '@inertiajs/react';
import { ScrollText, Search, Filter, ShieldCheck, Eye, X } from 'lucide-react';
import { AuditLogItem, User } from '@/types';

interface AuditLogsIndexProps {
    logs: {
        data: AuditLogItem[];
        links: any[];
        total: number;
    };
    users: User[];
    filters: {
        action?: string;
        user_id?: string;
        date?: string;
    };
}

export default function AuditLogsIndex({ logs, users, filters }: AuditLogsIndexProps) {
    const [action, setAction] = useState(filters.action || '');
    const [userId, setUserId] = useState(filters.user_id || '');
    const [date, setDate] = useState(filters.date || '');
    const isFirstRender = useRef(true);

    // Live filter without progress bar
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                '/audit-logs',
                { action, user_id: userId, date },
                { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [action, userId, date]);

    // Payload viewer modal
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/audit-logs',
            { action, user_id: userId, date },
            { preserveState: true, preserveScroll: true, replace: true, showProgress: false }
        );
    };

    const openDetailModal = (log: AuditLogItem) => {
        setSelectedLog(log);
        setDetailModalOpen(true);
    };

    return (
        <AuthenticatedLayout title="Audit Log Keamanan (Immutable)">
            <Head title="Audit Log Sistem" />

            <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <ScrollText className="w-4 h-4 text-[#14433b]" />
                            <span>Audit Log Sistem & Jejak Aktivitas ({logs.total} Rekaman)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Catatan audit kekal (hanya-baca) yang merekam setiap peristiwa sensitif, perubahan data, dan IP address
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Proteksi Immutable Aktif</span>
                        </span>
                    </div>
                </div>

                {/* Filter */}
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                        <div className="sm:col-span-4 relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={action}
                                onChange={(e) => setAction(e.target.value)}
                                placeholder="Cari nama aksi (e.g. attendance, student)..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border-slate-300 focus:ring-[#14433b] focus:border-[#14433b]"
                            />
                        </div>

                        <div className="sm:col-span-4">
                            <select
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className="w-full py-1.5 pl-3 pr-8 text-xs rounded-md border-slate-300 focus:ring-[#14433b] focus:border-[#14433b] bg-white"
                            >
                                <option value="">Semua Pelaku / User</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-3">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full py-1.5 px-3 text-xs rounded-md border-slate-300 focus:ring-[#14433b] focus:border-[#14433b]"
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <button
                                type="submit"
                                aria-label="Terapkan Filter"
                                className="w-full py-1.5 px-3 rounded-md bg-[#14433b] text-white hover:bg-[#1a554a] transition-colors flex items-center justify-center shadow-xs"
                            >
                                <Filter className="w-3.5 h-3.5 text-[#21c9a4]" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Logs Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/75">
                                    <th className="py-2.5 px-3.5">Waktu Server</th>
                                    <th className="py-2.5 px-3.5">Aksi / Event</th>
                                    <th className="py-2.5 px-3.5">Pelaku (User)</th>
                                    <th className="py-2.5 px-3.5">Entitas Terkait</th>
                                    <th className="py-2.5 px-3.5 font-mono">IP Address</th>
                                    <th className="py-2.5 px-3.5 text-right">Detail Payload</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {logs.data.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2.5 px-3.5 font-mono text-slate-600">
                                            {new Date(log.created_at).toLocaleString('id-ID')}
                                        </td>
                                        <td className="py-2.5 px-3.5 font-mono font-medium text-slate-900">
                                            {log.action}
                                        </td>
                                        <td className="py-2.5 px-3.5 font-medium text-slate-800">
                                            {log.user?.name || 'Sistem Otomatis'}
                                        </td>
                                        <td className="py-2.5 px-3.5 text-slate-600">
                                            {log.entity_type ? `${log.entity_type} #${log.entity_id || '-'}` : '-'}
                                        </td>
                                        <td className="py-2.5 px-3.5 font-mono text-slate-500">
                                            {log.ip_address || '-'}
                                        </td>
                                        <td className="py-2.5 px-3.5 text-right">
                                            <button
                                                onClick={() => openDetailModal(log)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors text-[11px]"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Lihat JSON</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 border-t border-slate-100">
                        <Pagination links={logs.links} />
                    </div>
                </div>
            </div>

            {/* Detail Payload Modal */}
            {detailModalOpen && selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="w-full max-w-2xl bg-white rounded-lg p-5 shadow-lg border border-slate-200 space-y-4 animate-in fade-in max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Detail Audit Payload: {selectedLog.action}</h3>
                                <p className="text-xs text-slate-500">Log ID #{selectedLog.id} · {selectedLog.created_at}</p>
                            </div>
                            <button onClick={() => setDetailModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 text-xs">
                            {selectedLog.payload_before && (
                                <div>
                                    <span className="font-semibold text-slate-700 block mb-1">Payload Sebelum (Before):</span>
                                    <pre className="p-3 rounded-md bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                                        {selectedLog.payload_before}
                                    </pre>
                                </div>
                            )}

                            <div>
                                <span className="font-semibold text-slate-700 block mb-1">Payload Sesudah (After / Event Data):</span>
                                <pre className="p-3 rounded-md bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                                    {selectedLog.payload_after || '(Kosong)'}
                                </pre>
                            </div>

                            <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 text-slate-600 text-[11px] space-y-1">
                                <div><strong>Pelaku:</strong> {selectedLog.user?.name} ({selectedLog.user?.email})</div>
                                <div><strong>User Agent:</strong> {selectedLog.user_agent || '-'}</div>
                                <div><strong>IP Address:</strong> {selectedLog.ip_address || '-'}</div>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 text-right">
                            <button
                                onClick={() => setDetailModalOpen(false)}
                                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
