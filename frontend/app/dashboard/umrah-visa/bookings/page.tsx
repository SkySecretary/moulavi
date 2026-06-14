'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Edit, 
  Trash2,
  PlusCircle,
  Users,
  UserPlus,
  Download,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG, VISA_TYPE_CONFIG } from '@/lib/constants';
import { DatePicker } from '@/components/ui/date-picker';
import { fromDisplayDate, toDisplayDate, extractDateFromISO } from '@/lib/umrah/validation';
import ViewUmrahVisaDialog from '@/components/ViewUmrahVisaDialog';

export default function UmrahVisaPage() {
  const router = useRouter();
  const user = getUser();
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVisaType, setSelectedVisaType] = useState<string>('all');
  const [arrivalDateFrom, setArrivalDateFrom] = useState('');
  const [arrivalDateTo, setArrivalDateTo] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  useEffect(() => {
    fetchBookings(pagination.page);
  }, [pagination.page, searchQuery, selectedStatus, selectedVisaType, arrivalDateFrom, arrivalDateTo]);

  const fetchBookings = async (page = 1) => {
    try {
      setIsLoading(true);
      const params: any = {
        page: page.toString(),
        limit: '10',
        search: searchQuery,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        visaType: selectedVisaType === 'all' ? undefined : selectedVisaType,
        arrivalDateFrom,
        arrivalDateTo,
      };
      
      const response = await umrahVisaAPI.getBookings(params);
      const flattenedBookings = (response.data.bookings || []).map((b: any) => {
        const mainTravel = b.travelDetails?.find((t: any) => !t.isAlternate);
        if (mainTravel) {
          b.arrivalDate = mainTravel.arrivalDateTime;
          b.departureDate = mainTravel.departureDateTime;
          b.arrivalFlightNumber = mainTravel.arrivalFlightNumber;
        }
        return b;
      });
      setBookings(flattenedBookings);
      setPagination(response.data.pagination);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') setSelectedStatus(value);
    else if (key === 'visaType') setSelectedVisaType(value);
    else if (key === 'search') setSearchQuery(value);
    else if (key === 'dateFrom') setArrivalDateFrom(value);
    else if (key === 'dateTo') setArrivalDateTo(value);
    
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusCounts = () => {
    return {
      all: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      documents_downloaded: bookings.filter(b => b.status === 'documents_downloaded').length,
      group_assigned: bookings.filter(b => b.status === 'group_assigned').length,
      voucher: bookings.filter(b => b.status === 'voucher').length,
      bill: bookings.filter(b => b.status === 'bill').length,
      booking_success: bookings.filter(b => b.status === 'booking_success').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
    };
  };

  const getVisaTypeCounts = () => {
    return {
      all: bookings.length,
      individual_visa: bookings.filter(b => b.visaType === 'individual_visa').length,
      group_visa: bookings.filter(b => b.visaType === 'group_visa').length,
    };
  };

  const handleDeleteBooking = async (bookingId: string, partyName: string) => {
    if (!confirm(`Are you sure you want to delete this booking for ${partyName}?`)) {
      return;
    }

    try {
      await umrahVisaAPI.deleteBooking(bookingId);
      toast.success('Booking deleted successfully');
      fetchBookings();
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      toast.error(error?.response?.data?.error || 'Failed to delete booking');
    }
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


  const statusCounts = getStatusCounts();

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Umrah Visa Bookings</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5 font-medium">Manage all Umrah visa bookings</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => router.push('/dashboard/umrah-visa/create-individual')}
                className="flex items-center gap-2 font-bold"
              >
                <PlusCircle className="h-4 w-4" />
                Individual Booking
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => router.push('/dashboard/umrah-visa/create-group')}
                className="flex items-center gap-2 font-bold"
              >
                <Users className="h-4 w-4" />
                Group Booking
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => router.push('/dashboard/umrah-visa/add-to-existing-booking')}
                className="flex items-center gap-2 font-bold"
              >
                <UserPlus className="h-4 w-4" />
                Add to Existing
              </Button>
              <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
              <Button onClick={fetchBookings} variant="outline" size="sm" className="flex items-center gap-2 font-bold">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8">
          <Card>
              <CardContent className="space-y-4">
                {/* Search Bar and Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div className="relative md:col-span-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      placeholder="Search bookings..."
                      value={searchQuery}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedVisaType} onValueChange={(val) => handleFilterChange('visaType', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Visa Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Visa Types</SelectItem>
                      <SelectItem value="individual_visa">Individual Visa</SelectItem>
                      <SelectItem value="group_visa">Group Visa</SelectItem>
                    </SelectContent>
                  </Select>
                  <DatePicker
                    value={arrivalDateFrom}
                    onChange={(val) => handleFilterChange('dateFrom', fromDisplayDate(val))}
                    placeholder="Arrival From"
                  />
                  <DatePicker
                    value={arrivalDateTo}
                    onChange={(val) => handleFilterChange('dateTo', fromDisplayDate(val))}
                    placeholder="Arrival To"
                  />
                </div>

                {/* Booking Count */}
                <div className="text-sm text-gray-600">
                  Showing {bookings.length} of {pagination.total} bookings
                </div>

                {/* Status Filter Tabs */}
                <div className="flex flex-wrap gap-2 pb-4 border-b">
                  <Button
                    variant={selectedStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('status', 'all')}
                  >
                    All {stats ? `(${stats.total})` : ''}
                  </Button>
                  {Object.entries(UMRAH_VISA_STATUS_CONFIG).map(([status, config]) => (
                    <Button
                      key={status}
                      variant={selectedStatus === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('status', status)}
                    >
                      {config.label} {stats && stats[status] !== undefined ? `(${stats[status]})` : ''}
                    </Button>
                  ))}
                </div>
                          
                {/* Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Visa Type</TableHead>
                        <TableHead className="w-[120px]">Reference</TableHead>
                        <TableHead className="w-[220px]">Party Details</TableHead>
                        <TableHead className="w-[150px]">Group Details</TableHead>
                        <TableHead className="w-[120px]">Passengers</TableHead>
                        <TableHead className="w-[150px]">Travel Dates</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="w-[220px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : bookings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">No bookings found</TableCell>
                        </TableRow>
                      ) : (
                        bookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <Badge className={`${VISA_TYPE_CONFIG[booking.visaType as keyof typeof VISA_TYPE_CONFIG]?.color || 'bg-gray-100'} text-xs`}>
                                {VISA_TYPE_CONFIG[booking.visaType as keyof typeof VISA_TYPE_CONFIG]?.label || booking.visaType || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-primary text-xs whitespace-nowrap">
                                {booking.bookingReference || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-semibold text-gray-900">{booking.party?.partyName}</div>
                                <div className="text-xs text-gray-500">{booking.party?.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{booking.groupNumber || 'Not Assigned'}</div>
                                <div className="text-xs text-gray-500">{booking.groupName || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{booking.passengerCount}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs space-y-1">
                                <div className="font-bold text-secondary">
                                  {booking.arrivalFlightNumber || 'N/A'}
                                </div>
                                <div className="flex flex-col text-gray-500">
                                  <span>Arr: {booking.arrivalDate ? formatDate(booking.arrivalDate) : 'N/A'}</span>
                                  <span>Dep: {booking.departureDate ? formatDate(booking.departureDate) : 'N/A'}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${UMRAH_VISA_STATUS_CONFIG[booking.status as keyof typeof UMRAH_VISA_STATUS_CONFIG]?.color || 'bg-gray-100'} text-xs`}>
                                {UMRAH_VISA_STATUS_CONFIG[booking.status as keyof typeof UMRAH_VISA_STATUS_CONFIG]?.label || booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                                  onClick={() => router.push(`/dashboard/umrah-visa/visa-management/view/${booking.id}`)}
                                  className="flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadBookingPDF(booking)}
                                  disabled={downloadingId === booking.id}
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                >
                                  {downloadingId === booking.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Download className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push(`/dashboard/umrah-visa/visa-management/edit/${booking.id}`)}
                                  className="flex items-center gap-1"
                                  title="Edit Booking"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Button>
                                {booking.status === 'voucher' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      // Find the voucher associated with this booking if possible, 
                                      // or redirect to voucher search with the reference
                                      router.push(`/dashboard/services/voucher?search=${booking.bookingReference || ''}`);
                                    }}
                                    className="flex items-center gap-1 text-secondary border-secondary/20 hover:bg-secondary/5"
                                    title="Go to Voucher Management"
                                  >
                                    <Ticket className="h-3 w-3" />
                                    Voucher
                                  </Button>
                                )}
                            <Button
                                  size="sm"
                              variant="outline"
                                  onClick={() => handleDeleteBooking(booking.id, booking.party?.partyName || 'Unknown')}
                                  className="text-primary hover:text-destructive hover:bg-destructive/5"
                            >
                                  <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                            </TableCell>
                          </TableRow>
                        ))
              )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-500">
                    Showing {pagination.total > 0 ? ((pagination.page - 1) * 10) + 1 : 0} to{' '}
                    {Math.min(pagination.page * 10, pagination.total)} of{' '}
                    {pagination.total} results
                  </p>
                  
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
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
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ViewUmrahVisaDialog
        bookingId={selectedBookingId}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
}
