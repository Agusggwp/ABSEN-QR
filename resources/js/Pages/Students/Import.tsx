import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
    FileSpreadsheet,
    Download,
    UploadCloud,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ArrowLeft,
    FileText,
} from 'lucide-react';

interface PreviewRow {
    row_number: number;
    nis: string;
    nisn?: string | null;
    name: string;
    gender: string;
    class_name: string;
    class_id?: number;
    errors?: string[];
}

export default function StudentImport() {
    const [file, setFile] = useState<File | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);
    const [previewResult, setPreviewResult] = useState<{
        status: string;
        message?: string;
        summary: {
            total_rows: number;
            valid_count: number;
            invalid_count: number;
        };
        valid_rows: PreviewRow[];
        invalid_rows: PreviewRow[];
    } | null>(null);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreviewResult(null);
            setErrorMessage(null);
        }
    };

    const handleUploadPreview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setIsPreviewing(true);
        setErrorMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/students/import/preview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.status === 'error') {
                setErrorMessage(response.data.message);
            } else {
                setPreviewResult(response.data);
            }
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'Gagal memproses pratinjau file.');
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleCommitImport = () => {
        if (!previewResult || previewResult.valid_rows.length === 0) return;

        setIsCommitting(true);
        router.post(
            '/students/import/commit',
            { valid_rows: previewResult.valid_rows as any },
            {
                onFinish: () => setIsCommitting(false),
            }
        );
    };

    return (
        <AuthenticatedLayout title="Impor Data Siswa dari Excel">
            <Head title="Impor Siswa Excel" />

            <div className="space-y-6">
                {/* Header Back & Download Template */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/students"
                            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">
                                Impor Massal Siswa Baru
                            </h2>
                            <p className="text-xs text-gray-500">
                                Unggah file Excel (.xlsx) atau CSV dengan validasi baris per baris sebelum disimpan
                            </p>
                        </div>
                    </div>

                    <a
                        href="/students/import/template"
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span>Unduh Template Excel</span>
                    </a>
                </div>

                {/* File Upload Arena */}
                <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <form onSubmit={handleUploadPreview} className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#21c9a4] transition-colors bg-gray-50/50">
                            <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-gray-700">
                                {file ? `File Terpilih: ${file.name}` : 'Pilih file Excel (.xlsx / .xls / .csv)'}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Pastikan format kolom mengikuti template resmi yang telah diunduh di atas.
                            </p>
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                className="hidden"
                                id="excel-file-input"
                            />
                            <label
                                htmlFor="excel-file-input"
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#14433b] text-white hover:bg-[#1b554b] cursor-pointer shadow-sm"
                            >
                                <FileText className="w-4 h-4 text-[#21c9a4]" />
                                <span>{file ? 'Ganti File' : 'Pilih File dari Komputer'}</span>
                            </label>
                        </div>

                        {errorMessage && (
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700 flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {file && (
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isPreviewing}
                                    className="px-5 py-2.5 bg-[#14433b] text-white text-xs font-bold rounded-lg hover:bg-[#1b554b] transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-[#21c9a4]" />
                                    <span>{isPreviewing ? 'Memvalidasi File...' : 'Pratinjau & Validasi Data'}</span>
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Preview Results & Validation Summary */}
                {previewResult && (
                    <div className="space-y-5 animate-in fade-in">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <span className="text-xs text-gray-500 font-semibold">Total Baris Dibaca</span>
                                <p className="text-2xl font-extrabold text-gray-900 mt-1">
                                    {previewResult.summary.total_rows}
                                </p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm">
                                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Baris Siap Diimpor</span>
                                </span>
                                <p className="text-2xl font-extrabold text-emerald-800 mt-1">
                                    {previewResult.summary.valid_count}
                                </p>
                            </div>
                            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 shadow-sm">
                                <span className="text-xs text-rose-700 font-semibold flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Baris Bermasalah / Duplikat</span>
                                </span>
                                <p className="text-2xl font-extrabold text-rose-800 mt-1">
                                    {previewResult.summary.invalid_count}
                                </p>
                            </div>
                        </div>

                        {/* Error Warning Box if Invalid Rows exist */}
                        {previewResult.invalid_rows.length > 0 && (
                            <div className="p-5 bg-white rounded-xl border border-rose-200 shadow-sm space-y-3">
                                <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                                    <span>Daftar Kesalahan per Baris ({previewResult.invalid_rows.length} Baris Ditolak)</span>
                                </h3>
                                <p className="text-xs text-gray-600">
                                    Baris-baris ini akan diabaikan secara otomatis saat commit impor dilakukan:
                                </p>
                                <div className="max-h-60 overflow-y-auto divide-y divide-rose-100 text-xs border border-rose-100 rounded-lg">
                                    {previewResult.invalid_rows.map((inv, idx) => (
                                        <div key={idx} className="p-2.5 bg-rose-50/40 flex items-start justify-between">
                                            <div>
                                                <span className="font-bold text-rose-900">Baris {inv.row_number}:</span>{' '}
                                                <span className="font-medium text-gray-800">{inv.name || '(Nama Kosong)'}</span>{' '}
                                                <span className="text-gray-500">(NIS: {inv.nis || '-'})</span>
                                            </div>
                                            <div className="text-right text-rose-700 font-semibold text-[11px]">
                                                {inv.errors?.join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Valid Rows Preview Table */}
                        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">
                                        Pratinjau Data Siswa Valid ({previewResult.valid_rows.length} Siswa)
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Data berikut siap dimasukkan ke database dan dibuatkan kartu QR otomatis
                                    </p>
                                </div>

                                {previewResult.valid_rows.length > 0 && (
                                    <button
                                        onClick={handleCommitImport}
                                        disabled={isCommitting}
                                        className="px-5 py-2.5 bg-[#14433b] text-white text-xs font-bold rounded-xl hover:bg-[#1b554b] transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-[#21c9a4]" />
                                        <span>{isCommitting ? 'Menyimpan ke Database...' : `Simpan ${previewResult.valid_rows.length} Siswa`}</span>
                                    </button>
                                )}
                            </div>

                            <div className="overflow-x-auto max-h-72">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                                        <tr>
                                            <th className="py-2 px-3">Baris</th>
                                            <th className="py-2 px-3">NIS</th>
                                            <th className="py-2 px-3">NISN</th>
                                            <th className="py-2 px-3">Nama Lengkap</th>
                                            <th className="py-2 px-3 text-center">L/P</th>
                                            <th className="py-2 px-3">Kelas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {previewResult.valid_rows.slice(0, 30).map((vr, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="py-2 px-3 text-gray-400 font-mono">{vr.row_number}</td>
                                                <td className="py-2 px-3 font-mono font-bold text-gray-800">{vr.nis}</td>
                                                <td className="py-2 px-3 font-mono text-gray-500">{vr.nisn || '-'}</td>
                                                <td className="py-2 px-3 font-semibold text-gray-900">{vr.name}</td>
                                                <td className="py-2 px-3 text-center font-bold text-gray-600">{vr.gender}</td>
                                                <td className="py-2 px-3 font-semibold text-[#14433b]">{vr.class_name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
