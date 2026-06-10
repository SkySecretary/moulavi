'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { getUser, setUser, removeUser } from '@/lib/auth';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [user, setLocalUser] = useState<any>(null);
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (currentUser.emailVerified) {
      router.push('/party/dashboard');
      return;
    }
    setLocalUser(currentUser);
  }, [router]);

  const handleSendCode = async () => {
    if (!user?.email) return;
    setIsSending(true);

    try {
      const response = await fetch('/api/landing/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();
      if (data.success) {
        setIsCodeSent(true);
        toast.success('Verification code sent to your email');
      } else {
        throw new Error(data.error || 'Failed to send code');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    setIsVerifying(true);

    try {
      const response = await fetch('/api/landing/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, code }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Email verified successfully!');
        
        // Update user state
        const updatedUser = { ...user, emailVerified: true };
        setUser(updatedUser);
        
        // Redirect to dashboard
        router.push('/party/dashboard');
      } else {
        throw new Error(data.error || 'Invalid verification code');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-950 p-6">
      <div className="w-full max-w-[450px] space-y-8">
        <div className="flex justify-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center text-primary shadow-2xl">
            <Mail className="h-8 w-8 text-emerald-900" />
          </div>
        </div>

        <Card className="border-0 shadow-2xl rounded-[2rem] bg-white overflow-hidden">
          <CardHeader className="pt-10 pb-2 px-10 text-center">
            <CardTitle className="text-3xl font-black text-emerald-900 tracking-tighter uppercase italic text-center">
              Email Not Verified
            </CardTitle>
            <CardDescription className="font-bold text-xs uppercase tracking-widest text-emerald-700/60 mt-2 text-center">
              Protocol Verification Required
            </CardDescription>
          </CardHeader>

          <CardContent className="p-10 space-y-6">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-900/40 uppercase tracking-widest">Status</p>
                <p className="font-bold text-amber-900 truncate">Verification Required to Continue</p>
              </div>
            </div>

            {!isCodeSent ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 leading-relaxed text-center">
                  Your email address is not yet verified. Please continue to verify your account to access the agency portal.
                </p>
                <Button 
                  onClick={handleSendCode}
                  disabled={isSending}
                  className="w-full h-14 bg-emerald-900 hover:bg-emerald-800 text-white font-black uppercase tracking-[0.2em] rounded-2xl"
                >
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue to Verify"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest ml-1">6-Digit Code</label>
                  <Input 
                    type="text"
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-14 bg-gray-50 border-gray-100 rounded-xl font-black text-2xl tracking-[0.5em] text-center text-emerald-900 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="w-full h-14 bg-emerald-900 hover:bg-emerald-800 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-900/20"
                  >
                    {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Complete Verification"}
                  </Button>
                  
                  <button 
                    onClick={handleSendCode} 
                    disabled={isSending}
                    className="w-full text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-800 transition-colors py-2"
                  >
                    {isSending ? "Resending..." : "Resend Code"}
                  </button>
                </div>
              </div>
            )}
            
            <button 
              onClick={() => {
                removeUser();
                router.push('/login');
              }}
              className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors pt-4 border-t border-gray-50"
            >
              <ArrowLeft className="h-3 w-3" />
              Sign out and try another email
            </button>
          </CardContent>
        </Card>

        <p className="text-center text-[9px] font-black text-emerald-400/40 uppercase tracking-[0.3em]">
          NuSync Protocol Security Active
        </p>
      </div>
    </div>
  );
}
