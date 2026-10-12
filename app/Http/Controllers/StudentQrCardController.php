<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentQrCode;
use App\Models\SchoolClass;
use App\Services\QrSecurityService;
use App\Services\PdfReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class StudentQrCardController extends Controller
{
    public function __construct(
        protected QrSecurityService $qrSecurityService,
        protected PdfReportService $pdfService
    ) {}

    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $classId = $request->query('class_id');
        $status = $request->query('status', 'active');
        $perPage = min((int) $request->query('per_page', 15), 100);

        $query = StudentQrCode::with(['student.schoolClass'])->latest();

        if ($search) {
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('nis', 'like', "%{$search}%");
            })->orWhere('card_number', 'like', "%{$search}%");
        }

        if ($classId) {
            $query->whereHas('student', function ($q) use ($classId) {
                $q->where('class_id', $classId);
            });
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $cards = $query->paginate($perPage)->withQueryString();
        $classes = SchoolClass::orderBy('name')->get(['id', 'name']);

        return Inertia::render('QrCards/Index', [
            'cards' => $cards,
            'classes' => $classes,
            'filters' => [
                'search' => $search,
                'class_id' => $classId,
                'status' => $status,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function regenerate(Student $student): RedirectResponse
    {
        $result = $this->qrSecurityService->generateTokenForStudent($student);

        return redirect()->back()->with('success', "Kartu QR baru berhasil diterbitkan untuk siswa {$student->name}. Kartu lama telah dinonaktifkan.");
    }

    public function revoke(Request $request, StudentQrCode $card): RedirectResponse
    {
        $request->validate([
            'reason' => 'required|string|max:255',
        ], [
            'reason.required' => 'Wajib mengisi alasan pencabutan kartu.',
        ]);

        $this->qrSecurityService->revokeCard($card->id, $request->input('reason'), auth()->id());

        return redirect()->back()->with('success', "Kartu QR {$card->card_number} berhasil dicabut.");
    }

    public function printSingle(Student $student): SymfonyResponse
    {
        $tokenData = $this->qrSecurityService->getActiveTokenForStudent($student);
        $rawToken = $tokenData['raw_secret_token'];

        return $this->pdfService->generateSingleStudentCard($student, $rawToken);
    }

    public function printBulk(Request $request): SymfonyResponse
    {
        $classId = $request->query('class_id');
        $query = Student::with(['schoolClass', 'activeQrCode'])->where('is_active', true);

        if ($classId) {
            $query->where('class_id', $classId);
        }

        $students = $query->take(30)->get(); // Cetak per halaman/batch 30 kartu

        $cardsData = $students->map(function ($std) {
            $tokenData = $this->qrSecurityService->getActiveTokenForStudent($std);
            return [
                'student' => $std,
                'card_number' => $tokenData['qr_code']->card_number,
                'qr_token' => $tokenData['raw_secret_token'],
            ];
        })->toArray();

        return $this->pdfService->generateBulkStudentCards($cardsData);
    }
}
