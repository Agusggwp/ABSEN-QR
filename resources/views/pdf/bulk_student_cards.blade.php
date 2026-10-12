<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Cetak Massal Kartu Siswa</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 10mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #1a1a1a;
            -webkit-print-color-adjust: exact;
        }
        .page-grid {
            width: 100%;
        }
        .card-wrapper {
            float: left;
            width: 88mm;
            height: 56mm;
            margin: 3mm;
            border: 1px dashed #aaa;
            box-sizing: border-box;
            page-break-inside: avoid;
        }
        .card-inner {
            width: 85.6mm;
            height: 53.98mm;
            margin: 1mm auto;
            border: 1px solid #14433b;
            background: #ffffff;
            position: relative;
            overflow: hidden;
        }
        .card-header {
            background-color: #14433b;
            color: #ffffff;
            padding: 2.5mm 4mm;
            border-bottom: 2px solid #21c9a4;
        }
        .school-title {
            font-size: 7.5pt;
            font-weight: bold;
            color: #21c9a4;
            margin: 0;
        }
        .school-subtitle {
            font-size: 5.5pt;
            color: #e0e0e0;
            margin: 0;
        }
        .card-body {
            padding: 2.5mm 4mm;
        }
        .photo-box {
            float: left;
            width: 20mm;
            height: 25mm;
            border: 1px solid #ccc;
            border-radius: 2px;
            background-color: #f5f5f5;
            text-align: center;
        }
        .photo-placeholder {
            font-size: 6pt;
            color: #888;
            padding-top: 10mm;
        }
        .student-info {
            float: left;
            margin-left: 3mm;
            width: 32mm;
        }
        .info-label {
            font-size: 5pt;
            color: #666;
            text-transform: uppercase;
        }
        .info-value {
            font-size: 6.5pt;
            font-weight: bold;
            color: #14433b;
            margin-bottom: 1.5mm;
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
            width: 19mm;
            height: 19mm;
        }
        .qr-card-no {
            font-size: 4.5pt;
            color: #666;
            margin-top: 0.5mm;
            font-family: monospace;
        }
        .card-footer {
            position: absolute;
            bottom: 0;
            width: 100%;
            background-color: #f7f9f8;
            border-top: 1px solid #eaeaea;
            padding: 1mm 3mm;
            font-size: 4.5pt;
            color: #555;
            text-align: center;
        }
        .clearfix::after {
            content: "";
            clear: both;
            display: table;
        }
    </style>
</head>
<body>
    <div class="page-grid clearfix">
        @foreach($cards as $c)
            <div class="card-wrapper">
                <div class="card-inner">
                    <div class="card-header">
                        @if(!empty($logoPath) && file_exists(public_path('storage/' . $logoPath)))
                            <img src="{{ public_path('storage/' . $logoPath) }}" style="float: left; width: 5.5mm; height: 5.5mm; object-fit: contain; margin-right: 2mm; background: #ffffff; padding: 0.4mm; border-radius: 2px;">
                        @endif
                        <div class="school-title">{{ $schoolName ?? 'SMA ARTDEVATA DENPASAR' }}</div>
                        <div class="school-subtitle">KARTU ABSENSI RESMI SISWA</div>
                    </div>
                    <div class="card-body clearfix">
                        <div class="photo-box">
                            @php
                                $cPhoto = null;
                                if (!empty($c['student']->photo_path)) {
                                    if (file_exists(public_path('storage/' . $c['student']->photo_path))) {
                                        $cPhoto = public_path('storage/' . $c['student']->photo_path);
                                    } elseif (file_exists(public_path($c['student']->photo_path))) {
                                        $cPhoto = public_path($c['student']->photo_path);
                                    }
                                }
                            @endphp
                            @if($cPhoto)
                                <img src="{{ $cPhoto }}" alt="Foto" style="width: 100%; height: 100%; object-fit: cover;">
                            @else
                                <div class="photo-placeholder">FOTO</div>
                            @endif
                        </div>
                        <div class="student-info">
                            <div class="info-label">Nama</div>
                            <div class="info-value">{{ $c['student']->name }}</div>

                            <div class="info-label">NIS</div>
                            <div class="info-value">{{ $c['student']->nis }}</div>

                            <div class="info-label">Kelas</div>
                            <div class="info-value">{{ $c['student']->schoolClass?->name ?? '-' }}</div>
                        </div>
                        <div class="qr-box">
                            <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={{ urlencode($c['qr_token']) }}" alt="QR">
                            <div class="qr-card-no">{{ $c['card_number'] }}</div>
                        </div>
                    </div>
                    <div class="card-footer">
                        Sistem Anti-Titip Absen &bull; Validasi Otoritas Server
                    </div>
                </div>
            </div>
        @endforeach
    </div>
</body>
</html>
