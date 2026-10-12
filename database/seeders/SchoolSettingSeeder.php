<?php

namespace Database\Seeders;

use App\Models\SchoolSetting;
use Illuminate\Database\Seeder;

class SchoolSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'school_name' => 'SMA ARTDEVATA DENPASAR',
            'school_npsn' => '50102030',
            'school_address' => 'Jl. Bypass Ngurah Rai No. 88, Denpasar, Bali',
            'school_phone' => '(0361) 234567',
            'school_email' => 'info@artdevata.sch.id',
            'school_website' => 'https://artdevata.sch.id',
            'timezone' => 'Asia/Makassar',
            'headmaster_name' => 'Dr. Ni Ketut Suryani, M.Pd.',
            'headmaster_nip' => '197505122000032001',
            'anti_titip_require_officer_confirm' => '1',
            'late_tolerance_minutes' => '15',
            'cctv_enabled' => '0',
            'cctv_stream_url' => '',
            'cctv_model' => 'EZVIZ H8c 2K',
            'cctv_status' => 'Belum didukung (Perlu Pengujian Kompatibilitas RTSP)',
        ];

        foreach ($settings as $key => $value) {
            SchoolSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }
    }
}
