import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: string;
    color?: 'brand' | 'accent' | 'amber' | 'blue' | 'rose' | 'purple';
}

export default function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color = 'brand',
}: StatCardProps) {
    const colorStyles = {
        brand: {
            bg: 'bg-[#14433b]/5 text-[#14433b]',
            border: 'border-[#14433b]/10',
            iconBg: 'bg-[#14433b]/10 text-[#14433b]',
        },
        accent: {
            bg: 'bg-[#21c9a4]/5 text-[#14433b]',
            border: 'border-[#21c9a4]/20',
            iconBg: 'bg-[#21c9a4]/20 text-[#14433b]',
        },
        amber: {
            bg: 'bg-amber-500/5 text-amber-700',
            border: 'border-amber-200',
            iconBg: 'bg-amber-100 text-amber-600',
        },
        blue: {
            bg: 'bg-sky-500/5 text-sky-700',
            border: 'border-sky-200',
            iconBg: 'bg-sky-100 text-sky-600',
        },
        rose: {
            bg: 'bg-rose-500/5 text-rose-700',
            border: 'border-rose-200',
            iconBg: 'bg-rose-100 text-rose-600',
        },
        purple: {
            bg: 'bg-purple-500/5 text-purple-700',
            border: 'border-purple-200',
            iconBg: 'bg-purple-100 text-purple-600',
        },
    };

    const style = colorStyles[color];

    return (
        <div
            className={`p-5 bg-white rounded-xl border ${style.border} shadow-sm transition-all hover:shadow-md`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {title}
                    </p>
                    <h3 className="mt-1 text-2xl font-extrabold text-gray-900 tracking-tight">
                        {value}
                    </h3>
                    {subtitle && (
                        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${style.iconBg}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
