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
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG, VISA_TYPE_CONFIG } from '@/lib/constants';
import ViewUmrahVisaDialog from '@/components/ViewUmrahVisaDialog';

export default function UmrahVisaPage() {
  const router = useRouter();
  const user = getUser();
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVisaType, setSelectedVisaType] = useState<string>('all');
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, selectedStatus, selectedVisaType, bookings]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings();
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = bookings;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === selectedStatus);
    }

    // Filter by visa type
    if (selectedVisaType !== 'all') {
      filtered = filtered.filter(booking => booking.visaType === selectedVisaType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.party?.partyName?.toLowerCase().includes(query) ||
        booking.party?.email?.toLowerCase().includes(query) ||
        booking.groupNumber?.toLowerCase().includes(query) ||
        booking.groupName?.toLowerCase().includes(query)
      );
    }

    setFilteredData(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
                {/* Search Bar and Visa Type Filter */}
                <div className="flex gap-4 items-center mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      placeholder="Search by party name, email, group number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="w-48">
                    <Select value={selectedVisaType} onValueChange={setSelectedVisaType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by Visa Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Visa Types ({getVisaTypeCounts().all})</SelectItem>
                        <SelectItem value="individual_visa">Individual Visa ({getVisaTypeCounts().individual_visa})</SelectItem>
                        <SelectItem value="group_visa">Group Visa ({getVisaTypeCounts().group_visa})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Booking Count */}
                <div className="text-sm text-gray-600">
                  Showing {filteredData.length} of {bookings.length} bookings
                </div>

                {/* Status Filter Tabs */}
                <div className="flex flex-wrap gap-2 pb-4 border-b">
                            <Button
                    variant={selectedStatus === 'all' ? 'default' : 'outline'}
                              size="sm"
                    onClick={() => setSelectedStatus('all')}
                  >
                    All ({statusCounts.all})
                            </Button>
                  {Object.entries(UMRAH_VISA_STATUS_CONFIG).map(([status, config]) => (
                            <Button
                      key={status}
                      variant={selectedStatus === status ? 'default' : 'outline'}
                              size="sm"
                      onClick={() => setSelectedStatus(status)}
                            >
                      {UMRAH_VISA_STATUS_CONFIG[status as keyof typeof UMRAH_VISA_STATUS_CONFIG]?.label || status} ({statusCounts[status as keyof typeof statusCounts]})
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
                          <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">No bookings found</TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((booking) => (
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
                                <div>Arrival: {formatDate(booking.createdAt)}</div>
                                <div>Departure: {formatDate(booking.updatedAt)}</div>
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
                                  onClick={() => router.push(`/dashboard/umrah-visa/visa-management/edit/${booking.id}`)}
                                  className="flex items-center gap-1"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Button>
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
