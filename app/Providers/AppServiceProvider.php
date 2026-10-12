<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        try {
            $tz = \App\Models\SchoolSetting::get('timezone', config('app.timezone', 'Asia/Makassar'));
            if ($tz) {
                date_default_timezone_set($tz);
                config(['app.timezone' => $tz]);
            }
        } catch (\Throwable $e) {
            // Abaikan saat migration atau instalasi awal sebelum tabel dibuat
        }
    }
}
