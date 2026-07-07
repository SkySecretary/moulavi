'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI, nusukAPI, partyAPI } from '@/lib/api';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import Link from 'next/link';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Hash,
  Users,
  Calendar,
  Building,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  PlusCircle,
  Globe,
  Shield,
  Award,
  TrendingUp,
  Activity,
  Download,
  Loader2,
  AlertTriangle,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface UmrahVisaBooking {
  id: string;
  bookingId?: string;
  bookingReference?: string;
  groupNumber?: string;
  groupName?: string;
  passengerCount: number;
  status: 'pending' | 'documents_downloaded' | 'group_assigned' | 'voucher' | 'bill' | 'booking_success' | 'cancelled';
  createdAt: string;
  party?: {
    id: string;
    partyName: string;
    email: string;
  };
  lastUpdatedByUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function PartyDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<UmrahVisaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });
  const [complianceData, setComplianceData] = useState<any>(null);
  const [partyDetails, setPartyDetails] = useState<any>(null);
  const [missingReturnBookings, setMissingReturnBookings] = useState<any[]>([]);
  const [loadingMissingReturn, setLoadingMissingReturn] = useState(false);
  const loadingRef = useRef(false);

  const loadPartyAndMissingReturn = async () => {
    try {
      const partyRes = await partyAPI.getMyParty();
      const party = partyRes.data.party;
      setPartyDetails(party);

      if (party?.allowOneWayTicket) {
        setLoadingMissingReturn(true);
        const response = await umrahVisaAPI.getMissingReturnTicketsBookings({ page: '1', limit: '100' });
        setMissingReturnBookings(response.data.bookings || []);
        setLoadingMissingReturn(false);
      }
    } catch (error) {
      console.error('Failed to load party details or missing return bookings:', error);
    }
  };

  const loadCompliance = async () => {
    try {
      const complianceRes = await nusukAPI.getComplianceDashboard();
      setComplianceData(complianceRes.data);
    } catch (error) {
      console.error('Failed to load compliance details:', error);
    }
  };

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    setUser(currentUser);
  }, []);

  // Load bookings and calculate stats
  const loadBookings = async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      
      const params = { 
        page: String(pagination.page), 
        limit: String(pagination.limit),
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        arrivalDateFrom: dateFrom || undefined,
        arrivalDateTo: dateTo || undefined,
      };
      
      const response = await umrahVisaAPI.getBookings(params);
      const bookingsData = response.data.bookings || [];
      const paginationData = response.data.pagination || {
        page: pagination.page,
        limit: pagination.limit,
        total: bookingsData.length,
        totalPages: 1,
      };
      
      setBookings(bookingsData);
      setPagination(paginationData);
      
      // Calculate stats from total count
      const total = paginationData.total || 0;
      
      // Get stats from a separate call for accuracy (passing date filters)
      try {
        const statsRes = await umrahVisaAPI.getStats({
          arrivalDateFrom: dateFrom || undefined,
          arrivalDateTo: dateTo || undefined,
        });
        const s = statsRes.data.stats;
        setStats({
          total: s.total,
          pending: s.pending + s.documents_downloaded + s.group_assigned + s.voucher + s.bill,
          completed: s.booking_success,
        });
      } catch {
        // If stats fail, use total from pagination
        setStats(prev => ({ ...prev, total }));
      }
    } catch (error) {
      setBookings([]);
      setStats({ total: 0, pending: 0, completed: 0 });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Auth check and redirect
  useEffect(() => {
    if (!mounted) return;
    
    if (!user || !hasRole('party')) {
      router.push('/');
      return;
    }
  }, [mounted, user, router]);

  // Load bookings when filters/pagination change (only after user is confirmed)
  useEffect(() => {
    if (!mounted || !user || !hasRole('party')) return;
    loadBookings();
    loadCompliance();
    loadPartyAndMissingReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, user, pagination.page, pagination.limit, searchTerm, statusFilter, dateFrom, dateTo]);

  const getStatusBadge = (status: string) => {
    if (!status) {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-0">
          <Clock className="h-3 w-3 mr-1" />
          Unknown
        </Badge>
      );
    }

    const statusConfig = {
      pending: { color: 'bg-yellow-50 text-yellow-700 border-yellow-100', icon: Clock, label: 'Pending' },
      documents_downloaded: { color: 'bg-blue-50 text-blue-700 border-blue-100', icon: FileText, label: 'Docs Received' },
      group_assigned: { color: 'bg-secondary/10 text-secondary border-secondary/20', icon: Users, label: 'Group Assigned' },
      voucher: { color: 'bg-primary/10 text-secondary border-primary/20', icon: Award, label: 'Voucher' },
      bill: { color: 'bg-gray-50 text-gray-700 border-gray-200', icon: FileText, label: 'Invoice' },
      booking_success: { color: 'bg-green-50 text-green-700 border-green-100', icon: CheckCircle, label: 'Success' },
      cancelled: { color: 'bg-destructive/5 text-destructive border-destructive/20', icon: XCircle, label: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`${config.color} text-[10px] py-0 h-5`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleViewBooking = (bookingId: string) => {
    router.push(`/party/umrah-visa/view/${bookingId}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDownloadBookingPDF = async (booking: any) => {
    if (!booking.id) return;
    
    try {
      setDownloadingId(booking.id);
      const response = await umrahVisaAPI.generateBookingPDF(booking.id);
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = `${booking.bookingReference || booking.id.slice(0, 8)}.pdf`;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Booking PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading booking PDF:', error);
      toast.error('Failed to download booking PDF');
    } finally {
      setDownloadingId(null);
    }
  };


  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  const getMissingReturnStatus = () => {
    if (!partyDetails?.allowOneWayTicket || missingReturnBookings.length === 0) {
      return { show: false, urgent: false, count: 0 };
    }

    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
    const tomorrowUTC = todayUTC + 86400000;
    const dayAfterUTC = todayUTC + 172800000;

    let hasUrgent = false;
    for (const booking of missingReturnBookings) {
      if (booking.departureDate) {
        const depDate = new Date(booking.departureDate.substring(0, 10)).getTime();
        if (depDate <= dayAfterUTC) {
          hasUrgent = true;
          break;
        }
      }
    }

    return {
      show: true,
      urgent: hasUrgent,
      count: missingReturnBookings.length
    };
  };

  const missingReturnStatus = getMissingReturnStatus();

  if (!user || !hasRole('party')) {
    return null;
  }

  return (
    <PartyLayout 
      title="Agency Dashboard" 
      subtitle="Overview of your Umrah applications and performance"
    >
      {/* Email Verification Warning */}
      {user && !user.emailVerified && (
        <div className="bg-orange-50 border-b border-orange-100 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-800 tracking-tight">Security Protocol: Email Not Verified</p>
              <p className="text-xs text-orange-600 font-medium">Please verify your email to unlock full portal capabilities and secure your account.</p>
            </div>
          </div>
          <Button 
            onClick={() => router.push('/verify-email')}
            variant="outline" 
            size="sm"
            className="border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800 font-bold h-8"
          >
            Verify Now
          </Button>
        </div>
      )}

      {/* Hero / Welcome Section */}
      <div className="relative bg-gradient-to-r from-secondary to-[#112020] text-white px-8 py-10 overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <Globe className="h-64 w-64 text-white" />
        </div>
        <div className="relative z-10 max-w-4xl">
          <h2 className="text-3xl font-bold mb-2 text-primary-foreground tracking-tight">Welcome, {user.name}</h2>
          <p className="text-primary-foreground/80 text-lg mb-6 max-w-2xl font-medium">
            Manage your Umrah pilgrim groups and visa applications through our Nusuk-integrated platform.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => router.push('/party/umrah-visa')}
              className="bg-primary hover:bg-primary/90 text-white border-none shadow-lg hover:shadow-xl transition-all font-bold"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Individual
            </Button>
            <Button 
              onClick={() => router.push('/party/umrah-visa-group')}
              className="bg-primary hover:bg-primary/90 text-white border-none shadow-lg hover:shadow-xl transition-all font-bold"
            >
              <Users className="mr-2 h-4 w-4" />
              New Group
            </Button>
            <Button 
              onClick={() => router.push('/party/add-to-existing-booking')}
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white backdrop-blur-sm font-bold"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add to Existing
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8 space-y-8">
        {/* Missing Return Tickets Alert */}
        {missingReturnStatus.show && (
          missingReturnStatus.urgent ? (
            <div className="bg-rose-50 border border-rose-200 border-l-4 border-l-rose-600 p-5 rounded-2xl flex items-start gap-4 shadow-sm animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-rose-950 uppercase tracking-wide flex items-center gap-2">
                  <span>CRITICAL ALERT: URGENT ACTION REQUIRED</span>
                  <span className="bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-bounce">DEPARTING SOON</span>
                </h4>
                <p className="text-xs text-rose-700 font-semibold mt-1.5 leading-relaxed">
                  You have <span className="font-extrabold text-rose-950 underline">{missingReturnStatus.count} booking(s)</span> created as onward-only (one-way) that are missing return tickets. At least one booking has a departure scheduled today, tomorrow, or the day after. You must collect and upload the return ticket immediately!
                </p>
                <div className="mt-3 flex gap-2">
                  <Button 
                    size="sm"
                    variant="destructive"
                    onClick={() => router.push('/party/missing-return-ticket')}
                    className="font-bold text-xs"
                  >
                    Upload Return Tickets Now
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 border-l-4 border-l-amber-500 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                  ATTENTION: Missing Return Tickets Notice
                </h4>
                <p className="text-xs text-amber-700 font-semibold mt-1.5 leading-relaxed">
                  You have <span className="font-extrabold text-amber-950">{missingReturnStatus.count} booking(s)</span> in the system with onward-only (one-way) flights. Please ensure that return tickets are collected and updated in the system as soon as possible.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/party/missing-return-ticket')}
                    className="border-amber-300 text-amber-800 hover:bg-amber-100 font-bold text-xs"
                  >
                    Manage Missing Tickets
                  </Button>
                </div>
              </div>
            </div>
          )
        )}

        {/* Mismatched Travel Compliance High Priority Notice */}
        {complianceData && complianceData.myMismatches && complianceData.myMismatches.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-pulse">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-850 uppercase tracking-wide">High Priority: Mismatched Travel Action Required</h4>
              <p className="text-xs text-red-700 font-semibold mt-1">
                You have {complianceData.myMismatches.length} active travel detail discrepancies. Please update flight/passport info immediately before pilgrim departure dates to avoid Nusuk Portal penalties.
              </p>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatsCard 
            title="Total Applications" 
            value={stats.total} 
            icon={FileText} 
            color="text-secondary"
            bgColor="bg-secondary/10"
            description="Lifetime bookings"
          />
          <StatsCard 
            title="Pending Processing" 
            value={stats.pending} 
            icon={Clock} 
            color="text-orange-600"
            bgColor="bg-orange-50"
            description="Active applications"
          />
          <StatsCard 
            title="Visa Issued" 
            value={stats.completed} 
            icon={CheckCircle} 
            color="text-green-600"
            bgColor="bg-green-50"
            description="Completed bookings"
          />
        </div>

        {/* Compliance Dashboard Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Compliance Score & Status */}
          <Card className="border-none shadow-md overflow-hidden bg-white rounded-xl col-span-1">
            <CardHeader className="border-b border-gray-50 py-4">
              <CardTitle className="text-md font-bold text-secondary flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Compliance rank meter */}
              <div className="text-center py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Current Status</div>
                <div className="mt-2 flex items-center justify-center">
                  {complianceData?.metrics?.complianceStatus === 'RED' ? (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wide shadow-sm animate-pulse">
                      <XCircle className="h-4 w-4 mr-2" /> Critical Risk (RED)
                    </span>
                  ) : complianceData?.metrics?.complianceStatus === 'YELLOW' ? (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wide shadow-sm">
                      <AlertTriangle className="h-4 w-4 mr-2" /> Warning (YELLOW)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-black bg-green-50 text-green-600 border border-green-100 uppercase tracking-wide shadow-sm">
                      <CheckCircle className="h-4 w-4 mr-2" /> Compliant (GREEN)
                    </span>
                  )}
                </div>
                
                {/* Visual Gauge representation */}
                <div className="mt-6 px-4">
                  <div className="relative h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-500 w-1/3 border-r border-white"></div>
                    <div className="h-full bg-yellow-500 w-1/3 border-r border-white"></div>
                    <div className="h-full bg-red-500 w-1/3"></div>
                    
                    {/* Floating indicator marker */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-white bg-slate-900 shadow-md transition-all duration-700"
                      style={{ 
                        left: complianceData?.metrics?.complianceStatus === 'RED' 
                          ? '83%' 
                          : complianceData?.metrics?.complianceStatus === 'YELLOW' 
                          ? '50%' 
                          : '16%' 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-gray-400 mt-2 uppercase tracking-wider">
                    <span>Compliant</span>
                    <span>Throttled</span>
                    <span>Suspended</span>
                  </div>
                </div>
              </div>

              {/* Compliance score advice info box */}
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100/50 rounded-xl">
                <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                  Compliance Advice
                </h5>
                <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                  {complianceData?.advice || "Loading advice..."}
                </p>
              </div>

              {/* Data Accuracy Matrix */}
              <div className="space-y-3.5 pt-3 border-t">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-800 font-bold uppercase tracking-wider">Data Accuracy Rate</span>
                  <span className="font-extrabold text-indigo-650 text-sm">
                    {complianceData?.accuracy ?? 100}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-1000"
                    style={{ width: `${complianceData?.accuracy ?? 100}%` }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                  <div className="bg-slate-50/50 p-2.5 rounded-lg border">
                    <span className="text-gray-400 font-bold uppercase tracking-wide block text-[9px]">Resolved Mismatches</span>
                    <strong className="text-green-600 font-extrabold text-sm">{complianceData?.resolvedMismatchesCount ?? 0}</strong>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-lg border">
                    <span className="text-gray-400 font-bold uppercase tracking-wide block text-[9px]">Active Mismatches</span>
                    <strong className="text-rose-600 font-extrabold text-sm">{complianceData?.myMismatches?.length ?? 0}</strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-dashed">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-bold uppercase tracking-wider">Monitored Arrivals:</span>
                    <span className="font-bold text-slate-800">
                      {complianceData?.metrics?.arrivalMismatches ?? 0} / {complianceData?.metrics?.totalArrivals ?? 0} mismatches
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-bold uppercase tracking-wider">Monitored Departures:</span>
                    <span className="font-bold text-slate-800">
                      {complianceData?.metrics?.departureMismatches ?? 0} / {complianceData?.metrics?.totalDepartures ?? 0} mismatches
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-bold uppercase tracking-wider">Severe Violations:</span>
                    <span className={`font-bold ${complianceData?.metrics?.severeViolations > 0 ? 'text-red-600 font-black' : 'text-slate-800'}`}>
                      {complianceData?.metrics?.severeViolations ?? 0} records
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column (Col-span 2): My Active Discrepancies */}
          <Card className="border-none shadow-md overflow-hidden bg-white rounded-xl col-span-1 lg:col-span-2">
            <CardHeader className="border-b border-gray-50 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-md font-bold text-secondary flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Discrepancy Action List
                </CardTitle>
                <p className="text-xs text-gray-400">Review flight details flagged by the Nusuk sync report</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="bg-slate-50 border rounded px-2.5 py-1 text-gray-500 font-semibold">
                  Today: <span className="text-rose-600 font-bold">{complianceData?.todayCount ?? 0}</span>
                </div>
                <div className="bg-slate-50 border rounded px-2.5 py-1 text-gray-500 font-semibold">
                  Month: <span className="text-slate-700 font-bold">{complianceData?.monthCount ?? 0}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {complianceData?.myMismatches && complianceData.myMismatches.length > 0 ? (
                  complianceData.myMismatches.map((item: any) => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 font-mono">{item.booking.bookingReference}</span>
                          <span className="text-[10px] font-mono text-gray-400">• Detected {new Date(item.createdAt).toLocaleDateString()}</span>
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold py-0.5 px-2">
                            {item.mismatchType === 'entry' && 'Arrival Mismatch'}
                            {item.mismatchType === 'exit' && 'Departure Mismatch'}
                            {item.mismatchType === 'both' && 'Arrival & Departure'}
                            {item.mismatchType === 'pax_count' && 'Count Mismatch'}
                          </Badge>
                        </div>
                        
                        <div className="text-xs font-semibold text-gray-800">
                          Passenger: <span className="text-slate-900 font-bold">{item.passenger?.fullName || item.details.mutamerName || 'Count Discrepancy'}</span> 
                          {item.passenger?.passportNumber && <span className="text-[10px] font-mono text-gray-400 ml-1">({item.passenger.passportNumber})</span>}
                        </div>
                        
                        {/* Display specific error fields comparisons */}
                        {item.mismatchType !== 'pax_count' && (
                          <div className="text-[11px] text-gray-600 leading-tight space-y-0.5 bg-white p-2 rounded-lg border border-slate-100 shadow-sm max-w-xl">
                            {item.details.entry?.mismatched && (
                              <div>
                                <span className="font-bold text-rose-600">Arrival Error:</span> DB flight{' '}
                                <span className="font-semibold text-slate-800">{item.details.entry.flight?.db || 'N/A'}</span> vs Nusuk{' '}
                                <span className="font-semibold text-rose-700 bg-rose-50 px-1 rounded">{item.details.entry.flight?.excel || 'N/A'}</span>
                              </div>
                            )}
                            {item.details.exit?.mismatched && (
                              <div>
                                <span className="font-bold text-rose-600">Departure Error:</span> DB flight{' '}
                                <span className="font-semibold text-slate-800">{item.details.exit.flight?.db || 'N/A'}</span> vs Nusuk{' '}
                                <span className="font-semibold text-rose-700 bg-rose-50 px-1 rounded">{item.details.exit.flight?.excel || 'N/A'}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {item.mismatchType === 'pax_count' && (
                          <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                            <span className="font-bold text-rose-600">Passenger Count Deviation:</span> Expected{' '}
                            <strong className="text-slate-800">{item.details.expected}</strong> but Nusuk report contains{' '}
                            <strong className="text-rose-700">{item.details.actual}</strong> processed records.
                          </div>
                        )}
                      </div>

                      <Link href={`/party/umrah-visa/view/${item.bookingId}`} target="_blank" passHref>
                        <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0 font-bold text-xs h-9">
                          Correct Info
                        </Button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 flex flex-col items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                    <h5 className="text-sm font-bold text-slate-800">All Clear!</h5>
                    <p className="text-xs text-gray-500 max-w-xs mt-1">No active travel discrepancies found for your bookings.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consulate Review Section */}
        {complianceData && complianceData.myConsulateReviews && complianceData.myConsulateReviews.length > 0 && (
          <Card className="border-none shadow-md overflow-hidden bg-white rounded-xl">
            <CardHeader className="border-b border-gray-50 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-md font-bold text-secondary flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  Consulate Review Applications
                </CardTitle>
                <p className="text-xs text-gray-400">Pilgrims whose visas are currently in Consulate Review (no visa number yet)</p>
              </div>
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold px-2.5 py-1">
                {complianceData.myConsulateReviews.length} Applications
              </Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                      <th className="py-3 px-4">Mutamer Name</th>
                      <th className="py-3 px-4">Passport Number</th>
                      <th className="py-3 px-4">MoFA Number</th>
                      <th className="py-3 px-4">Nationality</th>
                      <th className="py-3 px-4">Group Info</th>
                      <th className="py-3 px-4">Nusuk Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complianceData.myConsulateReviews.map((passenger: any) => (
                      <tr key={passenger.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition duration-150">
                        <td className="py-3 px-4 font-semibold text-slate-900">{passenger.fullName}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{passenger.passportNumber || '-'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{passenger.mofaNumber || '-'}</td>
                        <td className="py-3 px-4 text-slate-500">{passenger.nationality || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-semibold text-indigo-650 text-[10px]">
                              {passenger.booking?.groupNumber || 'No Group'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {passenger.booking?.groupName || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase bg-rose-50 text-rose-700 border-rose-100">
                            {passenger.mutamerStatus || 'Consulate Review'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/party/umrah-visa/view/${passenger.bookingId}`} target="_blank" passHref>
                            <Button size="sm" variant="ghost" className="text-indigo-650 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-xs h-8 px-2.5 rounded-lg">
                              View Booking
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Applications */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-white">
            <div className="flex flex-col space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-secondary">Recent Applications</h2>
                  <p className="text-sm text-gray-500">Track and manage your pilgrim groups</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search group..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 w-full sm:w-64 border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-full sm:w-[180px] border-gray-200">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="documents_downloaded">Docs Received</SelectItem>
                      <SelectItem value="group_assigned">Group Assigned</SelectItem>
                      <SelectItem value="voucher">Voucher</SelectItem>
                      <SelectItem value="bill">Invoice</SelectItem>
                      <SelectItem value="booking_success">Success</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Arrival From:</Label>
                  <Input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => { setDateFrom(e.target.value); setPagination(p => ({...p, page: 1})); }} 
                    className="h-9 border-gray-100 bg-gray-50/30 text-xs font-bold" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Arrival To:</Label>
                  <Input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => { setDateTo(e.target.value); setPagination(p => ({...p, page: 1})); }} 
                    className="h-9 border-gray-100 bg-gray-50/30 text-xs font-bold" 
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setDateFrom(''); setDateTo(''); setPagination(p => ({...p, page: 1})); }}
                    className="text-[10px] font-black text-primary uppercase h-9"
                  >
                    <X className="h-3 w-3 mr-1" /> Clear Dates
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No applications found</h3>
                <p className="text-gray-500 mb-8 max-w-xs mx-auto">You haven't submitted any Umrah visa applications yet.</p>
                <Button 
                  onClick={() => router.push('/party/umrah-visa')}
                  className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg"
                >
                  Apply Now
                </Button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-5 hover:bg-gray-50/50 transition-colors group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Building className="h-6 w-6 text-secondary" />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-secondary text-lg">
                                {booking.groupName || 'Umrah Group'}
                              </h3>
                              {booking.bookingReference && (
                                <Badge variant="outline" className="text-[10px] py-0 border-primary/20 text-primary font-bold">
                                  {booking.bookingReference}
                                </Badge>
                              )}
                              {getStatusBadge(booking.status)}
                              {booking.lastUpdatedByUser?.role && 
                               (booking.lastUpdatedByUser.role === 'admin' || booking.lastUpdatedByUser.role === 'staff') && (
                                <Badge variant="outline" className="text-[10px] py-0 bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold uppercase tracking-wide">
                                  Admin Booking
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
                              {booking.groupNumber && (
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                                  <Hash className="h-3 w-3" />
                                  {booking.groupNumber}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {booking.passengerCount || 0} Passengers
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
                              </span>
                              <div className="flex items-center gap-1 bg-primary/10 text-secondary px-1.5 py-0.5 rounded text-[10px] font-bold">
                                <Activity className="h-3 w-3" />
                                {complianceData?.accuracy ?? 100}% Info Accuracy
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleDownloadBookingPDF(booking)}
                            size="sm"
                            variant="outline"
                            disabled={downloadingId === booking.id}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 h-9 px-3"
                          >
                            {downloadingId === booking.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => handleViewBooking(booking.id)}
                            size="sm"
                            variant="outline"
                            className="border-gray-200 text-gray-600 hover:text-secondary hover:border-secondary font-bold h-9 px-4"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                <div className="p-6 bg-gray-50/30 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </div>
                  
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1 || loading}
                        className="h-8 w-8 p-0 border-gray-200"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-xs font-bold text-secondary bg-white border border-gray-200 px-3 py-1.5 rounded-md">
                        {pagination.page} / {pagination.totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.totalPages || loading}
                        className="h-8 w-8 p-0 border-gray-200"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PartyLayout>
  );
}

function StatsCard({ title, value, icon: Icon, color, bgColor, description }: any) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200 bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-3xl font-black text-secondary mb-1">{value}</h3>
            <p className="text-[10px] text-gray-400 font-medium">{description}</p>
          </div>
          <div className={`p-3 rounded-xl ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceMetric({ label, percentage, description, icon: Icon }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-50 rounded text-secondary">
             <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-gray-700">{label}</span>
        </div>
        <span className="text-sm font-black text-secondary">{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-1000" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-[10px] text-gray-400 font-medium leading-tight">
        {description}
      </p>
    </div>
  );
}



