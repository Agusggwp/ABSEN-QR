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
            $cardNumber = $customCardNumber ?? 'KARTU-' . str_pad((string) $student->id, 5, '0', STR_PAD_LEFT);
            $masked = substr($rawSecret, 0, 12) . '****' . substr($rawSecret, -6);

            $qrCode = StudentQrCode::create([
                'student_id' => $student->id,
                'qr_token_hash' => $tokenHash,
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
     * Verifikasi dan temukan QR code dari raw secret token.
     */
    public function findByRawToken(string $rawToken): ?StudentQrCode
    {
        $rawToken = trim($rawToken);
        if (empty($rawToken)) {
            return null;
        }

        $tokenHash = hash('sha256', $rawToken);

        return StudentQrCode::with(['student.schoolClass'])
            ->where('qr_token_hash', $tokenHash)
            ->first();
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
