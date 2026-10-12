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
        <AuthenticatedLayout title="Impor Data Siswa">
            <Head title="Impor Siswa Excel" />

            <div className="space-y-5">
                {/* Header Back & Download Template */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/students"
                            className="p-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Impor data siswa dari spreadsheet
                            </h2>
                            <p className="text-xs text-slate-500">
                                Unggah file Excel (.xlsx) atau CSV dengan validasi baris per baris sebelum disimpan
                            </p>
                        </div>
                    </div>

                    <a
                        href="/students/import/template"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Unduh template Excel</span>
                    </a>
                </div>

                {/* File Upload Arena */}
                <div className="p-5 bg-white rounded-lg border border-slate-200">
                    <form onSubmit={handleUploadPreview} className="space-y-4">
                        <div className="border border-dashed border-slate-300 rounded-lg p-7 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
                            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-xs font-medium text-slate-800">
                                {file ? `File terpilih: ${file.name}` : 'Pilih file Excel (.xlsx / .xls / .csv)'}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
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
                                className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#14433b] text-white hover:bg-[#1b554b] cursor-pointer"
                            >
                                <FileText className="w-3.5 h-3.5 text-[#21c9a4]" />
                                <span>{file ? 'Ganti file' : 'Pilih file dari komputer'}</span>
                            </label>
                        </div>

                        {errorMessage && (
                            <div className="p-3 bg-rose-50 rounded-md border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {file && (
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isPreviewing}
                                    className="px-4 py-2 bg-[#14433b] text-white text-xs font-medium rounded-md hover:bg-[#1b554b] transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#21c9a4]" />
                                    <span>{isPreviewing ? 'Memvalidasi file...' : 'Pratinjau & validasi data'}</span>
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Preview Results & Validation Summary */}
                {previewResult && (
                    <div className="space-y-4">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-4 bg-white rounded-lg border border-slate-200">
                                <span className="text-[11px] text-slate-500 font-medium">Total baris dibaca</span>
                                <p className="text-xl font-semibold text-slate-900 mt-1">
                                    {previewResult.summary.total_rows}
                                </p>
                            </div>
                            <div className="p-4 bg-white rounded-lg border border-slate-200">
                                <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>Baris siap diimpor</span>
                                </span>
                                <p className="text-xl font-semibold text-emerald-800 mt-1">
                                    {previewResult.summary.valid_count}
                                </p>
                            </div>
                            <div className="p-4 bg-white rounded-lg border border-slate-200">
                                <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    <span>Baris bermasalah / duplikat</span>
                                </span>
                                <p className="text-xl font-semibold text-rose-800 mt-1">
                                    {previewResult.summary.invalid_count}
                                </p>
                            </div>
                        </div>

                        {/* Error Warning Box if Invalid Rows exist */}
                        {previewResult.invalid_rows.length > 0 && (
                            <div className="p-4 bg-white rounded-lg border border-rose-200 space-y-2.5">
                                <h3 className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Daftar kesalahan per baris ({previewResult.invalid_rows.length} baris ditolak)</span>
                                </h3>
                                <p className="text-xs text-slate-600">
                                    Baris-baris ini akan diabaikan secara otomatis saat penyimpanan dilakukan:
                                </p>
                                <div className="max-h-56 overflow-y-auto divide-y divide-rose-100 text-xs border border-rose-100 rounded-md">
                                    {previewResult.invalid_rows.map((inv, idx) => (
                                        <div key={idx} className="p-2 bg-rose-50/30 flex items-start justify-between">
                                            <div>
                                                <span className="font-semibold text-rose-900">Baris {inv.row_number}:</span>{' '}
                                                <span className="text-slate-800">{inv.name || '(Nama Kosong)'}</span>{' '}
                                                <span className="text-slate-500">(NIS: {inv.nis || '-'})</span>
                                            </div>
                                            <div className="text-right text-rose-700 font-medium text-[11px]">
                                                {inv.errors?.join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Valid Rows Preview Table */}
                        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-900">
                                        Pratinjau data siswa valid ({previewResult.valid_rows.length} siswa)
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Data berikut siap dimasukkan ke database dan dibuatkan kartu QR otomatis
                                    </p>
                                </div>

                                {previewResult.valid_rows.length > 0 && (
                                    <button
                                        onClick={handleCommitImport}
                                        disabled={isCommitting}
                                        className="px-3.5 py-1.5 bg-[#14433b] text-white text-xs font-medium rounded-md hover:bg-[#1b554b] transition-all disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#21c9a4]" />
                                        <span>{isCommitting ? 'Menyimpan...' : `Simpan ${previewResult.valid_rows.length} siswa`}</span>
                                    </button>
                                )}
                            </div>

                            <div className="overflow-x-auto max-h-72 border border-slate-100 rounded-md">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                        <tr>
                                            <th className="py-2 px-3 text-[11px] font-medium text-slate-600">Baris</th>
                                            <th className="py-2 px-3 text-[11px] font-medium text-slate-600">NIS</th>
                                            <th className="py-2 px-3 text-[11px] font-medium text-slate-600">NISN</th>
                                            <th className="py-2 px-3 text-[11px] font-medium text-slate-600">Nama lengkap</th>
                                            <th className="py-2 px-3 text-center text-[11px] font-medium text-slate-600">L/P</th>
                                            <th className="py-2 px-3 text-[11px] font-medium text-slate-600">Kelas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewResult.valid_rows.slice(0, 30).map((vr, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/60">
                                                <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{vr.row_number}</td>
                                                <td className="py-2 px-3 font-mono font-medium text-slate-800">{vr.nis}</td>
                                                <td className="py-2 px-3 font-mono text-slate-500">{vr.nisn || '-'}</td>
                                                <td className="py-2 px-3 font-medium text-slate-900">{vr.name}</td>
                                                <td className="py-2 px-3 text-center text-slate-600">{vr.gender}</td>
                                                <td className="py-2 px-3 text-[#14433b] font-medium">{vr.class_name}</td>
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
