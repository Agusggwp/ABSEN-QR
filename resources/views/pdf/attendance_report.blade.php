<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 15mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #222;
            font-size: 8.5pt;
            line-height: 1.4;
        }
        .header-kop {
            text-align: center;
            border-bottom: 2px solid #14433b;
            padding-bottom: 3mm;
            margin-bottom: 4mm;
        }
        .kop-instansi {
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #555;
        }
        .kop-sekolah {
            font-size: 13pt;
            font-weight: bold;
            color: #14433b;
            margin: 1mm 0;
        }
        .kop-alamat {
            font-size: 7.5pt;
            color: #666;
        }
        .report-title {
            text-align: center;
            font-size: 11pt;
            font-weight: bold;
            color: #14433b;
            text-transform: uppercase;
            margin: 3mm 0 1mm 0;
        }
        .report-subtitle {
            text-align: center;
            font-size: 8pt;
            color: #666;
            margin-bottom: 4mm;
        }
        .summary-boxes {
            width: 100%;
            margin-bottom: 4mm;
        }
        .summary-box {
            float: left;
            width: 18%;
            margin-right: 2%;
            background: #f7faf9;
            border: 1px solid #d3e4e1;
            padding: 2mm;
            text-align: center;
            border-radius: 3px;
        }
        .summary-box:last-child {
            margin-right: 0;
        }
        .summary-count {
            font-size: 12pt;
            font-weight: bold;
            color: #14433b;
        }
        .summary-label {
            font-size: 6.5pt;
            text-transform: uppercase;
            color: #666;
        }
        .table-data {
            width: 100%;
            border-collapse: collapse;
            margin-top: 3mm;
        }
        .table-data th {
            background-color: #14433b;
            color: #ffffff;
            font-weight: bold;
            padding: 2mm 1.5mm;
            font-size: 7.5pt;
            border: 1px solid #14433b;
            text-align: center;
        }
        .table-data td {
            padding: 1.5mm;
            border: 1px solid #ddd;
            font-size: 7.5pt;
        }
        .table-data tr:nth-child(even) {
            background-color: #fdfdfd;
        }
        .text-center {
            text-align: center;
        }
        .status-badge {
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 2px;
            font-size: 6.5pt;
            text-transform: uppercase;
        }
        .status-hadir { color: #0d6832; }
        .status-terlambat { color: #b45309; }
        .status-izin { color: #0284c7; }
        .status-sakit { color: #6d28d9; }
        .status-alpa { color: #b91c1c; }
        .footer-ttd {
            margin-top: 8mm;
            width: 100%;
        }
        .ttd-box {
            float: right;
            width: 50mm;
            text-align: center;
            font-size: 8pt;
        }
        .ttd-space {
            height: 18mm;
        }
        .clearfix::after {
            content: "";
            clear: both;
            display: table;
        }
    </style>
</head>
<body>
    <div class="header-kop">
        <div class="kop-instansi">PEMERINTAH PROVINSI BALI &bull; DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA</div>
        <div class="kop-sekolah">{{ $schoolName ?? 'SMA ARTDEVATA DENPASAR' }}</div>
        <div class="kop-alamat">{{ $schoolAddress ?? 'Jl. Bypass Ngurah Rai No. 88, Denpasar, Bali | Telp: (0361) 234567 | NPSN: 50102030' }}</div>
    </div>

    <div class="report-title">{{ $title }}</div>
    <div class="report-subtitle">Periode: {{ $periodInfo ?? now()->translatedFormat('d F Y') }}</div>

    <div class="summary-boxes clearfix">
        <div class="summary-box">
            <div class="summary-count">{{ $stats['total'] ?? 0 }}</div>
            <div class="summary-label">Total Record</div>
        </div>
        <div class="summary-box">
            <div class="summary-count">{{ $stats['hadir'] ?? 0 }}</div>
            <div class="summary-label">Hadir Tepat</div>
        </div>
        <div class="summary-box">
            <div class="summary-count">{{ $stats['terlambat'] ?? 0 }}</div>
            <div class="summary-label">Terlambat</div>
        </div>
        <div class="summary-box">
            <div class="summary-count">{{ ($stats['izin'] ?? 0) + ($stats['sakit'] ?? 0) }}</div>
            <div class="summary-label">Izin / Sakit</div>
        </div>
        <div class="summary-box">
            <div class="summary-count">{{ $stats['alpa'] ?? 0 }}</div>
            <div class="summary-label">Alpa</div>
        </div>
    </div>

    <table class="table-data">
        <thead>
            <tr>
                <th width="5%">No</th>
                <th width="12%">Tanggal</th>
                <th width="12%">NIS</th>
                <th width="28%">Nama Siswa</th>
                <th width="13%">Kelas</th>
                <th width="10%">Jam Scan</th>
                <th width="10%">Status</th>
                <th width="10%">Petugas</th>
            </tr>
        </thead>
        <tbody>
            @forelse($attendances as $idx => $item)
                <tr>
                    <td class="text-center">{{ $idx + 1 }}</td>
                    <td class="text-center">{{ $item->date ? \Carbon\Carbon::parse($item->date)->format('d/m/Y') : '-' }}</td>
                    <td class="text-center">{{ $item->student?->nis ?? '-' }}</td>
                    <td>{{ $item->student?->name ?? '-' }}</td>
                    <td class="text-center">{{ $item->schoolClass?->name ?? '-' }}</td>
                    <td class="text-center">{{ $item->scanned_at ? \Carbon\Carbon::parse($item->scanned_at)->format('H:i:s') : '-' }}</td>
                    <td class="text-center">
                        <span class="status-badge status-{{ $item->status }}">
                            {{ strtoupper($item->status) }}
                        </span>
                    </td>
                    <td class="text-center">{{ $item->verifiedByUser?->name ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" class="text-center">Tidak ada data absensi untuk filter yang dipilih.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer-ttd clearfix">
        <div class="ttd-box">
            Denpasar, {{ now()->translatedFormat('d F Y') }}<br>
            Kepala Sekolah,
            <div class="ttd-space"></div>
            <strong><u>{{ $headmasterName ?? 'Dr. Ni Ketut Suryani, M.Pd.' }}</u></strong><br>
            NIP. {{ $headmasterNip ?? '197505122000032001' }}
        </div>
    </div>
</body>
</html>
