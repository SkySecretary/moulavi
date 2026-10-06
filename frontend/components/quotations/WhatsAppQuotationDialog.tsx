'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { quotationAPI } from '@/lib/api';
import { toast } from 'sonner';
import { MessageSquare, Loader2, Send, FileText, CheckCircle2, Users, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WhatsAppQuotationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: {
    id: string;
    quotationNumber: string;
    guestName: string;
    guestPhone?: string | null;
    partyId?: string | null;
    party?: {
      partyName?: string;
      whatsappGroupId?: string | null;
      whatsappNumber?: string | null;
      contactNumber?: string | null;
    } | null;
    customerType: string;
    currency: string;
    grandTotal: number;
    totalPax: number;
    title?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function WhatsAppQuotationDialog({
  isOpen,
  onClose,
  quotation,
  onSuccess,
}: WhatsAppQuotationDialogProps) {
  const [recipient, setRecipient] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (quotation) {
      const defaultPhone = quotation.customerType === 'B2B' && quotation.party
        ? (quotation.party.whatsappGroupId || quotation.party.whatsappNumber || quotation.party.contactNumber || quotation.guestPhone || '')
        : (quotation.guestPhone || '');
      setRecipient(defaultPhone);

      const isAgency = quotation.customerType === 'B2B' && quotation.party?.partyName;
      const targetName = isAgency ? quotation.party?.partyName : quotation.guestName;

      setCustomMessage(
        `📄 *UMRAH PACKAGE QUOTATION - MOULAVI TRAVELS*\n` +
        `═══════════════════\n` +
        `Dear *${targetName}*,\n\n` +
        `Thank you for choosing *Moulavi Travels*. We are pleased to present your customized Umrah package proposal.\n\n` +
        `🔖 *Quotation Ref:* ${quotation.quotationNumber}\n` +
        `🏷️ *Package:* ${quotation.title || 'Custom Umrah Package'}\n` +
        `👥 *Total Pilgrims:* ${quotation.totalPax} Pax\n` +
        `💰 *Total Amount:* *${quotation.currency} ${Number(quotation.grandTotal).toLocaleString()}*\n\n` +
        `📎 *Official quotation document is attached as PDF below.*\n\n` +
        `🤲 We look forward to facilitating a spiritual and seamless journey for you and your guests.\n` +
        `*Moulavi Travel & Recruitment Agents Pvt Ltd*`
      );
    }
  }, [quotation]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    try {
      setSending(true);
      const res = await quotationAPI.sendWhatsApp(quotation.id, {
        to: recipient.trim() || undefined,
        message: customMessage.trim() || undefined,
      });

      toast.success(res.data?.message || 'Quotation sent via WhatsApp successfully!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error sending quotation via WhatsApp:', error);
      toast.error(error.response?.data?.error || 'Failed to send WhatsApp quotation');
    } finally {
      setSending(false);
    }
  };

  const isB2B = quotation?.customerType === 'B2B' && quotation?.party;
  const hasAgencyGroup = isB2B && quotation?.party?.whatsappGroupId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSend}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-950">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <MessageSquare className="h-5 w-5" />
              </div>
              Send Quotation on WhatsApp (QR Channel)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dispatches the branded quotation summary and attaches the official PDF proposal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Target Routing Context Banner */}
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 space-y-1.5 text-xs text-emerald-900">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  {isB2B ? <Users className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                  {isB2B ? `B2B Agency: ${quotation?.party?.partyName}` : `B2C Direct Guest: ${quotation?.guestName}`}
                </span>
                <Badge variant="outline" className="bg-white/80 text-[10px] text-emerald-800 border-emerald-200">
                  {hasAgencyGroup ? 'Routing to Agency Group' : 'Direct Number'}
                </Badge>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Quotation: <strong className="text-slate-800 font-mono">{quotation?.quotationNumber}</strong></span>
                <span>Amount: <strong className="text-emerald-700">{quotation?.currency} {Number(quotation?.grandTotal || 0).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Recipient Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                WhatsApp Destination (Phone / Group ID)
              </Label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="+919876543210 or 120363048999@g.us"
                className="text-sm font-mono"
              />
              <p className="text-[11px] text-gray-500">
                Leave blank to automatically route using the saved agency WhatsApp group / guest phone number.
              </p>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">WhatsApp Message Text</Label>
              <Textarea
                rows={6}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="text-xs font-mono resize-none leading-relaxed"
              />
            </div>

            {/* PDF Attachment Notice */}
            <div className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700">
              <FileText className="h-4 w-4 text-rose-500 shrink-0" />
              <span>
                Attachment: <strong>Quotation_{quotation?.quotationNumber}.pdf</strong> will be delivered directly with the message.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-md"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending WhatsApp...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send WhatsApp
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
