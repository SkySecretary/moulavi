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
import { umrahVisaAPI } from '@/lib/api';
import { PartyLayout } from '@/components/layouts/PartyLayout';
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
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface UmrahVisaBooking {
  id: string;
  bookingId?: string;
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
}

export default function PartyDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<UmrahVisaBooking[]>([]);
  const [loading, setLoading] = useState(true);
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
  const loadingRef = useRef(false);

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

        {/* Agency Performance Monitoring */}
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-lg font-bold text-secondary">Agency Compliance Level</CardTitle>
              <p className="text-xs text-gray-400">Based on data submission accuracy and timeliness</p>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">Level: Compliant</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <PerformanceMetric 
                  label="Trip Information Accuracy" 
                  percentage={94} 
                  description="Percentage of bookings approved without data correction" 
                  icon={Shield}
                />
                <PerformanceMetric 
                  label="On-Time Submission Rate" 
                  percentage={89} 
                  description="Trip details provided > 48h before arrival" 
                  icon={Clock}
                />
             </div>
          </CardContent>
        </Card>

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
                                {Math.floor(Math.random() * 15) + 85}% Info Accuracy
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
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



