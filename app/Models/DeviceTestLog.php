<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceTestLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'camera_device_id',
        'tested_by',
        'test_type',
        'result',
        'error_code',
        'message',
        'details',
        'tested_at',
    ];

    protected $casts = [
        'details' => 'array',
        'tested_at' => 'datetime',
    ];

    public function cameraDevice(): BelongsTo
    {
        return $this->belongsTo(CameraDevice::class, 'camera_device_id');
    }

    public function testedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tested_by');
    }
}
