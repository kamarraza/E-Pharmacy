'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
    phone: '',
    address: '',
    location: '',
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subscriptionType: formData.role === 'pharmacist' ? null : undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Registration successful! You can now login.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setMessage(result.error || 'Registration failed');
      }
    } catch {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/85 p-8 shadow-2xl">
        <div className="mb-6">
          <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
            Create Account
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">Join E-Pharmacy</h1>
          <p className="mt-2 text-slate-300">
            Register as a patient or pharmacy and start using the platform immediately.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
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

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-200">
              {formData.role === 'patient' ? 'Full Name' : 'Pharmacy Name'}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
              placeholder={formData.role === 'patient' ? 'Enter your full name' : 'Enter pharmacy name'}
            />
          </div>

          <div className="md:col-span-2">
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

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
              placeholder="Confirm your password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
              placeholder="Enter your phone number"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
              placeholder="Enter your address"
            />
          </div>

          {formData.role === 'pharmacist' && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-200">Service Location (City/ZIP)</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                placeholder="Enter service location"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </div>
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
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
