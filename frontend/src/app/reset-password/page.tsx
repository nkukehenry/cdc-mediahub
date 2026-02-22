'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid or missing reset token.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setStatus('error');
            setMessage('Password must be at least 8 characters long.');
            return;
        }

        setStatus('loading');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage('Your password has been reset successfully. You can now log in with your new password.');
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                setStatus('error');
                setMessage(data.error?.message || 'Failed to reset password. The link may be expired.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Failed to connect to the server. Please try again.');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl px-6 py-8 md:px-10">
            {status === 'success' ? (
                <div className="text-center py-4">
                    <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
                    <p className="text-gray-600 mb-6">{message}</p>
                    <p className="text-sm text-au-grey-text/50">Redirecting to login in 3 seconds...</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-au-green focus:border-transparent outline-none transition-all"
                            placeholder="Min. 8 characters"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-au-green focus:border-transparent outline-none transition-all"
                            placeholder="Repeat your password"
                        />
                    </div>

                    {status === 'error' && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'loading' || !token}
                        className="w-full py-3 px-4 bg-au-green hover:bg-au-corporate-green text-white font-semibold rounded-xl shadow-lg transition-colors disabled:opacity-50"
                    >
                        {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <PublicNav />

            <div className="flex-1 pt-32 pb-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-au-grey-text">Set New Password</h1>
                        <p className="mt-3 text-sm text-au-grey-text/70">
                            Please enter your new password below.
                        </p>
                    </div>

                    <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </div>
            </div>

            <PublicFooter />
        </div>
    );
}
