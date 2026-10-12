<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Crypt;
use Exception;

class CameraDevice extends Model
{
    protected $fillable = [
        'name',
        'type',
        'brand',
        'model',
        'location',
        'host',
        'port',
        'protocol',
        'credential_reference',
        'status',
        'browser_device_id',
        'resolution_requested',
        'last_checked_at',
        'last_test_result',
        'created_by',
    ];

    protected $hidden = [
        'credential_reference',
    ];

    protected $casts = [
        'port' => 'integer',
        'last_checked_at' => 'datetime',
        'last_test_result' => 'array',
    ];

    protected $appends = [
        'is_credential_configured',
        'masked_host',
    ];

    /**
     * Cek apakah kredensial telah disimpan tanpa membocorkan nilai aslinya.
     */
    public function getIsCredentialConfiguredAttribute(): bool
    {
        return !empty($this->credential_reference);
    }

    /**
     * Sensor alamat host (misal IP 192.168.1.100 -> 192.168.***.***).
     */
    public function getMaskedHostAttribute(): ?string
    {
        if (empty($this->host)) {
            return null;
        }

        $parts = explode('.', $this->host);
        if (count($parts) === 4) {
            return "{$parts[0]}.{$parts[1]}.***.***";
        }

        return substr($this->host, 0, 4) . '****' . substr($this->host, -3);
    }

    /**
     * Simpan kredensial terenkripsi (username, password, verification code).
     */
    public function setEncryptedCredentials(array $credentials): void
    {
        // Hanya simpan jika ada nilai yang valid
        $filtered = array_filter($credentials, fn($val) => !is_null($val) && $val !== '');
        if (empty($filtered)) {
            $this->credential_reference = null;
            return;
        }

        $this->credential_reference = Crypt::encryptString(json_encode($filtered));
    }

    /**
     * Ambil kredensial terdekripsi secara aman di backend.
     */
    public function getDecryptedCredentials(): ?array
    {
        if (empty($this->credential_reference)) {
            return null;
        }

        try {
            $decrypted = Crypt::decryptString($this->credential_reference);
            return json_decode($decrypted, true);
        } catch (Exception $e) {
            return null;
        }
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function testLogs(): HasMany
    {
        return $this->hasMany(DeviceTestLog::class, 'camera_device_id');
    }

    public function activeAttendanceSetting(): HasOne
    {
        return $this->hasOne(AttendanceSetting::class, 'active_camera_id');
    }
}
