'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Loader2, 
  AlertCircle, 
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Lock
} from 'lucide-react';

// Declare Cashfree SDK on window
declare global {
  interface Window {
    Cashfree?: any;
  }
}

function ReentryPaymentContent() {
  const searchParams = useSearchParams();
  const rawOrderId = searchParams?.get('order_id') || '';
  const rawSessionId = searchParams?.get('session_id') || '';
  const rawAm = searchParams?.get('am') || '2000';
  const rawCu = searchParams?.get('cu') || 'INR';
  const rawRef = searchParams?.get('ref') || `RE-${Date.now().toString().slice(-6)}`;
  const rawStay = searchParams?.get('stay') || 'hotel';
  const rawPhone = searchParams?.get('phone') || '';
  const rawName = searchParams?.get('name') || 'Pilgrim';

  const [orderId, setOrderId] = useState(rawOrderId);
  const [sessionId, setSessionId] = useState(rawSessionId);
  const [amount] = useState(rawAm);
  const [refNumber] = useState(rawRef);

  // Status Check State (When returning from Cashfree redirect)
  const [verifying, setVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PAID' | 'FAILED' | 'PENDING'>('IDLE');
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const hasAutoTriggeredRef = useRef(false);

  // 1. Load Cashfree JS SDK v3
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.Cashfree) {
        setSdkReady(true);
      } else {
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.async = true;
        script.onload = () => setSdkReady(true);
        document.body.appendChild(script);
      }
    }
  }, []);

  // 2. Auto-dispatch: verify if returning from gateway OR auto-redirect to Cashfree checkout
  useEffect(() => {
    if (!sdkReady) return;
    if (hasAutoTriggeredRef.current) return;

    // CASE A: Returning from Cashfree (order_id in URL but no session_id)
    if (rawOrderId && !rawSessionId) {
      hasAutoTriggeredRef.current = true;
      checkOrderStatus(rawOrderId);
      return;
    }

    // CASE B: Initial payment page load -> automatically launch Cashfree checkout
    hasAutoTriggeredRef.current = true;
    triggerCashfreeCheckout();
  }, [sdkReady, rawOrderId, rawSessionId]);

  const checkOrderStatus = async (oid: string) => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/b2c/reentry-pricing/order-status/${oid}`);
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.isPaid || data.data.orderStatus === 'PAID') {
          setPaymentStatus('PAID');
          setBookingResult(data.data.booking);
          toast.success('🎉 Payment confirmed! Your booking has been registered in NuSync.');
          return;
        } else {
          setPaymentStatus('FAILED');
          return;
        }
      }
      setPaymentStatus('FAILED');
    } catch (err) {
      console.error('Error verifying order status:', err);
      setPaymentStatus('FAILED');
    } finally {
      setVerifying(false);
    }
  };

  // 3. Auto-redirect back to WhatsApp when paid
  useEffect(() => {
    if (paymentStatus === 'PAID') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = 'https://wa.me/912246193365';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [paymentStatus]);

  const triggerCashfreeCheckout = async () => {
    setRedirecting(true);
    try {
      let activeSessionId = sessionId || rawSessionId;

      if (!activeSessionId) {
        const orderRes = await fetch('/api/b2c/reentry-pricing/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(amount),
            guestName: rawName,
            guestMobile: rawPhone,
            stayType: rawStay,
            returnUrl: `https://umra.moulavi.in/pay/reentry?order_id={order_id}&ref=${refNumber}&stay=${rawStay}`,
          }),
        });
        const orderData = await orderRes.json();
        if (orderData.success && orderData.data) {
          activeSessionId = orderData.data.paymentSessionId;
          setSessionId(activeSessionId);
          setOrderId(orderData.data.orderId);
        } else {
          throw new Error(orderData.error || 'Failed to initialize Cashfree gateway session');
        }
      }

      if (!activeSessionId) {
        throw new Error('Cashfree session ID missing');
      }

      let cashfree: any = null;
      if (typeof window !== 'undefined' && window.Cashfree) {
        cashfree = window.Cashfree({ mode: 'production' });
      } else {
        await new Promise((r) => setTimeout(r, 600));
        if (typeof window !== 'undefined' && window.Cashfree) {
          cashfree = window.Cashfree({ mode: 'production' });
        }
      }

      if (!cashfree) {
        throw new Error('Cashfree SDK is not available');
      }

      cashfree.checkout({
        paymentSessionId: activeSessionId,
        redirectTarget: '_self', // Smooth full page redirect to Cashfree checkout
      });
    } catch (err: any) {
      console.error('Cashfree launch error:', err);
      toast.error(err.message || 'Could not redirect to Cashfree');
      setRedirecting(false);
      setPaymentStatus('FAILED');
    }
  };

  // ==========================================
  // VIEW 1: PAYMENT SUCCESSFUL & AUTO-RETURN TO WHATSAPP
  // ==========================================
  if (paymentStatus === 'PAID') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white text-center">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 space-y-3">
              <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Payment Successful!
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 font-medium">
                Your 1-Year Umrah Re-Entry Package is Confirmed & Activated
              </p>
            </div>

            <CardContent className="p-6 space-y-6 text-left">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs text-emerald-900">
                <div className="flex justify-between items-center pb-2 border-b border-emerald-200">
                  <span className="font-semibold text-emerald-800">Amount Paid:</span>
                  <span className="font-bold text-base font-mono text-emerald-900">₹{Number(amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Order Reference:</span>
                  <span className="font-mono font-bold">{orderId || refNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Booking Status:</span>
                  <Badge className="bg-emerald-600 text-white font-bold">CONFIRMED</Badge>
                </div>
                {bookingResult?.voucherRef && (
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                    <span className="font-semibold text-emerald-800">Voucher Reference:</span>
                    <span className="font-mono font-black text-emerald-900">{bookingResult.voucherRef}</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-emerald-100/50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5 text-center">
                <p className="font-bold flex items-center justify-center gap-1.5 text-emerald-800">
                  <MessageSquare className="h-4 w-4" /> Confirmation Sent to WhatsApp
                </p>
                <p className="text-emerald-700">
                  Returning to WhatsApp in <strong>{countdown}</strong> seconds...
                </p>
              </div>

              <Button
                onClick={() => { window.location.href = 'https://wa.me/912246193365'; }}
                className="w-full h-14 bg-[#00a884] hover:bg-[#008f6f] text-white font-black text-base rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-transform active:scale-95"
              >
                <MessageSquare className="h-5 w-5" /> Open WhatsApp to View Voucher
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: PAYMENT FAILED OR CANCELLED
  // ==========================================
  if (paymentStatus === 'FAILED') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white text-center">
            <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-8 space-y-3">
              <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">
                Payment Incomplete
              </h2>
              <p className="text-xs text-red-100 font-medium">
                The transaction was cancelled or could not be completed.
              </p>
            </div>

            <CardContent className="p-6 space-y-5 text-left">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Payable Amount:</span>
                  <span className="font-mono font-bold text-base text-slate-900">₹{Number(amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Reference:</span>
                  <span className="font-mono font-semibold text-slate-700">{orderId || refNumber}</span>
                </div>
              </div>

              {/* 1-Click Retry Cashfree Gateway Button */}
              <Button
                onClick={triggerCashfreeCheckout}
                disabled={redirecting}
                className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95 text-white font-black text-base rounded-2xl shadow-lg shadow-teal-700/20 flex items-center justify-center gap-2"
              >
                {redirecting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Connecting Cashfree...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5" />
                    <span>Retry Payment with Cashfree</span>
                  </>
                )}
              </Button>

              {/* Direct Bank Transfer Option */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Building2 className="h-4 w-4 text-slate-600" />
                  <span>Direct Bank Transfer (NEFT / IMPS):</span>
                </div>
                <div className="text-slate-600 space-y-1 pl-6">
                  <p><strong>Bank:</strong> Federal Bank</p>
                  <p><strong>Account Name:</strong> Moulavi Travels & Logistics</p>
                  <p><strong>Account Number:</strong> 14140200001234</p>
                  <p><strong>IFSC Code:</strong> FDRL0001414</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: CLEAN AUTO-REDIRECT ANIMATION TO CASHFREE
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-white">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Animated Security Pulsar */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-teal-500/30 animate-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Lock className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Status Message */}
        <div className="space-y-3">
          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 font-semibold uppercase tracking-wider text-xs">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5 inline" />
            Cashfree 256-Bit Secure Checkout
          </Badge>
          
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Opening Cashfree Gateway...
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
            Please wait a moment while we load your secure payment session.
          </p>
        </div>

        {/* Invoice Highlight Pill */}
        <div className="p-4 bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/60 text-xs text-slate-300 space-y-2 text-left max-w-xs mx-auto">
          <div className="flex justify-between items-center pb-2 border-b border-slate-700">
            <span className="text-slate-400 font-medium">Total Amount:</span>
            <span className="font-mono font-black text-xl text-emerald-400">₹{Number(amount).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Order Ref:</span>
            <span className="font-mono font-medium text-slate-200">{orderId || refNumber}</span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-48 mx-auto space-y-2">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse" />
          </div>
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            Redirecting to checkout...
          </p>
        </div>

        {/* Fallback button if popup/redirect is blocked */}
        <div className="pt-2">
          <Button
            onClick={triggerCashfreeCheckout}
            variant="ghost"
            className="text-xs text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Click here if not redirected automatically <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReentryPaymentPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <ReentryPaymentContent />
    </Suspense>
  );
}
