<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceSetting extends Model
{
    protected $fillable = [
        'qr_scanner_mode',
        'identity_verification_mode',
        'active_camera_id',
        'fallback_mode',
        'face_recognition_status',
        'allow_manual_fallback',
        'require_visual_photo_matching',
        'updated_by',
    ];

    protected $casts = [
        'allow_manual_fallback' => 'boolean',
        'require_visual_photo_matching' => 'boolean',
    ];

    /**
     * Dapatkan konfigurasi absensi tunggal (Singleton pattern).
     */
    public static function getSettings(): self
    {
        return static::firstOrCreate([], [
            'qr_scanner_mode' => 'browser_camera',
            'identity_verification_mode' => 'officer_manual',
            'active_camera_id' => null,
            'fallback_mode' => 'officer_manual',
            'face_recognition_status' => 'tidak_digunakan',
            'allow_manual_fallback' => true,
            'require_visual_photo_matching' => true,
        ]);
    }

    public function activeCamera(): BelongsTo
    {
        return $this->belongsTo(CameraDevice::class, 'active_camera_id');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
