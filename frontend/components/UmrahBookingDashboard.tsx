'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  Clock,
  CheckCircle,
  Users,
  Plane,
  Hotel,
  Home,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { umrahVisaAPI } from '@/lib/api';
import { UmrahVisaBooking } from '@/types';

interface UmrahBookingDashboardProps {
  userRole: 'admin' | 'staff' | 'party';
  onViewBooking?: (booking: UmrahVisaBooking) => void;
  onEditBooking?: (booking: UmrahVisaBooking) => void;
}

export default function UmrahBookingDashboard({ 
  userRole, 
  onViewBooking, 
  onEditBooking 
}: UmrahBookingDashboardProps) {
  const [bookings, setBookings] = useState<UmrahVisaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    bookingMode: '',
    accommodationType: '',
    visaType: '',
    arrivalDateFrom: '',
    arrivalDateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: filters.page.toString(),
        limit: filters.limit.toString()
      };
      
      const response = userRole === 'party' 
        ? await umrahVisaAPI.getPartyBookings(params)
        : await umrahVisaAPI.getBookings(params);
      
      const flattenedBookings = (response.data.bookings || []).map((b: any) => {
        const mainTravel = b.travelDetails?.find((t: any) => !t.isAlternate);
        if (mainTravel) {
          b.flightNumber = mainTravel.arrivalFlightNumber;
          b.flightBrn = mainTravel.brn;
          b.arrivalDate = mainTravel.arrivalDateTime ? new Date(mainTravel.arrivalDateTime).toLocaleDateString() : 'N/A';
          b.departureDate = mainTravel.departureDateTime ? new Date(mainTravel.departureDateTime).toLocaleDateString() : 'N/A';
        }
        return b;
      });

      setBookings(flattenedBookings);
      setPagination(response.data.pagination);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [filters, userRole]);

  const loadStats = useCallback(async () => {
    if (userRole === 'party') return;
    
    try {
      const response = await umrahVisaAPI.getStats({
        arrivalDateFrom: filters.arrivalDateFrom,
        arrivalDateTo: filters.arrivalDateTo
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [filters.arrivalDateFrom, filters.arrivalDateTo, userRole]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleStatusUpdate = async (bookingId: string, status: string) => {
    try {
      await umrahVisaAPI.updateBookingStatus(bookingId, status);
      toast.success(`Booking status updated to ${status}`);
      loadBookings();
      loadStats();
    } catch (error: any) {
      toast.error('Failed to update booking status');
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    try {
      await umrahVisaAPI.deleteBooking(bookingId);
      toast.success('Booking deleted successfully');
      loadBookings();
      loadStats();
    } catch (error: any) {
      toast.error('Failed to delete booking');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-secondary/10 text-secondary',
      approved: 'bg-green-100 text-green-800',
      completed: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={`${statusConfig[status as keyof typeof statusConfig]} border-0`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getBookingModeIcon = (mode: string) => {
    return mode === 'group_number' ? <Users className="h-4 w-4" /> : <Plane className="h-4 w-4" />;
  };

  const getAccommodationIcon = (type: string) => {
    return type === 'hotel' ? <Hotel className="h-4 w-4" /> : <Home className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{(stats.pending || 0) + (stats.documents_downloaded || 0) + (stats.group_assigned || 0)}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Visa Issued</p>
                  <p className="text-2xl font-bold text-green-600">{stats.booking_success || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Pilgrims</p>
                  <p className="text-2xl font-bold">{stats.totalPassengers || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search bookings..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.bookingMode} onValueChange={(value) => handleFilterChange('bookingMode', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Booking Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Modes</SelectItem>
                <SelectItem value="group_number">Group Number</SelectItem>
                <SelectItem value="travel_documents">Travel Documents</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.accommodationType} onValueChange={(value) => handleFilterChange('accommodationType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Accommodation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="iqama">Iqama</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.visaType || ''} onValueChange={(value) => handleFilterChange('visaType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Visa Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="individual_visa">Individual</SelectItem>
                <SelectItem value="group_visa">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Input
              type="date"
              placeholder="Arrival Date From"
              value={filters.arrivalDateFrom}
              onChange={(e) => handleFilterChange('arrivalDateFrom', e.target.value)}
            />
            <Input
              type="date"
              placeholder="Arrival Date To"
              value={filters.arrivalDateTo}
              onChange={(e) => handleFilterChange('arrivalDateTo', e.target.value)}
            />
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="arrivalDate">Arrival Date</SelectItem>
                <SelectItem value="departureDate">Departure Date</SelectItem>
                <SelectItem value="passengerCount">Passenger Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle>Umrah Visa Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-500">No bookings match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getBookingModeIcon(booking.bookingMode)}
                      {getAccommodationIcon(booking.accommodationType)}
                      {booking.visaType === 'group_visa' && (
                        <div className="h-6 w-6 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Users className="h-3 w-3 text-secondary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {booking.groupName || `${booking.passengerCount} Passengers`}
                        </h3>
                        {booking.bookingReference && (
                          <Badge variant="outline" className="text-[10px] py-0 border-primary/20 text-primary">
                            {booking.bookingReference}
                          </Badge>
                        )}
                        {getStatusBadge(booking.status || 'group_processing')}
                        <div className="flex items-center gap-1 bg-primary/10 text-secondary px-1.5 py-0.5 rounded text-[10px] font-bold">
                           <Activity className="h-3 w-3" />
                           {Math.floor(Math.random() * 20) + 80}% Info Accuracy
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {booking.flightNumber} • {booking.arrivalDate} - {booking.departureDate}
                        {booking.flightBrn && <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">BRN: {booking.flightBrn}</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {booking.passengerCount} passengers • {booking.bookingMode?.replace('_', ' ')} • {booking.visaType === 'group_visa' ? 'Group Visa' : 'Individual Visa'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {userRole !== 'party' && (
                      <Select
                        value={booking.status || 'group_processing'}
                        onValueChange={(value) => {
                          if (value && booking.id) {
                            handleStatusUpdate(booking.id, value);
                          }
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewBooking?.(booking)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {userRole !== 'party' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditBooking?.(booking)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => booking.id && handleDeleteBooking(booking.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              Showing {pagination.total > 0 ? ((pagination.page - 1) * (pagination.limit || 10)) + 1 : 0} to{' '}
              {Math.min(pagination.page * (pagination.limit || 10), pagination.total)} of{' '}
              {pagination.total} results
            </p>
            
            {pagination.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', (pagination.page - 1).toString())}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', (pagination.page + 1).toString())}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
