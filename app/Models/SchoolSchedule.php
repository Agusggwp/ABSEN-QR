<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolSchedule extends Model
{
    protected $fillable = [
        'school_year_id',
        'day_of_week',
        'check_in_start',
        'check_in_end',
        'late_tolerance_time',
        'check_out_start',
        'check_out_end',
        'is_school_day',
    ];

    protected function casts(): array
    {
        return [
            'is_school_day' => 'boolean',
        ];
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }
}
