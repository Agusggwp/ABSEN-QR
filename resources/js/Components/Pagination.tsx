import React from 'react';
import { Link } from '@inertiajs/react';

interface PaginationProps {
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

export default function Pagination({ links }: PaginationProps) {
    if (!links || links.length <= 3) return null;

    return (
        <div className="flex flex-wrap items-center justify-center gap-1 py-4">
            {links.map((link, idx) => {
                // Bersihkan simbol &laquo; dan &raquo; dari Laravel
                const cleanLabel = link.label
                    .replace('&laquo;', '‹')
                    .replace('&raquo;', '›')
                    .replace('Previous', 'Sebelumnya')
                    .replace('Next', 'Berikutnya');

                if (!link.url) {
                    return (
                        <span
                            key={idx}
                            className="px-3 py-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed"
                            dangerouslySetInnerHTML={{ __html: cleanLabel }}
                        />
                    );
                }

                return (
                    <Link
                        key={idx}
                        href={link.url}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            link.active
                                ? 'bg-[#14433b] border-[#14433b] text-white font-bold'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                        dangerouslySetInnerHTML={{ __html: cleanLabel }}
                    />
                );
            })}
        </div>
    );
}
