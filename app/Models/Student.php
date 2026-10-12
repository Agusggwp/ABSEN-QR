<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Student extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nis',
        'nisn',
        'name',
        'gender',
        'photo_path',
        'class_id',
        'is_active',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function activeQrCode(): HasOne
    {
        return $this->hasOne(StudentQrCode::class)->where('status', 'active')->latestOfMany();
    }

    public function qrCodes(): HasMany
    {
        return $this->hasMany(StudentQrCode::class);
    }

    public function classMemberships(): HasMany
    {
        return $this->hasMany(ClassMembership::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function exceptions(): HasMany
    {
        return $this->hasMany(AttendanceException::class);
    }

    public function classroomConfirmations(): HasMany
    {
        return $this->hasMany(ClassroomConfirmation::class);
    }
}
