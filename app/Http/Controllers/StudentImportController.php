<?php

namespace App\Http\Controllers;

use App\Services\ExcelImportExportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentImportController extends Controller
{
    public function __construct(
        protected ExcelImportExportService $excelService
    ) {}

    public function index(): Response
    {
        return Inertia::render('Students/Import');
    }

    public function downloadTemplate(): StreamedResponse
    {
        return $this->excelService->downloadStudentTemplate();
    }

    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240', // Maks 10MB
        ], [
            'file.required' => 'Pilih file Excel (.xlsx / .csv) untuk diunggah.',
            'file.mimes' => 'Format file harus berupa Excel (.xlsx, .xls) atau .csv.',
            'file.max' => 'Ukuran file tidak boleh melebihi 10MB.',
        ]);

        $result = $this->excelService->previewImportFile($request->file('file'));

        return response()->json($result);
    }

    public function commit(Request $request): RedirectResponse
    {
        $request->validate([
            'valid_rows' => 'required|array|min:1',
            'valid_rows.*.nis' => 'required|string',
            'valid_rows.*.name' => 'required|string',
            'valid_rows.*.gender' => 'required|in:L,P',
            'valid_rows.*.class_id' => 'required|exists:classes,id',
        ], [
            'valid_rows.required' => 'Tidak ada baris data valid yang dapat disimpan.',
        ]);

        $result = $this->excelService->commitImport(
            $request->input('valid_rows'),
            auth()->id()
        );

        return redirect()->route('students.index')->with('success', $result['message']);
    }
}
