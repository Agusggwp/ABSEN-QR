<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. School Settings
        Schema::create('school_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->longText('value')->nullable();
            $table->timestamps();
        });

        // 2. School Years
        Schema::create('school_years', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50); // e.g. "2026/2027"
            $table->enum('semester', ['ganjil', 'genap'])->default('ganjil');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(false)->index();
            $table->timestamps();
        });

        // 3. Classes
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_year_id')->nullable()->constrained('school_years')->nullOnDelete();
            $table->string('name', 50)->index(); // e.g. "X MIPA 1"
            $table->string('grade_level', 20)->default('10');
            $table->foreignId('homeroom_teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 4. Students
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('nis', 30)->unique();
            $table->string('nisn', 30)->nullable()->unique();
            $table->string('name', 150)->index();
            $table->enum('gender', ['L', 'P'])->default('L');
            $table->string('photo_path', 255)->nullable();
            $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->boolean('is_active')->default(true)->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 5. Class Memberships (Mendukung perpindahan kelas tanpa merusak riwayat)
        Schema::create('class_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('school_year_id')->nullable()->constrained('school_years')->nullOnDelete();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'class_id']);
        });

        // 6. Student QR Codes
        Schema::create('student_qr_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('qr_token_hash', 64)->unique(); // SHA-256 hash of random UUID secret token
            $table->string('raw_token_masked', 30)->nullable(); // e.g. "ART-****-9821" for display
            $table->string('card_number', 50)->unique();
            $table->enum('status', ['active', 'revoked', 'replaced'])->default('active')->index();
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamp('revoked_at')->nullable();
            $table->string('revocation_reason', 255)->nullable();
            $table->timestamps();
        });

        // 7. Scanner Devices
        Schema::create('scanner_devices', function (Blueprint $table) {
            $table->id();
            $table->string('device_name', 100);
            $table->string('device_identifier', 64)->unique(); // Secret UUID or API Key
            $table->string('location_description', 150)->nullable();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('last_heartbeat')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 8. School Schedules
        Schema::create('school_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete();
            $table->tinyInteger('day_of_week'); // 1 = Senin, 2 = Selasa, ..., 7 = Minggu
            $table->time('check_in_start')->default('06:00:00');
            $table->time('check_in_end')->default('07:30:00');
            $table->time('late_tolerance_time')->default('07:00:00');
            $table->time('check_out_start')->default('13:30:00');
            $table->time('check_out_end')->default('16:00:00');
            $table->boolean('is_school_day')->default(true);
            $table->timestamps();

            $table->unique(['school_year_id', 'day_of_week']);
        });

        // 9. Holidays
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete();
            $table->date('date')->index();
            $table->string('description', 200);
            $table->timestamps();
        });

        // 10. Attendance Sessions
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_year_id')->nullable()->constrained('school_years')->nullOnDelete();
            $table->date('date')->index();
            $table->enum('type', ['masuk', 'pulang'])->default('masuk');
            $table->time('start_time');
            $table->time('end_time');
            $table->time('late_time');
            $table->enum('status', ['open', 'closed', 'cancelled'])->default('open')->index();
            $table->foreignId('closed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['date', 'type'], 'uniq_session_date_type');
        });

        // 11. Attendances
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('attendance_sessions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->date('date')->index();
            $table->enum('type', ['masuk', 'pulang'])->default('masuk');
            $table->enum('status', ['hadir', 'terlambat', 'izin', 'sakit', 'dispensasi', 'alpa', 'perlu_verifikasi'])->default('hadir')->index();
            $table->enum('verification_status', ['verified_officer', 'pending', 'flagged_suspicious', 'manual_corrected'])->default('verified_officer');
            $table->timestamp('scanned_at')->useCurrent();
            $table->foreignId('scanner_device_id')->nullable()->constrained('scanner_devices')->nullOnDelete();
            $table->foreignId('verified_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('qr_code_id')->nullable()->constrained('student_qr_codes')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->boolean('is_corrected')->default(false);
            $table->timestamps();

            // Constraint unik untuk mencegah scan ganda pada sesi yang sama
            $table->unique(['student_id', 'session_id'], 'uniq_student_attendance_session');
            $table->index(['date', 'class_id', 'status']);
        });

        // 12. Attendance Verifications (Audit detail verifikasi anti-titip)
        Schema::create('attendance_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->constrained('attendances')->cascadeOnDelete();
            $table->enum('verification_method', ['officer_visual', 'classroom_crosscheck', 'manual_override'])->default('officer_visual');
            $table->foreignId('officer_user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('verification_result', ['valid_match', 'identity_mismatch', 'card_passed_without_student', 'anomalous_timing'])->default('valid_match');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 13. Attendance Exceptions (Izin, Sakit, Dispensasi)
        Schema::create('attendance_exceptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->enum('category', ['izin', 'sakit', 'dispensasi'])->default('izin')->index();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('attachment_path', 255)->nullable();
            $table->text('reason');
            $table->foreignId('approved_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['student_id', 'start_date', 'end_date']);
        });

        // 14. Classroom Confirmations (Konfirmasi kehadiran kelas oleh Guru)
        Schema::create('classroom_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('attendance_sessions')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('teacher_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->enum('status', ['present_in_class', 'absent_in_class', 'with_excuse'])->default('present_in_class');
            $table->enum('gate_match_status', ['matched', 'gate_only_missing_class', 'class_only_missing_gate'])->default('matched');
            $table->string('notes', 255)->nullable();
            $table->timestamp('confirmed_at')->useCurrent();
            $table->timestamps();

            $table->unique(['session_id', 'class_id', 'student_id'], 'uniq_classroom_confirmation');
        });

        // 15. Attendance Corrections
        Schema::create('attendance_corrections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->constrained('attendances')->cascadeOnDelete();
            $table->foreignId('corrected_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('previous_status', 50);
            $table->string('new_status', 50);
            $table->text('reason'); // Wajib diisi alasan koreksi
            $table->timestamps();
        });

        // 16. Immutable Audit Logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 100)->index();
            $table->string('entity_type', 100)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload_before')->nullable();
            $table->longText('payload_after')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['entity_type', 'entity_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('attendance_corrections');
        Schema::dropIfExists('classroom_confirmations');
        Schema::dropIfExists('attendance_exceptions');
        Schema::dropIfExists('attendance_verifications');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('attendance_sessions');
        Schema::dropIfExists('holidays');
        Schema::dropIfExists('school_schedules');
        Schema::dropIfExists('scanner_devices');
        Schema::dropIfExists('student_qr_codes');
        Schema::dropIfExists('class_memberships');
        Schema::dropIfExists('students');
        Schema::dropIfExists('classes');
        Schema::dropIfExists('school_years');
        Schema::dropIfExists('school_settings');
    }
};
