<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScannerDevice extends Model
{
    protected $fillable = [
        'device_name',
        'device_identifier',
        'location_description',
        'assigned_user_id',
        'ip_address',
        'last_heartbeat',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'last_heartbeat' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'scanner_device_id');
    }
}
