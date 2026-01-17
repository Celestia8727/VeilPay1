'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
    return (
        <Toaster
            position="bottom-right"
            toastOptions={{
                className: 'glass-card',
                style: {
                    background: 'rgba(18, 18, 24, 0.9)',
                    color: '#fff',
                    border: '1px solid rgba(0, 245, 255, 0.3)',
                },
            }}
        />
    );
}
