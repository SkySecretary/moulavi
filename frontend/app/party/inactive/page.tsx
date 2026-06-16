'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, LogOut, FileText, CheckCircle2 } from 'lucide-react';
import { getUser, removeUser } from '@/lib/auth';
import { toast } from 'sonner';

export default function PartyInactivePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'party') {
      router.push('/');
      return;
    }
    
    // If they somehow got here but are actually active, send them to dashboard
    if (currentUser.isActive === true) {
      router.push('/party/dashboard');
    }
    
    setUser(currentUser);
  }, [router]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      // Logout should continue even if API call fails
    } finally {
      removeUser();
      toast.success('Logged out successfully');
      router.push('/');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-amber-500 overflow-hidden">
        <div className="bg-amber-50/50 p-6 flex flex-col items-center justify-center border-b border-amber-100">
          <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">Account Pending Activation</h1>
          <p className="text-sm text-gray-500 text-center mt-2">
            Your agency account ({user.name}) has been created but is currently inactive.
          </p>
        </div>
        
        <CardContent className="p-8 space-y-6 bg-white">
          <div className="space-y-4">
            <p className="text-gray-700 font-medium leading-relaxed">
              Your account registration is complete, but access to the booking portal is currently restricted. This usually happens for one of the following reasons:
            </p>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 text-sm">Your agency contract is still pending formalization or signature.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 text-sm">Required documents or compliance checks are awaiting admin review.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 text-sm">Your account has been temporarily suspended by management.</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mt-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              What to do next?
            </h3>
            <p className="text-sm text-gray-600">
              Please contact the Moulavi Travels administration team to complete your onboarding process and activate your account.
            </p>
          </div>
          
          <div className="pt-4 border-t border-gray-100">
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="w-full h-12 font-bold text-gray-600 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}