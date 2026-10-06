'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { quotationAPI, partyAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, ArrowRightCircle, CheckCircle2, Building2, Users } from 'lucide-react';

interface ConvertToBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: {
    id: string;
    quotationNumber: string;
    guestName: string;
    guestPhone?: string | null;
    partyId?: string | null;
    customerType: string;
    totalPax: number;
    title?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function ConvertToBookingDialog({
  isOpen,
  onClose,
  quotation,
  onSuccess,
}: ConvertToBookingDialogProps) {
  const router = useRouter();
  const [parties, setParties] = useState<any[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [visaType, setVisaType] = useState<'individual_visa' | 'group_visa'>('individual_visa');
  const [groupNumber, setGroupNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  const [converting, setConverting] = useState(false);
  const [loadingParties, setLoadingParties] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadParties();
      if (quotation) {
        setSelectedPartyId(quotation.partyId || '');
        const isGroup = quotation.totalPax > 1;
        setVisaType(isGroup ? 'group_visa' : 'individual_visa');
        setGroupName(quotation.title || `${quotation.guestName} Umrah Group`);
        setGroupNumber(`G-${quotation.quotationNumber.replace('QT-', '')}`);
      }
    }
  }, [isOpen, quotation]);

  const loadParties = async () => {
    try {
      setLoadingParties(true);
      const res = await partyAPI.getAll({ is_customer: 'true', limit: 1000 });
      const rawParties = res.data?.parties || (Array.isArray(res.data) ? res.data : []);
      const activeParties = rawParties.filter((p: any) => p.isCustomer !== false);
      setParties(activeParties);
      if (quotation?.partyId) {
        setSelectedPartyId(quotation.partyId);
      } else if (activeParties.length > 0) {
        setSelectedPartyId((prev) => prev || activeParties[0].id);
      }
    } catch (err) {
      console.error('Error loading parties:', err);
    } finally {
      setLoadingParties(false);
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    try {
      setConverting(true);
      const res = await quotationAPI.convertToBooking(quotation.id, {
        partyId: selectedPartyId || undefined,
        visaType,
        groupNumber: visaType === 'group_visa' ? groupNumber.trim() : undefined,
        groupName: visaType === 'group_visa' ? groupName.trim() : undefined,
      });

      const newBooking = res.data?.booking;
      toast.success(
        res.data?.message || `Successfully converted to booking #${newBooking?.bookingReference || ''}!`
      );
      onSuccess?.();
      onClose();

      // Navigate directly to the booking view or edit page
      if (newBooking?.id) {
        router.push(`/dashboard/umrah-visa/visa-management/view/${newBooking.id}`);
      }
    } catch (error: any) {
      console.error('Error converting quotation:', error);
      toast.error(error.response?.data?.error || 'Failed to convert quotation to booking');
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleConvert}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <ArrowRightCircle className="h-5 w-5 text-primary" />
              Convert Quotation to Booking
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will create an active <strong>Umrah Visa Booking</strong> with all guest slots, stays, and transfers automatically pre-filled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Quotation Info */}
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Quotation Ref:</span>
                <span className="font-mono font-bold text-slate-900">{quotation?.quotationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Lead Guest:</span>
                <span className="font-medium text-gray-900">{quotation?.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Pilgrims:</span>
                <span className="font-bold text-gray-900">{quotation?.totalPax} Pax</span>
              </div>
            </div>

            {/* Target Agency / Party */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Assign to Agency / Party <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Agency / Party" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.partyName} ({p.partyCode || 'Agency'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visa Booking Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Booking Visa Type</Label>
              <Select
                value={visaType}
                onValueChange={(val: any) => setVisaType(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual_visa" className="text-xs">
                    Individual Booking (Passport / Family)
                  </SelectItem>
                  <SelectItem value="group_visa" className="text-xs">
                    Group Booking (Group Code Batch)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group details if group visa */}
            {visaType === 'group_visa' && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="groupNum" className="text-xs font-semibold">
                    Group Code / Number
                  </Label>
                  <Input
                    id="groupNum"
                    value={groupNumber}
                    onChange={(e) => setGroupNumber(e.target.value)}
                    placeholder="e.g. G-261005-001"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="grpName" className="text-xs font-semibold">
                    Group Name
                  </Label>
                  <Input
                    id="grpName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. VIP Umrah Package Group"
                    className="text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={converting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={converting || (!selectedPartyId && parties.length > 0)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
            >
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm & Create Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
