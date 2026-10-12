import React, { PropsWithChildren, useState } from 'react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import ToastNotification from '@/Components/ToastNotification';

interface AuthenticatedLayoutProps {
    title?: string;
    header?: React.ReactNode;
}

export default function AuthenticatedLayout({
    children,
    title,
    header,
}: PropsWithChildren<AuthenticatedLayoutProps>) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#f8faf9] flex">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
                {/* Topbar */}
                <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />

                {/* Page Body */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                    {children}
                </main>

                {/* Flash Toast Alerts */}
                <ToastNotification />
            </div>
        </div>
    );
}
