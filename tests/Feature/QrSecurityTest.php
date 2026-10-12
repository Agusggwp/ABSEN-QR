<?php

namespace Tests\Feature;

use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\StudentQrCode;
use App\Models\User;
use App\Services\QrSecurityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected QrSecurityService $qrService;
    protected User $admin;
    protected SchoolYear $academicYear;
    protected SchoolClass $class;

    protected function setUp(): void
    {
        parent::setUp();
        $this->qrService = new QrSecurityService();

        $this->admin = User::factory()->create([
            'role' => 'admin_sekolah',
            'is_active' => true,
        ]);

        $this->academicYear = SchoolYear::create([
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

    public function test_qr_generation_stores_sha256_hash_not_raw_secret()
    {
        $student = Student::create([
            'nis' => '20261001',
            'name' => 'Budi Pratama',
            'gender' => 'L',
            'is_active' => true,
        ]);

        $result = $this->qrService->generateTokenForStudent($student);
        $rawSecret = $result['raw_secret_token'];
        $qrCode = $result['qr_code'];

        $this->assertNotEmpty($rawSecret);
        $this->assertDatabaseHas('student_qr_codes', [
            'student_id' => $student->id,
            'qr_token_hash' => hash('sha256', $rawSecret),
            'status' => 'active',
        ]);
    }

    public function test_token_hash_lookup_finds_correct_student()
    {
        $student = Student::create([
            'nis' => '20261002',
            'name' => 'Siti Rahma',
            'gender' => 'P',
            'is_active' => true,
        ]);

        $result = $this->qrService->generateTokenForStudent($student);
        $rawSecret = $result['raw_secret_token'];

        $foundCard = $this->qrService->findByRawToken($rawSecret);
        $this->assertNotNull($foundCard);
        $this->assertEquals($student->id, $foundCard->student_id);
    }

    public function test_invalid_raw_token_is_rejected()
    {
        $result = $this->qrService->findByRawToken('INVALID_TOKEN_RANDOM_123');
        $this->assertNull($result);
    }

    public function test_revoked_card_is_not_active()
    {
        $student = Student::create([
            'nis' => '20261003',
            'name' => 'Ahmad Dani',
            'gender' => 'L',
            'is_active' => true,
        ]);

        $result = $this->qrService->generateTokenForStudent($student);
        $qrCode = $result['qr_code'];

        $this->qrService->revokeCard($qrCode->id, 'Kartu hilang', $this->admin->id);

        $qrCode->refresh();
        $this->assertEquals('revoked', $qrCode->status);
    }

    public function test_regenerating_card_avoids_duplicate_card_number()
    {
        $student = Student::create([
            'nis' => '20261004',
            'name' => 'Dewi Lestari',
            'gender' => 'P',
            'is_active' => true,
        ]);

        // First card issuance: KARTU-0000X
        $firstResult = $this->qrService->generateTokenForStudent($student);
        $firstCard = $firstResult['qr_code'];
        $expectedBaseNumber = 'KARTU-' . str_pad((string) $student->id, 5, '0', STR_PAD_LEFT);
        $this->assertEquals($expectedBaseNumber, $firstCard->card_number);

        // Second card issuance: should safely increment to -V2 and NOT crash with duplicate key
        $secondResult = $this->qrService->generateTokenForStudent($student);
        $secondCard = $secondResult['qr_code'];
        $this->assertEquals($expectedBaseNumber . '-V2', $secondCard->card_number);
        $this->assertEquals('active', $secondCard->status);

        $firstCard->refresh();
        $this->assertEquals('replaced', $firstCard->status);
    }

    public function test_get_active_token_encrypts_legacy_card_in_place_without_duplicate_error()
    {
        $student = Student::create([
            'nis' => '20261005',
            'name' => 'Fajar Nugraha',
            'gender' => 'L',
            'is_active' => true,
        ]);

        $cardNumber = 'KARTU-' . str_pad((string) $student->id, 5, '0', STR_PAD_LEFT);

        // Create legacy card without qr_token_encrypted
        $legacyCard = StudentQrCode::create([
            'student_id' => $student->id,
            'qr_token_hash' => hash('sha256', 'LEGACY-OLD-SECRET'),
            'qr_token_encrypted' => null,
            'raw_token_masked' => 'LEGACY****',
            'card_number' => $cardNumber,
            'status' => 'active',
            'issued_at' => now(),
        ]);

        $activeToken = $this->qrService->getActiveTokenForStudent($student);

        $this->assertNotEmpty($activeToken['raw_secret_token']);
        $this->assertEquals($cardNumber, $activeToken['qr_code']->card_number);
        $this->assertNotNull($activeToken['qr_code']->qr_token_encrypted);
        $this->assertEquals($legacyCard->id, $activeToken['qr_code']->id);
    }
}
