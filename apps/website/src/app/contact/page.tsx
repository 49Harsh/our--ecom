'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name:    z.string().min(2, 'Enter your name'),
  email:   z.string().email('Enter a valid email'),
  subject: z.string().min(3, 'Enter a subject'),
  message: z.string().min(10, 'Message too short'),
});
type FormData = z.infer<typeof schema>;

const contactInfo = [
  { icon: Mail,   title: 'Email',   value: 'support@recom.in',          sub: 'We reply within 24 hours' },
  { icon: Phone,  title: 'Phone',   value: '+91-99999-99999',            sub: 'Mon–Sat, 10am–6pm IST' },
  { icon: MapPin, title: 'Address', value: '123 Main St, Mumbai 400001', sub: 'Maharashtra, India' },
  { icon: Clock,  title: 'Hours',   value: 'Mon–Sat: 10am–6pm',         sub: 'Closed on Sundays' },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    // In production this would POST to /contact or send via Resend
    // For now we simulate success — replace with real API call when backend adds the endpoint
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
    reset();
  };

  return (
    <div className="container-site py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold text-black mb-3">Contact Us</h1>
          <p className="text-gray-500 text-sm">We&apos;re here to help — reach out anytime.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Info cards */}
          <div className="space-y-4">
            {contactInfo.map(({ icon: Icon, title, value, sub }) => (
              <div key={title} className="card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">{title}</p>
                  <p className="font-medium text-gray-900 text-sm">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="card p-8">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                  <h2 className="font-semibold text-gray-900 text-lg mb-2">Message Sent!</h2>
                  <p className="text-gray-500 text-sm">
                    We&apos;ve received your message and will get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="btn btn-outline mt-6"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Your name *
                      </label>
                      <input
                        {...register('name')}
                        className="input"
                        placeholder="John Doe"
                        autoComplete="name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email *
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        className="input"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Subject *
                    </label>
                    <input
                      {...register('subject')}
                      className="input"
                      placeholder="Order issue, Return request, General enquiry..."
                    />
                    {errors.subject && (
                      <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Message *
                    </label>
                    <textarea
                      {...register('message')}
                      rows={5}
                      className="input resize-none"
                      placeholder="Describe your issue or question in detail..."
                    />
                    {errors.message && (
                      <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary w-full gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                      ? <><Loader2 size={15} className="animate-spin" /> Sending...</>
                      : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
