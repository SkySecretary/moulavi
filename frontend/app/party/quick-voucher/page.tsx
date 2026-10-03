'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Zap,
  Plus,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Trash2,
  Ticket,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import api, { voucherAPI } from '@/lib/api';
import QuickVoucherForm from '@/components/voucher/QuickVoucherForm';
import NextLink from 'next/link';

export default function PartyQuickVoucherPage() {
  const user = getUser();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const fetchRequests = async (page = 1) => {
    try {
      setLoading(true);
      const response = await voucherAPI.getQuickRequests({
        page,
        limit: pagination.limit,
        status: statusFilter,
        search: searchQuery,
      });

      const reqs = response.data?.requests || [];
      setRequests(reqs);
      setPagination(response.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });

      // Compute stats
      const allRes = await voucherAPI.getQuickRequests({ limit: 1000 });
      const allReqs = allRes.data?.requests || [];
      setStats({
        total: allReqs.length,
        pending: allReqs.filter((r: any) => r.status === 'pending').length,
        approved: allReqs.filter((r: any) => r.status === 'approved').length,
        rejected: allReqs.filter((r: any) => r.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load quick voucher requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && hasRole('party')) {
      fetchRequests(pagination.page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, statusFilter, searchQuery]);

  const handleDownloadPDF = async (voucherId: string) => {
    try {
      setDownloadingId(voucherId);
      const response = await voucherAPI.getVoucherById(voucherId);
      const voucher = response.data.voucher;

      const pdfData = {
        voucherNumber: voucher.voucherNumber,
        bookingReference: voucher.bookingReference || '',
        reservationNumber: voucher.voucherNumber,
        reservationDate: voucher.reservationDate ? voucher.reservationDate.split('T')[0] : '',
        guestName: voucher.guestName || '',
        guestMobile: voucher.guestMobile || '',
        groupCode: voucher.groupCode || '',
        paxCount: voucher.paxCount || 0,
        umrahCompany: voucher.umrahCompany || null,
        agentParty: voucher.party || null,
        transportCompany: voucher.transportCompany || null,
        hotelSchedules: (voucher.hotelSchedules || []).map((hs: any) => ({
          number: hs.number || 0,
          location: hs.location || '',
          hotelName: hs.hotelName || '',
          checkIn: hs.checkIn ? hs.checkIn.split('T')[0] : '',
          checkOut: hs.checkOut ? hs.checkOut.split('T')[0] : '',
          days: hs.days || 0,
          brn: hs.brn ? (hs.brn.includes(',') ? hs.brn.split(',').map((s: string) => s.trim()) : [hs.brn]) : [],
        })),
        movementDetails: (voucher.movementDetails || []).map((md: any) => ({
          sr: md.sr || 0,
          route: md.route || '',
          date: md.date ? md.date.split('T')[0] : '',
          time: md.time || '',
          from: md.from || '',
          fromLocation: md.fromLocation || '',
          to: md.to || '',
          toLocation: md.toLocation || '',
          vehicleType: md.vehicleType || voucher.vehicleType || '',
        })),
        flightDetails: (voucher.flightDetails || []).map((fd: any) => ({
          type: fd.type || 'AA',
          carrier: fd.carrier || '',
          number: fd.number || '',
          date: fd.date ? fd.date.split('T')[0] : '',
          from: fd.from || '',
          to: fd.to || '',
          etd: fd.etd || '',
          eta: fd.eta || '',
        })),
      };

      const pdfResponse = await api.post('/umrah-visa/generate-pdf', pdfData, { responseType: 'blob' });
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Voucher-${pdfData.voucherNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Voucher PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this pending voucher request?')) return;
    try {
      setCancellingId(id);
      await voucherAPI.deleteQuickRequest(id);
      toast.success('Request cancelled successfully');
      fetchRequests(pagination.page);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to cancel request');
    } finally {
      setCancellingId(null);
    }
  };

  if (!user || !hasRole('party')) return null;

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 min-h-screen pb-20">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Quick Voucher Requests
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 font-medium mt-0.5">
              Request quick transport vouchers and monitor admin approval status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 shadow-md flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>New Voucher Request</span>
            </Button>
            <Button
              onClick={() => fetchRequests(pagination.page)}
              variant="outline"
              size="sm"
              className="h-9 font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4 shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Requests</p>
              <p className="text-xl font-black text-gray-900">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending</p>
              <p className="text-xl font-black text-amber-600">{stats.pending}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Approved</p>
              <p className="text-xl font-black text-emerald-600">{stats.approved}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold flex-shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rejected</p>
              <p className="text-xl font-black text-rose-600">{stats.rejected}</p>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <Card className="border shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="p-4 border-b bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search request #, guest name, mobile, group code..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(v: any) => {
                    setStatusFilter(v);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  <SelectTrigger className="h-9 w-36 text-xs font-bold bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">All Status</SelectItem>
                    <SelectItem value="pending" className="text-xs font-bold text-amber-600">Pending</SelectItem>
                    <SelectItem value="approved" className="text-xs font-bold text-emerald-600">Approved</SelectItem>
                    <SelectItem value="rejected" className="text-xs font-bold text-rose-600">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[140px] text-xs font-bold uppercase">Request #</TableHead>
                    <TableHead className="w-[180px] text-xs font-bold uppercase">Guest / Mobile</TableHead>
                    <TableHead className="w-[140px] text-xs font-bold uppercase">Group Code</TableHead>
                    <TableHead className="w-[80px] text-xs font-bold uppercase">Pax</TableHead>
                    <TableHead className="w-[130px] text-xs font-bold uppercase">Travel Date</TableHead>
                    <TableHead className="w-[100px] text-xs font-bold uppercase">Segments</TableHead>
                    <TableHead className="w-[120px] text-xs font-bold uppercase">Status</TableHead>
                    <TableHead className="w-[180px] text-right text-xs font-bold uppercase pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-xs text-slate-500">
                        Loading requests...
                      </TableCell>
                    </TableRow>
                  ) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-slate-400">
                        <div className="max-w-sm mx-auto space-y-3">
                          <Zap className="h-10 w-10 mx-auto text-slate-300 stroke-1" />
                          <p className="text-sm font-bold text-slate-700">No quick voucher requests found</p>
                          <p className="text-xs text-slate-400">
                            Submit your transport and hotel requirements quickly without waiting for full visa filing.
                          </p>
                          <Button
                            onClick={() => setShowCreateModal(true)}
                            size="sm"
                            className="bg-primary text-white font-bold text-xs"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Submit Request Now
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((req) => {
                      const moveCount = req.movementDetails && Array.isArray(req.movementDetails) ? req.movementDetails.length : 0;
                      return (
                        <TableRow key={req.id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="space-y-0.5">
                              <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                {req.requestNumber}
                              </span>
                              {req.voucher && (
                                <span className="block text-[10px] text-emerald-700 font-bold font-mono">
                                  Voucher: #{req.voucher.voucherNumber}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-bold text-xs text-slate-900">{req.guestName}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{req.guestMobile || '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs font-semibold text-slate-700">
                              {req.groupCode || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                              {req.paxCount} PAX
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600">
                              {req.reservationDate ? new Date(req.reservationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {moveCount} Segments
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {req.status === 'pending' && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <Clock className="h-3 w-3 text-amber-600" /> Pending Admin Review
                              </Badge>
                            )}
                            {req.status === 'approved' && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Approved
                              </Badge>
                            )}
                            {req.status === 'rejected' && (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold flex items-center gap-1 w-fit" title={req.rejectionReason || ''}>
                                <XCircle className="h-3 w-3 text-rose-600" /> Rejected
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {req.status === 'approved' && req.voucher ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleDownloadPDF(req.voucher.id)}
                                  disabled={downloadingId === req.voucher.id}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 flex items-center gap-1"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Download PDF
                                </Button>
                              ) : req.status === 'pending' ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelRequest(req.id)}
                                  disabled={cancellingId === req.id}
                                  className="h-8 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Cancel
                                </Button>
                              ) : req.status === 'rejected' && req.rejectionReason ? (
                                <span className="text-[11px] text-rose-600 font-medium italic max-w-[160px] truncate" title={req.rejectionReason}>
                                  Reason: {req.rejectionReason}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-xs text-gray-500 font-medium">
                Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} requests
              </p>
              {pagination.totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="h-8 text-xs">
                    Previous
                  </Button>
                  <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages} className="h-8 text-xs">
                    Next
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Quick Voucher Request Modal */}
      {showCreateModal && (
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-3 border-b bg-white flex-shrink-0">
              <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Submit Quick Voucher Request
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Fill in the guest, flight, hotel, and movement details. Admin will review and allocate your voucher number.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 bg-slate-50/40">
              <QuickVoucherForm
                onSuccess={() => {
                  setShowCreateModal(false);
                  fetchRequests(pagination.page);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
