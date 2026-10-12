import React, { useState } from 'react';
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

    // Payload viewer modal
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/audit-logs', { action, user_id: userId, date }, { preserveState: true, replace: true });
    };

    const openDetailModal = (log: AuditLogItem) => {
        setSelectedLog(log);
        setDetailModalOpen(true);
    };

    return (
        <AuthenticatedLayout title="Audit Log Keamanan (Immutable)">
            <Head title="Audit Log Sistem" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <ScrollText className="w-5 h-5 text-[#14433b]" />
                            <span>Audit Log Sistem & Jejak Aktivitas ({logs.total} Rekaman)</span>
                        </h2>
                        <p className="text-xs text-gray-500">
                            Catatan audit kekal (hanya-baca) yang merekam setiap peristiwa sensitif, perubahan data, dan IP address
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>PROTEKSI IMMUTABLE AKTIF</span>
                        </span>
                    </div>
                </div>

                {/* Filter */}
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        <div className="sm:col-span-4 relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                value={action}
                                onChange={(e) => setAction(e.target.value)}
                                placeholder="Cari nama aksi (e.g. attendance, student)..."
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            />
                        </div>

                        <div className="sm:col-span-4">
                            <select
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
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
                                className="w-full py-2 px-3 text-xs rounded-lg border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                            />
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

                {/* Logs Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/70">
                                    <th className="py-3 px-4">Waktu Server</th>
                                    <th className="py-3 px-4">Aksi / Event</th>
                                    <th className="py-3 px-4">Pelaku (User)</th>
                                    <th className="py-3 px-4">Entitas Terkait</th>
                                    <th className="py-3 px-4 font-mono">IP Address</th>
                                    <th className="py-3 px-4 text-right">Detail Payload</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.data.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-3 px-4 font-mono text-gray-600">
                                            {new Date(log.created_at).toLocaleString('id-ID')}
                                        </td>
                                        <td className="py-3 px-4 font-mono font-bold text-[#14433b]">
                                            {log.action}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-gray-900">
                                            {log.user?.name || 'Sistem Otomatis'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {log.entity_type ? `${log.entity_type} #${log.entity_id || '-'}` : '-'}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-gray-500">
                                            {log.ip_address || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => openDetailModal(log)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold transition-colors text-[11px]"
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

                    <div className="px-4 border-t border-gray-100">
                        <Pagination links={logs.links} />
                    </div>
                </div>
            </div>

            {/* Detail Payload Modal */}
            {detailModalOpen && selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Detail Audit Payload: {selectedLog.action}</h3>
                                <p className="text-xs text-gray-500">Log ID #{selectedLog.id} &bull; {selectedLog.created_at}</p>
                            </div>
                            <button onClick={() => setDetailModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 text-xs">
                            {selectedLog.payload_before && (
                                <div>
                                    <span className="font-bold text-gray-700 block mb-1">Payload Sebelum (Before):</span>
                                    <pre className="p-3 rounded-lg bg-gray-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                                        {selectedLog.payload_before}
                                    </pre>
                                </div>
                            )}

                            <div>
                                <span className="font-bold text-gray-700 block mb-1">Payload Sesudah (After / Event Data):</span>
                                <pre className="p-3 rounded-lg bg-gray-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                                    {selectedLog.payload_after || '(Kosong)'}
                                </pre>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-lg text-gray-600 text-[11px] space-y-1">
                                <div><strong>Pelaku:</strong> {selectedLog.user?.name} ({selectedLog.user?.email})</div>
                                <div><strong>User Agent:</strong> {selectedLog.user_agent || '-'}</div>
                                <div><strong>IP Address:</strong> {selectedLog.ip_address || '-'}</div>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 text-right">
                            <button
                                onClick={() => setDetailModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
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
