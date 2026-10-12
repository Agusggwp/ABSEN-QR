import React from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function ToastNotification() {
    const { props } = usePage<PageProps>();
    const flash = props.flash;
    const [visible, setVisible] = React.useState(false);
    const [type, setType] = React.useState<'success' | 'error' | 'warning' | 'info'>('success');
    const [message, setMessage] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (flash.success) {
            setType('success');
            setMessage(String(flash.success));
            setVisible(true);
        } else if (flash.error) {
            setType('error');
            setMessage(String(flash.error));
            setVisible(true);
        } else if (flash.warning) {
            setType('warning');
            setMessage(String(flash.warning));
            setVisible(true);
        } else if (flash.info) {
            setType('info');
            setMessage(String(flash.info));
            setVisible(true);
        }
    }, [flash]);

    React.useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(() => {
            setVisible(false);
        }, 5000);
        return () => clearTimeout(timer);
    }, [visible]);

    if (!visible || !message) return null;

    const styles = {
        success: {
            bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
            icon: CheckCircle2,
            iconColor: 'text-emerald-600',
        },
        error: {
            bg: 'bg-red-50 border-red-200 text-red-900',
            icon: AlertCircle,
            iconColor: 'text-red-600',
        },
        warning: {
            bg: 'bg-amber-50 border-amber-200 text-amber-900',
            icon: AlertTriangle,
            iconColor: 'text-amber-600',
        },
        info: {
            bg: 'bg-blue-50 border-blue-200 text-blue-900',
            icon: Info,
            iconColor: 'text-blue-600',
        },
    };

    const currentStyle = styles[type];
    const Icon = currentStyle.icon;

    return (
        <div className="fixed z-50 bottom-5 right-5 max-w-md animate-in slide-in-from-bottom-5">
            <div
                className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${currentStyle.bg}`}
            >
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${currentStyle.iconColor}`} />
                <div className="flex-1 text-xs font-medium leading-relaxed">{message}</div>
                <button
                    onClick={() => setVisible(false)}
                    className="p-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
