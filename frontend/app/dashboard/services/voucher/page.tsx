'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  RefreshCw,
  Eye,
  Download,
  Ticket,
  Calendar,
  TrendingUp,
  X,
  Filter,
  ArrowRight,
  Loader2,
  Save,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { voucherAPI } from '@/lib/api';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickVoucherForm } from '@/components/voucher/QuickVoucherForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

interface Voucher {
  id: string;
  voucherNumber: string;
  bookingReference?: string;
  reservationDate: string;
  guestName: string;
  guestMobile?: string;
  groupCode?: string;
  paxCount: number;
  createdAt: string;
  generatedByUser: {
    id: string;
    name: string;
    email: string;
  };
  booking: {
    id: string;
    party: {
      id: string;
      partyName: string;
      email: string;
      contactNumber?: string;
      whatsappNumber?: string;
    };
  };
}

interface Movement {
  voucherId: string;
  voucherNumber: string;
  movementIndex: number;
  movementId?: string;
  routeNumber: string;
  date: string;
  time: string;
  agentName: string;
  guestName: string;
  mobile: string;
  pax: number;
  from: string;
  fromLocation: string;
  fromLocationId?: string | null;
  to: string;
  toLocation: string;
  toLocationId?: string | null;
  driverDetails1: string;
  driverDetails2: string;
  vehicleNumber: string;
  partyEmail: string;
  partyWhatsApp: string;
}

interface Stats {
  totalVouchers: number;
  todayMovements: number;
  tomorrowMovements: number;
}

export default function VoucherServicePage() {
  const router = useRouter();
  const user = getUser();
  
  // Tab States
  const [activeMainTab, setActiveMainTab] = useState<'vouchers' | 'movements'>('vouchers');
  const [activeVoucherSubTab, setActiveVoucherSubTab] = useState<'all' | 'quick'>('all');
  const [activeMovementSubTab, setActiveMovementSubTab] = useState<'today' | 'tomorrow'>('today');
  
  // Stats
  const [stats, setStats] = useState<Stats>({
    totalVouchers: 0,
    todayMovements: 0,
    tomorrowMovements: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Data States
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  const [todayMovements, setTodayMovements] = useState<Movement[]>([]);
  const [tomorrowMovements, setTomorrowMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  
  // Editing & Action States
  const [editingMovements, setEditingMovements] = useState<Map<string, Movement>>(new Map());
  const [savingMovementId, setSavingMovementId] = useState<string | null>(null);
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);

  // Filter States
  const [availableFromOptions, setAvailableFromOptions] = useState<string[]>([]);
  const [availableToOptions, setAvailableToOptions] = useState<string[]>([]);
  const [selectedFrom, setSelectedFrom] = useState<string | null>(null);
  const [selectedTo, setSelectedTo] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [movementSearch, setMovementSearch] = useState('');

  // Movement Summary Stats
  const [todayStats, setTodayStats] = useState<Array<{from: string, to: string, count: number}>>([]);
  const [tomorrowStats, setTomorrowStats] = useState<Array<{from: string, to: string, count: number}>>([]);
  const [loadingMovementStats, setLoadingMovementStats] = useState(false);

  // Initial Load
  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    loadStats();
    loadFilterOptions();
    loadTodayStats();
    loadTomorrowStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync data with active tabs
  useEffect(() => {
    if (activeMainTab === 'vouchers' && activeVoucherSubTab === 'all') {
      loadVouchers();
    } else if (activeMainTab === 'movements') {
      if (activeMovementSubTab === 'today') loadTodayMovements();
      else loadTomorrowMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMainTab, activeVoucherSubTab, activeMovementSubTab, searchTerm, pagination.page, selectedFrom, selectedTo]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const response = await voucherAPI.getVoucherStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadVouchers = async () => {
    try {
      setLoadingVouchers(true);
      const response = await voucherAPI.getAllVouchers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
      });
      setVouchers(response.data.vouchers);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading vouchers:', error);
    } finally {
      setLoadingVouchers(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const response = await voucherAPI.getMovementFilterOptions();
      setAvailableFromOptions(response.data.fromOptions || []);
      setAvailableToOptions(response.data.toOptions || []);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadTodayMovements = async () => {
    try {
      setLoadingMovements(true);
      const from = selectedFrom && selectedFrom !== 'all' ? selectedFrom : undefined;
      const to = selectedTo && selectedTo !== 'all' ? selectedTo : undefined;
      const response = await voucherAPI.getTodayMovements(from, to);
      setTodayMovements(response.data.movements);
    } catch (error) {
      console.error('Error loading today movements:', error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadTomorrowMovements = async () => {
    try {
      setLoadingMovements(true);
      const from = selectedFrom && selectedFrom !== 'all' ? selectedFrom : undefined;
      const to = selectedTo && selectedTo !== 'all' ? selectedTo : undefined;
      const response = await voucherAPI.getTomorrowMovements(from, to);
      setTomorrowMovements(response.data.movements);
    } catch (error) {
      console.error('Error loading tomorrow movements:', error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadTodayStats = async () => {
    try {
      setLoadingMovementStats(true);
      const response = await voucherAPI.getTodayMovementStats();
      setTodayStats(response.data.stats || []);
    } catch (error) {
      console.error('Error loading today stats:', error);
    } finally {
      setLoadingMovementStats(false);
    }
  };

  const loadTomorrowStats = async () => {
    try {
      setLoadingMovementStats(true);
      const response = await voucherAPI.getTomorrowMovementStats();
      setTomorrowStats(response.data.stats || []);
    } catch (error) {
      console.error('Error loading tomorrow stats:', error);
    } finally {
      setLoadingMovementStats(false);
    }
  };

  const updateMovementField = (movementId: string, field: string, value: any) => {
    setEditingMovements(prev => {
      const updated = new Map(prev);
      const current = updated.get(movementId) || 
                     [...todayMovements, ...tomorrowMovements].find(m => (m.movementId || `${m.voucherId}-${m.movementIndex}`) === movementId);
      if (current) updated.set(movementId, { ...current, [field]: value });
      return updated;
    });
  };

  const saveMovement = async (movement: Movement) => {
    const movementId = movement.movementId || `${movement.voucherId}-${movement.movementIndex}`;
    const editedMovement = editingMovements.get(movementId) || movement;
    try {
      setSavingMovementId(movementId);
      await voucherAPI.updateMovementDetails(movement.voucherId, movement.movementIndex, {
        driverDetails1: editedMovement.driverDetails1,
        driverDetails2: editedMovement.driverDetails2,
        vehicleNumber: editedMovement.vehicleNumber,
      });
      toast.success('Movement updated');
      setEditingMovements(prev => {
        const updated = new Map(prev);
        updated.delete(movementId);
        return updated;
      });
      if (activeMovementSubTab === 'today') loadTodayMovements();
      else loadTomorrowMovements();
      loadStats();
    } catch (error: any) {
      toast.error('Failed to update movement');
    } finally {
      setSavingMovementId(null);
    }
  };

  const downloadVoucherPDF = async (voucherId: string) => {
    try {
      setDownloadingVoucherId(voucherId);
      const response = await voucherAPI.getVoucherById(voucherId);
      const voucher = response.data.voucher;
      
      const pdfData = {
        voucherNumber: voucher.voucherNumber,
        bookingReference: voucher.bookingReference || '',
        reservationNumber: voucher.voucherNumber,
        reservationDate: voucher.reservationDate ? (typeof voucher.reservationDate === 'string' ? voucher.reservationDate.split('T')[0] : new Date(voucher.reservationDate).toISOString().split('T')[0]) : '',
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
          checkIn: hs.checkIn ? (typeof hs.checkIn === 'string' ? hs.checkIn.split('T')[0] : new Date(hs.checkIn).toISOString().split('T')[0]) : '',
          checkOut: hs.checkOut ? (typeof hs.checkOut === 'string' ? hs.checkOut.split('T')[0] : new Date(hs.checkOut).toISOString().split('T')[0]) : '',
          days: hs.days || 0,
          brn: hs.brn ? (hs.brn.includes(',') ? hs.brn.split(',').map((s: string) => s.trim()) : [hs.brn]) : [],
        })),
        movementDetails: (voucher.movementDetails || []).map((md: any) => ({
          sr: md.sr || 0,
          route: md.route || '',
          date: md.date ? (typeof md.date === 'string' ? md.date.split('T')[0] : new Date(md.date).toISOString().split('T')[0]) : '',
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
          date: fd.date ? (typeof fd.date === 'string' ? fd.date.split('T')[0] : new Date(fd.date).toISOString().split('T')[0]) : '',
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
      const refPart = pdfData.bookingReference ? `_${pdfData.bookingReference}` : '';
      link.download = `Voucher_${pdfData.voucherNumber}${refPart}_${pdfData.guestName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Voucher PDF downloaded');
    } catch (error: any) {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingVoucherId(null);
    }
  };

  const filteredVouchers = vouchers.filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return v.voucherNumber.toLowerCase().includes(term) ||
           v.guestName.toLowerCase().includes(term) ||
           v.groupCode?.toLowerCase().includes(term);
  });

  const currentMovements = activeMovementSubTab === 'today' ? todayMovements : tomorrowMovements;
  const filteredMovements = currentMovements.filter(m => {
    if (!movementSearch.trim()) return true;
    return m.routeNumber.toLowerCase().includes(movementSearch.toLowerCase()) ||
           m.guestName.toLowerCase().includes(movementSearch.toLowerCase()) ||
           m.voucherNumber.toLowerCase().includes(movementSearch.toLowerCase());
  });

  const currentMoveStats = activeMovementSubTab === 'today' ? todayStats : tomorrowStats;

  if (!user || !hasRole(['admin', 'staff'])) return null;

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 min-h-screen">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Voucher Management</h1>
            <p className="text-xs lg:text-sm text-gray-500 font-medium">Daily movements and transport voucher control</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { loadStats(); loadVouchers(); loadTodayMovements(); loadTomorrowMovements(); }} className="font-bold h-9">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
        {/* Compact Stats Row */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[180px] bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><Ticket className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p><p className="text-xl font-black text-gray-900">{loadingStats ? '...' : stats.totalVouchers}</p></div>
          </div>
          <div className="flex-1 min-w-[180px] bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0"><Calendar className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today</p><p className="text-xl font-black text-gray-900">{loadingStats ? '...' : stats.todayMovements}</p></div>
          </div>
          <div className="flex-1 min-w-[180px] bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0"><TrendingUp className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tomorrow</p><p className="text-xl font-black text-gray-900">{loadingStats ? '...' : stats.tomorrowMovements}</p></div>
          </div>
        </div>

        {/* Main Interface Tabs */}
        <Tabs value={activeMainTab} onValueChange={(v: any) => setActiveMainTab(v)} className="w-full space-y-6">
          <div className="flex items-center justify-center">
            <TabsList className="bg-white border shadow-sm p-1 h-12 rounded-2xl">
              <TabsTrigger value="vouchers" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold px-10 h-10 rounded-xl transition-all">Vouchers</TabsTrigger>
              <TabsTrigger value="movements" className="data-[state=active]:bg-secondary data-[state=active]:text-white font-bold px-10 h-10 rounded-xl transition-all">Movements</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="vouchers" className="animate-in fade-in-50 duration-300">
            <Tabs value={activeVoucherSubTab} onValueChange={(v: any) => setActiveVoucherSubTab(v)} className="space-y-4">
              <div className="flex items-center justify-center sm:justify-start">
                <TabsList className="bg-gray-100 border p-1 h-9 rounded-lg">
                  <TabsTrigger value="all" className="text-xs font-bold px-6 h-7 rounded-md">All Listing</TabsTrigger>
                  <TabsTrigger value="quick" className="text-xs font-bold px-6 h-7 rounded-md">Quick Create</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="space-y-4">
                <Card className="rounded-2xl border shadow-sm overflow-hidden bg-white">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <CardTitle className="text-lg font-bold text-primary">System Vouchers</CardTitle>
                      <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input placeholder="Search name, voucher # or group..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 rounded-lg" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-500">
                          <TableRow>
                            <TableHead className="px-6">Voucher No</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead>Guest Detail</TableHead>
                            <TableHead>Pax</TableHead>
                            <TableHead>Created By</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right px-6">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingVouchers ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={7} className="px-6"><Skeleton className="h-10 w-full" /></TableCell></TableRow>) : 
                           filteredVouchers.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-16 text-gray-400 font-medium tracking-tight">No voucher records matching your query</TableCell></TableRow> :
                           filteredVouchers.map(v => (
                            <TableRow key={v.id} className="hover:bg-gray-50/50 transition-colors border-gray-50">
                              <TableCell className="px-6 font-black text-primary text-sm">{v.voucherNumber}</TableCell>
                              <TableCell className="text-xs font-bold text-secondary uppercase">{v.groupCode || '—'}</TableCell>
                              <TableCell><div><p className="font-bold text-sm text-gray-900">{v.guestName}</p><p className="text-[10px] text-gray-400 font-medium">{v.guestMobile}</p></div></TableCell>
                              <TableCell><Badge variant="outline" className="font-black bg-blue-50/50 border-blue-100 text-blue-700">{v.paxCount} PAX</Badge></TableCell>
                              <TableCell className="text-xs font-medium text-gray-600">{v.generatedByUser.name}</TableCell>
                              <TableCell className="text-xs text-gray-400 font-medium">{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right px-6"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 rounded-lg" onClick={() => router.push(`/dashboard/services/voucher/view/${v.id}`)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 rounded-lg" onClick={() => downloadVoucherPDF(v.id)} disabled={downloadingVoucherId === v.id}>{downloadingVoucherId === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</Button></div></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {pagination.totalPages > 1 && (
                      <div className="p-4 border-t flex items-center justify-between bg-gray-50/30">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Total: {pagination.total} entries</p>
                        <div className="flex gap-2"><Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1}>Prev</Button><Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page === pagination.totalPages}>Next</Button></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="quick" className="animate-in slide-in-from-bottom-2 duration-300">
                <Card className="rounded-2xl border-0 shadow-sm overflow-hidden bg-white">
                  <div className="bg-primary p-6"><h3 className="text-lg font-bold text-white uppercase tracking-tight">Manual Quick Voucher</h3><p className="text-primary-foreground/60 text-[10px] font-medium uppercase tracking-widest mt-1">Generate a transport voucher without an existing booking record</p></div>
                  <CardContent className="p-6"><QuickVoucherForm onSuccess={() => { loadStats(); loadVouchers(); setActiveVoucherSubTab('all'); }} /></CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="movements" className="animate-in fade-in-50 duration-300 space-y-4">
            <Tabs value={activeMovementSubTab} onValueChange={(v: any) => setActiveMovementSubTab(v)} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2 rounded-xl border shadow-sm">
                <TabsList className="bg-gray-100 border p-1 h-9 rounded-lg">
                  <TabsTrigger value="today" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs font-bold px-8 h-7 rounded-md transition-all">Today</TabsTrigger>
                  <TabsTrigger value="tomorrow" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-xs font-bold px-8 h-7 rounded-md transition-all">Tomorrow</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" /><Input placeholder="Filter movements..." value={movementSearch} onChange={(e) => setMovementSearch(e.target.value)} className="pl-9 h-9 rounded-lg" /></div>
                  <Button variant={showFilters ? "secondary" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="h-9 font-bold rounded-lg"><Filter className="h-4 w-4 mr-2" /> Filter List</Button>
                </div>
              </div>

              {showFilters && (
                <Card className="border-dashed border-2 bg-white/50 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                  <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest ml-1">From Location</Label><Select value={selectedFrom || 'all'} onValueChange={(v) => setSelectedFrom(v === 'all' ? null : v)}><SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger><SelectContent className="rounded-xl border-0 shadow-2xl"><SelectItem value="all">All Spectrum</SelectItem>{availableFromOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest ml-1">To Location</Label><Select value={selectedTo || 'all'} onValueChange={(v) => setSelectedTo(v === 'all' ? null : v)}><SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger><SelectContent className="rounded-xl border-0 shadow-2xl"><SelectItem value="all">All Spectrum</SelectItem>{availableToOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                    <Button variant="ghost" size="sm" className="h-9 text-xs font-bold text-primary" onClick={() => { setSelectedFrom(null); setSelectedTo(null); }}>Reset All Filters</Button>
                  </CardContent>
                </Card>
              )}

              {currentMoveStats.length > 0 && (
                <div className="flex flex-wrap gap-2 py-1">
                  {currentMoveStats.map((stat, idx) => (
                    <div key={idx} className="bg-white border border-gray-100 rounded-full px-3 py-1 flex items-center gap-2 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-700">{stat.from}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-gray-300" />
                      <span className="text-[10px] font-bold text-gray-700">{stat.to}</span>
                      <Badge className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-0 font-black">{stat.count}</Badge>
                    </div>
                  ))}
                </div>
              )}

              <Card className="rounded-2xl border shadow-sm overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-500">
                      <TableRow>
                        <TableHead className="px-6">Route</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Guest / Voucher</TableHead>
                        <TableHead>Pax</TableHead>
                        <TableHead>Sector Detail</TableHead>
                        <TableHead>Driver & Vehicle Information</TableHead>
                        <TableHead className="px-6 text-right w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingMovements ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={7} className="px-6"><Skeleton className="h-16 w-full" /></TableCell></TableRow>) : 
                       filteredMovements.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-20 text-gray-400 font-medium">No movements scheduled for this selection</TableCell></TableRow> :
                       filteredMovements.map(m => {
                        const mid = m.movementId || `${m.voucherId}-${m.movementIndex}`;
                        const edited = editingMovements.get(mid) || m;
                        return (
                          <TableRow key={mid} className="hover:bg-gray-50/50 transition-colors border-gray-50">
                            <TableCell className="px-6 font-black text-primary text-xs">{m.routeNumber}</TableCell>
                            <TableCell><Badge variant="secondary" className="font-black text-[10px]">{m.time}</Badge></TableCell>
                            <TableCell><div><p className="font-bold text-sm text-gray-900 truncate w-40">{m.guestName}</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">REF: {m.voucherNumber}</p></div></TableCell>
                            <TableCell><Badge className="bg-blue-50 text-blue-700 border-blue-100 font-black text-[10px]">{m.pax} PAX</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-xs font-black text-gray-700"><span>{m.from}</span><ArrowRight className="h-3 w-3 text-gray-300" /><span>{m.to}</span></div>
                              <div className="text-[9px] text-gray-400 mt-0.5 font-medium truncate max-w-[180px]">{m.fromLocation} → {m.toLocation}</div>
                            </TableCell>
                            <TableCell>
                              <div className="grid grid-cols-2 gap-2 w-80">
                                <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Driver Detail</p><Textarea placeholder="Contact..." className="text-[10px] min-h-[45px] p-2 rounded-lg resize-none" value={edited.driverDetails1 || ''} onChange={(e) => updateMovementField(mid, 'driverDetails1', e.target.value)} /></div>
                                <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Vehicle No</p><Textarea placeholder="Plate..." className="text-[10px] min-h-[45px] p-2 rounded-lg resize-none" value={edited.vehicleNumber || ''} onChange={(e) => updateMovementField(mid, 'vehicleNumber', e.target.value)} /></div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 text-right">
                              <Button size="icon" variant="ghost" className={cn("h-9 w-9 rounded-xl transition-all", editingMovements.has(mid) ? "bg-primary text-white hover:bg-primary/90 shadow-md" : "text-gray-300 hover:text-gray-400")} onClick={() => saveMovement(m)} disabled={savingMovementId === mid || !editingMovements.has(mid)}>
                                {savingMovementId === mid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
