import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: LucideIcon;
    badge?: string;
}

export default function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    badge,
}: StatCardProps) {
    return (
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                    {title}
                </span>
                {Icon && (
                    <div className="p-1.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
                        <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                )}
            </div>

            <div className="mt-2">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                        {value}
                    </span>
                    {badge && (
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {badge}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className="mt-1 text-xs text-slate-500 truncate">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
