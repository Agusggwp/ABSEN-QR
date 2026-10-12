<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentQrCode extends Model
{
    protected $fillable = [
        'student_id',
        'qr_token_hash',
        'qr_token_encrypted',
        'raw_token_masked',
        'card_number',
        'status',
        'issued_at',
        'revoked_at',
        'revocation_reason',
    ];

    protected $hidden = [
        'qr_token_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /**
     * Dapatkan raw secret token terdekripsi untuk ditampilkan sebagai QR Code di Portal Murid atau kartu PDF.
     */
    public function getDecryptedToken(): ?string
    {
        if (empty($this->qr_token_encrypted)) {
            return null;
        }

        try {
            return \Illuminate\Support\Facades\Crypt::decryptString($this->qr_token_encrypted);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Simpan token rahasia dalam bentuk terenkripsi.
     */
    public function setEncryptedToken(string $rawToken): void
    {
        $this->qr_token_encrypted = \Illuminate\Support\Facades\Crypt::encryptString($rawToken);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'qr_code_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
