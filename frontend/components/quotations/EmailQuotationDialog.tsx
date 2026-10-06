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
import { Loader2, Mail, Send, FileText, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EmailQuotationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: {
    id: string;
    quotationNumber: string;
    guestName: string;
    guestEmail?: string | null;
    partyId?: string | null;
    party?: {
      partyName?: string;
      email?: string | null;
    } | null;
    customerType?: string;
    currency: string;
    grandTotal: number;
    totalPax: number;
    title?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function EmailQuotationDialog({
  isOpen,
  onClose,
  quotation,
  onSuccess,
}: EmailQuotationDialogProps) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Automatically autofill fields whenever dialog opens or quotation changes
  useEffect(() => {
    if (isOpen && quotation) {
      const isB2B = quotation.customerType === 'B2B';
      const defaultEmail = isB2B
        ? (quotation.party?.email || quotation.guestEmail || '')
        : (quotation.guestEmail || quotation.party?.email || '');
      
      setEmail(defaultEmail);
      setSubject(`Official Umrah Quotation #${quotation.quotationNumber} - Moulavi Travels`);

      const recipientGreeting = isB2B && quotation.party?.partyName
        ? quotation.party.partyName
        : quotation.guestName;

      setMessage(
        `Dear ${recipientGreeting},\n\n` +
        `Thank you for choosing Moulavi Travels. Please find attached your official customized Umrah Package Quotation (${quotation.quotationNumber}).\n\n` +
        `🔖 Quotation Reference: ${quotation.quotationNumber}\n` +
        `🏷️ Package: ${quotation.title || 'Custom Umrah Package'}\n` +
        `👥 Total Pilgrims: ${quotation.totalPax} Pax\n` +
        `💰 Total Package Price: ${quotation.currency} ${Number(quotation.grandTotal).toLocaleString()}\n\n` +
        `Please review the attached official quotation document (PDF) and let us know if you need any adjustments or wish to proceed with confirmation.\n\n` +
        `Warm regards,\n` +
        `Moulavi Travels & Recruitment Agents Pvt Ltd\n` +
        `https://umra.moulavi.in`
      );
    }
  }, [isOpen, quotation]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;
    if (!email.trim()) {
      toast.error('Recipient email address is required');
      return;
    }

    try {
      setSending(true);
      const res = await quotationAPI.sendEmail(quotation.id, {
        to: email.trim(),
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
      });

      toast.success(res.data?.message || 'Quotation email sent successfully!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error sending quotation email:', error);
      toast.error(error.response?.data?.error || 'Failed to send quotation email');
    } finally {
      setSending(false);
    }
  };

  const isB2B = quotation?.customerType === 'B2B';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSend}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Mail className="h-5 w-5 text-primary" />
              Email Quotation Document (PDF)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send the official PDF quotation directly to the {isB2B ? 'partner agency' : 'client'} with full Moulavi branding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Context Badge */}
            {quotation && (
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white font-mono font-bold text-slate-800 text-xs">
                    #{quotation.quotationNumber}
                  </Badge>
                  <span className="font-semibold text-slate-700">
                    {isB2B && quotation.party?.partyName ? quotation.party.partyName : quotation.guestName}
                  </span>
                </div>
                <span className="font-mono font-bold text-primary">
                  {quotation.currency} {Number(quotation.grandTotal).toLocaleString()}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="recipientEmail" className="text-xs font-semibold">
                  Recipient Email <span className="text-destructive">*</span>
                </Label>
                {isB2B && quotation?.party?.email && (
                  <span className="text-[10px] text-emerald-600 font-medium">Autofilled from Agency Master</span>
                )}
              </div>
              <Input
                id="recipientEmail"
                type="email"
                placeholder={isB2B ? 'agency.contact@example.com' : 'guest@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emailSubject" className="text-xs font-semibold">
                Email Subject
              </Label>
              <Input
                id="emailSubject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-sm"
                placeholder="Official Quotation - Moulavi Travels"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emailMessage" className="text-xs font-semibold">
                Cover Note / Message Content
              </Label>
              <Textarea
                id="emailMessage"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-xs font-sans"
              />
            </div>

            <div className="rounded-md bg-emerald-50/70 p-3 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>PDF Attachment Included:</span>
              </div>
              <span className="font-mono font-bold text-slate-900">Quotation_{quotation?.quotationNumber || 'Doc'}.pdf</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending} className="gap-1.5 shadow-xs">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending PDF...' : 'Send Quotation Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
