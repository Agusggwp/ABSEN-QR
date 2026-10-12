import React, { useEffect, useState, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import StudentLayout from '@/Layouts/StudentLayout';
import QRCode from 'qrcode';
import {
    Download,
    Printer,
    ArrowLeft,
    CheckCircle2,
    Info,
    Smartphone,
} from 'lucide-react';

interface QrPageProps {
    student: {
        id: number;
        name: string;
        nis: string;
        nisn?: string;
        gender: string;
        photo_path?: string;
        school_class?: {
            id: number;
            name: string;
        };
    };
    school: {
        name: string;
        logo?: string;
        address: string;
        phone?: string;
    };
    qr: {
        raw_token: string;
        card_number: string;
        status: string;
        issued_at?: string;
    };
}

export default function StudentQrCodePage({ student, school, qr }: QrPageProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [qrSvgString, setQrSvgString] = useState<string>('');
    const cardPrintRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (qr.raw_token) {
            QRCode.toDataURL(qr.raw_token, {
                errorCorrectionLevel: 'H',
                margin: 2,
                width: 600,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
            }).then((url) => {
                setQrDataUrl(url);
            });

            QRCode.toString(qr.raw_token, {
                type: 'svg',
                errorCorrectionLevel: 'H',
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
            }).then((svg) => {
                setQrSvgString(svg);
            });
        }
    }, [qr.raw_token]);

    const handleDownloadPng = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.download = `KARTU_QR_${student.nis}_${student.name.replace(/\s+/g, '_')}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    const handleDownloadSvg = () => {
        if (!qrSvgString) return;
        const blob = new Blob([qrSvgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `QR_${student.nis}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <StudentLayout
            title="QR Code Saya"
            studentName={student.name}
            studentNis={student.nis}
        >
            <Head title="QR Code Presensi Saya" />

            {/* Print Stylesheet */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-student-card, #printable-student-card * {
                        visibility: visible;
                    }
                    #printable-student-card {
                        position: absolute;
                        left: 50%;
                        top: 40px;
                        transform: translateX(-50%);
                        width: 85.6mm;
                        max-width: 85.6mm;
                        margin: 0 auto;
                        box-shadow: none !important;
                        border: 1px solid #14433b !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>

            <div className="space-y-5 text-slate-800">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                    <div>
                        <Link
                            href={route('portal.dashboard')}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 mb-1"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Kembali ke Dashboard</span>
                        </Link>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                            QR Code Presensi & Kartu Siswa
                        </h1>
                        <p className="text-xs text-slate-500">
                            Gunakan kartu ini atau tampilkan di layar smartphone saat presensi
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDownloadPng}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-xs"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Unduh PNG</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadSvg}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-xs"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Unduh SVG</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#14433b] hover:bg-[#1a5349] text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                            <Printer className="w-3.5 h-3.5 text-[#21c9a4]" />
                            <span>Cetak Kartu</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Card Preview Ready to Print */}
                    <div className="lg:col-span-7 flex flex-col items-center">
                        <div className="text-left w-full mb-2 flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Pratinjau Kartu Siswa (Standar ID Card CR80)
                            </span>
                            <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                                Siap Cetak
                            </span>
                        </div>

                        {/* PHYSICAL CARD CONTAINER */}
                        <div
                            id="printable-student-card"
                            ref={cardPrintRef}
                            className="w-full max-w-[380px] bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden text-slate-800"
                        >
                            {/* Card Header Strip */}
                            <div className="bg-[#14433b] text-white p-3.5 flex items-center justify-between border-b-2 border-[#21c9a4]">
                                <div className="flex items-center gap-2">
                                    {school.logo ? (
                                        <img
                                            src={`/storage/${school.logo}`}
                                            alt="Logo Sekolah"
                                            className="w-7 h-7 object-contain rounded-md bg-white p-0.5 shrink-0"
                                        />
                                    ) : (
                                        <div className="w-7 h-7 rounded-md bg-[#21c9a4] text-[#14433b] font-bold flex items-center justify-center text-xs shrink-0">
                                            A
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-xs font-bold tracking-tight uppercase">
                                            {school.name}
                                        </h2>
                                        <p className="text-[9px] text-emerald-200 font-medium">
                                            KARTU PRESENSI QR CODE RESMI
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0e302a] text-emerald-300 font-semibold">
                                    {qr.card_number}
                                </span>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 flex flex-col items-center text-center">
                                {/* QR Code Display (High Contrast) */}
                                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs my-1">
                                    {qrDataUrl ? (
                                        <img
                                            src={qrDataUrl}
                                            alt={`QR Code ${student.name}`}
                                            className="w-44 h-44 object-contain"
                                        />
                                    ) : (
                                        <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                                            Memuat QR...
                                        </div>
                                    )}
                                </div>

                                {/* Student Details */}
                                <div className="mt-2.5 w-full">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        {student.name}
                                    </h3>
                                    <p className="text-xs text-slate-600 mt-0.5 font-mono">
                                        NIS: <span className="font-semibold text-slate-900">{student.nis}</span>
                                        {student.nisn ? ` • NISN: ${student.nisn}` : ''}
                                    </p>
                                    <div className="inline-block mt-1.5 px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-medium">
                                        Kelas: {student.school_class?.name || '-'}
                                    </div>
                                </div>

                                {/* Card Footer Instructions */}
                                <div className="w-full mt-4 pt-2.5 border-t border-slate-100 text-[9px] text-slate-400 text-center leading-tight">
                                    <p>Identitas resmi absensi siswa SMA ARTDEVATA.</p>
                                    <p className="mt-0.5">Dilarang memindahtangankan kartu kepada pihak lain.</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-2 text-center">
                            Ukuran cetak otomatis menyesuaikan ukuran kartu ID ketika dicetak.
                        </p>
                    </div>

                    {/* Right: Smartphone On-Screen Large Scanner Display */}
                    <div className="lg:col-span-5 space-y-3.5">
                        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-3.5">
                            <div className="flex items-center gap-2 text-slate-900">
                                <Smartphone className="w-4 h-4 text-slate-600" />
                                <h3 className="text-xs font-bold uppercase tracking-wider">
                                    Mode Pindai Layar Smartphone
                                </h3>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                                Jika tidak membawa kartu fisik, buka halaman ini di HP dan arahkan kode QR ke terminal scanner.
                            </p>

                            <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 flex items-center gap-2.5 text-xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div>
                                    <p className="font-semibold text-emerald-950">Status QR: Aktif & Terverifikasi</p>
                                    <p className="text-[10px] text-emerald-700">Diterbitkan: {qr.issued_at || 'Hari ini'}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Nomor Kartu:</span>
                                    <span className="font-mono text-slate-900 font-semibold">{qr.card_number}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Nama Siswa:</span>
                                    <span className="text-slate-900 font-medium">{student.name}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                    <span className="text-slate-500">NIS:</span>
                                    <span className="font-mono text-slate-900">{student.nis}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-slate-500">Kelas:</span>
                                    <span className="text-slate-900 font-medium">{student.school_class?.name || '-'}</span>
                                </div>
                            </div>

                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                <span>
                                    Setiap kehadiran akan diverifikasi wajah oleh petugas di gerbang atau ruang kelas.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
}
