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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

    return (
        <div className="min-h-screen bg-[#f8faf9] flex">
            {/* Sidebar Desktop & Mobile */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarCollapsed={sidebarCollapsed}
                toggleSidebar={toggleSidebar}
            />

            {/* Main Content Area */}
            <div
                className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
                    sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
                }`}
            >
                {/* Topbar */}
                <Topbar
                    onMenuClick={() => setSidebarOpen(true)}
                    title={title}
                    sidebarCollapsed={sidebarCollapsed}
                    toggleSidebar={toggleSidebar}
                />

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
