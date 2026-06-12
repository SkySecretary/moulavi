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
  Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI } from '@/lib/api';
import { VISA_TYPE_CONFIG } from '@/lib/constants';
import { toDisplayDate, extractTimeFromISO } from '@/lib/umrah/validation';

export default function DailyOverviewPage() {
  const user = getUser();
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [arrivalFilter, setArrivalFilter] = useState('');
  const [departureFilter, setDepartureFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDailyBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Calculate target date
      const date = new Date();
      if (activeTab === 'tomorrow') {
        date.setDate(date.getDate() + 1);
      }
      const dateStr = date.toISOString().split('T')[0];

      const response = await umrahVisaAPI.getDailyOverview({
        date: dateStr,
        arrivalAirportCode: arrivalFilter || undefined,
        departureAirportCode: departureFilter || undefined,
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
  }, [activeTab, arrivalFilter, departureFilter]);

  useEffect(() => {
    if (user && hasRole(['admin', 'staff'])) {
      fetchDailyBookings();
    }
  }, [fetchDailyBookings, user]);

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  const filteredBookings = bookings.filter(b => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      (b.bookingReference || '').toLowerCase().includes(search) ||
      (b.groupNumber || '').toLowerCase().includes(search) ||
      (b.groupName || '').toLowerCase().includes(search) ||
      (b.party?.partyName || '').toLowerCase().includes(search)
    );
  });

  const getTargetDateLabel = () => {
    const date = new Date();
    if (activeTab === 'tomorrow') date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
            <Button onClick={fetchDailyBookings} variant="outline" size="sm" className="h-9">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <TabsList className="bg-white border p-1 h-11 w-fit rounded-xl shadow-sm">
              <TabsTrigger value="today" className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-white">
                Today
              </TabsTrigger>
              <TabsTrigger value="tomorrow" className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-white">
                Tomorrow
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search ref, party, group..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-[250px] bg-white border-gray-200 rounded-xl shadow-sm focus:ring-primary/20" 
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
                {(arrivalFilter || departureFilter) && (
                  <button onClick={() => { setArrivalFilter(''); setDepartureFilter(''); }} className="hover:text-red-500">
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
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel Date</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-emerald-50/30">Arrival Hub</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-blue-50/30">Departure Hub</TableHead>
                      <TableHead className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-purple-50/30">Today's Movement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          {Array(8).fill(0).map((_, j) => (
                            <TableCell key={j} className="py-6 px-6">
                              <div className="h-4 bg-gray-100 rounded w-full"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-20 text-center">
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
                              <div className="flex items-center gap-1.5 text-xs font-black text-secondary italic">
                                <CalendarIcon className="h-3 w-3" />
                                {travel?.arrivalDateTime ? formatDate(travel.arrivalDateTime) : 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="py-5 px-6 bg-emerald-50/10">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px] font-black bg-emerald-50 text-emerald-700 border-emerald-100">
                                    {travel?.arrivalAirport?.code || '???'}
                                  </Badge>
                                  <span className="text-[10px] font-black text-emerald-900">{travel?.arrivalFlightNumber || 'N/A'}</span>
                                </div>
                                <span className="text-[9px] text-emerald-600/70 font-bold uppercase truncate max-w-[120px]">
                                  {travel?.arrivalAirport?.city || 'N/A'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-5 px-6 bg-blue-50/10">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px] font-black bg-blue-50 text-blue-700 border-blue-100">
                                    {travel?.departureAirport?.code || '???'}
                                  </Badge>
                                  <span className="text-[10px] font-black text-blue-900">{travel?.departureFlightNumber || 'N/A'}</span>
                                </div>
                                <span className="text-[9px] text-blue-600/70 font-bold uppercase truncate max-w-[120px]">
                                  {travel?.departureAirport?.city || 'N/A'}
                                </span>
                              </div>
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
