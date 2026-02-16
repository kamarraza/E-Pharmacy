'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'patient',
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Login successful! Redirecting...');
        const redirectPath = formData.role === 'patient' ? '/upload' : '/dashboard';
        window.location.assign(redirectPath);
        return;
      } else {
        setMessage(result.error || 'Login failed');
      }
    } catch {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        <section className="glass-panel rounded-3xl border border-white/10 p-8">
          <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Welcome Back
          </p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Sign in to continue care coordination</h1>
          <p className="mt-4 text-slate-300">
            Access your account to upload prescriptions, track status, or manage incoming requests from nearby patients.
          </p>
          <div className="mt-8 space-y-3 text-sm text-slate-200">
            <p>Patient flow: Upload, track, and review history.</p>
            <p>Pharmacist flow: Receive alerts and assign requests quickly.</p>
            <p>Single platform designed for speed and local coverage.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/85 p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white">Login to E-Pharmacy</h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">I am a</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 focus:border-cyan-300 focus:outline-none"
              >
                <option value="patient">Patient</option>
                <option value="pharmacist">Pharmacist</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          {message && (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-center text-sm ${
                message.includes('successful')
                  ? 'bg-emerald-300/15 text-emerald-100'
                  : 'bg-rose-300/15 text-rose-100'
              }`}
            >
              {message}
            </p>
          )}
          <p className="mt-6 text-sm text-slate-300">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-cyan-200 hover:text-cyan-100">
              Register here
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
