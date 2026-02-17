'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  address: string;
  location: string;
  subscriptionType: string;
  subscriptionStart: string;
  subscriptionEnd: string;
}

type EditableField = 'name' | 'phone' | 'address' | 'location';

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [savingField, setSavingField] = useState<EditableField | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState<ProfileData>({
    id: '',
    name: '',
    email: '',
    role: '',
    phone: '',
    address: '',
    location: '',
    subscriptionType: '',
    subscriptionStart: '',
    subscriptionEnd: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (data?.profile) {
          setProfile({
            id: data.profile.id || '',
            name: data.profile.name || '',
            email: data.profile.email || '',
            role: data.profile.role || '',
            phone: data.profile.phone || '',
            address: data.profile.address || '',
            location: data.profile.location || '',
            subscriptionType: data.profile.subscriptionType || '',
            subscriptionStart: data.profile.subscriptionStart || '',
            subscriptionEnd: data.profile.subscriptionEnd || '',
          });
        }
      } catch {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const startEditing = (field: EditableField) => {
    setEditingField(field);
    setDraftValue(profile[field] || '');
    setError('');
    setSuccess('');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setDraftValue('');
  };

  const saveField = async (field: EditableField) => {
    setError('');
    setSuccess('');

    const nextValue = draftValue.trim();
    if (field === 'name' && !nextValue) {
      setError('Name is required.');
      return;
    }

    const nextProfile = { ...profile, [field]: nextValue };
    if (!nextProfile.name.trim()) {
      setError('Name is required.');
      return;
    }

    try {
      setSavingField(field);
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextProfile.name,
          phone: nextProfile.phone,
          address: nextProfile.address,
          location: nextProfile.location,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || 'Failed to update profile.');
        return;
      }
      setSuccess(`${field.charAt(0).toUpperCase()}${field.slice(1)} updated successfully.`);
      if (payload?.profile) {
        setProfile((prev) => ({
          ...prev,
          name: payload.profile.name || prev.name,
          phone: payload.profile.phone || '',
          address: payload.profile.address || '',
          location: payload.profile.location || '',
          subscriptionType: payload.profile.subscriptionType || prev.subscriptionType,
          subscriptionStart: payload.profile.subscriptionStart || prev.subscriptionStart,
          subscriptionEnd: payload.profile.subscriptionEnd || prev.subscriptionEnd,
        }));
      } else {
        setProfile(nextProfile);
      }
      setEditingField(null);
      setDraftValue('');
    } catch {
      setError('Failed to update profile.');
    } finally {
      setSavingField(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-slate-300">Loading profile...</p>
      </div>
    );
  }

  const formatPlanDate = (value: string) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const planName = profile.subscriptionType
    ? `${profile.subscriptionType.charAt(0).toUpperCase()}${profile.subscriptionType.slice(1)} Plan`
    : 'No active plan';

  const renderEditableField = (
    label: string,
    field: EditableField,
    value: string,
    placeholder: string
  ) => {
    const isEditing = editingField === field;
    const isSaving = savingField === field;

    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-200">{label}</p>
          {!isEditing && (
            <button
              type="button"
              onClick={() => startEditing(field)}
              className="rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Edit
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => saveField(field)}
                disabled={isSaving}
                className="rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-100">{value || 'Not set'}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/80 p-8">
        <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
          Account
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white">Profile Details</h1>
        <p className="mt-2 text-slate-300">View and update your account details.</p>

        {profile.role === 'pharmacist' && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Plan Details</h2>
            <div className="mt-3 space-y-1 text-sm text-slate-200">
              <p><strong>Current Plan:</strong> {planName}</p>
              <p><strong>Start Date:</strong> {formatPlanDate(profile.subscriptionStart)}</p>
              <p><strong>End Date:</strong> {formatPlanDate(profile.subscriptionEnd)}</p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-slate-400"
            />
          </div>

          {renderEditableField('Name', 'name', profile.name, 'Enter your full name')}
          {renderEditableField('Phone', 'phone', profile.phone, 'Enter phone number')}
          {renderEditableField('Address', 'address', profile.address, 'Enter address')}
          {profile.role === 'pharmacist' && (
            renderEditableField('Service Location (City/ZIP)', 'location', profile.location, 'Enter service location')
          )}

          {error && <p className="rounded-xl bg-rose-300/15 px-4 py-3 text-sm text-rose-100">{error}</p>}
          {success && <p className="rounded-xl bg-emerald-300/15 px-4 py-3 text-sm text-emerald-100">{success}</p>}
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
