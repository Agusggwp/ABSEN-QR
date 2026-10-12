import React from 'react';
import { Menu, Clock, Calendar, ShieldCheck, User as UserIcon } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

interface TopbarProps {
    onMenuClick: () => void;
    title?: string;
}

export default function Topbar({ onMenuClick, title }: TopbarProps) {
    const { props } = usePage<PageProps>();
    const { auth, app_settings } = props;
    const user = auth.user;

    const [currentTime, setCurrentTime] = React.useState<string>('');

    React.useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                }) + ' WITA'
            );
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm sm:px-6">
            {/* Left: Mobile Menu & Page Title */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="p-2 text-gray-600 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none"
                    aria-label="Toggle menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-base font-bold text-[#14433b] sm:text-lg">
                        {title || 'Dashboard'}
                    </h2>
                    <p className="hidden text-xs text-gray-500 sm:block">
                        {app_settings?.school_name || 'SMA ARTDEVATA DENPASAR'}
                    </p>
                </div>
            </div>

            {/* Right: Clock & User Badge */}
            <div className="flex items-center gap-4">
                {/* Server Synchronized Clock */}
                <div className="items-center hidden gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 border border-gray-200 text-[#14433b] md:flex">
                    <Clock className="w-4 h-4 text-[#21c9a4]" />
                    <span className="font-mono tracking-wider">{currentTime || '--:--:--'}</span>
                </div>

                {/* User Info Capsule */}
                <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-gray-900 leading-tight">
                            {user?.name}
                        </div>
                        <div className="text-[10px] text-[#14433b] font-medium uppercase tracking-wider">
                            {user?.role?.replace('_', ' ')}
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#14433b] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-[#21c9a4]/40">
                        {user?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                    </div>
                </div>
            </div>
        </header>
    );
}
