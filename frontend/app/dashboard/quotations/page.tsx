'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { quotationAPI } from '@/lib/api';
import { getUser, hasRole } from '@/lib/auth';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Download,
  Mail,
  ArrowRightCircle,
  Edit2,
  Copy,
  Trash2,
  Users,
  Building2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Send,
  Calendar,
  MessageSquare,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { EmailQuotationDialog } from '@/components/quotations/EmailQuotationDialog';
import { WhatsAppQuotationDialog } from '@/components/quotations/WhatsAppQuotationDialog';
import { ConvertToBookingDialog } from '@/components/quotations/ConvertToBookingDialog';
import { DownloadQuotationDialog } from '@/components/quotations/DownloadQuotationDialog';

interface QuotationItem {
  id: string;
  quotationNumber: string;
  title?: string | null;
  status: string;
  validUntil?: string | null;
  customerType: string;
  partyId?: string | null;
  party?: {
    id: string;
    partyName: string;
    partyCode?: string;
    email?: string | null;
    contactNumber?: string | null;
    whatsappNumber?: string | null;
    whatsappGroupId?: string | null;
  } | null;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestCountry?: string | null;
  guestCity?: string | null;
  adultsCount: number;
  childrenCount: number;
  infantsCount: number;
  totalPax: number;
  currency: string;
  grandTotal: number;
  hotels?: any[];
  flights?: any[];
  transports?: any[];
  convertedBooking?: { id: string; bookingReference: string; status: string } | null;
  createdAt: string;
}

export default function QuotationsPage() {
  const router = useRouter();
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    totalDraft: 0,
    totalSent: 0,
    totalConverted: 0,
    totalAccepted: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog states
  const [downloadDialogQuote, setDownloadDialogQuote] = useState<QuotationItem | null>(null);
  const [emailDialogQuote, setEmailDialogQuote] = useState<QuotationItem | null>(null);
  const [whatsappDialogQuote, setWhatsappDialogQuote] = useState<QuotationItem | null>(null);
  const [convertDialogQuote, setConvertDialogQuote] = useState<QuotationItem | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const res = await quotationAPI.getAll({
        page: currentPage,
        limit: 15,
        search: debouncedSearch,
        status: statusFilter,
        customerType: customerTypeFilter,
      });

      if (res.data) {
        setQuotations(res.data.quotations || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
        }
      }
    } catch (error: any) {
      console.error('Error loading quotations:', error);
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    loadQuotations();
  }, [currentPage, debouncedSearch, statusFilter, customerTypeFilter]);

  const handleDuplicate = async (id: string) => {
    try {
      const res = await quotationAPI.duplicate(id);
      toast.success(`Quotation duplicated as #${res.data?.quotation?.quotationNumber}`);
      loadQuotations();
    } catch (error: any) {
      toast.error('Failed to duplicate quotation');
    }
  };

  const handleDelete = async (id: string, quoteNum: string) => {
    if (!confirm(`Are you sure you want to delete quotation #${quoteNum}?`)) return;
    try {
      await quotationAPI.delete(id);
      toast.success(`Quotation #${quoteNum} deleted`);
      loadQuotations();
    } catch (error: any) {
      toast.error('Failed to delete quotation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700">Draft</Badge>;
      case 'SENT':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent to Client</Badge>;
      case 'ACCEPTED':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Accepted</Badge>;
      case 'CONVERTED':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Converted to Booking</Badge>;
      case 'EXPIRED':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 pb-16">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-indigo-600" />
              Quotations & Costing Builder
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Create instant quotes with meals, hotels, transfers, and easily convert them into bookings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => loadQuotations()}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/dashboard/quotations/create">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" />
                New Quotation
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-indigo-100 bg-indigo-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Total Quotations</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <FileText className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Active quotations in system</p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Sent / Emailed</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalSent}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Send className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Quotations sent to clients</p>
            </CardContent>
          </Card>

          <Card className="border-purple-100 bg-purple-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Converted Bookings</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{stats.totalConverted}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Successfully converted to bookings</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-slate-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Drafts Pending</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDraft}</p>
                </div>
                <div className="p-3 bg-slate-200 rounded-xl">
                  <Clock className="h-6 w-6 text-slate-700" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Drafts awaiting finalize/send</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search quote #, guest name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="CONVERTED">Converted</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                  <SelectTrigger className="w-36 text-xs">
                    <SelectValue placeholder="Customer Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="B2C">Direct (B2C)</SelectItem>
                    <SelectItem value="B2B">Agency (B2B)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotations List */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm">Loading quotations...</p>
              </div>
            ) : quotations.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base font-semibold text-gray-800">No Quotations Found</p>
                <p className="text-xs text-gray-500 mt-1">Get started by creating your first custom quotation.</p>
                <Link href="/dashboard/quotations/create">
                  <Button size="sm" className="mt-4 bg-indigo-600 text-white">
                    Create Quotation
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Quote Number</th>
                      <th className="py-3 px-4">Guest / Customer</th>
                      <th className="py-3 px-4">Pilgrims</th>
                      <th className="py-3 px-4">Grand Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quotations.map((quote) => (
                      <tr key={quote.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-bold text-indigo-700">
                              #{quote.quotationNumber}
                            </span>
                            {quote.title && (
                              <span className="text-xs text-gray-500 truncate max-w-xs">{quote.title}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{quote.guestName}</span>
                            {quote.customerType === 'B2B' && quote.party ? (
                              <span className="text-indigo-600 text-[11px] flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {quote.party.partyName}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[10px]">Direct B2C</span>
                            )}
                            {quote.guestPhone && (
                              <span className="text-gray-500 font-mono text-[10px]">{quote.guestPhone}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <Badge variant="outline" className="font-mono">
                            {quote.totalPax} Pax
                          </Badge>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {quote.adultsCount}A {quote.childrenCount > 0 ? `, ${quote.childrenCount}C` : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          {quote.currency} {quote.grandTotal?.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          {getStatusBadge(quote.status)}
                          {quote.convertedBooking && (
                            <Link
                              href={`/dashboard/umrah-visa/visa-management/view/${quote.convertedBooking.id}`}
                              className="text-[10px] font-semibold text-purple-700 hover:underline block mt-1"
                            >
                              Booking #{quote.convertedBooking.bookingReference} →
                            </Link>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-500">
                          {new Date(quote.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Download PDF */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                              onClick={() => setDownloadDialogQuote(quote)}
                              title="Download PDF (Itemized / Lump-Sum Options)"
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            {/* WhatsApp PDF */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                              onClick={() => setWhatsappDialogQuote(quote)}
                              title="Send on WhatsApp"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>

                            {/* Email PDF */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => setEmailDialogQuote(quote)}
                              title="Email PDF"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>

                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              onClick={() => router.push(`/dashboard/quotations/edit/${quote.id}`)}
                              title="Edit Quotation"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            {/* Duplicate */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              onClick={() => handleDuplicate(quote.id)}
                              title="Duplicate Quotation"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>

                            {/* Convert to Booking */}
                            {quote.status !== 'CONVERTED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                onClick={() => setConvertDialogQuote(quote)}
                                title="Convert to Booking"
                              >
                                <ArrowRightCircle className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDelete(quote.id, quote.quotationNumber)}
                              title="Delete Quotation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1 || loading}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                    className="h-8 px-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Download Modal Dialog */}
      <DownloadQuotationDialog
        open={Boolean(downloadDialogQuote)}
        onOpenChange={(open) => !open && setDownloadDialogQuote(null)}
        quotation={downloadDialogQuote}
      />

      {/* Email Modal Dialog */}
      <EmailQuotationDialog
        isOpen={Boolean(emailDialogQuote)}
        onClose={() => setEmailDialogQuote(null)}
        quotation={emailDialogQuote}
        onSuccess={() => loadQuotations()}
      />

      {/* WhatsApp Modal Dialog */}
      <WhatsAppQuotationDialog
        isOpen={Boolean(whatsappDialogQuote)}
        onClose={() => setWhatsappDialogQuote(null)}
        quotation={whatsappDialogQuote}
        onSuccess={() => loadQuotations()}
      />

      {/* Convert to Booking Dialog */}
      <ConvertToBookingDialog
        isOpen={Boolean(convertDialogQuote)}
        onClose={() => setConvertDialogQuote(null)}
        quotation={convertDialogQuote}
        onSuccess={() => loadQuotations()}
      />
    </div>
  );
}
