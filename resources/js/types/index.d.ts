export type UserRole = 'super_admin' | 'admin_sekolah' | 'petugas_absensi' | 'guru_wali' | 'kepala_sekolah' | 'murid';

export interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    phone?: string | null;
    is_active?: boolean;
    email_verified_at?: string;
}

export interface SchoolClass {
    id: number;
    name: string;
    grade_level: string;
    homeroom_teacher_id?: number | null;
    homeroom_teacher?: User | null;
    total_students?: number;
}

export interface StudentQrCode {
    id: number;
    student_id: number;
    card_number: string;
    raw_token_masked?: string | null;
    status: 'active' | 'revoked' | 'replaced';
    issued_at: string;
}

export interface Student {
    id: number;
    nis: string;
    nisn?: string | null;
    name: string;
    gender: 'L' | 'P';
    photo_path?: string | null;
    class_id?: number | null;
    school_class?: SchoolClass | null;
    active_qr_code?: StudentQrCode | null;
    is_active: boolean;
    notes?: string | null;
}

export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'dispensasi' | 'alpa' | 'perlu_verifikasi';

export interface Attendance {
    id: number;
    session_id: number;
    student_id: number;
    class_id?: number | null;
    date: string;
    type: 'masuk' | 'pulang';
    status: AttendanceStatus;
    verification_status: 'verified_officer' | 'pending' | 'flagged_suspicious' | 'manual_corrected';
    scanned_at: string;
    scanner_device_id?: number | null;
    scanner_device?: ScannerDevice | null;
    verified_by_user_id?: number | null;
    notes?: string | null;
    is_corrected: boolean;
    student?: Student | null;
    school_class?: SchoolClass | null;
    verified_by_user?: User | null;
    corrections?: Array<{
        id: number;
        previous_status: string;
        new_status: string;
        reason: string;
        corrected_by_user?: User | null;
        created_at: string;
    }>;
}

export interface AttendanceSession {
    id: number;
    date: string;
    type: 'masuk' | 'pulang';
    start_time: string;
    end_time: string;
    late_time: string;
    status: 'open' | 'closed' | 'cancelled';
}

export interface ScannerDevice {
    id: number;
    device_name: string;
    device_identifier: string;
    location_description?: string | null;
    assigned_user_id?: number | null;
    assigned_user?: User | null;
    ip_address?: string | null;
    last_heartbeat?: string | null;
    is_active: boolean;
    is_online?: boolean;
}

export interface CameraDevice {
    id: number;
    name: string;
    type: 'webcam' | 'cctv';
    brand?: string | null;
    model?: string | null;
    location?: string | null;
    host?: string | null;
    masked_host?: string | null;
    port?: number | null;
    protocol?: string | null;
    status: 'terhubung' | 'tidak_terhubung' | 'belum_diuji' | 'tidak_memiliki_izin' | 'stream_tidak_tersedia' | 'konfigurasi_tidak_valid' | 'nonaktif' | 'gangguan';
    browser_device_id?: string | null;
    resolution_requested?: string | null;
    is_credential_configured?: boolean;
    last_checked_at?: string | null;
    last_test_result?: any;
    created_by?: number | null;
    created_at?: string;
    updated_at?: string;
    creator?: User | null;
}

export interface AttendanceSetting {
    id: number;
    qr_scanner_mode: 'browser_camera' | 'usb_scanner';
    identity_verification_mode: 'officer_manual' | 'webcam_visual' | 'cctv_visual';
    active_camera_id?: number | null;
    fallback_mode: 'officer_manual';
    face_recognition_status: 'tidak_digunakan' | 'belum_dikonfigurasi' | 'sedang_diuji' | 'siap_diujicoba' | 'aktif' | 'gangguan';
    allow_manual_fallback: boolean;
    require_visual_photo_matching: boolean;
    active_camera?: CameraDevice | null;
    updated_by?: number | null;
    updated_at?: string;
}

export interface DeviceTestLog {
    id: number;
    camera_device_id: number;
    camera_device?: CameraDevice | null;
    tested_by: number;
    tested_by_user?: User | null;
    test_type: string;
    result: 'success' | 'failed' | 'warning';
    error_code?: string | null;
    message?: string | null;
    details?: any;
    tested_at: string;
}

export interface AuditLogItem {
    id: number;
    user_id?: number | null;
    user?: User | null;
    action: string;
    entity_type?: string | null;
    entity_id?: number | null;
    ip_address?: string | null;
    user_agent?: string | null;
    payload_before?: string | null;
    payload_after?: string | null;
    created_at: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash: {
        success?: string | null;
        error?: string | null;
        warning?: string | null;
        info?: string | null;
    };
    app_settings: {
        school_name: string;
        timezone: string;
        logo_path?: string | null;
    };
};
