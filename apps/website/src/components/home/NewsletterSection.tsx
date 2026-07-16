'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section className="section bg-black">
      <div className="container-site">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mx-auto text-center"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
            <Mail size={22} className="text-white" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-white mb-3">Stay in the Loop</h2>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Subscribe to get exclusive offers, new arrivals, and style inspiration delivered to your inbox.
          </p>

          {submitted ? (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-emerald-400 font-medium"
            >
              🎉 You&apos;re subscribed! Thanks for joining us.
            </motion.p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-gray-500 rounded-md px-4 py-2.5 text-sm outline-none focus:border-white/50 transition-colors"
              />
              <button type="submit" className="btn btn-primary !bg-white !text-black !border-white hover:!bg-gray-200 shrink-0">
                Subscribe
              </button>
            </form>
          )}

          <p className="text-gray-600 text-xs mt-4">No spam, ever. Unsubscribe anytime.</p>
        </motion.div>
      </div>
    </section>
  );
}
