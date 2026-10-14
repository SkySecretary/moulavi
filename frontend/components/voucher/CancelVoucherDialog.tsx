'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { voucherAPI } from '@/lib/api';
import {
  Ban,
  PlaneTakeoff,
  PlaneLanding,
  RotateCcw,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Ticket,
  User,
  Users,
} from 'lucide-react';

interface CancelVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher: any | null;
  onSuccess?: () => void;
}

export type CancelType = 'complete' | 'arrival' | 'departure' | 'reactivate';

export function CancelVoucherDialog({
  open,
  onOpenChange,
  voucher,
  onSuccess,
}: CancelVoucherDialogProps) {
  const [cancelType, setCancelType] = useState<CancelType>('complete');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (voucher) {
      if (voucher.status === 'cancelled_complete' || voucher.status === 'cancelled_arrival' || voucher.status === 'cancelled_departure') {
        // If already cancelled, default to reactivate or keep current
        setCancelType(voucher.cancelType || 'complete');
      } else {
        setCancelType('complete');
      }
      setReason(voucher.cancellationReason || '');
    }
  }, [voucher, open]);

  if (!voucher) return null;

  const currentStatus = voucher.status || 'active';
  const isCancelled = currentStatus.startsWith('cancelled');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cancelled_complete':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200">Completely Cancelled</Badge>;
      case 'cancelled_arrival':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Arrival Cancelled</Badge>;
      case 'cancelled_departure':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Departure Cancelled</Badge>;
      case 'active':
      default:
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>;
    }
  };

  const handleConfirm = async () => {
    if (!voucher?.id) return;

    if (cancelType !== 'reactivate' && !reason.trim()) {
      toast.error('Please enter a cancellation reason or note');
      return;
    }

    try {
      setLoading(true);
      const response = await voucherAPI.cancelVoucher(voucher.id, {
        cancelType,
        reason: reason.trim(),
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Voucher cancellation status updated');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error('Failed to update voucher status');
      }
    } catch (err: any) {
      console.error('Cancellation error:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to update voucher status';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const options: Array<{
    type: CancelType;
    title: string;
    description: string;
    icon: any;
    color: string;
    borderActive: string;
    bgActive: string;
  }> = [
    {
      type: 'complete',
      title: 'Completely Cancel',
      description: 'Cancel the entire voucher and all associated transportation sectors',
      icon: Ban,
      color: 'text-rose-600',
      borderActive: 'border-rose-500 ring-2 ring-rose-200',
      bgActive: 'bg-rose-50/60',
    },
    {
      type: 'arrival',
      title: 'Arrival Cancel',
      description: 'Cancel only the arrival transport sector (e.g. airport to hotel)',
      icon: PlaneLanding,
      color: 'text-amber-600',
      borderActive: 'border-amber-500 ring-2 ring-amber-200',
      bgActive: 'bg-amber-50/60',
    },
    {
      type: 'departure',
      title: 'Departure Cancel',
      description: 'Cancel only the departure transport sector (e.g. hotel to airport)',
      icon: PlaneTakeoff,
      color: 'text-purple-600',
      borderActive: 'border-purple-500 ring-2 ring-purple-200',
      bgActive: 'bg-purple-50/60',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  Cancel Voucher #{voucher.voucherNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Update cancellation status for this reservation
                </DialogDescription>
              </div>
            </div>
            <div>{getStatusBadge(currentStatus)}</div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold text-white truncate">{voucher.guestName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span>{voucher.paxCount} PAX</span>
              {voucher.groupCode && (
                <span className="text-slate-400 ml-1 truncate">({voucher.groupCode})</span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Select Cancellation Option
            </Label>
            <div className="grid grid-cols-1 gap-2.5">
              {options.map((opt) => {
                const Icon = opt.icon;
                const isSelected = cancelType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setCancelType(opt.type)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${opt.borderActive} ${opt.bgActive}`
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg mt-0.5 ${
                        isSelected ? 'bg-white shadow-sm' : 'bg-gray-100'
                      } ${opt.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">{opt.title}</p>
                        {isSelected && (
                          <CheckCircle2 className={`h-4 w-4 ${opt.color}`} />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Reactivate option if already cancelled */}
              {isCancelled && (
                <button
                  type="button"
                  onClick={() => setCancelType('reactivate')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    cancelType === 'reactivate'
                      ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/60'
                      : 'border-dashed border-emerald-300 hover:border-emerald-400 bg-emerald-50/20'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      cancelType === 'reactivate' ? 'bg-white shadow-sm' : 'bg-emerald-100'
                    } text-emerald-600`}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-emerald-900">
                        Reactivate / Restore Voucher
                      </p>
                      {cancelType === 'reactivate' && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-emerald-700/80 mt-0.5 leading-snug">
                      Restore voucher and clear cancellation flags back to Active status
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
              <span>Reason / Remarks</span>
              {cancelType !== 'reactivate' && (
                <span className="text-[10px] text-rose-500 font-semibold lowercase">required for audit log</span>
              )}
            </Label>
            <Textarea
              placeholder={
                cancelType === 'reactivate'
                  ? 'Optional: reason for reactivating voucher...'
                  : 'Specify reason (e.g. Flight rescheduled, Passenger requested cancel, Visa issue)...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none text-xs rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs font-bold text-gray-500 hover:text-gray-700"
          >
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={loading || (cancelType !== 'reactivate' && !reason.trim())}
            className={`text-xs font-bold px-5 h-9 rounded-xl shadow-sm text-white ${
              cancelType === 'reactivate'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Updating...
              </>
            ) : cancelType === 'reactivate' ? (
              'Confirm Reactivation'
            ) : (
              'Confirm Cancellation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
