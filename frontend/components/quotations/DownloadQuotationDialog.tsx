'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { quotationAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Download, ExternalLink, FileText, CheckCircle2, Layers, Eye, Loader2, Sparkles } from 'lucide-react';

interface DownloadQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: {
    id: string;
    quotationNumber: string;
    title?: string | null;
    guestName: string;
    currency: string;
    grandTotal: number;
    totalPax: number;
  } | null;
}

export function DownloadQuotationDialog({
  open,
  onOpenChange,
  quotation,
}: DownloadQuotationDialogProps) {
  const [formatType, setFormatType] = useState<'itemized' | 'lumpsum'>('lumpsum');
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  if (!quotation) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const hideBreakdown = formatType === 'lumpsum';
      toast.info(`Generating ${hideBreakdown ? 'Consolidated' : 'Itemized'} PDF for #${quotation.quotationNumber}...`);
      
      await quotationAPI.downloadPdf(quotation.id, quotation.quotationNumber, {
        hideBreakdown,
      });
      
      toast.success('PDF downloaded successfully');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error downloading quotation PDF:', error);
      toast.error('Failed to download quotation PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = async () => {
    try {
      setPreviewing(true);
      const hideBreakdown = formatType === 'lumpsum';
      await quotationAPI.openPdf(quotation.id, {
        hideBreakdown,
      });
      toast.success('Opening quotation PDF preview in new tab');
    } catch (error: any) {
      console.error('Error previewing quotation PDF:', error);
      toast.error('Failed to open PDF preview');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white sm:rounded-xl shadow-2xl border-slate-200">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Download Quotation PDF
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Choose the presentation layout for quotation #{quotation.quotationNumber}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quotation Mini Summary Banner */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs my-2">
          <div>
            <span className="text-slate-500 block text-[11px]">Guest / Client:</span>
            <strong className="text-slate-900 text-xs font-semibold">{quotation.guestName}</strong>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[11px]">Total Package:</span>
            <strong className="text-emerald-700 font-mono font-bold text-xs">
              {quotation.currency} {Number(quotation.grandTotal || 0).toLocaleString()} ({quotation.totalPax} Pax)
            </strong>
          </div>
        </div>

        {/* Format Selection Cards */}
        <div className="space-y-2.5 my-2">
          <Label className="text-xs font-bold text-slate-700">Choose PDF Pricing Format:</Label>

          {/* Option 1: Lump Sum / Consolidated (Default) */}
          <div
            onClick={() => setFormatType('lumpsum')}
            className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all flex items-start gap-3 ${
              formatType === 'lumpsum'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="mt-0.5">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  formatType === 'lumpsum' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                }`}
              >
                {formatType === 'lumpsum' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Consolidated Package (Total & Per Person Only)
                </span>
                <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0">
                  Recommended for Guests
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Hides individual price breakdowns of hotels, meals, flights, and transfers. Displays the clean <strong>Total Package Cost</strong> and <strong>Per Pilgrim Rate</strong>.
              </p>
            </div>
          </div>

          {/* Option 2: Itemized Breakdown */}
          <div
            onClick={() => setFormatType('itemized')}
            className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all flex items-start gap-3 ${
              formatType === 'itemized'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="mt-0.5">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  formatType === 'itemized' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                }`}
              >
                {formatType === 'itemized' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-slate-600" />
                  Itemized Cost Breakdown
                </span>
                <Badge variant="outline" className="text-[10px] text-slate-600 font-normal px-1.5 py-0">
                  Detailed
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Displays itemized line rates and totals for each individual hotel, extra bed, meal plan, flight sector, ground transfer, and visa charge.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={downloading || previewing}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={downloading || previewing}
            className="text-xs gap-1.5"
          >
            {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5 text-slate-600" />}
            Preview PDF
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownload}
            disabled={downloading || previewing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
