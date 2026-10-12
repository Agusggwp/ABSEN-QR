<?php

namespace App\Services;

use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\ClassMembership;
use App\Models\StudentQrCode;
use App\Models\AuditLog;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExcelImportExportService
{
    /**
     * Download template Excel untuk impor siswa.
     */
    public function downloadStudentTemplate(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Impor Siswa');

        // Header
        $headers = ['NIS*', 'NISN', 'Nama Lengkap*', 'Jenis Kelamin* (L/P)', 'Nama Kelas* (e.g. X MIPA 1)'];
        $cols = ['A', 'B', 'C', 'D', 'E'];

        foreach ($headers as $idx => $header) {
            $col = $cols[$idx];
            $sheet->setCellValue("{$col}1", $header);
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Header Styling
        $sheet->getStyle('A1:E1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '14433B'], // Warna utama hijau gelap
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        // Contoh baris dummy untuk panduan pengisian
        $sampleRows = [
            ['20261001', '0065432101', 'I Wayan Bagus Pratama', 'L', 'X MIPA 1'],
            ['20261002', '0065432102', 'Ni Made Ayu Dewi', 'P', 'X MIPA 1'],
            ['20261003', '0065432103', 'Putu Arya Danendra', 'L', 'X MIPA 2'],
        ];

        $rowIdx = 2;
        foreach ($sampleRows as $sample) {
            foreach ($sample as $colIdx => $val) {
                $sheet->setCellValueExplicit("{$cols[$colIdx]}{$rowIdx}", $val, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            }
            $rowIdx++;
        }

        $writer = new Xlsx($spreadsheet);

        return response()->stream(
            function () use ($writer) {
                $writer->save('php://output');
            },
            200,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="template_impor_siswa_artdevata.xlsx"',
                'Cache-Control' => 'max-age=0',
            ]
        );
    }

    /**
     * Validasi pratinjau impor file Excel/CSV baris per baris sebelum disimpan.
     */
    public function previewImportFile(UploadedFile $file): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        if (count($rows) < 2) {
            return [
                'status' => 'error',
                'message' => 'File kosong atau tidak memiliki baris data setelah header.',
                'summary' => ['total' => 0, 'valid' => 0, 'invalid' => 0, 'duplicates' => 0],
                'valid_rows' => [],
                'invalid_rows' => [],
            ];
        }

        $classesMap = SchoolClass::pluck('id', 'name')->toArray();
        $existingNis = Student::pluck('nis')->flip()->toArray();

        $seenNisInFile = [];
        $validRows = [];
        $invalidRows = [];

        // Loop baris data (mulai baris 2)
        $rowNum = 1;
        foreach ($rows as $row) {
            $rowNum++;
            if ($rowNum === 2) {
                continue; // Lewati baris header A1
            }

            $nis = trim((string) ($row['A'] ?? ''));
            $nisn = trim((string) ($row['B'] ?? ''));
            $name = trim((string) ($row['C'] ?? ''));
            $gender = strtoupper(trim((string) ($row['D'] ?? '')));
            $className = trim((string) ($row['E'] ?? ''));

            // Abaikan baris kosong total
            if (empty($nis) && empty($name) && empty($className)) {
                continue;
            }

            $errors = [];

            if (empty($nis)) {
                $errors[] = 'NIS wajib diisi';
            } elseif (isset($seenNisInFile[$nis])) {
                $errors[] = "NIS duplikat di dalam file ini (baris ke-{$seenNisInFile[$nis]})";
            } elseif (isset($existingNis[$nis])) {
                $errors[] = "NIS {$nis} sudah terdaftar di database sekolah";
            }

            if (empty($name)) {
                $errors[] = 'Nama lengkap siswa wajib diisi';
            }

            if (!in_array($gender, ['L', 'P'])) {
                $errors[] = 'Jenis kelamin harus "L" atau "P"';
            }

            $classId = null;
            if (empty($className)) {
                $errors[] = 'Nama kelas wajib diisi';
            } else {
                // Case insensitive match
                $matchedClassId = null;
                foreach ($classesMap as $cName => $cId) {
                    if (strcasecmp($cName, $className) === 0) {
                        $matchedClassId = $cId;
                        break;
                    }
                }

                if (!$matchedClassId) {
                    $errors[] = "Kelas \"{$className}\" tidak ditemukan dalam sistem";
                } else {
                    $classId = $matchedClassId;
                }
            }

            if (!empty($nis)) {
                $seenNisInFile[$nis] = $rowNum;
            }

            if (!empty($errors)) {
                $invalidRows[] = [
                    'row_number' => $rowNum,
                    'nis' => $nis,
                    'name' => $name,
                    'gender' => $gender,
                    'class_name' => $className,
                    'errors' => $errors,
                ];
            } else {
                $validRows[] = [
                    'row_number' => $rowNum,
                    'nis' => $nis,
                    'nisn' => $nisn ?: null,
                    'name' => $name,
                    'gender' => $gender,
                    'class_id' => $classId,
                    'class_name' => $className,
                ];
            }
        }

        return [
            'status' => 'success',
            'summary' => [
                'total_rows' => count($validRows) + count($invalidRows),
                'valid_count' => count($validRows),
                'invalid_count' => count($invalidRows),
            ],
            'valid_rows' => $validRows,
            'invalid_rows' => $invalidRows,
        ];
    }

    /**
     * Eksekusi penyimpanan data siswa hasil impor yang telah valid.
     */
    public function commitImport(array $validRows, int $userId): array
    {
        return DB::transaction(function () use ($validRows, $userId) {
            $schoolYear = SchoolYear::getActive();
            $createdStudents = [];

            foreach ($validRows as $item) {
                $student = Student::create([
                    'nis' => $item['nis'],
                    'nisn' => $item['nisn'] ?? null,
                    'name' => $item['name'],
                    'gender' => $item['gender'],
                    'class_id' => $item['class_id'],
                    'is_active' => true,
                ]);

                // Buat kartu QR otomatis
                $rawSecret = 'ARTDEVATA-' . Str::upper(Str::random(8)) . '-' . Str::uuid()->toString();
                $tokenHash = hash('sha256', $rawSecret);
                $cardNumber = 'KARTU-' . str_pad((string) $student->id, 5, '0', STR_PAD_LEFT);
                $masked = substr($rawSecret, 0, 12) . '****' . substr($rawSecret, -6);

                StudentQrCode::create([
                    'student_id' => $student->id,
                    'qr_token_hash' => $tokenHash,
                    'qr_token_encrypted' => \Illuminate\Support\Facades\Crypt::encryptString($rawSecret),
                    'raw_token_masked' => $masked,
                    'card_number' => $cardNumber,
                    'status' => 'active',
                    'issued_at' => now(),
                ]);

                // Buat akun login murid otomatis
                app(\App\Services\StudentAccountService::class)->createAccountForStudent($student);

                // Buat riwayat keanggotaan kelas
                ClassMembership::create([
                    'student_id' => $student->id,
                    'class_id' => $item['class_id'],
                    'school_year_id' => $schoolYear?->id,
                    'start_date' => now()->format('Y-m-d'),
                ]);

                $createdStudents[] = $student;
            }

            AuditLog::log(
                action: 'student.bulk_imported',
                entityType: 'Student',
                entityId: null,
                payloadBefore: null,
                payloadAfter: ['imported_count' => count($createdStudents)],
                userId: $userId
            );

            return [
                'success' => true,
                'imported_count' => count($createdStudents),
                'message' => 'Berhasil mengimpor ' . count($createdStudents) . ' data siswa.',
            ];
        });
    }

    /**
     * Ekspor Laporan Absensi ke Format Excel.
     */
    public function exportAttendanceExcel($attendances, string $title, array $filterMeta = []): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Laporan Absensi');

        // Judul Laporan
        $sheet->setCellValue('A1', 'ARTDEVATA SCHOOL ATTENDANCE SYSTEM');
        $sheet->setCellValue('A2', strtoupper($title));
        $sheet->setCellValue('A3', 'Diekspor pada: ' . now()->translatedFormat('d F Y H:i') . ' WITA | Oleh: ' . (auth()->user()?->name ?? 'Sistem'));

        $sheet->getStyle('A1:A2')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getFont()->getColor()->setRGB('14433B');

        // Header Tabel
        $headers = ['No', 'Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Waktu Masuk', 'Status', 'Metode Verifikasi', 'Petugas', 'Keterangan'];
        $cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

        $rowIdx = 5;
        foreach ($headers as $idx => $header) {
            $col = $cols[$idx];
            $sheet->setCellValue("{$col}{$rowIdx}", $header);
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->getStyle("A5:J5")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '14433B'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
            ],
        ]);

        $no = 1;
        $rowIdx = 6;
        foreach ($attendances as $item) {
            $sheet->setCellValue("A{$rowIdx}", $no++);
            $sheet->setCellValue("B{$rowIdx}", $item->date ? \Carbon\Carbon::parse($item->date)->format('d/m/Y') : '-');
            $sheet->setCellValueExplicit("C{$rowIdx}", $item->student?->nis ?? '-', \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue("D{$rowIdx}", $item->student?->name ?? '-');
            $sheet->setCellValue("E{$rowIdx}", $item->schoolClass?->name ?? '-');
            $sheet->setCellValue("F{$rowIdx}", $item->scanned_at ? \Carbon\Carbon::parse($item->scanned_at)->format('H:i:s') : '-');
            $sheet->setCellValue("G{$rowIdx}", strtoupper($item->status ?? '-'));
            $sheet->setCellValue("H{$rowIdx}", $item->verification_status ?? 'verified_officer');
            $sheet->setCellValue("I{$rowIdx}", $item->verifiedByUser?->name ?? '-');
            $sheet->setCellValue("J{$rowIdx}", $item->notes ?? '-');

            $rowIdx++;
        }

        $lastRow = max(6, $rowIdx - 1);
        $sheet->getStyle("A5:J{$lastRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        $writer = new Xlsx($spreadsheet);

        return response()->stream(
            function () use ($writer) {
                $writer->save('php://output');
            },
            200,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="laporan_absensi_artdevata_' . date('Ymd_His') . '.xlsx"',
                'Cache-Control' => 'max-age=0',
            ]
        );
    }
}
