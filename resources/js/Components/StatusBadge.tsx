import React from 'react';
import { AttendanceStatus } from '@/types';

interface StatusBadgeProps {
    status: AttendanceStatus | string;
    size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
    const statusMap: Record<
        string,
        { label: string; bg: string; text: string; border: string }
    > = {
        hadir: {
            label: 'HADIR',
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
        },
        terlambat: {
            label: 'TERLAMBAT',
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
        },
        izin: {
            label: 'IZIN',
            bg: 'bg-sky-50',
            text: 'text-sky-700',
            border: 'border-sky-200',
        },
        sakit: {
            label: 'SAKIT',
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            border: 'border-purple-200',
        },
        dispensasi: {
            label: 'DISPENSASI',
            bg: 'bg-indigo-50',
            text: 'text-indigo-700',
            border: 'border-indigo-200',
        },
        alpa: {
            label: 'ALPA',
            bg: 'bg-rose-50',
            text: 'text-rose-700',
            border: 'border-rose-200',
        },
        perlu_verifikasi: {
            label: 'PERLU VERIFIKASI',
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            border: 'border-orange-200',
        },
        active: {
            label: 'AKTIF',
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
        },
        revoked: {
            label: 'DICABUT',
            bg: 'bg-rose-50',
            text: 'text-rose-700',
            border: 'border-rose-200',
        },
        replaced: {
            label: 'DIGANTI',
            bg: 'bg-gray-100',
            text: 'text-gray-700',
            border: 'border-gray-200',
        },
    };

    const current = statusMap[status] || {
        label: status.toUpperCase(),
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200',
    };

    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

    return (
        <span
            className={`inline-flex items-center font-bold tracking-wide rounded-md border ${sizeClasses} ${current.bg} ${current.text} ${current.border}`}
        >
            {current.label}
        </span>
    );
}
