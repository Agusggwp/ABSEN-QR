import React from 'react';
import { AttendanceStatus } from '@/types';

interface StatusBadgeProps {
    status: AttendanceStatus | string;
    size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
    const statusMap: Record<
        string,
        { label: string; bg: string; text: string; dot: string; border: string }
    > = {
        hadir: {
            label: 'Hadir',
            bg: 'bg-emerald-50',
            text: 'text-emerald-800',
            dot: 'bg-emerald-500',
            border: 'border-emerald-200',
        },
        terlambat: {
            label: 'Terlambat',
            bg: 'bg-amber-50',
            text: 'text-amber-800',
            dot: 'bg-amber-500',
            border: 'border-amber-200',
        },
        izin: {
            label: 'Izin',
            bg: 'bg-sky-50',
            text: 'text-sky-800',
            dot: 'bg-sky-500',
            border: 'border-sky-200',
        },
        sakit: {
            label: 'Sakit',
            bg: 'bg-purple-50',
            text: 'text-purple-800',
            dot: 'bg-purple-500',
            border: 'border-purple-200',
        },
        dispensasi: {
            label: 'Dispensasi',
            bg: 'bg-indigo-50',
            text: 'text-indigo-800',
            dot: 'bg-indigo-500',
            border: 'border-indigo-200',
        },
        alpa: {
            label: 'Alpa',
            bg: 'bg-rose-50',
            text: 'text-rose-800',
            dot: 'bg-rose-500',
            border: 'border-rose-200',
        },
        perlu_verifikasi: {
            label: 'Perlu Verifikasi',
            bg: 'bg-orange-50',
            text: 'text-orange-800',
            dot: 'bg-orange-500',
            border: 'border-orange-200',
        },
        active: {
            label: 'Aktif',
            bg: 'bg-emerald-50',
            text: 'text-emerald-800',
            dot: 'bg-emerald-500',
            border: 'border-emerald-200',
        },
        revoked: {
            label: 'Dicabut',
            bg: 'bg-rose-50',
            text: 'text-rose-800',
            dot: 'bg-rose-500',
            border: 'border-rose-200',
        },
        replaced: {
            label: 'Diganti',
            bg: 'bg-slate-50',
            text: 'text-slate-700',
            dot: 'bg-slate-400',
            border: 'border-slate-200',
        },
    };

    const current = statusMap[status.toLowerCase()] || {
        label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        dot: 'bg-slate-400',
        border: 'border-slate-200',
    };

    const sizeClasses =
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

    return (
        <span
            className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${current.bg} ${current.text} ${current.border}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${current.dot}`} />
            <span>{current.label}</span>
        </span>
    );
}
