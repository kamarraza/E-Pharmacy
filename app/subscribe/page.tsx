'use client';

import { useState } from 'react';

export default function SubscribePage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    location: '',
    subscriptionType: '',
  });
  const [message, setMessage] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: '₹299/month',
      features: ['Access to prescriptions', 'Basic dashboard', 'Email support'],
      popular: false,
    },
    {
      id: 'yearly',
      name: 'Yearly Plan',
      price: '₹999/year',
      features: ['All monthly features', 'Priority matching', 'Phone support', 'Save 20%'],
      popular: true,
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      price: '₹2999/year',
      features: ['All yearly features', 'Advanced analytics', 'Dedicated account manager', 'Custom integrations'],
      popular: false,
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setFormData({ ...formData, subscriptionType: planId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      setMessage('Please select a subscription plan.');
      return;
    }
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'pharmacist' }),
      });
      const result = await response.json();
      if (response.ok) {
        setMessage('Subscription successful! You can now access the dashboard.');
        setFormData({
          name: '',
          email: '',
          password: '',
          phone: '',
          address: '',
          location: '',
          subscriptionType: '',
        });
        setSelectedPlan('');
      } else {
        setMessage(result.error || 'Failed to subscribe');
      }
    } catch {
      setMessage('Error subscribing');
    }
  };

  return (
    <div className="min-h-screen px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Pharmacy Subscription
          </p>
          <h1 className="mt-4 text-4xl font-bold text-white">Grow with Local Prescription Demand</h1>
          <p className="mt-2 text-slate-300">
            Pick a plan, activate your profile, and start receiving nearby prescription requests.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-3xl border p-6 transition ${
                selectedPlan === plan.id
                  ? 'border-cyan-300 bg-cyan-300/10'
                  : 'border-white/10 bg-slate-900/80 hover:border-white/25'
              }`}
            >
              {plan.popular && (
                <p className="mb-4 inline-flex rounded-full bg-emerald-300/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                  Most Popular
                </p>
              )}
              <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
              <p className="mt-2 text-3xl font-bold text-cyan-200">{plan.price}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-200">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <button
                className={`mt-6 w-full rounded-xl px-4 py-3 font-semibold transition ${
                  selectedPlan === plan.id
                    ? 'bg-cyan-300 text-slate-900'
                    : 'border border-white/20 text-slate-100 hover:bg-white/10'
                }`}
                onClick={() => handlePlanSelect(plan.id)}
              >
                {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
              </button>
            </article>
          ))}
        </div>

        {selectedPlan && (
          <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-white/10 bg-slate-900/85 p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white">Complete Your Subscription</h2>
            <p className="mt-2 text-slate-300">
              Fill in your details to subscribe to the {plans.find((plan) => plan.id === selectedPlan)?.name}.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-200">Pharmacy Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 focus:border-cyan-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-200">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 focus:border-cyan-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-200">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 focus:border-cyan-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-200">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 focus:border-cyan-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-200">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 focus:border-cyan-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-200">Service Location (City/ZIP)</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 focus:border-cyan-300 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-900 transition hover:bg-cyan-200"
                >
                  Subscribe to {plans.find((plan) => plan.id === selectedPlan)?.name}
                </button>
              </div>
            </form>
            {message && (
              <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-center text-sm text-slate-100">{message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
