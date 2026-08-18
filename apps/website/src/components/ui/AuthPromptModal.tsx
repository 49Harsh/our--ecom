'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Lock, X } from 'lucide-react';

interface AuthPromptModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  redirectUrl?: string;
}

export default function AuthPromptModal({
  open,
  onClose,
  title = 'Sign In Required',
  message = 'Please sign in or create an account to save your address.',
  redirectUrl = '/addresses',
}: AuthPromptModalProps) {
  if (!open) return null;

  const loginHref = `/auth/login?redirect=${encodeURIComponent(redirectUrl)}`;
  const registerHref = `/auth/register?redirect=${encodeURIComponent(redirectUrl)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl z-10 text-center"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
          >
            <X size={20} />
          </button>

          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={22} />
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>

          <div className="flex flex-col gap-3">
            <Link
              href={loginHref}
              className="btn btn-primary w-full text-center"
              onClick={onClose}
            >
              Sign In
            </Link>
            <Link
              href={registerHref}
              className="btn btn-outline w-full text-center"
              onClick={onClose}
            >
              Create Account
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-black mt-2 transition-colors"
            >
              Continue browsing
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
