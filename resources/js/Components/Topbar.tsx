import React from 'react';
import { Menu, Clock, PanelLeftClose, PanelLeft, User as UserIcon } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

interface TopbarProps {
    onMenuClick: () => void;
    title?: string;
    sidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

export default function Topbar({
    onMenuClick,
    title,
    sidebarCollapsed = false,
    toggleSidebar,
}: TopbarProps) {
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
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs sm:px-6">
            {/* Left: Sidebar Toggle & Page Title */}
            <div className="flex items-center gap-3">
                {/* Mobile Hamburger Menu */}
                <button
                    onClick={onMenuClick}
                    className="p-2 text-slate-600 dark:text-slate-300 rounded-lg lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
                    aria-label="Toggle mobile menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Desktop Collapse/Expand Sidebar Button */}
                {toggleSidebar && (
                    <button
                        onClick={toggleSidebar}
                        className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hidden lg:flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={sidebarCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
                    >
                        {sidebarCollapsed ? (
                            <PanelLeft className="w-5 h-5" />
                        ) : (
                            <PanelLeftClose className="w-5 h-5" />
                        )}
                    </button>
                )}

                <div>
                    <h2 className="text-base font-extrabold text-[#14433b] dark:text-white sm:text-lg leading-tight">
                        {title || 'Dashboard'}
                    </h2>
                    <p className="hidden text-[11px] text-slate-400 dark:text-slate-400 font-medium sm:block">
                        {app_settings?.school_name || 'SMA ARTDEVATA DENPASAR'}
                    </p>
                </div>
            </div>

            {/* Right: Clock & User Capsule */}
            <div className="flex items-center gap-4">
                {/* Server Synchronized Clock */}
                <div className="items-center hidden gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[#14433b] dark:text-[#21c9a4] md:flex">
                    <Clock className="w-4 h-4 text-[#21c9a4]" />
                    <span className="font-mono tracking-wider">{currentTime || '--:--:--'}</span>
                </div>

                {/* User Info Capsule */}
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {user?.name}
                        </div>
                        <div className="text-[10px] text-[#14433b] dark:text-[#21c9a4] font-semibold uppercase tracking-wider">
                            {user?.role?.replace('_', ' ')}
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#14433b] text-[#21c9a4] flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-[#21c9a4]/40">
                        {user?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                    </div>
                </div>
            </div>
        </header>
    );
}
