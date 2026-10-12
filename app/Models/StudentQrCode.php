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
        'raw_token_masked',
        'card_number',
        'status',
        'issued_at',
        'revoked_at',
        'revocation_reason',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
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
