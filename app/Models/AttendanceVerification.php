<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceVerification extends Model
{
    protected $fillable = [
        'attendance_id',
        'verification_method',
        'officer_user_id',
        'verification_result',
        'notes',
    ];

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    public function officerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_user_id');
    }
}
