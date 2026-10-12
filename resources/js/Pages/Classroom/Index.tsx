import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    CheckSquare,
    AlertTriangle,
    Save,
    CheckCircle2,
    XCircle,
    Clock,
    School,
    ShieldAlert,
} from 'lucide-react';
import { SchoolClass, AttendanceSession } from '@/types';

interface ComparisonStudent {
    student_id: number;
    nis: string;
    name: string;
    gender: 'L' | 'P';
    has_gate_scan: boolean;
    gate_status?: string | null;
    gate_scanned_at?: string | null;
    class_status: 'present_in_class' | 'absent_in_class' | 'with_excuse';
    match_status: 'matched' | 'gate_only_missing_class' | 'class_only_missing_gate';
    notes?: string | null;
    is_confirmed: boolean;
}

interface ClassroomIndexProps {
    classes: SchoolClass[];
    selected_class_id: number;
    selected_class: SchoolClass;
    session: AttendanceSession | null;
    students: ComparisonStudent[];
    discrepancies_count: number;
}

export default function ClassroomConfirmationIndex({
    classes,
    selected_class_id,
    selected_class,
    session,
    students: initialStudents,
    discrepancies_count,
}: ClassroomIndexProps) {
    const [students, setStudents] = useState<ComparisonStudent[]>(initialStudents);
    const [isSaving, setIsSaving] = useState(false);

    const handleClassChange = (newClassId: number) => {
        router.get('/classroom', { class_id: newClassId }, { preserveState: false });
    };

    const handleStatusChange = (studentId: number, status: 'present_in_class' | 'absent_in_class' | 'with_excuse') => {
        setStudents((prev) =>
            prev.map((s) => {
                if (s.student_id !== studentId) return s;

                let matchStatus: 'matched' | 'gate_only_missing_class' | 'class_only_missing_gate' = 'matched';
                if (s.has_gate_scan && status === 'absent_in_class') {
                    matchStatus = 'gate_only_missing_class';
                } else if (!s.has_gate_scan && status === 'present_in_class') {
                    matchStatus = 'class_only_missing_gate';
                }

                return { ...s, class_status: status, match_status: matchStatus };
            })
        );
    };

    const handleNoteChange = (studentId: number, note: string) => {
        setStudents((prev) =>
            prev.map((s) => (s.student_id === studentId ? { ...s, notes: note } : s))
        );
    };

    const handleSaveConfirmation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;

        setIsSaving(true);
        router.post(
            '/classroom',
            {
                class_id: selected_class_id,
                session_id: session.id,
                confirmations: students.map((s) => ({
                    student_id: s.student_id,
                    class_status: s.class_status,
                    notes: s.notes,
                })),
            },
            {
                onFinish: () => setIsSaving(false),
            }
        );
    };

    const anomaliesInState = students.filter(
        (s) => s.match_status === 'gate_only_missing_class'
    ).length;

    return (
        <AuthenticatedLayout title="Konfirmasi Kehadiran di Kelas">
            <Head title="Konfirmasi Kelas" />

            <div className="space-y-6">
                {/* Header Action & Class Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-[#14433b]" />
                            <span>Konfirmasi Kehadiran Kelas - {selected_class?.name}</span>
                        </h2>
                        <p className="text-xs text-gray-500">
                            Pencocokan silang antara siswa yang scan di gerbang sekolah dengan kehadiran nyata di ruang kelas
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-gray-600">Pilih Kelas:</label>
                        <select
                            value={selected_class_id}
                            onChange={(e) => handleClassChange(Number(e.target.value))}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg border-gray-300 bg-gray-50 text-[#14433b] focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                        >
                            {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    {cls.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Anomaly Notification Banner if Discrepancy Found */}
                {anomaliesInState > 0 && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3 shadow-sm animate-in fade-in">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <strong className="text-sm font-bold">
                                Terdeteksi {anomaliesInState} Siswa Anomali: Scan di Gerbang tapi Tidak Hadir di Kelas!
                            </strong>
                            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                                Siswa yang bersangkutan telah ditandai &quot;Perlu Pemeriksaan&quot;. Sistem tidak langsung menjatuhkan sanksi otomatis sebelum diverifikasi oleh wali kelas atau guru piket.
                            </p>
                        </div>
                    </div>
                )}

                {/* Comparison Table */}
                <form onSubmit={handleSaveConfirmation} className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-500 font-semibold bg-gray-50/70">
                                        <th className="py-3 px-4">NIS</th>
                                        <th className="py-3 px-4">Nama Siswa</th>
                                        <th className="py-3 px-4 text-center">Catatan Gerbang</th>
                                        <th className="py-3 px-4 text-center">Kehadiran di Kelas</th>
                                        <th className="py-3 px-4 text-center">Hasil Pencocokan</th>
                                        <th className="py-3 px-4">Catatan Guru</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {students.length > 0 ? (
                                        students.map((std) => (
                                            <tr key={std.student_id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="py-3 px-4 font-mono font-medium text-gray-600">
                                                    {std.nis}
                                                </td>
                                                <td className="py-3 px-4 font-bold text-gray-900">
                                                    {std.name}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {std.has_gate_scan ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            <span>Scan Gerbang ({std.gate_scanned_at})</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                                                            <XCircle className="w-3 h-3 text-gray-400" />
                                                            <span>Belum Scan Gerbang</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(std.student_id, 'present_in_class')}
                                                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                                                                std.class_status === 'present_in_class'
                                                                    ? 'bg-[#14433b] text-white shadow-xs'
                                                                    : 'text-gray-600 hover:text-gray-900'
                                                            }`}
                                                        >
                                                            Hadir
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(std.student_id, 'absent_in_class')}
                                                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                                                                std.class_status === 'absent_in_class'
                                                                    ? 'bg-rose-600 text-white shadow-xs'
                                                                    : 'text-gray-600 hover:text-gray-900'
                                                            }`}
                                                        >
                                                            Tidak Hadir
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(std.student_id, 'with_excuse')}
                                                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                                                                std.class_status === 'with_excuse'
                                                                    ? 'bg-sky-600 text-white shadow-xs'
                                                                    : 'text-gray-600 hover:text-gray-900'
                                                            }`}
                                                        >
                                                            Izin/Sakit
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {std.match_status === 'matched' && (
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                                            COCOK
                                                        </span>
                                                    )}
                                                    {std.match_status === 'gate_only_missing_class' && (
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                            ANOMALI: HILANG DI KELAS
                                                        </span>
                                                    )}
                                                    {std.match_status === 'class_only_missing_gate' && (
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                                                            HADIR TANPA SCAN GERBANG
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="text"
                                                        value={std.notes || ''}
                                                        onChange={(e) => handleNoteChange(std.student_id, e.target.value)}
                                                        placeholder="Catatan guru..."
                                                        className="w-full text-xs px-2 py-1 rounded border-gray-300 focus:ring-[#21c9a4] focus:border-[#21c9a4]"
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-gray-400">
                                                Tidak ada siswa terdaftar di kelas ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <span className="text-xs text-gray-500">
                            Total {students.length} siswa dalam daftar absensi rombel kelas {selected_class?.name}.
                        </span>

                        <button
                            type="submit"
                            disabled={isSaving || !session}
                            className="px-5 py-2.5 rounded-xl bg-[#14433b] text-white font-bold text-xs hover:bg-[#1b554b] transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4 text-[#21c9a4]" />
                            <span>{isSaving ? 'Menyimpan Konfirmasi...' : 'Simpan Konfirmasi Kelas'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
