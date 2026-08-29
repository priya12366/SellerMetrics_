import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  BarChart2,
  User,
  Building2,
  AlertCircle
} from 'lucide-react';

import { API_URL } from '../config';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const {
      fullName,
      businessName,
      email,
      password,
      confirmPassword,
      terms
    } = formData;

    if (
      !fullName ||
      !businessName ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError('Please fill in all fields.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!terms) {
      setError('You must agree to the Terms and Privacy Policy.');
      return;
    }

    setIsLoading(true);

    try {
      // Production backend URL comes from src/config.js
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: fullName,
          business_name: businessName,
          email: email,
          password: password,
          confirm_password: confirmPassword
        })
      });

      let data;

      try {
        data = await response.json();
      } catch (jsonErr) {
        data = {};
      }

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('This email is already registered.');
        }

        const backendError = data.detail
          ? typeof data.detail === 'string'
            ? data.detail
            : data.detail[0]?.msg
          : null;

        throw new Error(
          backendError || 'Registration failed. Please try again.'
        );
      }

      // Registration successful
      navigate('/login', {
        state: {
          message: 'Account created successfully. Please login.'
        }
      });
    } catch (err) {
      if (err.name === 'TypeError') {
        setError(
          'Unable to connect to the server. Please try again.'
        );
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-50 font-sans">

      {/* Brand Panel - Left */}
      <div className="hidden md:flex w-full md:w-1/2 flex-col justify-center bg-gradient-to-br from-indigo-600 to-indigo-500 p-12 lg:p-24 text-white">
        <div className="mb-12 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg">
            <BarChart2 className="h-6 w-6 text-indigo-600" />
          </div>

          <span className="text-2xl font-bold tracking-tight">
            SellerMetrics
          </span>
        </div>

        <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight">
          Create Seller Account
        </h1>

        <p className="max-w-md text-lg font-medium text-indigo-100">
          Start managing your Meesho business from one intelligent dashboard.
        </p>
      </div>

      {/* Register Form - Right */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center overflow-y-auto p-6 sm:p-12">

        {/* Mobile Header */}
        <div className="mb-12 mt-8 flex w-full max-w-md items-center gap-3 md:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg">
            <BarChart2 className="h-6 w-6 text-white" />
          </div>

          <span className="text-2xl font-bold tracking-tight text-slate-900">
            SellerMetrics
          </span>
        </div>

        <div className="my-8 w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-8 sm:p-10 shadow-xl backdrop-blur-xl md:my-0">

          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            Get started for free
          </h2>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>

            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Full Name
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <User className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Business Name */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Business Name
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Building2 className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Doe Enterprise"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email Address
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Confirm Password
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Terms and Privacy */}
            <div className="mt-4 flex items-start pt-2">
              <div className="flex h-5 items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={formData.terms}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>

              <div className="ml-3 text-sm">
                <label
                  htmlFor="terms"
                  className="cursor-pointer text-slate-600"
                >
                  I agree to the{' '}
                  <a
                    href="#"
                    className="font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Terms
                  </a>{' '}
                  &{' '}
                  <a
                    href="#"
                    className="font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={
                isLoading
                  ? "mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-indigo-400 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-200 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                  : "mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
              }
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}

              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-slate-600">
              Already have an account?{' '}
            </span>

            <Link
              to="/login"
              className="font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}