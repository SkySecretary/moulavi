'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Lock, Loader2, ChevronRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { authAPI } from '@/lib/api';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token.');
      router.push('/login');
    }
  }, [token, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error('Token is missing');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.resetPassword({
        token,
        newPassword: data.newPassword,
      });

      setIsSuccess(true);
      toast.success('Password reset successfully!');
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || 'Failed to reset password. The link may have expired.';
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-background">
      {/* Left Side: Visual/Branding Section */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-primary">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-110"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/95 via-primary/80 to-transparent" />
        
        <div className="relative z-10 flex flex-col justify-center p-16 lg:p-24 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center text-primary shadow-2xl border border-white/10 rotate-3">
              <Globe className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              NuSync
            </h1>
          </div>
          
          <div className="space-y-6 max-w-lg">
            <h2 className="text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight uppercase italic">
              Empowering Your <span className="text-secondary">Sacred</span> Journey.
            </h2>
            <p className="text-lg font-medium text-white/70 leading-relaxed max-w-md uppercase tracking-wide">
              Advanced management protocols for premium Umrah and travel operations.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary to-transparent opacity-50" />
      </div>

      {/* Right Side: Authentication Hub */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
        <div className="md:hidden flex items-center gap-3 mb-12">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white">
            <Globe className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">NuSync</h1>
        </div>

        <div className="w-full max-w-[400px] space-y-8">
          <div className="text-center md:text-left space-y-2">
            <h3 className="text-3xl font-black text-primary tracking-tighter uppercase italic">Reset Password Hub</h3>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest opacity-60">Enter your new operational credentials</p>
          </div>

          <Card className="border-0 shadow-2xl shadow-primary/5 rounded-[2rem] bg-white overflow-hidden">
            <CardContent className="p-8 lg:p-10">
              {isSuccess ? (
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-6">
                  <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce" />
                  <h4 className="text-lg font-black text-primary uppercase tracking-tight">Access Reset Successful</h4>
                  <p className="text-xs font-semibold text-gray-500 max-w-xs">
                    Your password has been changed. You will be redirected to the login screen in a few seconds.
                  </p>
                  <Button 
                    onClick={() => router.push('/login')} 
                    className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs h-12 rounded-xl"
                  >
                    Go To Login Now
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-1">New Access Key</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...register('newPassword')}
                        disabled={isLoading}
                        className="h-12 bg-gray-50 border-gray-100 rounded-xl font-bold text-primary focus:ring-secondary/20 pl-10 pr-12 transition-all shadow-inner"
                      />
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/20" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary/40 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-[10px] font-bold text-destructive mt-1 ml-1 uppercase">{errors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-1">Confirm Access Key</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...register('confirmPassword')}
                        disabled={isLoading}
                        className="h-12 bg-gray-50 border-gray-100 rounded-xl font-bold text-primary focus:ring-secondary/20 pl-10 pr-12 transition-all shadow-inner"
                      />
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/20" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary/40 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[10px] font-bold text-destructive mt-1 ml-1 uppercase">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 mt-4 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 rounded-2xl transition-all active:scale-[0.97] flex items-center justify-center gap-3"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Access Key</span>
                        <ChevronRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="text-center pt-4">
             <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
                System Version 2.4.0 • ERP Encryption Active
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
