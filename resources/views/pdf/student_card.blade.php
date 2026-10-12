<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kartu Absensi QR - {{ $student->name }}</title>
    <style>
        @page {
            size: 85.6mm 53.98mm; /* Ukuran Standar Kartu ID Card CR80 */
            margin: 0;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            color: #1a1a1a;
            -webkit-print-color-adjust: exact;
        }
        .card-container {
            width: 85.6mm;
            height: 53.98mm;
            box-sizing: border-box;
            border: 1px solid #14433b;
            position: relative;
            overflow: hidden;
            background: #ffffff;
        }
        .card-header {
            background-color: #14433b;
            color: #ffffff;
            padding: 4mm 5mm 3mm 5mm;
            border-bottom: 2px solid #21c9a4;
        }
        .school-title {
            font-size: 8pt;
            font-weight: bold;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin: 0;
            color: #21c9a4;
        }
        .school-subtitle {
            font-size: 6pt;
            color: #e0e0e0;
            margin: 1px 0 0 0;
        }
        .card-body {
            padding: 3mm 5mm;
        }
        .photo-box {
            float: left;
            width: 22mm;
            height: 28mm;
            border: 1px solid #ccc;
            border-radius: 3px;
            background-color: #f5f5f5;
            text-align: center;
            overflow: hidden;
        }
        .photo-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .photo-placeholder {
            font-size: 7pt;
            color: #888;
            padding-top: 10mm;
        }
        .student-info {
            float: left;
            margin-left: 4mm;
            width: 28mm;
        }
        .info-label {
            font-size: 5.5pt;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 0.5px;
        }
        .info-value {
            font-size: 7pt;
            font-weight: bold;
            color: #14433b;
            margin-bottom: 2mm;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .qr-box {
            float: right;
            width: 22mm;
            text-align: center;
        }
        .qr-image {
            width: 20mm;
            height: 20mm;
        }
        .qr-card-no {
            font-size: 5pt;
            color: #666;
            margin-top: 1mm;
            font-family: monospace;
        }
        .card-footer {
            clear: both;
            position: absolute;
            bottom: 0;
            width: 100%;
            background-color: #f7f9f8;
            border-top: 1px solid #eaeaea;
            padding: 1.5mm 5mm;
            font-size: 5pt;
            color: #555;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="card-container">
        <div class="card-header">
            @if(!empty($logoPath) && file_exists(public_path('storage/' . $logoPath)))
                <img src="{{ public_path('storage/' . $logoPath) }}" style="float: left; width: 6.5mm; height: 6.5mm; object-fit: contain; margin-right: 2.5mm; background: #ffffff; padding: 0.5mm; border-radius: 2px;">
            @endif
            <div class="school-title">{{ $schoolName ?? 'SMA ARTDEVATA DENPASAR' }}</div>
            <div class="school-subtitle">KARTU TANDA SISWA & ABSENSI RESMI</div>
        </div>
        <div class="card-body">
            <div class="photo-box">
                @php
                    $studentPhoto = null;
                    if (!empty($student->photo_path)) {
                        if (file_exists(public_path('storage/' . $student->photo_path))) {
                            $studentPhoto = public_path('storage/' . $student->photo_path);
                        } elseif (file_exists(public_path($student->photo_path))) {
                            $studentPhoto = public_path($student->photo_path);
                        }
                    }
                @endphp
                @if($studentPhoto)
                    <img src="{{ $studentPhoto }}" alt="Foto">
                @else
                    <div class="photo-placeholder">FOTO 3x4</div>
                @endif
            </div>

            <div class="student-info">
                <div class="info-label">Nama Siswa</div>
                <div class="info-value">{{ $student->name }}</div>

                <div class="info-label">NIS / NISN</div>
                <div class="info-value">{{ $student->nis }} {{ $student->nisn ? '/ ' . $student->nisn : '' }}</div>

                <div class="info-label">Kelas</div>
                <div class="info-value">{{ $student->schoolClass?->name ?? '-' }}</div>
            </div>

            <div class="qr-box">
                <!-- QR Code SVG / Base64 -->
                <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={{ urlencode($qrToken) }}" alt="QR Code">
                <div class="qr-card-no">{{ $cardNumber }}</div>
            </div>
        </div>
        <div class="card-footer">
            Sistem Anti-Titip Absen &bull; Wajib diverifikasi petugas saat scan gerbang
        </div>
    </div>
</body>
</html>
