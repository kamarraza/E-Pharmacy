'use client';

import { useState } from 'react';

export default function SubscribePage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
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
      price: '$29/month',
      features: ['Access to prescriptions', 'Basic dashboard', 'Email support'],
      popular: false,
    },
    {
      id: 'yearly',
      name: 'Yearly Plan',
      price: '$299/year',
      features: ['All monthly features', 'Priority matching', 'Phone support', 'Save 20%'],
      popular: true,
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      price: '$499/year',
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
          phone: '',
          address: '',
          location: '',
          subscriptionType: '',
        });
        setSelectedPlan('');
      } else {
        setMessage(result.error || 'Failed to subscribe');
      }
    } catch (error) {
      setMessage('Error subscribing');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Subscription Plan</h1>
          <p className="text-xl text-gray-600">Select the plan that best fits your pharmacy's needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 ${
                selectedPlan === plan.id ? 'ring-2 ring-blue-500 transform scale-105' : 'hover:shadow-xl'
              } ${plan.popular ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handlePlanSelect(plan.id)}
            >
              {plan.popular && (
                <div className="bg-blue-500 text-white text-center py-2 text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold text-blue-600 mb-6">{plan.price}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-600">
                      <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition duration-300 ${
                    selectedPlan === plan.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedPlan && (
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white text-center">Complete Your Subscription</h2>
            </div>
            <div className="p-8">
              <p className="text-black mb-6 text-center">Fill in your details to subscribe to the {plans.find(p => p.id === selectedPlan)?.name}.</p>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Location (City/ZIP)</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white p-3 rounded-lg hover:from-green-600 hover:to-blue-600 transition duration-300 font-semibold">
                  Subscribe to {plans.find(p => p.id === selectedPlan)?.name}
                </button>
              </form>
              {message && <p className="mt-4 text-center text-black bg-gray-100 p-3 rounded-lg">{message}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}