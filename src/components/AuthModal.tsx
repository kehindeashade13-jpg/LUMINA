import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { signUpWithEmail, signInWithEmail } from '../services/supabase';
import { LuminaUser } from '../types/study';
import LuminaLogo from './LuminaLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: LuminaUser) => void;
  defaultMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  defaultMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) {
          setErrorMessage('Please provide your full name.');
          setIsLoading(false);
          return;
        }

        const { user, error } = await signUpWithEmail(email, password, fullName);
        if (error) throw error;
        if (user) {
          setSuccessNotice('Account created successfully! Welcome to LUMINA.');
          setTimeout(() => {
            onAuthSuccess(user);
            onClose();
          }, 600);
        } else {
          setSuccessNotice('Registration received! You can now log in.');
          setMode('signin');
        }
      } else {
        const { user, error } = await signInWithEmail(email, password);
        if (error) throw error;
        if (user) {
          setSuccessNotice(`Welcome back, ${user.fullName || 'Scholar'}!`);
          setTimeout(() => {
            onAuthSuccess(user);
            onClose();
          }, 500);
        }
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please check credentials.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-neutral-900 border border-[#34495E]/80 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-[#8E44AD]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3 flex justify-center">
            <LuminaLogo size={80} showText={false} />
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">
            {mode === 'signup' ? 'Create Your LUMINA Account' : 'Welcome Back to LUMINA'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            {mode === 'signup'
              ? 'Get personalized study spaces, private document storage, and adaptive recall stats.'
              : 'Sign in to access your private study notes, flashcards, and quizzes.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-neutral-950 rounded-2xl border border-[#34495E]/60 mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl transition ${
              mode === 'signin'
                ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl transition ${
              mode === 'signup'
                ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-4 p-3 rounded-xl bg-[#2ECC71]/15 border border-[#2ECC71]/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2ECC71]" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Kehinde Ashade"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-[#34495E]/60 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-[#8E44AD] transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-[#34495E]/60 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-[#8E44AD] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-neutral-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-[#34495E]/60 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-[#8E44AD] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-neutral-500 hover:text-neutral-300 transition"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {mode === 'signup' && (
              <p className="text-[10px] text-neutral-400 mt-1">
                At least 6 characters. Stored securely with Supabase Auth encryption.
              </p>
            )}
          </div>

          {/* Submit Button (Deep Violet #8E44AD) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#8E44AD]/30 transition active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#F1C40F]" />
                <span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
