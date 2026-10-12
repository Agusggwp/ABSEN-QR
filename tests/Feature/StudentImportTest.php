<?php

namespace Tests\Feature;

use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use App\Services\ExcelImportExportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentImportTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected SchoolClass $class;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);

        SchoolYear::create([
            'name' => '2026/2027',
            'start_date' => '2026-07-15',
            'end_date' => '2027-06-20',
            'is_active' => true,
        ]);

        $this->class = SchoolClass::create([
            'name' => 'X-RPL-1',
            'grade_level' => 10,
            'major' => 'Rekayasa Perangkat Lunak',
            'is_active' => true,
        ]);
    }

    public function test_import_commit_inserts_students_and_generates_qr_cards()
    {
        $validRows = [
            [
                'row_number' => 2,
                'nis' => '20269901',
                'nisn' => '0099887711',
                'name' => 'Wayan Aditya',
                'gender' => 'L',
                'class_name' => 'X-RPL-1',
                'class_id' => $this->class->id,
            ],
            [
                'row_number' => 3,
                'nis' => '20269902',
                'nisn' => '0099887712',
                'name' => 'Ni Made Lestari',
                'gender' => 'P',
                'class_name' => 'X-RPL-1',
                'class_id' => $this->class->id,
            ],
        ];

        $response = $this->actingAs($this->admin)->post('/students/import/commit', [
            'valid_rows' => $validRows,
        ]);

        $response->assertRedirect('/students');

        $this->assertDatabaseHas('students', [
            'nis' => '20269901',
            'name' => 'Wayan Aditya',
        ]);

        $this->assertDatabaseHas('students', [
            'nis' => '20269902',
            'name' => 'Ni Made Lestari',
        ]);

        // Verify active QR cards were automatically generated for both
        $student1 = Student::where('nis', '20269901')->first();
        $student2 = Student::where('nis', '20269902')->first();

        $this->assertDatabaseHas('student_qr_codes', [
            'student_id' => $student1->id,
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('student_qr_codes', [
            'student_id' => $student2->id,
            'status' => 'active',
        ]);
    }

    public function test_template_download_is_accessible()
    {
        $response = $this->actingAs($this->admin)->get('/students/import/template');
        $response->assertOk();
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
}
