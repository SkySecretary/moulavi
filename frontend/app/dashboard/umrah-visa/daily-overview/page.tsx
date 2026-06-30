'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  RefreshCw, 
  Plane, 
  MapPin, 
  ArrowRight,
  Clock,
  Calendar as CalendarIcon,
  Filter,
  X,
  Truck,
  Printer,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI } from '@/lib/api';
import { VISA_TYPE_CONFIG } from '@/lib/constants';
import { toDisplayDate, extractTimeFromISO } from '@/lib/umrah/validation';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toBlob } from 'html-to-image';
import { useRef } from 'react';

export default function DailyOverviewPage() {
  const user = getUser();
  const tableRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');
  const [filterType, setFilterType] = useState<'all' | 'arrival' | 'departure'>('all');
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [arrivalFilter, setArrivalFilter] = useState('');
  const [departureFilter, setDepartureFilter] = useState('');
  const [umraCompanyFilter, setUmraCompanyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const getTargetDate = useCallback(() => {
    const date = new Date();
    if (activeTab === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [activeTab]);

  const fetchDailyBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const dateStr = getTargetDate();

      const response = await umrahVisaAPI.getDailyOverview({
        date: dateStr,
        arrivalAirportCode: arrivalFilter || undefined,
        departureAirportCode: departureFilter || undefined,
        umrahVisaProviderId: undefined, // We'll filter client-side for better UX if we use text search
        type: filterType,
      });

      if (response.data?.success) {
        setBookings(response.data.data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching daily overview:', error);
      toast.error('Failed to load operational data');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, arrivalFilter, departureFilter, filterType, getTargetDate]);

  useEffect(() => {
    const currentUser = getUser();
    if (currentUser && hasRole(['admin', 'staff'])) {
      fetchDailyBookings();
    }
  }, [fetchDailyBookings]);

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  const isSameDate = (isoString: string, targetDateStr: string) => {
    if (!isoString) return false;
    return isoString.split('T')[0] === targetDateStr;
  };

  const filteredBookings = bookings.filter(b => {
    const search = searchQuery.toLowerCase();
    const umraSearch = umraCompanyFilter.toLowerCase();
    
    const matchesSearch = !searchQuery || (
      (b.bookingReference || '').toLowerCase().includes(search) ||
      (b.groupNumber || '').toLowerCase().includes(search) ||
      (b.groupName || '').toLowerCase().includes(search) ||
      (b.party?.partyName || '').toLowerCase().includes(search)
    );

    const matchesUmraCompany = !umraCompanyFilter || (
      (b.umrahVisaProvider?.partyName || '').toLowerCase().includes(umraSearch)
    );

    return matchesSearch && matchesUmraCompany;
  });

  const getTargetDateLabel = () => {
    const date = new Date();
    if (activeTab === 'tomorrow') date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleCopyImage = async () => {
    if (!tableRef.current) return;
    
    try {
      const blob = await toBlob(tableRef.current, { 
        backgroundColor: '#ffffff', 
        pixelRatio: 3, // Higher quality for WhatsApp
        filter: (node: any) => {
          if (node.classList && node.classList.contains('no-capture')) return false;
          return true;
        }
      });
      
      if (blob) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        toast.success('Tafweej schedule copied to clipboard!');
      }
    } catch (error) {
      console.error('Error copying image:', error);
      toast.error('Failed to copy image to clipboard');
    }
  };

  const handlePrint = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    const title = 'Tafweej - ' + getTargetDateLabel();
    const filters = [];
    filters.push(`Type: ${filterType.toUpperCase()}`);
    if (arrivalFilter) filters.push(`Arr: ${arrivalFilter}`);
    if (departureFilter) filters.push(`Dep: ${departureFilter}`);
    if (umraCompanyFilter) filters.push(`Umra Co: ${umraCompanyFilter}`);
    if (searchQuery) filters.push(`Search: ${searchQuery}`);
    
    const subtitle = filters.join(' | ');

    doc.setFontSize(18);
    doc.text(title, 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 40, 60);

    const tableData = filteredBookings.map((booking) => {
      const travel = booking.travelDetails?.[0];
      const movement = booking.movementDetails?.[0];
      const dateStr = getTargetDate();
      
      const isArrivalToday = travel?.arrivalDateTime && isSameDate(travel.arrivalDateTime, dateStr);
      const isDepartureToday = travel?.departureDateTime && isSameDate(travel.departureDateTime, dateStr);

      const visaType = VISA_TYPE_CONFIG[booking.visaType as keyof typeof VISA_TYPE_CONFIG]?.label || booking.visaType;
      const reference = booking.bookingReference || 'N/A';
      const group = `${booking.groupNumber || 'N/A'}\n${booking.groupName || ''}`;
      const party = booking.party?.partyName || 'N/A';
      const provider = booking.umrahVisaProvider?.partyName || 'N/A';
      const qty = booking.passengerCount || 0;

      let arrival = '---';
      if (isArrivalToday) {
        arrival = `${travel?.arrivalAirport?.code || '???'} - ${travel?.arrivalFlightNumber || 'N/A'}\n${travel?.arrivalAirport?.city || ''}\n${extractTimeFromISO(travel?.arrivalDateTime)}`;
      }

      let departure = '---';
      if (isDepartureToday) {
        departure = `${travel?.departureAirport?.code || '???'} - ${travel?.departureFlightNumber || 'N/A'}\n${travel?.departureAirport?.city || ''}\n${extractTimeFromISO(travel?.departureDateTime)}`;
      }

      let cityMovement = 'No movement';
      if (movement) {
        cityMovement = `${movement.fromCity?.name} -> ${movement.toCity?.name}\n${extractTimeFromISO(movement.travelDateTime)}`;
      }

      return [
        visaType,
        reference,
        group,
        provider,
        qty,
        arrival,
        departure,
        cityMovement
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [['Visa Type', 'Reference', 'Group Details', 'Service Provider', 'Qty', 'Arrival Hub', 'Departure Hub', 'City Movement']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [51, 51, 51],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
      },
      margin: { top: 80, bottom: 40, left: 40, right: 40 },
      didDrawPage: (data) => {
        const str = 'Page ' + (doc.internal as any).getNumberOfPages();
        doc.setFontSize(8);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 20);
      }
    });

    doc.save(`Tafweej_${getTargetDate()}.pdf`);
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return 'N/A';
    return toDisplayDate(isoString);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 min-h-screen">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Tafweej</h1>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5 font-medium">Operative overview for {getTargetDateLabel()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCopyImage} variant="outline" size="sm" className="h-9 border-blue-200 hover:bg-blue-50 text-blue-700 font-bold no-capture">
              <Copy className="h-4 w-4 mr-2" />
              Copy Image
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm" className="h-9 border-primary/20 hover:bg-primary/5 text-primary font-bold no-capture">
              <Printer className="h-4 w-4 mr-2" />
              Print PDF
            </Button>
            <Button onClick={fetchDailyBookings} variant="outline" size="sm" className="h-9 no-capture">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          </div>
          </div>

          <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6" ref={tableRef}>
          <div className="hidden lg:block mb-2">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Tafweej - {getTargetDateLabel()}</h2>
          <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Type: {filterType.toUpperCase()} {arrivalFilter && `| Arr: ${arrivalFilter}`} {departureFilter && `| Dep: ${departureFilter}`} {umraCompanyFilter && `| Co: ${umraCompanyFilter}`}</p>
          </div>
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 no-capture">

            <div className="flex flex-col sm:flex-row gap-4">
              <TabsList className="bg-white border p-1 h-11 w-fit rounded-xl shadow-sm">
                <TabsTrigger value="today" className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase text-[10px] tracking-widest">
                  Today
                </TabsTrigger>
                <TabsTrigger value="tomorrow" className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase text-[10px] tracking-widest">
                  Tomorrow
                </TabsTrigger>
              </TabsList>

              <div className="bg-white border p-1 h-11 w-fit rounded-xl shadow-sm flex items-center">
                <button 
                  onClick={() => setFilterType('all')}
                  className={cn(
                    "rounded-lg px-4 h-full text-[10px] font-black uppercase tracking-widest transition-all",
                    filterType === 'all' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilterType('arrival')}
                  className={cn(
                    "rounded-lg px-4 h-full text-[10px] font-black uppercase tracking-widest transition-all",
                    filterType === 'arrival' ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-emerald-600"
                  )}
                >
                  Arrival
                </button>
                <button 
                  onClick={() => setFilterType('departure')}
                  className={cn(
                    "rounded-lg px-4 h-full text-[10px] font-black uppercase tracking-widest transition-all",
                    filterType === 'departure' ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-blue-600"
                  )}
                >
                  Departure
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search ref, party, group..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-[250px] bg-white border-gray-200 rounded-xl shadow-sm focus:ring-primary/20 font-bold text-xs" 
                />
              </div>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-1 shadow-sm gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Arr Port" 
                  value={arrivalFilter}
                  onChange={(e) => setArrivalFilter(e.target.value.toUpperCase())}
                  className="border-0 shadow-none h-8 w-20 text-xs font-bold p-0 focus-visible:ring-0" 
                />
                <div className="w-px h-4 bg-gray-200" />
                <Input 
                  placeholder="Dep Port" 
                  value={departureFilter}
                  onChange={(e) => setDepartureFilter(e.target.value.toUpperCase())}
                  className="border-0 shadow-none h-8 w-20 text-xs font-bold p-0 focus-visible:ring-0" 
                />
                <div className="w-px h-4 bg-gray-200" />
                <Input 
                  placeholder="Umra Co." 
                  value={umraCompanyFilter}
                  onChange={(e) => setUmraCompanyFilter(e.target.value)}
                  className="border-0 shadow-none h-8 w-24 text-xs font-bold p-0 focus-visible:ring-0" 
                />
                {(arrivalFilter || departureFilter || umraCompanyFilter) && (
                  <button onClick={() => { setArrivalFilter(''); setDepartureFilter(''); setUmraCompanyFilter(''); }} className="hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-xl shadow-primary/5 overflow-hidden rounded-3xl bg-white/70 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-100">
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Visa Type</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Group Details</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Party Name</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Provider</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-emerald-50/30 text-center">Arrival Hub</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-blue-50/30 text-center">Departure Hub</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-purple-50/30">City Movement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          {Array(9).fill(0).map((_, j) => (
                            <TableCell key={j} className="py-6 px-6">
                              <div className="h-4 bg-gray-100 rounded w-full"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-20 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center">
                              <Search className="h-8 w-8 text-gray-200" />
                            </div>
                            <p className="text-gray-500 font-medium italic">No operational data found for this date</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookings.map((booking) => {
                        const travel = booking.travelDetails?.[0];
                        const movement = booking.movementDetails?.[0];
                        const dateStr = getTargetDate();
                        
                        const isArrivalToday = travel?.arrivalDateTime && isSameDate(travel.arrivalDateTime, dateStr);
                        const isDepartureToday = travel?.departureDateTime && isSameDate(travel.departureDateTime, dateStr);

                        return (
                          <TableRow key={booking.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50 group">
                            <TableCell className="py-5 px-6">
                              <Badge variant={booking.visaType === 'group_visa' ? 'default' : 'secondary'} className="text-[9px] uppercase font-black px-2 py-0.5">
                                {VISA_TYPE_CONFIG[booking.visaType as keyof typeof VISA_TYPE_CONFIG]?.label || booking.visaType}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-5 px-6">
                              <span className="text-xs font-bold text-primary font-mono tracking-tighter">
                                {booking.bookingReference || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className="py-5 px-6">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-gray-900 leading-tight">{booking.groupNumber || 'N/A'}</span>
                                <span className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{booking.groupName || 'No group name'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-5 px-6">
                              <span className="text-xs font-bold text-gray-700">{booking.party?.partyName || 'N/A'}</span>
                            </TableCell>
                            <TableCell className="py-5 px-6">
                              <span className="text-[10px] font-black text-secondary uppercase truncate max-w-[120px]">
                                {booking.umrahVisaProvider?.partyName || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className="py-5 px-6 text-center">
                              <span className="text-xs font-black text-gray-900">{booking.passengerCount || 0}</span>
                            </TableCell>
                            <TableCell className="py-5 px-6 bg-emerald-50/10 text-center">
                              {isArrivalToday ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px] font-black bg-emerald-50 text-emerald-700 border-emerald-100">
                                      {travel?.arrivalAirport?.code || '???'}
                                    </Badge>
                                    <span className="text-[10px] font-black text-emerald-900">{travel?.arrivalFlightNumber || 'N/A'}</span>
                                  </div>
                                  <span className="text-[9px] text-emerald-600/70 font-bold uppercase truncate max-w-[120px]">
                                    {travel?.arrivalAirport?.city || 'N/A'}
                                  </span>
                                  <span className="text-[9px] font-black text-emerald-500 italic mt-0.5">
                                    {extractTimeFromISO(travel?.arrivalDateTime)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-300 font-bold uppercase">---</span>
                              )}
                            </TableCell>
                            <TableCell className="py-5 px-6 bg-blue-50/10 text-center">
                              {isDepartureToday ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px] font-black bg-blue-50 text-blue-700 border-blue-100">
                                      {travel?.departureAirport?.code || '???'}
                                    </Badge>
                                    <span className="text-[10px] font-black text-blue-900">{travel?.departureFlightNumber || 'N/A'}</span>
                                  </div>
                                  <span className="text-[9px] text-blue-600/70 font-bold uppercase truncate max-w-[120px]">
                                    {travel?.departureAirport?.city || 'N/A'}
                                  </span>
                                  <span className="text-[9px] font-black text-blue-500 italic mt-0.5">
                                    {extractTimeFromISO(travel?.departureDateTime)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-300 font-bold uppercase">---</span>
                              )}
                            </TableCell>
                            <TableCell className="py-5 px-6 bg-purple-50/10">
                              {movement ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 border border-purple-200">
                                    <Truck className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-black text-purple-900 truncate max-w-[80px]">{movement.fromCity?.name}</span>
                                      <ArrowRight className="h-2 w-2 text-purple-400" />
                                      <span className="text-[10px] font-black text-purple-900 truncate max-w-[80px]">{movement.toCity?.name}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-primary italic">{extractTimeFromISO(movement.travelDateTime)}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-400 italic">No movement scheduled</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}
