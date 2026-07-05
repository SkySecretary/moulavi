'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

interface OneWayDisclaimerDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const OneWayDisclaimerDialog: React.FC<OneWayDisclaimerDialogProps> = ({ open, onConfirm, onCancel }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="max-w-2xl border-none shadow-2xl rounded-[2rem] overflow-hidden p-0 bg-white">
        <div className="bg-rose-600 p-6 flex items-center gap-4 text-white">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">MANDATORY DEPARTURE TICKET protocol</h2>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Onward Only (One-Way) Booking Disclaimer</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-1">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-rose-700 uppercase text-sm italic">Departure Ticket is Mandatory</p>
                <p className="text-sm text-rose-900/90 leading-relaxed font-semibold">
                  A departure ticket must be collected and uploaded to the system as soon as possible.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-1">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-amber-700 uppercase text-sm italic">System Block & Financial Penalty Warning</p>
                <p className="text-sm text-amber-900/80 leading-relaxed font-medium">
                  Failure to upload a departure ticket before the pilgrim's travel will cause an immediate <span className="font-bold underline">system block</span> and severe <span className="font-bold underline">financial penalties</span> from regulatory authorities.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-1">
                <Info className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-secondary uppercase text-sm italic">90-Day Visa Limitation Rule</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  The return ticket must specify a travel date within the maximum allowed stay of 90 days from the pilgrim's arrival date.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 pt-2">
            <Checkbox 
              id="oneway-disclaimer" 
              checked={agreed} 
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              className="mt-1 h-5 w-5 border-2 border-rose-600 data-[state=checked]:bg-rose-600 rounded-md"
            />
            <Label htmlFor="oneway-disclaimer" className="text-sm font-bold text-gray-700 leading-tight cursor-pointer">
              I agree and confirm that I will collect and upload the departure flight ticket copy as soon as possible, and I accept full responsibility for any penalties or blocks arising from failure to do so.
            </Label>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 flex gap-3 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={onCancel}
            className="flex-1 sm:flex-none font-black uppercase text-xs tracking-widest text-gray-400 hover:text-rose-600 transition-colors"
          >
            Go Back
          </Button>
          <Button 
            disabled={!agreed}
            onClick={onConfirm}
            className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs tracking-[0.2em] px-10 h-12 rounded-xl shadow-xl shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-30"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            I Agree & Proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
