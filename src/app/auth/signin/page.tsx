// src/app/auth/signin/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

// ─── Inner form — reads searchParams (must be inside Suspense) ───────────────

const SignInForm: React.FC = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(
    urlError === 'CredentialsSignin' ? 'Invalid email or password.' : null
  );

  /**
   * Handles form submission by invoking NextAuth Credentials sign-in.
   * @param e - The form submit event.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);

    try {
      await signIn('credentials', {
        email,
        password,
        callbackUrl,
        redirect: true,
      });
      // redirect: true means NextAuth handles navigation on success.
      // If we reach here without redirect, a non-redirect error occurred.
    } catch {
      // signIn with redirect:true typically navigates away; catching here is a safety net.
      setFormError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Email */}
      <div className="mb-4">
        <label
          htmlFor="email"
          className="block text-sm font-medium mb-1"
          style={{ color: '#1A1A1A' }}
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="
            w-full px-4 py-2.5 rounded-xl border border-gray-200
            text-sm bg-white outline-none transition
            focus:ring-2 focus:ring-[#1B5E20] focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          placeholder="admin@store.com"
        />
      </div>

      {/* Password */}
      <div className="mb-6">
        <label
          htmlFor="password"
          className="block text-sm font-medium mb-1"
          style={{ color: '#1A1A1A' }}
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="
            w-full px-4 py-2.5 rounded-xl border border-gray-200
            text-sm bg-white outline-none transition
            focus:ring-2 focus:ring-[#1B5E20] focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          placeholder="••••••••"
        />
      </div>

      {/* Error message */}
      {formError && (
        <div
          role="alert"
          className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200"
        >
          <p className="text-red-600 text-sm">{formError}</p>
        </div>
      )}

      {/* Submit button — hardcoded Green-Gold primary since SiteConfig is unavailable here */}
      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className="
          w-full flex items-center justify-center gap-2
          px-4 py-3 rounded-xl text-white text-sm font-semibold
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
          active:scale-[0.97] hover:opacity-90
        "
        style={{ backgroundColor: '#1B5E20' }}
      >
        {isLoading ? (
          <>
            {/* Inline SVG spinner — avoids importing the Spinner component on auth page */}
            <svg
              className="animate-spin w-4 h-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  );
};

// ─── Page shell ──────────────────────────────────────────────────────────────

/**
 * Admin sign-in page rendered at /auth/signin.
 * Uses hardcoded Green-Gold preset colors since SiteConfig is not available
 * before authentication.
 */
const SignInPage: React.FC = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#FAFAFA' }}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img
              src="/icons/icon-192.png"
              alt="Store Logo"
              className="w-16 h-16 mx-auto mb-4 rounded-xl object-cover"
              onError={(e) => {
                // Gracefully hide broken logo image
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: '#1A1A1A' }}
            >
              Admin Login
            </h1>
            <p className="text-sm mt-1" style={{ color: '#757575' }}>
              Sign in to manage your store
            </p>
          </div>

          {/* Form wrapped in Suspense because useSearchParams() requires it in Next.js 14 */}
          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <svg
                  className="animate-spin w-6 h-6"
                  style={{ color: '#1B5E20' }}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              </div>
            }
          >
            <SignInForm />
          </Suspense>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs mt-6" style={{ color: '#9E9E9E' }}>
          Eid E-Commerce Platform &mdash; Admin Only
        </p>
      </div>
    </div>
  );
};

export default SignInPage;