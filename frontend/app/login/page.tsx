'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Lock, User, Loader2, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { setUser } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    }
  });

  const rememberMeValue = watch('rememberMe');

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setValue('email', rememberedEmail);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const response = await authAPI.login(data.email, data.password);
      const { user, accessToken, refreshToken } = response.data;

      // Handle remember me
      if (data.rememberMe) {
        localStorage.setItem('rememberedEmail', data.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Store tokens and user info
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);

      // Redirect based on role
      toast.success(`Welcome back, ${user.name}!`);
      
      if (user.role === 'party') {
        if (!user.emailVerified) {
          router.push('/verify-email');
        } else {
          router.push('/party/dashboard');
        }
      } else if (user.role === 'admin' || user.role === 'staff') {
        router.push('/dashboard');
      } else {
        toast.error('Invalid user role');
        setIsLoading(false);
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || 'Failed to sign in. Please check your credentials.';
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-background">
      {/* Left Side: Visual/Branding Section */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-primary">
        {/* Background Image - Kaaba/Nusuk Style */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-110"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        {/* Deep Green Overlay with Nusuk Aesthetic */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/95 via-primary/80 to-transparent" />
        
        {/* Branding Content */}
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
            <div className="pt-8 flex items-center gap-8">
               <div className="flex flex-col">
                  <span className="text-2xl font-black text-secondary">100%</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Digital Auth</span>
               </div>
               <div className="h-10 w-px bg-white/10" />
               <div className="flex flex-col">
                  <span className="text-2xl font-black text-secondary">Elite</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Service Tier</span>
               </div>
            </div>
          </div>
        </div>

        {/* Decorative Bottom Pattern */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary to-transparent opacity-50" />
      </div>

      {/* Right Side: Authentication Hub */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile Header (Only visible on small screens) */}
        <div className="md:hidden flex items-center gap-3 mb-12">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white">
            <Globe className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">NuSync</h1>
        </div>

        <div className="w-full max-w-[400px] space-y-8">
          <div className="text-center md:text-left space-y-2">
            <h3 className="text-3xl font-black text-primary tracking-tighter uppercase italic">Identity Access</h3>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest opacity-60">Enter your operational credentials</p>
          </div>

          <Card className="border-0 shadow-2xl shadow-primary/5 rounded-[2rem] bg-white overflow-hidden">
            <CardContent className="p-8 lg:p-10">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-1">Username</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="username"
                      {...register('email')}
                      disabled={isLoading}
                      className="h-12 bg-gray-50 border-gray-100 rounded-xl font-bold text-primary focus:ring-secondary/20 pl-10 transition-all shadow-inner"
                    />
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/20" />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] font-bold text-destructive mt-1 ml-1 uppercase">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-1">Access Key</Label>
                    <a href="#" className="text-[10px] text-secondary hover:text-primary font-black uppercase tracking-widest transition-colors">Recover?</a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register('password')}
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
                  {errors.password && (
                    <p className="text-[10px] font-bold text-destructive mt-1 ml-1 uppercase">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-1">
                  <Checkbox 
                    id="rememberMe" 
                    onCheckedChange={(checked) => setValue('rememberMe', checked as boolean)}
                    checked={rememberMeValue}
                  />
                  <Label 
                    htmlFor="rememberMe" 
                    className="text-[10px] font-bold text-primary/60 uppercase cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-14 mt-4 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 rounded-2xl transition-all active:scale-[0.97] flex items-center justify-center gap-3"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Execute Sign In</span>
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
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


