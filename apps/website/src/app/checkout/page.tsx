'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, MapPin, Plus, Shield, Lock } from 'lucide-react';
import { cartApi, ordersApi, usersApi, paymentsApi } from '@/lib/api';
import { loadRazorpayScript, openRazorpay } from '@/lib/razorpay';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const addressSchema = z.object({
  fullName: z.string().min(2, 'Required'),
  phone:    z.string().min(10, 'Enter valid phone'),
  line1:    z.string().min(5, 'Required'),
  line2:    z.string().optional(),
  city:     z.string().min(2, 'Required'),
  state:    z.string().min(2, 'Required'),
  pincode:  z.string().length(6, 'Must be 6 digits'),
  landmark: z.string().optional(),
  type:     z.enum(['HOME', 'WORK', 'OTHER']),
});
type AddressForm = z.infer<typeof addressSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [error, setError] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get(),
    retry: false,
  });

  const { data: addrData, isLoading: addrLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => usersApi.getAddresses(),
    retry: false,
    enabled: mounted && !!token,
  });

  const { data: meData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => usersApi.getMe(),
    retry: false,
    enabled: mounted && !!token,
  });

  const cart      = cartData?.data?.data ?? cartData?.data;
  const items     = cart?.items ?? [];
  const totals    = cart?.totals ?? {};
  const addresses: any[] = addrData?.data?.data ?? addrData?.data ?? [];
  const user      = meData?.data?.data ?? meData?.data;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { type: 'HOME' },
  });

  const addAddressMutation = useMutation({
    mutationFn: (d: AddressForm) => usersApi.createAddress(d),
    onSuccess: (res) => {
      const newAddr = res.data?.data ?? res.data;
      qc.invalidateQueries({ queryKey: ['addresses'] });
      setSelectedAddressId(newAddr.id);
      setShowNewAddress(false);
      reset();
    },
  });

  // Handles both COD and Razorpay
  const handlePlaceOrder = async () => {
    setError('');
    const addrId =
      selectedAddressId ??
      addresses.find((a: any) => a.isDefault)?.id ??
      addresses[0]?.id;

    if (!addrId) { setError('Please select or add a delivery address'); return; }
    if (items.length === 0) { setError('Your cart is empty'); return; }

    setProcessingPayment(true);

    try {
      // 1. Create the order on backend
      const orderRes = await ordersApi.create({ addressId: addrId, paymentMethod });
      const order = orderRes.data?.data ?? orderRes.data;

      if (paymentMethod === 'COD') {
        // COD — done
        qc.invalidateQueries({ queryKey: ['cart'] });
        router.push(`/checkout/success?orderId=${order.id}`);
        return;
      }

      // 2. Razorpay — load SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError('Failed to load payment gateway. Please try again.');
        setProcessingPayment(false);
        return;
      }

      // 3. Create Razorpay order
      const rpOrderRes = await paymentsApi.createOrder(order.id);
      const rpOrder = rpOrderRes.data?.data ?? rpOrderRes.data;

      // 4. Open Razorpay modal
      openRazorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
        amount: rpOrder.amount,      // in paise
        currency: rpOrder.currency ?? 'INR',
        name: 'R·ECOM',
        description: `Order #${order.orderNumber}`,
        order_id: rpOrder.razorpayOrderId,
        prefill: {
          name:    user?.name,
          email:   user?.email,
          contact: user?.phone,
        },
        theme: { color: '#0a0a0a' },
        handler: async (response) => {
          // 5. Verify payment signature on backend
          try {
            await paymentsApi.verifyPayment({
              orderId:           order.id,
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            qc.invalidateQueries({ queryKey: ['cart'] });
            router.push(`/checkout/success?orderId=${order.id}`);
          } catch {
            setError('Payment verification failed. Please contact support.');
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError('Payment was cancelled. Your order is on hold — retry when ready.');
            setProcessingPayment(false);
          },
        },
      });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Something went wrong. Please try again.');
      setProcessingPayment(false);
    }
  };

  if (cartLoading || addrLoading) {
    return (
      <div className="container-site py-10">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  const activeAddressId =
    selectedAddressId ??
    addresses.find((a: any) => a.isDefault)?.id ??
    addresses[0]?.id;

  return (
    <div className="container-site py-8 lg:py-12">
      <h1 className="font-serif text-2xl font-bold text-black mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* ── Step 1: Address ── */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <MapPin size={16} className="text-gray-500" />
              Delivery Address
            </h2>

            {addresses.length > 0 && (
              <div className="space-y-3 mb-4">
                {addresses.map((addr: any) => (
                  <label
                    key={addr.id}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                      activeAddressId === addr.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-400',
                    )}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={activeAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-0.5 accent-black"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900">
                        {addr.fullName}
                        <span className="ml-2 text-[10px] font-semibold uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {addr.type}
                        </span>
                        {addr.isDefault && (
                          <span className="ml-1 text-[10px] font-semibold uppercase bg-black text-white px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">
                        {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
                          .filter(Boolean).join(', ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{addr.phone}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowNewAddress((s) => !s)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              <Plus size={15} />
              {showNewAddress ? 'Cancel' : 'Add new address'}
            </button>

            {showNewAddress && (
              <form
                onSubmit={handleSubmit((d) => addAddressMutation.mutate(d))}
                className="mt-5 space-y-4 border-t border-gray-100 pt-5"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input {...register('fullName')} className="input" />
                    {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input {...register('phone')} type="tel" className="input" />
                    {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                  <input {...register('line1')} className="input" placeholder="Flat no., Building, Street" />
                  {errors.line1 && <p className="text-xs text-red-600 mt-1">{errors.line1.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                  <input {...register('line2')} className="input" placeholder="Area, Colony (optional)" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input {...register('city')} className="input" />
                    {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <input {...register('state')} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code *</label>
                    <input {...register('pincode')} className="input" maxLength={6} />
                    {errors.pincode && <p className="text-xs text-red-600 mt-1">{errors.pincode.message}</p>}
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={addAddressMutation.isPending}
                    className="btn btn-primary gap-2 disabled:opacity-60"
                  >
                    {addAddressMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Save & Use
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewAddress(false); reset(); }}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── Step 2: Payment Method ── */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Lock size={16} className="text-gray-500" />
              Payment Method
            </h2>
            <div className="space-y-3">
              {[
                {
                  value: 'RAZORPAY',
                  label: 'Pay Online',
                  sub: 'UPI, Cards, Net Banking, Wallets — powered by Razorpay',
                  badge: '🔒 Secure',
                },
                {
                  value: 'COD',
                  label: 'Cash on Delivery',
                  sub: 'Pay in cash when your order is delivered',
                  badge: null,
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    paymentMethod === opt.value
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-400',
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={opt.value}
                    checked={paymentMethod === opt.value}
                    onChange={() => setPaymentMethod(opt.value as any)}
                    className="accent-black"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">
                      {opt.label}
                      {opt.badge && (
                        <span className="ml-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                          {opt.badge}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Order Summary ── */}
        <div>
          <div className="card p-5 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>

            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
              {items.map((item: any) => {
                const product = item.variant?.product;
                const price = Number(
                  item.variant?.discountPrice ??
                  item.variant?.price ??
                  product?.discountPrice ??
                  product?.price ?? 0
                );
                return (
                  <div key={item.id} className="flex justify-between text-sm gap-2">
                    <span className="text-gray-600 truncate">
                      {product?.title ?? 'Product'} × {item.quantity}
                    </span>
                    <span className="font-medium text-gray-900 shrink-0">
                      {formatPrice(price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(Number(totals.subtotal ?? 0))}</span>
              </div>
              {Number(totals.discount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(Number(totals.discount))}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={Number(totals.shipping) > 0 ? '' : 'text-emerald-600'}>
                  {Number(totals.shipping) > 0
                    ? formatPrice(Number(totals.shipping))
                    : 'Free'}
                </span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>{formatPrice(Number(totals.total ?? 0))}</span>
              </div>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={processingPayment}
              className="btn btn-primary w-full mt-5 gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {processingPayment ? (
                <><Loader2 size={15} className="animate-spin" /> Processing...</>
              ) : paymentMethod === 'COD' ? (
                'Place Order (COD)'
              ) : (
                'Pay Now →'
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-3">
              <Shield size={12} className="text-gray-400" />
              <p className="text-center text-xs text-gray-400">
                256-bit SSL encrypted checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
