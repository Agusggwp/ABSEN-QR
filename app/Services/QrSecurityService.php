<?php

namespace App\Services;

use App\Models\Student;
use App\Models\StudentQrCode;
use App\Models\AuditLog;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class QrSecurityService
{
    /**
     * Generate token QR baru yang aman dan tidak dapat ditebak.
     */
    public function generateTokenForStudent(Student $student, ?string $customCardNumber = null): array
    {
        return DB::transaction(function () use ($student, $customCardNumber) {
            // Nonaktifkan kartu lama jika ada
            StudentQrCode::where('student_id', $student->id)
                ->where('status', 'active')
                ->update([
                    'status' => 'replaced',
                    'revoked_at' => now(),
                    'revocation_reason' => 'Penggantian kartu baru',
                ]);

            // Token acak dengan entropi tinggi (Bukan NIS/NISN)
            // Raw token hanya dikembalikan ke proses pencetakan, database hanya menyimpan SHA-256 hash
            $rawSecret = 'ARTDEVATA-' . Str::upper(Str::random(8)) . '-' . Str::uuid()->toString();
            $tokenHash = hash('sha256', $rawSecret);

            if ($customCardNumber) {
                $cardNumber = $customCardNumber;
            } else {
                $baseCardNumber = 'KARTU-' . str_pad((string) $student->id, 5, '0', STR_PAD_LEFT);
                $cardNumber = $baseCardNumber;
                $version = 2;
                while (StudentQrCode::where('card_number', $cardNumber)->exists()) {
                    $cardNumber = $baseCardNumber . '-V' . $version;
                    $version++;
                }
            }

            $masked = substr($rawSecret, 0, 12) . '****' . substr($rawSecret, -6);

            $qrCode = StudentQrCode::create([
                'student_id' => $student->id,
                'qr_token_hash' => $tokenHash,
                'qr_token_encrypted' => \Illuminate\Support\Facades\Crypt::encryptString($rawSecret),
                'raw_token_masked' => $masked,
                'card_number' => $cardNumber,
                'status' => 'active',
                'issued_at' => now(),
            ]);

            AuditLog::log(
                action: 'qr.generated',
                entityType: 'StudentQrCode',
                entityId: $qrCode->id,
                payloadBefore: null,
                payloadAfter: ['student_id' => $student->id, 'card_number' => $cardNumber]
            );

            return [
                'qr_code' => $qrCode,
                'raw_secret_token' => $rawSecret, // Digunakan untuk render cetak QR
            ];
        });
    }

    /**
     * Dapatkan token QR aktif siswa. Jika belum ada atau belum terenkripsi, buat/regenerasi.
     */
    public function getActiveTokenForStudent(Student $student): array
    {
        $activeQr = StudentQrCode::where('student_id', $student->id)
            ->where('status', 'active')
            ->first();

        if ($activeQr) {
            $decrypted = $activeQr->getDecryptedToken();
            if ($decrypted) {
                return [
                    'qr_code' => $activeQr,
                    'raw_secret_token' => $decrypted,
                ];
            }

            // Kartu aktif ada tetapi token terenkripsinya belum tersimpan (misal data seeder awal).
            // Perbarui token langsung pada kartu aktif yang ada agar nomor kartu tidak berubah & tidak melanggar unique constraint.
            $rawSecret = 'ARTDEVATA-' . Str::upper(Str::random(8)) . '-' . Str::uuid()->toString();
            $tokenHash = hash('sha256', $rawSecret);
            $masked = substr($rawSecret, 0, 12) . '****' . substr($rawSecret, -6);

            $activeQr->update([
                'qr_token_hash' => $tokenHash,
                'qr_token_encrypted' => \Illuminate\Support\Facades\Crypt::encryptString($rawSecret),
                'raw_token_masked' => $masked,
            ]);

            return [
                'qr_code' => $activeQr->fresh(),
                'raw_secret_token' => $rawSecret,
            ];
        }

        // Jika belum ada kartu aktif sama sekali, buat baru
        return $this->generateTokenForStudent($student);
    }

    /**
     * Verifikasi dan temukan QR code dari raw secret token.
     */
    public function findByRawToken(string $rawToken): ?StudentQrCode
    {
        $rawToken = trim($rawToken);
        if (empty($rawToken)) {
            return null;
        }

        // 1. Pencarian utama berdasarkan SHA-256 hash dari cryptographic secret token
        $tokenHash = hash('sha256', $rawToken);
        $qrCode = StudentQrCode::with(['student.schoolClass'])
            ->where('qr_token_hash', $tokenHash)
            ->first();

        if ($qrCode) {
            return $qrCode;
        }

        // 2. Fallback: Format cetak kartu lama/legacy "ARTDEVATA-SEC-{nis}-{cardNumber}"
        if (preg_match('/^ARTDEVATA-SEC-(\w+)-(KARTU-\w+)$/i', $rawToken, $matches)) {
            $nis = $matches[1];
            $cardNumber = $matches[2];

            $qrCode = StudentQrCode::with(['student.schoolClass'])
                ->where('card_number', $cardNumber)
                ->first();

            if ($qrCode) {
                return $qrCode;
            }

            $student = Student::with('schoolClass')->where('nis', $nis)->first();
            if ($student && $student->activeQrCode) {
                return $student->activeQrCode;
            }
        }

        // 3. Fallback: Cek jika input adalah nomor kartu langsung ("KARTU-00001", "KARTU-00002", dst.)
        if (str_starts_with(strtoupper($rawToken), 'KARTU-')) {
            $qrCode = StudentQrCode::with(['student.schoolClass'])
                ->where('card_number', strtoupper($rawToken))
                ->first();

            if ($qrCode) {
                return $qrCode;
            }
        }

        // 4. Fallback: Cek jika input pemindaian adalah NIS siswa langsung
        $student = Student::with('schoolClass')->where('nis', $rawToken)->first();
        if ($student && $student->activeQrCode) {
            return $student->activeQrCode;
        }

        return null;
    }

    /**
     * Cabut / Nonaktifkan kartu QR siswa.
     */
    public function revokeCard(int $qrCodeId, string $reason, ?int $userId = null): bool
    {
        $qrCode = StudentQrCode::findOrFail($qrCodeId);

        if ($qrCode->status !== 'active') {
            return false;
        }

        $oldStatus = $qrCode->status;
        $qrCode->update([
            'status' => 'revoked',
            'revoked_at' => now(),
            'revocation_reason' => $reason,
        ]);

        AuditLog::log(
            action: 'qr.revoked',
            entityType: 'StudentQrCode',
            entityId: $qrCode->id,
            payloadBefore: ['status' => $oldStatus],
            payloadAfter: ['status' => 'revoked', 'reason' => $reason],
            userId: $userId
        );

        return true;
    }
}
