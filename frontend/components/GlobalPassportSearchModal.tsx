'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Loader2,
  Copy,
  Check,
  FileText,
  Edit2,
  ExternalLink,
  Building2,
  Calendar,
  Compass,
  MapPin,
  Plane,
  User,
  ShieldCheck,
  AlertCircle,
  Eye,
  ArrowRight,
  Phone,
  Hash,
  Tag
} from 'lucide-react';
import { nusukAPI, umrahVisaAPI, voucherAPI } from '@/lib/api';
import { generateVoucherPDF } from '@/lib/pdf/voucherPdfGenerator';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface GlobalPassportSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function GlobalPassportSearchModal({
  isOpen,
  onClose,
  initialQuery = '',
}: GlobalPassportSearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'in_ksa' | 'visa_issued' | 'review'>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedPassport, setCopiedPassport] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, initialQuery]);

  // Debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const delayFn = setTimeout(async () => {
      try {
        const response = await nusukAPI.searchPassengers(trimmed);
        setResults(response.data || []);
      } catch (err: any) {
        console.error('Passport search error:', err);
        toast.error('Failed to search passengers');
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayFn);
  }, [searchQuery]);

  const handleCopyPassport = (passportNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!passportNumber) return;
    navigator.clipboard.writeText(passportNumber);
    setCopiedPassport(passportNumber);
    toast.success(`Copied "${passportNumber}" to clipboard`);
    setTimeout(() => setCopiedPassport(null), 2000);
  };

  const handleDownloadBookingPDF = async (bookingId: string, bookingRef: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingId(`booking-${bookingId}`);
      const response = await umrahVisaAPI.generateBookingPDF(bookingId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bookingRef || bookingId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Booking PDF downloaded successfully');
    } catch (err) {
      console.error('Error downloading booking PDF:', err);
      toast.error('Failed to download booking PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadVoucherPDF = async (voucherId: string, voucherNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingId(`voucher-${voucherId}`);
      const response = await voucherAPI.getVoucherById(voucherId);
      if (response.data?.voucher) {
        generateVoucherPDF(response.data.voucher);
        toast.success(`Voucher #${voucherNumber} downloaded successfully`);
      } else {
        toast.error('Voucher details not found');
      }
    } catch (err) {
      console.error('Error downloading voucher PDF:', err);
      toast.error('Failed to download voucher PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenFullPage = () => {
    onClose();
    router.push(`/dashboard/passport-search${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`);
  };

  // Filter results
  const filteredResults = results.filter((p) => {
    if (filterTab === 'in_ksa') {
      return p.currentlyInKingdom === 'Yes';
    }
    if (filterTab === 'visa_issued') {
      return !!p.visaNumber || (p.mutamerStatus && !p.mutamerStatus.toLowerCase().includes('review') && !p.mutamerStatus.toLowerCase().includes('reject'));
    }
    if (filterTab === 'review') {
      return p.isConsulateReview || (p.mutamerStatus && p.mutamerStatus.toLowerCase().includes('review'));
    }
    return true;
  });

  const countInKSA = results.filter((p) => p.currentlyInKingdom === 'Yes').length;
  const countVisaIssued = results.filter((p) => !!p.visaNumber || (p.mutamerStatus && !p.mutamerStatus.toLowerCase().includes('review'))).length;
  const countReview = results.filter((p) => p.isConsulateReview || (p.mutamerStatus && p.mutamerStatus.toLowerCase().includes('review'))).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 shadow-2xl bg-white max-h-[90vh] flex flex-col">
        {/* Accessible Dialog Title for screen readers */}
        <DialogTitle className="sr-only">Global Passport & Passenger Search</DialogTitle>

        {/* Top Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Passport #, Name, Visa #, Border #, Group Code, Booking Reference..."
              className="w-full pl-12 pr-28 py-3.5 bg-gray-50/90 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-indigo-500 rounded-xl text-base font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
            />
            <div className="absolute right-3 flex items-center gap-2">
              {searching ? (
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              ) : searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Clear input"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-gray-400 bg-gray-100 border border-gray-200 rounded">
                ESC
              </kbd>
            </div>
          </div>

          {/* Quick Filters / Summary Bar */}
          {results.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({results.length})
                </button>
                <button
                  onClick={() => setFilterTab('in_ksa')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    filterTab === 'in_ksa'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  In KSA ({countInKSA})
                </button>
                <button
                  onClick={() => setFilterTab('visa_issued')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterTab === 'visa_issued'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  Visa Issued ({countVisaIssued})
                </button>
                {countReview > 0 && (
                  <button
                    onClick={() => setFilterTab('review')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      filterTab === 'review'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <AlertCircle className="h-3 w-3" />
                    Review ({countReview})
                  </button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenFullPage}
                className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold h-7 gap-1"
              >
                Full Page View
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Modal Body / Results */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-gray-50/50 min-h-[300px]">
          {searchQuery.trim() === '' ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-indigo-100">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Global Passenger & Passport Search</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Search across all registered bookings and passengers. Try entering a passport number, full name, visa number, or booking reference.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Search by:
                </span>
                <span className="bg-white border border-gray-200 text-gray-600 text-[11px] px-2 py-0.5 rounded-md font-medium shadow-2xs">
                  Passport #
                </span>
                <span className="bg-white border border-gray-200 text-gray-600 text-[11px] px-2 py-0.5 rounded-md font-medium shadow-2xs">
                  Passenger Name
                </span>
                <span className="bg-white border border-gray-200 text-gray-600 text-[11px] px-2 py-0.5 rounded-md font-medium shadow-2xs">
                  Visa # / Border #
                </span>
                <span className="bg-white border border-gray-200 text-gray-600 text-[11px] px-2 py-0.5 rounded-md font-medium shadow-2xs">
                  Booking Ref / Group #
                </span>
              </div>
            </div>
          ) : searching ? (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-500">Searching global records...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <X className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">No passengers found</h3>
              <p className="text-xs text-gray-500 mt-1">
                No matching records found for "{searchQuery}". Please check the spelling or try another keyword.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((passenger) => {
                const booking = passenger.booking || {};
                const voucher = booking.voucher || null;
                const isCopied = copiedPassport === passenger.passportNumber;

                return (
                  <div
                    key={passenger.id}
                    className="bg-white border border-gray-200/90 hover:border-indigo-300 rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-md group"
                  >
                    {/* Header Row: Passenger Name, Passport, Status Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span className="text-base font-bold text-gray-900">
                            {passenger.fullName}
                          </span>
                        </div>

                        {passenger.isLeadPassenger && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold py-0">
                            Lead Guest
                          </Badge>
                        )}

                        {passenger.isConsulateReview && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold py-0 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Consulate Review
                          </Badge>
                        )}

                        {/* Passport badge with 1-click copy */}
                        {passenger.passportNumber ? (
                          <button
                            onClick={(e) => handleCopyPassport(passenger.passportNumber, e)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold transition-all shadow-2xs group/btn"
                            title="Click to copy passport number"
                          >
                            <Hash className="h-3 w-3 text-indigo-400" />
                            <span>{passenger.passportNumber}</span>
                            {isCopied ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-indigo-400 group-hover/btn:text-indigo-700 transition-colors" />
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No Passport</span>
                        )}

                        {passenger.nationality && (
                          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded">
                            {passenger.nationality}
                          </span>
                        )}
                      </div>

                      {/* Status / KSA Badge */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                            passenger.currentlyInKingdom === 'Yes'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              passenger.currentlyInKingdom === 'Yes' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                            }`}
                          />
                          {passenger.currentlyInKingdom === 'Yes'
                            ? `In KSA (${passenger.daysInKingdom || 0}d)`
                            : 'Out of KSA'}
                        </span>
                      </div>
                    </div>

                    {/* Content Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-3 text-xs text-gray-600">
                      {/* Agency & Umrah Provider */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                          <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Agency / Company</span>
                        </div>
                        <p className="font-bold text-gray-800 truncate" title={booking.party?.partyName}>
                          {booking.party?.partyName || 'N/A'}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          Umrah Co: <span className="font-semibold text-gray-700">{booking.umrahCompany || 'N/A'}</span>
                        </p>
                      </div>

                      {/* Booking & Group Code */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                          <Compass className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Booking & Group</span>
                        </div>
                        <p className="font-bold text-indigo-600 font-mono">
                          {booking.bookingReference || 'N/A'}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Group: <span className="font-semibold text-gray-700">{booking.groupNumber || 'N/A'}</span>
                        </p>
                      </div>

                      {/* Voucher Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                          <FileText className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Transport Voucher</span>
                        </div>
                        {voucher ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono border border-emerald-200">
                                #{voucher.voucherNumber}
                              </span>
                              {voucher.isQuickVoucher && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 rounded">
                                  ⚡ Quick
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">
                              {voucher.transportCompanyName || 'Transport Assigned'}
                            </p>
                          </>
                        ) : (
                          <p className="text-gray-400 italic">No Voucher Created</p>
                        )}
                      </div>

                      {/* Hotels (Makkah & Madinah) */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                          <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Hotels</span>
                        </div>
                        <p className="text-[11px] text-gray-700 truncate">
                          🕋 <span className="font-semibold">{booking.makkaHotel || 'N/A'}</span>
                        </p>
                        <p className="text-[11px] text-gray-700 truncate">
                          🕌 <span className="font-semibold">{booking.madinaHotel || 'N/A'}</span>
                        </p>
                      </div>

                      {/* Visa & Border Number */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Visa & Entry Info</span>
                        </div>
                        <p className="text-[11px] text-gray-700">
                          Visa No: <span className="font-mono font-bold text-gray-900">{passenger.visaNumber || 'N/A'}</span>
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Border: <span className="font-mono font-medium">{passenger.borderNumber || 'N/A'}</span>
                        </p>
                      </div>

                      {/* Flights or Iqama */}
                      <div className="space-y-1">
                        {booking.travel ? (
                          <>
                            <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                              <Plane className="h-3.5 w-3.5 text-indigo-500" />
                              <span>Flight Schedule</span>
                            </div>
                            <p className="text-[11px] text-gray-700 truncate">
                              Arr: <span className="font-semibold">{booking.travel.arrivalFlightNumber || 'N/A'}</span> ({booking.travel.arrivalAirport})
                            </p>
                            <p className="text-[11px] text-gray-700 truncate">
                              Dep: <span className="font-semibold">{booking.travel.departureFlightNumber || 'N/A'}</span> ({booking.travel.departureAirport})
                            </p>
                          </>
                        ) : booking.iqama ? (
                          <>
                            <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                              <User className="h-3.5 w-3.5 text-indigo-500" />
                              <span>Iqama Sponsor</span>
                            </div>
                            <p className="text-[11px] text-gray-700 truncate">
                              Host: <span className="font-semibold">{booking.iqama.hostName}</span>
                            </p>
                            <p className="text-[11px] text-gray-500">
                              IQ#: <span className="font-mono">{booking.iqama.iqamaNumber}</span>
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                              <span>Status</span>
                            </div>
                            <p className="text-[11px] text-gray-700">
                              Mutamer: <span className="font-semibold">{passenger.mutamerStatus}</span>
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Bar Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                      <div className="text-[11px] text-gray-400">
                        Status: <span className="font-semibold uppercase text-gray-600">{booking.status}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Download Booking PDF */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDownloadBookingPDF(booking.id, booking.bookingReference, e)}
                          disabled={downloadingId === `booking-${booking.id}`}
                          className="h-8 text-xs font-semibold border-gray-200 hover:bg-gray-50 gap-1.5 text-gray-700"
                        >
                          {downloadingId === `booking-${booking.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-indigo-600" />
                          )}
                          Booking PDF
                        </Button>

                        {/* Download Voucher PDF (if voucher exists) */}
                        {voucher && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDownloadVoucherPDF(voucher.id, voucher.voucherNumber, e)}
                            disabled={downloadingId === `voucher-${voucher.id}`}
                            className="h-8 text-xs font-semibold border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 gap-1.5"
                          >
                            {downloadingId === `voucher-${voucher.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                            Voucher #{voucher.voucherNumber}
                          </Button>
                        )}

                        {/* Edit Booking */}
                        <Button
                          size="sm"
                          onClick={() => {
                            onClose();
                            router.push(`/dashboard/umrah-visa/visa-management/edit/${booking.id}`);
                          }}
                          className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Manage Booking
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 bg-gray-50 border-t border-gray-200/80 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>💡 Tip: Press <kbd className="font-mono bg-white border px-1.5 py-0.5 rounded text-[10px] text-gray-700 shadow-2xs">⌘K</kbd> anywhere to open search</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-bold text-gray-600 h-8"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleOpenFullPage}
              className="text-xs font-bold bg-gray-900 hover:bg-black text-white h-8 gap-1.5"
            >
              Open Full Search Page
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
