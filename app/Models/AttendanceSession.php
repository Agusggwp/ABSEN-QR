<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    protected $fillable = [
        'school_year_id',
        'date',
        'type',
        'start_time',
        'end_time',
        'late_time',
        'status',
        'closed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'session_id');
    }

    public function classroomConfirmations(): HasMany
    {
        return $this->hasMany(ClassroomConfirmation::class, 'session_id');
    }

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }
}
