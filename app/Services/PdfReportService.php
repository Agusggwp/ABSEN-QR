<?php

namespace App\Services;

use App\Models\Student;
use App\Models\SchoolSetting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class PdfReportService
{
    /**
     * Cetak Kartu QR Siswa Individual dalam Format PDF (Ukuran Standar ID Card CR80).
     */
    public function generateSingleStudentCard(Student $student, string $rawSecretToken): Response
    {
        $schoolName = SchoolSetting::get('school_name', 'SMA ARTDEVATA DENPASAR');
        $qrCode = $student->activeQrCode;
        $cardNumber = $qrCode?->card_number ?? ('KARTU-' . str_pad((string) $student->id, 5, '0', STR_PAD_LEFT));

        $pdf = Pdf::loadView('pdf.student_card', [
            'student' => $student,
            'qrToken' => $rawSecretToken,
            'cardNumber' => $cardNumber,
            'schoolName' => $schoolName,
        ])->setPaper([0, 0, 242.65, 153.01], 'landscape'); // 85.6mm x 53.98mm in points

        return $pdf->download("kartu_absen_{$student->nis}_{$student->name}.pdf");
    }

    /**
     * Cetak Massal Kartu Siswa dalam Format PDF (Kertas A4).
     */
    public function generateBulkStudentCards(array $cardsData): Response
    {
        $schoolName = SchoolSetting::get('school_name', 'SMA ARTDEVATA DENPASAR');

        $pdf = Pdf::loadView('pdf.bulk_student_cards', [
            'cards' => $cardsData,
            'schoolName' => $schoolName,
        ])->setPaper('a4', 'portrait');

        return $pdf->download("cetak_massal_kartu_siswa_artdevata.pdf");
    }

    /**
     * Cetak Laporan Absensi Resmi dalam Format PDF.
     */
    public function generateAttendanceReportPdf($attendances, string $title, array $stats, ?string $periodInfo = null): Response
    {
        $schoolName = SchoolSetting::get('school_name', 'SMA ARTDEVATA DENPASAR');
        $schoolAddress = SchoolSetting::get('school_address', 'Jl. Bypass Ngurah Rai No. 88, Denpasar, Bali');
        $headmasterName = SchoolSetting::get('headmaster_name', 'Dr. Ni Ketut Suryani, M.Pd.');
        $headmasterNip = SchoolSetting::get('headmaster_nip', '197505122000032001');

        $pdf = Pdf::loadView('pdf.attendance_report', [
            'attendances' => $attendances,
            'title' => $title,
            'stats' => $stats,
            'periodInfo' => $periodInfo,
            'schoolName' => $schoolName,
            'schoolAddress' => $schoolAddress,
            'headmasterName' => $headmasterName,
            'headmasterNip' => $headmasterNip,
        ])->setPaper('a4', 'portrait');

        return $pdf->download("laporan_absensi_artdevata_" . date('Ymd_His') . ".pdf");
    }
}
