<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class StudentAccountService
{
    /**
     * Buat atau hubungkan akun login untuk murid tertentu.
     */
    public function createAccountForStudent(
        Student $student,
        ?string $rawPassword = null,
        bool $mustChangePassword = true
    ): User {
        return DB::transaction(function () use ($student, $rawPassword, $mustChangePassword) {
            // Jika murid sudah memiliki akun terhubung
            if ($student->user_id) {
                $existingUser = User::find($student->user_id);
                if ($existingUser) {
                    return $existingUser;
                }
            }

            $username = $student->nis ?: ('murid_' . $student->id);
            $email = $username . '@student.artdevata.sch.id';
            $defaultPassword = $rawPassword ?: ('Siswa@' . $username);

            // Periksa jika username/email sudah digunakan user lain
            $user = User::where('username', $username)
                ->orWhere('email', $email)
                ->orWhere('student_id', $student->id)
                ->first();

            if ($user) {
                // Hubungkan user yang ada
                $user->update([
                    'student_id' => $student->id,
                    'role' => 'murid',
                    'username' => $username,
                ]);
            } else {
                $user = User::create([
                    'name' => $student->name,
                    'username' => $username,
                    'email' => $email,
                    'password' => Hash::make($defaultPassword),
                    'role' => 'murid',
                    'student_id' => $student->id,
                    'is_active' => true,
                    'must_change_password' => $mustChangePassword,
                ]);
            }

            // Update relasi dua arah
            $student->update(['user_id' => $user->id]);

            AuditLog::log(
                action: 'student.account_created',
                entityType: 'User',
                entityId: $user->id,
                payloadBefore: null,
                payloadAfter: [
                    'student_id' => $student->id,
                    'username' => $username,
                    'role' => 'murid',
                ]
            );

            return $user;
        });
    }

    /**
     * Buat akun massal untuk kumpulan murid.
     */
    public function bulkCreateAccounts(array $studentIds = []): array
    {
        $query = Student::query();
        if (!empty($studentIds)) {
            $query->whereIn('id', $studentIds);
        } else {
            $query->whereNull('user_id');
        }

        $students = $query->get();
        $created = 0;
        $skipped = 0;

        foreach ($students as $student) {
            if ($student->user_id && User::where('id', $student->user_id)->exists()) {
                $skipped++;
                continue;
            }

            $this->createAccountForStudent($student);
            $created++;
        }

        return [
            'total' => $students->count(),
            'created' => $created,
            'skipped' => $skipped,
        ];
    }

    /**
     * Reset password akun murid ke default (Siswa@{NIS}) dan tandai wajib ganti password.
     */
    public function resetStudentPassword(Student $student): string
    {
        $user = $student->user;
        if (!$user) {
            $user = $this->createAccountForStudent($student);
        }

        $username = $user->username ?: $student->nis;
        $newPassword = 'Siswa@' . $username;

        $user->update([
            'password' => Hash::make($newPassword),
            'must_change_password' => true,
        ]);

        AuditLog::log(
            action: 'student.password_reset',
            entityType: 'User',
            entityId: $user->id,
            payloadBefore: null,
            payloadAfter: ['student_id' => $student->id]
        );

        return $newPassword;
    }

    /**
     * Aktifkan atau nonaktifkan akun murid.
     */
    public function toggleAccountStatus(Student $student): bool
    {
        $user = $student->user;
        if (!$user) {
            $user = $this->createAccountForStudent($student);
        }

        $newStatus = !$user->is_active;
        $user->update(['is_active' => $newStatus]);

        AuditLog::log(
            action: 'student.status_toggled',
            entityType: 'User',
            entityId: $user->id,
            payloadBefore: ['is_active' => !$newStatus],
            payloadAfter: ['is_active' => $newStatus]
        );

        return $newStatus;
    }
}
