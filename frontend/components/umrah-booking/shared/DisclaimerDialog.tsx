'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Plane, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

interface DisclaimerDialogProps {
  open: boolean;
  onConfirm: () => void;
}

export const DisclaimerDialog: React.FC<DisclaimerDialogProps> = ({ open, onConfirm }) => {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  const handleCancel = () => {
    router.push('/party/dashboard');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent className="max-w-2xl border-none shadow-2xl rounded-[2rem] overflow-hidden p-0 bg-white">
        <div className="bg-amber-500 p-6 flex items-center gap-4 text-white">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Critical Protocol Update</h2>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Nusuk Compliance & Grading System</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-1">
                <Info className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-secondary uppercase text-sm italic"> Grading System Activation</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Umrah Companies and External Agents are now being evaluated under a unified grading system: 
                  <span className="inline-flex items-center gap-1 mx-1 font-bold text-emerald-600">🟢 Green</span>, 
                  <span className="inline-flex items-center gap-1 mx-1 font-bold text-orange-500">🟠 Orange</span>, 
                  <span className="inline-flex items-center gap-1 mx-1 font-bold text-yellow-500">🟡 Yellow</span>, and 
                  <span className="inline-flex items-center gap-1 mx-1 font-bold text-rose-600">🔴 Red</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-1">
                <Plane className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <p className="font-black text-rose-700 uppercase text-sm italic">Travel Arrangement Accuracy</p>
                <p className="text-sm text-rose-900/80 leading-relaxed font-medium">
                  Pilgrims <span className="font-black underline">must travel exactly</span> as per the details submitted in the visa application:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-200">• Flight Number</span>
                  <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-200">• Entry Date</span>
                  <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-200">• Exit Date</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 mt-1">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-secondary uppercase text-sm italic">Grading Impact</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Any mismatch in flight, arrival date, or departure date may result in a <span className="font-bold text-rose-600">lower grading</span> for both the Umrah Company and External Agent. 
                  A lower grading directly affects <span className="font-bold underline">visa quotas</span> and future operational capabilities.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 text-center">
            <p className="text-xs font-black text-secondary uppercase tracking-tight leading-relaxed">
              🕋 Visas will ONLY be processed with confirmed arrangements. 
              <br />Please finalize all travel details before proceeding.
            </p>
          </div>

          <div className="flex items-start space-x-3 pt-2">
            <Checkbox 
              id="disclaimer" 
              checked={agreed} 
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              className="mt-1 h-5 w-5 border-2 border-primary data-[state=checked]:bg-primary rounded-md"
            />
            <Label htmlFor="disclaimer" className="text-sm font-bold text-gray-700 leading-tight cursor-pointer">
              I have read and understood the Nusuk Grading Compliance protocols and confirm that all travel information provided is accurate and finalized.
            </Label>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 flex gap-3 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={handleCancel}
            className="flex-1 sm:flex-none font-black uppercase text-xs tracking-widest text-gray-400 hover:text-rose-600 transition-colors"
          >
            Cancel & Exit
          </Button>
          <Button 
            disabled={!agreed}
            onClick={onConfirm}
            className="flex-1 sm:flex-none bg-secondary hover:bg-secondary/90 text-white font-black uppercase text-xs tracking-[0.2em] px-10 h-12 rounded-xl shadow-xl shadow-secondary/20 transition-all active:scale-95 disabled:opacity-30"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Proceed to Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
