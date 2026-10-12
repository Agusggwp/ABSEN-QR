<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\AttendanceException;
use App\Models\SchoolSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceExceptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        SchoolSetting::set('school_name', 'SMK TI ARTDEVATA BALI');
        SchoolSetting::set('timezone', 'Asia/Makassar');
    }

    public function test_can_search_students_for_exception(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);

        $class = SchoolClass::create([
            'name' => 'XII IPA 1',
            'grade_level' => 12,
            'major' => 'IPA',
            'is_active' => true,
        ]);

        $student = Student::create([
            'name' => 'Budi Santoso',
            'nis' => '123456',
            'class_id' => $class->id,
            'gender' => 'L',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->getJson('/exceptions/students/search?q=Budi');

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'id' => $student->id,
            'name' => 'Budi Santoso',
            'nis' => '123456',
        ]);
    }

    public function test_can_store_attendance_exception_with_selected_student(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);

        $student = Student::create([
            'name' => 'Siti Aminah',
            'nis' => '654321',
            'gender' => 'P',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->post('/exceptions', [
            'student_id' => $student->id,
            'category' => 'izin',
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'reason' => 'Ada acara keluarga di luar kota',
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('attendance_exceptions', [
            'student_id' => $student->id,
            'category' => 'izin',
            'reason' => 'Ada acara keluarga di luar kota',
        ]);
    }

    public function test_fails_to_store_exception_without_student(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->post('/exceptions', [
            'student_id' => null,
            'category' => 'izin',
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'reason' => 'Surat izin',
        ]);

        $response->assertSessionHasErrors(['student_id']);
    }
}
