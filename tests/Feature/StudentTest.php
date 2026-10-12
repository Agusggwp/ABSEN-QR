<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\SchoolSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        SchoolSetting::set('school_name', 'SMK TI ARTDEVATA BALI');
        SchoolSetting::set('timezone', 'Asia/Makassar');
    }

    public function test_can_create_student_with_photo(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create([
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);

        $class = SchoolClass::create([
            'name' => 'X-RPL-1',
            'grade_level' => 10,
            'major' => 'RPL',
            'is_active' => true,
        ]);

        $file = UploadedFile::fake()->image('pasfoto.jpg', 300, 400);

        $response = $this->actingAs($admin)->post('/students', [
            'nis' => '20269999',
            'nisn' => '0099887766',
            'name' => 'Aditya Pratama',
            'gender' => 'L',
            'class_id' => $class->id,
            'photo' => $file,
        ]);

        $response->assertRedirect('/students');
        $student = Student::where('nis', '20269999')->firstOrFail();
        $this->assertNotNull($student->photo_path);
        Storage::disk('public')->assertExists($student->photo_path);
    }

    public function test_can_update_and_remove_student_photo(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create([
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);

        $class = SchoolClass::create([
            'name' => 'X-RPL-1',
            'grade_level' => 10,
            'major' => 'RPL',
            'is_active' => true,
        ]);

        $student = Student::create([
            'nis' => '20268888',
            'name' => 'Sinta Dewi',
            'gender' => 'P',
            'class_id' => $class->id,
            'is_active' => true,
            'photo_path' => 'students/photos/old_photo.jpg',
        ]);

        // Test update with new photo
        $newFile = UploadedFile::fake()->image('new_photo.png', 300, 400);
        $this->actingAs($admin)->put("/students/{$student->id}", [
            'nis' => '20268888',
            'name' => 'Sinta Dewi',
            'gender' => 'P',
            'class_id' => $class->id,
            'is_active' => 1,
            'photo' => $newFile,
        ]);

        $student->refresh();
        $this->assertNotNull($student->photo_path);
        Storage::disk('public')->assertExists($student->photo_path);

        // Test remove photo
        $this->actingAs($admin)->put("/students/{$student->id}", [
            'nis' => '20268888',
            'name' => 'Sinta Dewi',
            'gender' => 'P',
            'class_id' => $class->id,
            'is_active' => 1,
            'remove_photo' => 1,
        ]);

        $student->refresh();
        $this->assertNull($student->photo_path);
    }
}
