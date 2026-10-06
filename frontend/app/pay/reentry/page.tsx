'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Copy, 
  CheckCircle2, 
  QrCode, 
  Smartphone, 
  ArrowRight,
  ShieldCheck,
  Building2,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  MessageSquare
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
  const rawPa = searchParams?.get('pa') || 'moulavi1414@fbl';
  const rawPn = searchParams?.get('pn') || 'Moulavi Travels';
  const rawAm = searchParams?.get('am') || '2000';
  const rawCu = searchParams?.get('cu') || 'INR';
  const rawRef = searchParams?.get('ref') || `RE-${Date.now().toString().slice(-6)}`;
  const rawStay = searchParams?.get('stay') || 'hotel';
  const rawPhone = searchParams?.get('phone') || '';
  const rawName = searchParams?.get('name') || 'Pilgrim';

  const [orderId, setOrderId] = useState(rawOrderId);
  const [sessionId, setSessionId] = useState(rawSessionId);
  const [amount, setAmount] = useState(rawAm);
  const [upiId] = useState(rawPa);
  const [merchantName] = useState(rawPn);
  const [refNumber] = useState(rawRef);
  const [copied, setCopied] = useState(false);

  // Status Check State (When returning from Cashfree redirect)
  const [verifying, setVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PAID' | 'FAILED' | 'PENDING'>('IDLE');
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [cfLoading, setCfLoading] = useState(false);

  // Load Cashfree JS SDK v3
  useEffect(() => {
    if (!window.Cashfree) {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // If order_id is present in URL, verify status immediately
  useEffect(() => {
    if (orderId) {
      checkOrderStatus(orderId);
    }
  }, [orderId]);

  const checkOrderStatus = async (oid: string) => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/b2c/reentry-pricing/order-status/${oid}`);
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.isPaid || data.data.orderStatus === 'PAID') {
          setPaymentStatus('PAID');
          setBookingResult(data.data.booking);
          toast.success('🎉 Payment confirmed! Your voucher has been generated.');
        } else if (data.data.orderStatus === 'ACTIVE' || data.data.orderStatus === 'PENDING') {
          setPaymentStatus('PENDING');
        } else {
          setPaymentStatus('FAILED');
        }
      }
    } catch (err) {
      console.error('Error verifying order status:', err);
    } finally {
      setVerifying(false);
    }
  };

  // Launch Cashfree Payment Checkout
  const handleCashfreePay = async () => {
    setCfLoading(true);
    try {
      let activeSessionId = sessionId;
      let activeOrderId = orderId;

      // If no active session, create a fresh Cashfree order on demand
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
          activeOrderId = orderData.data.orderId;
          setSessionId(activeSessionId);
          setOrderId(activeOrderId);
        } else {
          throw new Error(orderData.error || 'Failed to initialize Cashfree gateway');
        }
      }

      if (!activeSessionId) {
        throw new Error('Cashfree session ID missing');
      }

      if (!window.Cashfree) {
        toast.info('Loading Cashfree checkout...');
        await new Promise((r) => setTimeout(r, 1000));
      }

      const cashfree = window.Cashfree({ mode: 'production' });
      cashfree.checkout({
        paymentSessionId: activeSessionId,
        redirectTarget: '_self', // Smooth redirection
      });
    } catch (err: any) {
      toast.error(err.message || 'Could not open Cashfree gateway');
      console.error('Cashfree launch error:', err);
    } finally {
      setCfLoading(false);
    }
  };

  // Formulate universal & app-specific intent URIs
  const cleanNote = encodeURIComponent(`Umrah Reentry ${refNumber}`);
  const encodedMerchant = encodeURIComponent(merchantName);
  
  const upiUniversalUri = `upi://pay?pa=${upiId}&pn=${encodedMerchant}&am=${amount}&cu=${rawCu}&tn=${cleanNote}`;
  const gpayUri = `tez://upi/pay?pa=${upiId}&pn=${encodedMerchant}&am=${amount}&cu=${rawCu}&tn=${cleanNote}`;
  const phonepeUri = `phonepe://pay?pa=${upiId}&pn=${encodedMerchant}&am=${amount}&cu=${rawCu}&tn=${cleanNote}`;
  const paytmUri = `paytmmp://pay?pa=${upiId}&pn=${encodedMerchant}&am=${amount}&cu=${rawCu}&tn=${cleanNote}`;
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUniversalUri)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast.success(`UPI ID copied: ${upiId}`);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePayIntent = (uri: string, appName: string) => {
    try {
      window.location.href = uri;
      toast.info(`Opening ${appName}...`);
    } catch (e) {
      window.location.href = upiUniversalUri;
    }
  };

  // ==========================================
  // VIEW: PAYMENT SUCCESSFUL & CONFIRMED
  // ==========================================
  if (paymentStatus === 'PAID') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-lg space-y-6">
          <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white text-center">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 space-y-3">
              <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
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

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 text-center">
                <p className="font-semibold text-slate-800">
                  📲 Confirmation Sent to WhatsApp
                </p>
                <p>
                  Your official Ministry clearance, travel details, and activation summary have been dispatched to your WhatsApp number.
                </p>
              </div>

              <Button
                onClick={() => window.open('https://wa.me/912246193365', '_blank')}
                className="w-full h-12 bg-[#00a884] hover:bg-[#008f6f] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <MessageSquare className="h-5 w-5" /> Open WhatsApp to View Booking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold tracking-wide uppercase">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Verified Umrah Payment Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Moulavi Travels & Logistics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            1-Year Umrah Visa Re-Entry Activation Checkout
          </p>
        </div>

        {/* Invoice Summary Card */}
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-800 text-white p-6 text-center space-y-2">
            <p className="text-xs uppercase tracking-widest text-emerald-200 font-bold">Total Amount Payable</p>
            <div className="text-4xl sm:text-5xl font-black tracking-tight font-mono">
              ₹{Number(amount).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-100 font-medium pt-1">
              <span>Ref: {orderId || refNumber}</span>
              <span>•</span>
              <span className="capitalize">{rawStay === 'iqama' ? '🇸🇦 Iqama Stay' : '🏨 Hotel Stay'}</span>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Status verification banner if return */}
            {verifying && (
              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-200 text-xs flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Verifying payment status with Cashfree...</span>
              </div>
            )}

            {paymentStatus === 'FAILED' && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>Payment not completed or failed. You can retry below.</span>
              </div>
            )}

            {/* Primary Cashfree Payment Gateway Button */}
            <div className="space-y-2">
              <Button
                onClick={handleCashfreePay}
                disabled={cfLoading}
                className="w-full h-14 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 hover:opacity-95 text-white font-black text-base rounded-2xl shadow-lg shadow-teal-700/20 flex items-center justify-center gap-3 transition-all"
              >
                {cfLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Connecting Cashfree...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    <span>Pay with Cashfree Gateway</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
              <p className="text-[11px] text-center text-slate-400 font-medium">
                🔒 Instant Auto-Confirmation (UPI, Google Pay, PhonePe, Cards & NetBanking)
              </p>
            </div>

            {/* Quick App Buttons */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Or Select Direct UPI App
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => handlePayIntent(gpayUri, 'Google Pay')}
                  className="h-11 font-bold bg-white text-slate-800 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="text-base font-black text-blue-600">G</span>Pay
                </Button>

                <Button 
                  onClick={() => handlePayIntent(phonepeUri, 'PhonePe')}
                  className="h-11 font-bold bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="text-base">पे</span> PhonePe
                </Button>

                <Button 
                  onClick={() => handlePayIntent(paytmUri, 'Paytm')}
                  className="h-11 font-bold bg-cyan-700 hover:bg-cyan-800 text-white flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="text-base">Pay</span>tm
                </Button>

                <Button 
                  onClick={() => handlePayIntent(upiUniversalUri, 'UPI App')}
                  className="h-11 font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm"
                >
                  <Smartphone className="h-4 w-4" /> Any UPI App
                </Button>
              </div>
            </div>

            {/* Copy UPI ID Box */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Or Pay via UPI ID / VPA
              </p>
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl border border-slate-200">
                <div className="font-mono text-sm sm:text-base font-bold text-slate-800 truncate select-all">
                  {upiId}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCopyUpi}
                  className="shrink-0 ml-2 gap-1.5 font-bold border-slate-300"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="text-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5">
                <QrCode className="h-4 w-4 text-emerald-600" />
                Scan QR Code with any UPI App
              </p>
              <div className="flex justify-center">
                <img 
                  src={qrCodeUrl} 
                  alt="UPI QR Code" 
                  className="w-40 h-40 rounded-xl border-4 border-white shadow-md bg-white p-1"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Accepts Google Pay, PhonePe, Paytm, BHIM, CRED & all Bank Apps
              </p>
            </div>

            {/* Bank Transfer Details */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Direct Bank Transfer (NEFT / IMPS)
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
                <p><strong className="text-slate-800">Bank:</strong> Federal Bank</p>
                <p><strong className="text-slate-800">Account Name:</strong> Moulavi Travels & Logistics</p>
                <p><strong className="text-slate-800">Account Number:</strong> 14140200001234</p>
                <p><strong className="text-slate-800">IFSC Code:</strong> FDRL0001414</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-100 p-4 border-t border-slate-200 text-center flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-700">
              ✨ Payments made via Cashfree Gateway are automatically verified in real-time without needing screenshot upload!
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function ReentryPaymentPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <ReentryPaymentContent />
    </Suspense>
  );
}
