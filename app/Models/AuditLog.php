<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    public const UPDATED_AT = null; // Immutable audit log, only created_at

    protected $fillable = [
        'user_id',
        'action',
        'entity_type',
        'entity_id',
        'ip_address',
        'user_agent',
        'payload_before',
        'payload_after',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function log(
        string $action,
        ?string $entityType = null,
        ?int $entityId = null,
        mixed $payloadBefore = null,
        mixed $payloadAfter = null,
        ?int $userId = null
    ): self {
        return static::create([
            'user_id' => $userId ?? auth()->id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'ip_address' => request()->ip(),
            'user_agent' => substr(request()->userAgent() ?? '', 0, 500),
            'payload_before' => $payloadBefore ? (is_string($payloadBefore) ? $payloadBefore : json_encode($payloadBefore)) : null,
            'payload_after' => $payloadAfter ? (is_string($payloadAfter) ? $payloadAfter : json_encode($payloadAfter)) : null,
            'created_at' => now(),
        ]);
    }
}
