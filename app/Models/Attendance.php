<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Attendance extends Model
{
    protected $fillable = [
        'session_id',
        'student_id',
        'class_id',
        'date',
        'type',
        'status',
        'verification_status',
        'scanned_at',
        'scanner_device_id',
        'verified_by_user_id',
        'qr_code_id',
        'notes',
        'is_corrected',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'scanned_at' => 'datetime',
            'is_corrected' => 'boolean',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function scannerDevice(): BelongsTo
    {
        return $this->belongsTo(ScannerDevice::class, 'scanner_device_id');
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }

    public function qrCode(): BelongsTo
    {
        return $this->belongsTo(StudentQrCode::class, 'qr_code_id');
    }

    public function verification(): HasOne
    {
        return $this->hasOne(AttendanceVerification::class);
    }

    public function corrections(): HasMany
    {
        return $this->hasMany(AttendanceCorrection::class);
    }
}
