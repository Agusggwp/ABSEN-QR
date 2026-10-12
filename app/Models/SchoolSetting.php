<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        if (!$setting || $setting->value === null || $setting->value === '') {
            return $default;
        }

        $decoded = json_decode($setting->value, true);
        return (json_last_error() === JSON_ERROR_NONE) ? $decoded : $setting->value;
    }

    public static function set(string $key, mixed $value): void
    {
        if ($value === null || $value === '') {
            static::where('key', $key)->delete();
            return;
        }

        $encoded = is_array($value) ? json_encode($value) : (string) $value;
        static::updateOrCreate(
            ['key' => $key],
            ['value' => $encoded]
        );
    }
}
