'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import { fromDisplayDate, extractDateFromISO, toDisplayDate } from '@/lib/umrah/validation';
import {
  Search,
  Plus,
  Ticket,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Loader2,
  Edit2,
  Check,
  X,
  Plane,
  Truck,
  Printer,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import api, { voucherAPI } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QuickVoucherForm from '@/components/voucher/QuickVoucherForm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toBlob } from 'html-to-image';
import { useRef } from 'react';

export default function VoucherServicePage() {
  const router = useRouter();
  const user = getUser();
  const movementRef = useRef<HTMLDivElement>(null);
  
  // Tab States
  const [activeMainTab, setActiveMainTab] = useState<'vouchers' | 'movements'>('vouchers');
  const [activeVoucherSubTab, setActiveVoucherSubTab] = useState<'all' | 'quick'>('all');
  const [activeMovementSubTab, setActiveMovementSubTab] = useState<'today' | 'tomorrow' | 'after-tomorrow' | 'specific-date'>('today');
  
  // Data States
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  const [todayMovements, setTodayMovements] = useState<any[]>([]);
  const [tomorrowMovements, setTomorrowMovements] = useState<any[]>([]);
  const [afterTomorrowMovements, setAfterTomorrowMovements] = useState<any[]>([]);
  const [specificDateMovements, setSpecificDateMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementPagination, setMovementPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  
  const [stats, setStats] = useState<any>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [todayStats, setTodayStats] = useState<any>({});
  const [tomorrowStats, setTomorrowStats] = useState<any>({});
  const [afterTomorrowStats, setAfterTomorrowStats] = useState<any>({});
  const [specificDateStats, setSpecificDateStats] = useState<any>({});
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState<string | null>(null);
  const [selectedTo, setSelectedTo] = useState<string | null>(null);
  const [availableFromOptions, setAvailableFromOptions] = useState<string[]>([]);
  const [availableToOptions, setAvailableToOptions] = useState<string[]>([]);
  const [movementSearch, setMovementSearch] = useState('');
  const [selectedMovementDate, setSelectedMovementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Editing & Action States
  const [editingMovements, setEditingMovements] = useState<Map<string, any>>(new Map());
  const [savingMovementId, setSavingMovementId] = useState<string | null>(null);
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);

  const loadVouchers = async () => {
    try {
      setLoadingVouchers(true);
      const response = await voucherAPI.getAllVouchers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        dateFrom,
        dateTo,
      });
      setVouchers(response.data.vouchers);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading vouchers:', error);
    } finally {
      setLoadingVouchers(false);
    }
  };

  const loadTodayMovements = async () => {
    try {
      setLoadingMovements(true);
      const from = selectedFrom && selectedFrom !== 'all' ? selectedFrom : undefined;
      const to = selectedTo && selectedTo !== 'all' ? selectedTo : undefined;
      const response = await api.get('/vouchers/movements/today', {
        params: { 
          from, 
          to, 
          page: movementPagination.page, 
          limit: movementPagination.limit,
          search: movementSearch
        }
      });
      setTodayMovements(response.data.movements);
      setMovementPagination(response.data.pagination);
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
      const response = await api.get('/vouchers/movements/tomorrow', {
        params: { 
          from, 
          to, 
          page: movementPagination.page, 
          limit: movementPagination.limit,
          search: movementSearch
        }
      });
      setTomorrowMovements(response.data.movements);
      setMovementPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading tomorrow movements:', error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadAfterTomorrowMovements = async () => {
    try {
      setLoadingMovements(true);
      const from = selectedFrom && selectedFrom !== 'all' ? selectedFrom : undefined;
      const to = selectedTo && selectedTo !== 'all' ? selectedTo : undefined;
      const response = await api.get('/vouchers/movements/after-tomorrow', {
        params: { 
          from, 
          to, 
          page: movementPagination.page, 
          limit: movementPagination.limit,
          search: movementSearch
        }
      });
      setAfterTomorrowMovements(response.data.movements);
      setMovementPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading after tomorrow movements:', error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadSpecificDateMovements = async () => {
    try {
      if (!selectedMovementDate) return;
      setLoadingMovements(true);
      const from = selectedFrom && selectedFrom !== 'all' ? selectedFrom : undefined;
      const to = selectedTo && selectedTo !== 'all' ? selectedTo : undefined;
      const response = await voucherAPI.getMovementsByDate(selectedMovementDate, from, to);
      setSpecificDateMovements(response.data.movements);
      setMovementPagination(response.data.pagination);
      
      const sStats = await voucherAPI.getMovementStatsByDate(selectedMovementDate);
      setSpecificDateStats(sStats.data);
    } catch (error) {
      console.error('Error loading specific date movements:', error);
    } finally {
      setLoadingMovements(false);
    }
  };

  // Sync data with active tabs
  useEffect(() => {
    if (activeMainTab === 'vouchers' && activeVoucherSubTab === 'all') {
      loadVouchers();
    } else if (activeMainTab === 'movements') {
      if (activeMovementSubTab === 'today') loadTodayMovements();
      else if (activeMovementSubTab === 'tomorrow') loadTomorrowMovements();
      else if (activeMovementSubTab === 'after-tomorrow') loadAfterTomorrowMovements();
      else loadSpecificDateMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMainTab, activeVoucherSubTab, activeMovementSubTab, searchTerm, dateFrom, dateTo, pagination.page, movementPagination.page, movementSearch, selectedFrom, selectedTo, selectedMovementDate]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const response = await voucherAPI.getVoucherStats();
      setStats(response.data);
      
      const tStats = await voucherAPI.getTodayMovementStats();
      setTodayStats(tStats.data);
      
      const tomStats = await voucherAPI.getTomorrowMovementStats();
      setTomorrowStats(tomStats.data);

      const afterTomStats = await voucherAPI.getAfterTomorrowMovementStats();
      setAfterTomorrowStats(afterTomStats.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const response = await voucherAPI.getMovementFilterOptions();
      setAvailableFromOptions(response.data.fromOptions);
      setAvailableToOptions(response.data.toOptions);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  useEffect(() => {
    loadStats();
    loadFilterOptions();
  }, []);

  const handleEditMovement = (movement: any) => {
    const movementId = movement.movementId || `${movement.voucherId}-${movement.movementIndex}`;
    setEditingMovements(prev => {
      const updated = new Map(prev);
      updated.set(movementId, { ...movement });
      return updated;
    });
  };

  const handleCancelEdit = (movementId: string) => {
    setEditingMovements(prev => {
      const updated = new Map(prev);
      updated.delete(movementId);
      return updated;
    });
  };

  const handleInputChange = (movementId: string, field: string, value: any) => {
    setEditingMovements(prev => {
      const updated = new Map(prev);
      const movement = updated.get(movementId);
      if (movement) {
        (movement as any)[field] = value;
      }
      return updated;
    });
  };

  const saveMovement = async (movement: any) => {
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
      else if (activeMovementSubTab === 'tomorrow') loadTomorrowMovements();
      else if (activeMovementSubTab === 'after-tomorrow') loadAfterTomorrowMovements();
      else loadSpecificDateMovements();
      loadStats();
    } catch (error: any) {
      toast.error('Failed to update movement');
    } finally {
      setSavingMovementId(null);
    }
  };

  const handlePrintMovements = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    let dateLabel = activeMovementSubTab.toUpperCase();
    if (activeMovementSubTab === 'after-tomorrow') dateLabel = 'DAY AFTER TOMORROW';
    if (activeMovementSubTab === 'specific-date') dateLabel = new Date(selectedMovementDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    
    const title = 'Tafweej Movements - ' + dateLabel;
    const filters = [];
    if (movementSearch) filters.push(`Search: ${movementSearch}`);
    if (selectedFrom) filters.push(`From: ${selectedFrom}`);
    if (selectedTo) filters.push(`To: ${selectedTo}`);
    
    const subtitle = filters.join(' | ');

    doc.setFontSize(18);
    doc.text(title, 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 40, 60);

    const tableData = currentMovements.map((m) => {
      const mid = m.movementId || `${m.voucherId}-${m.movementIndex}`;
      const edited = editingMovements.get(mid) || m;
      
      return [
        m.voucherNumber,
        m.umrahCompany,
        `${m.qty || m.pax} PAX`,
        `${new Date(m.date).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short' })}\n${m.time}`,
        `${m.guestName}\n${m.mobile}`,
        `${m.from} (${m.fromLocation}) -> ${m.to} (${m.toLocation})`,
        `${edited.driverDetails1 || ''}\n${edited.driverDetails2 || ''}\n${edited.vehicleNumber || ''}`
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [['Voucher', 'Umrah Co.', 'Qty', 'Timeline', 'Guest Details', 'Location Matrix', 'Driver & Vehicle']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [51, 51, 51],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'center' },
      },
      margin: { top: 80, bottom: 40, left: 40, right: 40 },
      didDrawPage: (data) => {
        const str = 'Page ' + doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 20);
      }
    });

    const filenameDate = activeMovementSubTab === 'specific-date' ? selectedMovementDate : activeMovementSubTab;
    doc.save(`Tafweej_Movements_${filenameDate}.pdf`);
  };

  const handleCopyMovementsImage = async () => {
    if (!movementRef.current) return;
    
    try {
      const blob = await toBlob(movementRef.current, { 
        backgroundColor: '#ffffff', 
        pixelRatio: 3,
        filter: (node: any) => {
          if (node.classList && node.classList.contains('no-capture')) return false;
          return true;
        }
      });
      
      if (blob) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        toast.success('Movements schedule copied to clipboard!');
      }
    } catch (error) {
      console.error('Error copying image:', error);
      toast.error('Failed to copy image to clipboard');
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
        reservationDate: voucher.reservationDate ? extractDateFromISO(voucher.reservationDate) : '',
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
          checkIn: hs.checkIn ? extractDateFromISO(hs.checkIn) : '',
          checkOut: hs.checkOut ? extractDateFromISO(hs.checkOut) : '',
          days: hs.days || 0,
          brn: hs.brn ? (hs.brn.includes(',') ? hs.brn.split(',').map((s: string) => s.trim()) : [hs.brn]) : [],
        })),
        movementDetails: (voucher.movementDetails || []).map((md: any) => ({
          sr: md.sr || 0,
          route: md.route || '',
          date: md.date ? extractDateFromISO(md.date) : '',
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
          date: fd.date ? extractDateFromISO(fd.date) : '',
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
      link.download = `voucher_${pdfData.voucherNumber}.pdf`;
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

  const currentMovements = activeMovementSubTab === 'today' ? todayMovements : 
                          activeMovementSubTab === 'tomorrow' ? tomorrowMovements : 
                          activeMovementSubTab === 'after-tomorrow' ? afterTomorrowMovements :
                          specificDateMovements;
  const currentMoveStats = activeMovementSubTab === 'today' ? todayStats : 
                           activeMovementSubTab === 'tomorrow' ? tomorrowStats : 
                           activeMovementSubTab === 'after-tomorrow' ? afterTomorrowStats :
                           specificDateStats;

  if (!user || !hasRole(['admin', 'staff', 'party'])) return null;

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 min-h-screen">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Voucher Management</h1>
            <p className="text-xs lg:text-sm text-gray-500 font-medium">Daily movements and transport voucher control</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { loadStats(); loadVouchers(); loadTodayMovements(); loadTomorrowMovements(); loadAfterTomorrowMovements(); if (activeMovementSubTab === 'specific-date') loadSpecificDateMovements(); }} className="font-bold h-9">
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
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p><p className="text-xl font-black text-gray-900">{loadingStats ? '...' : (stats.totalVouchers || 0)}</p></div>
          </div>
          <div className="flex-1 min-w-[180px] bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0"><Calendar className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today</p><p className="text-xl font-black text-gray-900">{loadingStats ? '...' : (stats.todayMovements || 0)}</p></div>
          </div>
          <div className="flex-1 min-w-[180px] bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0"><TrendingUp className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tomorrow</p><p className="text-xl font-black text-gray-900">{loadingStats ? '...' : (stats.tomorrowMovements || 0)}</p></div>
          </div>
          <div className="flex-1 min-w-[180px] bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0"><Calendar className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Day After</p><p className="text-xl font-black text-gray-900">{loadingStats ? '...' : (stats.dayAfterTomorrowMovements || 0)}</p></div>
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
              <div className="flex items-center gap-4 bg-white p-2 rounded-xl border shadow-sm w-fit">
                <TabsList className="bg-gray-100 border p-1 h-9 rounded-lg">
                  <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-primary text-xs font-bold px-6 h-7 rounded-md transition-all">All Records</TabsTrigger>
                  {hasRole(['admin', 'staff']) && (
                    <TabsTrigger value="quick" className="data-[state=active]:bg-white data-[state=active]:text-primary text-xs font-bold px-6 h-7 rounded-md transition-all">Quick Create</TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="all" className="animate-in slide-in-from-bottom-2 duration-300">
                <Card className="rounded-2xl border-0 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex flex-col space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-lg font-bold text-primary">System Vouchers</CardTitle>
                        <div className="relative w-full sm:w-96">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input placeholder="Search name, voucher # or group..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 rounded-lg" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">From:</Label>
                          <DatePicker value={dateFrom} onChange={(val) => setDateFrom(fromDisplayDate(val))} className="h-8" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">To:</Label>
                          <DatePicker value={dateTo} onChange={(val) => setDateTo(fromDisplayDate(val))} className="h-8" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-gray-50/50">
                          <TableRow className="border-b border-gray-100 hover:bg-transparent">
                            <TableHead className="px-6 h-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">Voucher ID</TableHead>
                            <TableHead className="h-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">Group Code</TableHead>
                            <TableHead className="h-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">Guest Contact</TableHead>
                            <TableHead className="h-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacity</TableHead>
                            <TableHead className="h-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">Umrah Co.</TableHead>
                            <TableHead className="h-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transport Co.</TableHead>
                            <TableHead className="h-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">Generator</TableHead>
                            <TableHead className="h-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">Created Date</TableHead>
                            <TableHead className="text-right px-6">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingVouchers ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={9} className="px-6"><Skeleton className="h-10 w-full" /></TableCell></TableRow>) : 
                           vouchers.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-16 text-gray-400 font-medium tracking-tight">No voucher records matching your query</TableCell></TableRow> :
                           vouchers.map(v => (
                            <TableRow key={v.id} className="hover:bg-gray-50/50 transition-colors border-gray-50">
                              <TableCell className="px-6 font-black text-primary text-sm">{v.voucherNumber}</TableCell>
                              <TableCell className="text-xs font-bold text-secondary uppercase">{v.groupCode || '—'}</TableCell>
                              <TableCell><div><p className="font-bold text-sm text-gray-900">{v.guestName}</p><p className="text-[10px] text-gray-400 font-medium">{v.guestMobile}</p></div></TableCell>
                              <TableCell><Badge variant="outline" className="font-black bg-blue-50/50 border-blue-100 text-blue-700">{v.paxCount} PAX</Badge></TableCell>
                              <TableCell className="text-[10px] font-bold text-gray-600 uppercase">{v.umrahCompany?.partyName || '—'}</TableCell>
                              <TableCell className="text-[10px] font-bold text-gray-600 uppercase">{v.transportCompany?.partyName || '—'}</TableCell>
                              <TableCell className="text-xs font-medium text-gray-600">{v.generatedByUser?.name || 'System'}</TableCell>
                              <TableCell className="text-xs text-gray-400 font-medium">{new Date(v.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</TableCell>
                              <TableCell className="text-right px-6">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 rounded-lg" onClick={() => router.push(`/dashboard/services/voucher/view/${v.id}`)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 rounded-lg" onClick={() => router.push(`/dashboard/services/voucher/edit/${v.id}`)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 rounded-lg" onClick={() => downloadVoucherPDF(v.id)} disabled={downloadingVoucherId === v.id}>
                                    {downloadingVoucherId === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="p-4 border-t flex items-center justify-between bg-gray-50/30">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">
                        Showing {pagination.total > 0 ? ((pagination.page - 1) * (pagination.limit || 10)) + 1 : 0} to{' '}
                        {Math.min(pagination.page * (pagination.limit || 10), pagination.total)} of{' '}
                        {pagination.total} entries
                      </p>
                      {pagination.totalPages > 1 && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs font-bold" 
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} 
                            disabled={pagination.page === 1}
                          >
                            Prev
                          </Button>
                          <span className="text-[10px] font-bold text-gray-400 flex items-center">
                            Page {pagination.page} of {pagination.totalPages}
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs font-bold" 
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} 
                            disabled={pagination.page === pagination.totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </div>
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
            <div ref={movementRef} className="space-y-4 bg-white p-4 rounded-3xl">
              <div className="hidden lg:block border-b pb-2 mb-2">
                <h2 className="text-xl font-bold text-gray-800">Tafweej Movements - {
                  activeMovementSubTab === 'after-tomorrow' ? 'DAY AFTER TOMORROW' : 
                  activeMovementSubTab === 'specific-date' ? new Date(selectedMovementDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) :
                  activeMovementSubTab.toUpperCase()
                }</h2>
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">
                  {movementSearch && `Search: ${movementSearch} | `} {selectedFrom && `From: ${selectedFrom} | `} {selectedTo && `To: ${selectedTo}`}
                </p>
              </div>
              <Tabs value={activeMovementSubTab} onValueChange={(v: any) => setActiveMovementSubTab(v)} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2 rounded-xl border shadow-sm no-capture">
                  <TabsList className="bg-gray-100 border p-1 h-9 rounded-lg">
                    <TabsTrigger value="today" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs font-bold px-8 h-7 rounded-md transition-all">Today</TabsTrigger>
                    <TabsTrigger value="tomorrow" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-xs font-bold px-8 h-7 rounded-md transition-all">Tomorrow</TabsTrigger>
                    <TabsTrigger value="after-tomorrow" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-xs font-bold px-8 h-7 rounded-md transition-all">Day After</TabsTrigger>
                    <TabsTrigger value="specific-date" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs font-bold px-8 h-7 rounded-md transition-all">Pick Date</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                    {activeMovementSubTab === 'specific-date' && (
                      <div className="flex items-center gap-2 mr-2 bg-blue-50/50 p-1 px-2 rounded-lg border border-blue-100">
                        <Label className="text-[10px] font-bold text-blue-600 uppercase">Target:</Label>
                        <DatePicker value={toDisplayDate(selectedMovementDate)} onChange={(v) => setSelectedMovementDate(fromDisplayDate(v))} className="h-7 w-32 text-xs" />
                      </div>
                    )}
                    <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" /><Input placeholder="Filter movements..." value={movementSearch} onChange={(e) => setMovementSearch(e.target.value)} className="pl-9 h-9 rounded-lg" /></div>
                    <Button variant={showFilters ? "secondary" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="h-9 font-bold rounded-lg"><Filter className="h-4 w-4 mr-2" /> Filter List</Button>
                  </div>
                </div>

                {showFilters && (
                  <Card className="border-dashed border-2 bg-white/50 rounded-2xl animate-in slide-in-from-top-2 duration-200 no-capture">
                    <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest ml-1">From Location</Label><Select value={selectedFrom || 'all'} onValueChange={(v) => setSelectedFrom(v === 'all' ? null : v)}><SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger><SelectContent className="rounded-xl border-0 shadow-2xl"><SelectItem value="all">All Spectrum</SelectItem>{availableFromOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest ml-1">To Location</Label><Select value={selectedTo || 'all'} onValueChange={(v) => setSelectedTo(v === 'all' ? null : v)}><SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger><SelectContent className="rounded-xl border-0 shadow-2xl"><SelectItem value="all">All Spectrum</SelectItem>{availableToOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                      <Button variant="ghost" size="sm" className="h-9 text-xs font-bold text-primary" onClick={() => { setSelectedFrom(null); setSelectedTo(null); }}>Reset All Filters</Button>
                    </CardContent>
                  </Card>
                )}

                <Card className="rounded-2xl border-0 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg ${
                          activeMovementSubTab === 'today' ? 'bg-emerald-100 text-emerald-700' : 
                          activeMovementSubTab === 'tomorrow' ? 'bg-amber-100 text-amber-700' : 
                          activeMovementSubTab === 'after-tomorrow' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        } flex items-center justify-center font-bold`}>{currentMovements.length}</div>
                        <div>
                          <CardTitle className="text-base font-bold text-secondary uppercase tracking-tight">
                            {activeMovementSubTab === 'after-tomorrow' ? 'DAY AFTER TOMORROW' : 
                             activeMovementSubTab === 'specific-date' ? `SCHEDULE FOR ${new Date(selectedMovementDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` :
                             activeMovementSubTab.toUpperCase()} SCHEDULE
                          </CardTitle>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            Live movement logs for {
                              activeMovementSubTab === 'today' ? 'current session' : 
                              activeMovementSubTab === 'tomorrow' ? 'next session' : 
                              activeMovementSubTab === 'after-tomorrow' ? 'upcoming session' :
                              'selected date'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                         <Button variant="outline" size="sm" onClick={handleCopyMovementsImage} className="h-9 border-blue-200 hover:bg-blue-50 text-blue-700 font-bold no-capture">
                           <Copy className="h-4 w-4 mr-2" />
                           Copy Image
                         </Button>
                         <Button variant="outline" size="sm" onClick={handlePrintMovements} className="h-9 border-primary/20 hover:bg-primary/5 text-primary font-bold no-capture">
                           <Printer className="h-4 w-4 mr-2" />
                           Print PDF
                         </Button>
                         <div className="text-right"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Makkah Load</p><p className="font-black text-secondary">{currentMoveStats.makkahMovements || 0} MVMT</p></div>
                         <div className="text-right"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Madinah Load</p><p className="font-black text-secondary">{currentMoveStats.madinahMovements || 0} MVMT</p></div>
                      </div>
                    </div>
                  </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50/30">
                      <TableRow className="border-b border-gray-100 hover:bg-transparent uppercase">
                        <TableHead className="px-6 text-[10px] font-black text-gray-400 tracking-widest">Voucher</TableHead>
                        <TableHead className="text-[10px] font-black text-gray-400 tracking-widest">Umrah Co.</TableHead>
                        <TableHead className="text-[10px] font-black text-gray-400 tracking-widest text-center">Qty</TableHead>
                        <TableHead className="text-[10px] font-black text-gray-400 tracking-widest">Timeline</TableHead>
                        <TableHead className="text-[10px] font-black text-gray-400 tracking-widest">Guest Protocol</TableHead>
                        <TableHead className="text-[10px] font-black text-gray-400 tracking-widest">Location Matrix</TableHead>
                        <TableHead className="px-6 text-[10px] font-black text-gray-400 tracking-widest w-[300px]">Driver & Vehicle Information</TableHead>
                        <TableHead className="px-6 text-right w-10 no-capture"></TableHead>
                        </TableRow>

                    </TableHeader>
                    <TableBody>
                      {loadingMovements ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={8} className="px-6"><Skeleton className="h-10 w-full" /></TableCell></TableRow>) : 
                       currentMovements.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-16 text-gray-400 font-medium tracking-tight">No travel movements matching your filters</TableCell></TableRow> :
                       currentMovements.map(m => {
                        const mid = m.movementId || `${m.voucherId}-${m.movementIndex}`;
                        const edited = editingMovements.get(mid) || m;
                        return (
                          <TableRow key={mid} className="hover:bg-gray-50/50 transition-colors border-gray-50">
                            <TableCell className="px-6">
                              <span className="font-black text-secondary bg-secondary/10 px-2.5 py-1.5 rounded-xl text-base border border-secondary/20 shadow-sm inline-block min-w-[100px] text-center">
                                {m.voucherNumber}
                              </span>
                            </TableCell>
                            <TableCell className="text-[10px] font-bold text-gray-600 uppercase max-w-[120px] truncate">{m.umrahCompany}</TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className="font-black bg-blue-50 text-blue-700 border-blue-100">{m.qty || m.pax} PAX</Badge></TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-xs">{new Date(m.date).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short' })}</span>
                                <span className="text-[10px] font-black text-primary bg-primary/10 w-fit px-1.5 rounded">{m.time}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-xs uppercase">{m.guestName}</span>
                                <span className="text-[10px] text-gray-400 font-medium">{m.pax} PAX • {m.mobile}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-secondary uppercase tracking-tighter">{m.from}</span>
                                  <span className="text-[9px] text-gray-400 font-medium truncate max-w-[100px]">{m.fromLocation}</span>
                                </div>
                                <div className="text-gray-300">→</div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-secondary uppercase tracking-tighter">{m.to}</span>
                                  <span className="text-[9px] text-gray-400 font-medium truncate max-w-[100px]">{m.toLocation}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1.5 py-2">
                                <Input 
                                  placeholder="Driver Name/Phone" 
                                  value={edited.driverDetails1} 
                                  onChange={(e) => { handleEditMovement(m); handleInputChange(mid, 'driverDetails1', e.target.value); }}
                                  className="h-7 text-[10px] font-bold bg-white border-gray-100"
                                />
                                <div className="flex gap-2">
                                  <Input 
                                    placeholder="Alternative Contact" 
                                    value={edited.driverDetails2} 
                                    onChange={(e) => { handleEditMovement(m); handleInputChange(mid, 'driverDetails2', e.target.value); }}
                                    className="h-7 text-[10px] font-bold bg-white border-gray-100 flex-1"
                                  />
                                  <Input 
                                    placeholder="Plate #" 
                                    value={edited.vehicleNumber} 
                                    onChange={(e) => { handleEditMovement(m); handleInputChange(mid, 'vehicleNumber', e.target.value); }}
                                    className="h-7 text-[10px] font-black bg-white border-gray-100 w-24 uppercase"
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 text-right no-capture">
                              {editingMovements.has(mid) ? (
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" onClick={() => saveMovement(m)} disabled={savingMovementId === mid}>
                                    {savingMovementId === mid ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" onClick={() => handleCancelEdit(mid)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary" onClick={() => handleEditMovement(m)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                       })}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-4 border-t flex items-center justify-between bg-gray-50/30">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">
                    Showing {movementPagination.total > 0 ? ((movementPagination.page - 1) * (movementPagination.limit || 10)) + 1 : 0} to{' '}
                    {Math.min(movementPagination.page * (movementPagination.limit || 10), movementPagination.total)} of{' '}
                    {movementPagination.total} entries
                  </p>
                  {movementPagination.totalPages > 1 && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs font-bold" 
                        onClick={() => setMovementPagination(prev => ({ ...prev, page: prev.page - 1 }))} 
                        disabled={movementPagination.page === 1}
                      >
                        Prev
                      </Button>
                      <span className="text-[10px] font-bold text-gray-400 flex items-center">
                        Page {movementPagination.page} of {movementPagination.totalPages}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs font-bold" 
                        onClick={() => setMovementPagination(prev => ({ ...prev, page: prev.page + 1 }))} 
                        disabled={movementPagination.page === movementPagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </Tabs>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
