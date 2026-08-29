import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  BarChart2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

import { API_URL } from '../config';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || ''
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError('');
    setSuccessMessage('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid email or password');
        }

        throw new Error(
          'An error occurred during login. Please try again.'
        );
      }

      const data = await response.json();

      // Save token
      localStorage.setItem('access_token', data.access_token);

      // Go to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.message || 'Unable to connect to the server.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert('Google Sign-In will be available in a future update.');
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-50 font-sans">

      {/* Brand Panel */}
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
          Welcome Back
        </h1>

        <p className="max-w-md text-lg font-medium text-indigo-100">
          Login to access your seller analytics dashboard.
        </p>
      </div>

      {/* Login Form */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center p-6 sm:p-12">

        {/* Mobile Header */}
        <div className="mb-12 flex w-full max-w-md items-center gap-3 md:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg">
            <BarChart2 className="h-6 w-6 text-white" />
          </div>

          <span className="text-2xl font-bold tracking-tight text-slate-900">
            SellerMetrics
          </span>
        </div>

        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-8 sm:p-10 shadow-xl backdrop-blur-xl">

          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            Login to your account
          </h2>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email Address
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                />

                <label
                  htmlFor="remember-me"
                  className="ml-2 block cursor-pointer text-sm text-slate-600"
                >
                  Remember Me
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#"
                  className="font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
                >
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Login */}
            <button
              type="submit"
              disabled={isLoading}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Logging in...' : 'Login'}

              {!isLoading && (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </form>

          {/* Google */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>

              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 font-medium text-slate-500">
                  OR
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>

                Continue with Google
              </button>
            </div>
          </div>

          {/* Register */}
          <div className="mt-8 text-center text-sm">
            <span className="text-slate-600">
              Don't have an account?{' '}
            </span>

            <Link
              to="/register"
              className="font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
            >
              Create Account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}