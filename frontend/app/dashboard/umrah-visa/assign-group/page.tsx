'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Search,
  Download,
  Plus,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { UmrahVisaBooking, UmrahVisaStatus, Party } from '@/types';
import { umrahVisaAPI, partyAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AssignGroupPage() {
  const router = useRouter();
  const user = getUser();
  const [bookingList, setBookingList] = useState<UmrahVisaBooking[]>([]);
  const [filteredData, setFilteredData] = useState<UmrahVisaBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddGroupDialog, setShowAddGroupDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<UmrahVisaBooking | null>(null);
  const [groupNumber, setGroupNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  const [umrahVisaProviderId, setUmrahVisaProviderId] = useState('');
  const [umrahVisaProviders, setUmrahVisaProviders] = useState<Party[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [inlineGroupData, setInlineGroupData] = useState<Record<string, { groupNumber: string, groupName: string, providerId: string }>>({});

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  useEffect(() => {
    fetchBookings();
    loadUmrahVisaProviders();
  }, []);

  const loadUmrahVisaProviders = async () => {
    setLoadingProviders(true);
    try {
      const response = await partyAPI.getAll({ 
        supplier_service_type: 'umrah_service',
        limit: 1000 
      });
      setUmrahVisaProviders(response.data.parties || []);
    } catch (error) {
      console.error('Error loading umrah visa providers:', error);
      setUmrahVisaProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    filterData();
    // Initialize inline data for relevant bookings if not already present
    setInlineGroupData(prev => {
      const newInlineData = { ...prev };
      let changed = false;
      bookingList.forEach(booking => {
        if ((booking.status === 'pending' || booking.status === 'documents_downloaded') && !newInlineData[booking.id]) {
          newInlineData[booking.id] = {
            groupNumber: booking.groupNumber || '',
            groupName: booking.groupName || '',
            providerId: booking.umrahVisaProviderId || ''
          };
          changed = true;
        }
      });
      return changed ? newInlineData : prev;
    });
  }, [searchQuery, bookingList]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings({ limit: 1000 });
      const data = response.data;
      
      const bookingsData = data.bookings
        .filter((booking: any) => booking.status === 'pending' || booking.status === 'documents_downloaded')
        .map((booking: any) => booking);

      setBookingList(bookingsData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = bookingList.filter(booking => 
      booking.status === 'pending' || booking.status === 'documents_downloaded'
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.party?.partyName?.toLowerCase().includes(query) ||
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

  const handleDownloadDocuments = async (booking: UmrahVisaBooking) => {
    if (!booking.id) return;
    
    const trackDownload = async () => {
      try {
        await umrahVisaAPI.downloadDocuments(booking.id!);
        toast.success('Documents download tracked successfully!');
        fetchBookings();
      } catch (trackError: any) {
        console.warn('Failed to track download:', trackError);
      }
    };

    try {
      toast.info('Downloading zip file...');
      
      const zipResponse = await umrahVisaAPI.downloadBookingZip(booking.id);
      const blob = zipResponse.data;

      if (blob.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const result = JSON.parse(reader.result as string);
            if (result.downloadUrl) {
              const link = document.createElement('a');
              link.href = result.downloadUrl;
              link.download = result.fileName || `${booking.bookingReference || booking.id}-all-docs.zip`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              await trackDownload();
            } else {
              toast.error(result.error || 'Failed to download zip file');
            }
          } catch (e) {
            toast.error('Failed to parse download response');
          }
        };
        reader.readAsText(blob);
      } else {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = zipResponse.headers['content-disposition'];
        let fileName = booking.bookingReference
          ? `${booking.bookingReference}-all-docs.zip`
          : `booking-documents-${booking.id}.zip`;
          
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
          if (fileNameMatch && fileNameMatch[1]) {
            fileName = fileNameMatch[1];
          }
        }
        
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        
        link.remove();
        window.URL.revokeObjectURL(url);
        await trackDownload();
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to download documents');
    }
  };

  const handleAddGroupData = async () => {
    if (!selectedBooking || !groupNumber || !groupName || !umrahVisaProviderId || !umrahVisaProviderId.trim()) {
      toast.error('Please fill in all fields (Group Number, Name, and Umrah Company)');
      return;
    }

    if (!selectedBooking.id) return;

    try {
      const payload: any = {
        groupNumber, 
        groupName,
        umrahVisaProviderId,
      };
      
      const response = await umrahVisaAPI.addGroupData(selectedBooking.id, payload);
      toast.success('Group data added successfully');
      setShowAddGroupDialog(false);
      setGroupNumber('');
      setGroupName('');
      setUmrahVisaProviderId('');
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add group data');
    }
  };

  const handleInlineAssignGroup = async (booking: UmrahVisaBooking) => {
    const data = inlineGroupData[booking.id];
    const providerId = data?.providerId || booking.umrahVisaProviderId;
    if (!data?.groupNumber || !data?.groupName) {
      toast.error('Please enter both group number and name');
      return;
    }
    if (!providerId) {
      toast.error('Please select an Umrah company (click the "+" button on the right to assign)');
      return;
    }

    try {
      toast.info('Assigning group...');
      const payload: any = {
        groupNumber: data.groupNumber,
        groupName: data.groupName,
        umrahVisaProviderId: providerId
      };
      
      await umrahVisaAPI.addGroupData(booking.id, payload);
      toast.success('Group assigned successfully');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign group');
    }
  };

  const renderActionButton = (booking: UmrahVisaBooking) => {
    if (booking.status === 'pending' || booking.status === 'documents_downloaded') {
      return (
        <div className="flex flex-col gap-2">
          {booking.status === 'pending' && (
            <Button size="sm" onClick={() => handleDownloadDocuments(booking)} className="flex items-center gap-1 w-full justify-start h-8 px-2 text-[10px]">
              <Download className="h-3 w-3" />
              Download Docs
            </Button>
          )}
          <div className="flex items-center gap-1 w-full">
            <Button 
              size="sm" 
              onClick={() => handleInlineAssignGroup(booking)} 
              className="flex-1 flex items-center gap-1 bg-green-600 hover:bg-green-700 h-8 px-2 text-[10px]"
            >
              <Plus className="h-3 w-3" />
              Assign
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => { 
                setSelectedBooking(booking); 
                setGroupNumber(inlineGroupData[booking.id]?.groupNumber || booking.groupNumber || '');
                setGroupName(inlineGroupData[booking.id]?.groupName || booking.groupName || '');
                setUmrahVisaProviderId(inlineGroupData[booking.id]?.providerId || booking.umrahVisaProviderId || '');
                setShowAddGroupDialog(true); 
              }} 
              className="h-8 w-8 p-0"
              title="More Options"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Assign Group</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">Manage pending and documents downloaded bookings</p>
          </div>
          <Button onClick={fetchBookings} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Assign Group</CardTitle>
              <CardDescription>Showing {filteredData.length} of {bookingList.length} bookings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input placeholder="Search by party name, group number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Visa Type</TableHead>
                      <TableHead className="w-[130px]">Reference</TableHead>
                      <TableHead className="w-[200px]">Group Details</TableHead>
                      <TableHead className="w-[180px]">Party Name</TableHead>
                      <TableHead className="w-[180px]">Umrah Company</TableHead>
                      <TableHead className="w-[150px]">Arrival Date</TableHead>
                      <TableHead className="w-[200px]">Downloaded By</TableHead>
                      <TableHead className="w-[150px]">Status</TableHead>
                      <TableHead className="w-[200px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">No bookings found</TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <Badge variant={booking.visaType === 'group_visa' ? 'default' : booking.visaType === 're_entry' ? 'outline' : 'secondary'} className="text-xs">
                              {booking.visaType === 'group_visa' ? 'Group Visa' : booking.visaType === 're_entry' ? 'Re-Entry' : 'Individual Visa'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-primary text-xs whitespace-nowrap">
                              {booking.bookingReference || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {(booking.status === 'pending' || booking.status === 'documents_downloaded') ? (
                              <div className="space-y-2 min-w-[150px]">
                                <Input 
                                  placeholder="Group Number" 
                                  value={inlineGroupData[booking.id]?.groupNumber || ''}
                                  onChange={(e) => setInlineGroupData(prev => ({
                                    ...prev, 
                                    [booking.id]: { ...prev[booking.id], groupNumber: e.target.value }
                                  }))}
                                  className="h-8 text-[11px] font-semibold"
                                />
                                <Input 
                                  placeholder="Group Name" 
                                  value={inlineGroupData[booking.id]?.groupName || ''}
                                  onChange={(e) => setInlineGroupData(prev => ({
                                    ...prev, 
                                    [booking.id]: { ...prev[booking.id], groupName: e.target.value }
                                  }))}
                                  className="h-8 text-[11px]"
                                />
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-semibold">{booking.groupNumber || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{booking.groupName || 'No group'}</div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell><div className="font-medium">{booking.party?.partyName || 'N/A'}</div></TableCell>
                          <TableCell><div className="font-semibold text-xs">{booking.umrahVisaProvider?.partyName || 'N/A'}</div></TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {(() => {
                                const mainTravel = booking.travelDetails?.find(t => !t.isAlternate);
                                return mainTravel?.arrivalDateTime ? formatDate(mainTravel.arrivalDateTime) : 'N/A';
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {booking.documentsDownloadedByUser ? (
                              <div className="space-y-1 text-xs">
                                <div className="font-medium text-gray-900">{booking.documentsDownloadedByUser.name}</div>
                                <div className="text-gray-400">Download #{booking.documentsDownloadCount || 0}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Not downloaded yet</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${UMRAH_VISA_STATUS_CONFIG[booking.status || 'pending'].color} text-xs`}>
                              {UMRAH_VISA_STATUS_CONFIG[booking.status || 'pending'].label}
                            </Badge>
                          </TableCell>
                          <TableCell>{renderActionButton(booking)}</TableCell>
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

      <Dialog open={showAddGroupDialog} onOpenChange={setShowAddGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Group Details</DialogTitle>
            <DialogDescription>Assign group number, name, and umrah visa providing company to this booking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groupNumber">Group Number *</Label>
              <Input id="groupNumber" placeholder="e.g., GRP-2024-001" value={groupNumber} onChange={(e) => setGroupNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="groupName">Group Name *</Label>
              <Input id="groupName" placeholder="e.g., Ramadan Group 2024" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
             <div>
              <Label htmlFor="umrahVisaProviderId">Umrah Visa Providing Company *</Label>
              <Select
                value={umrahVisaProviderId || undefined}
                onValueChange={(value) => setUmrahVisaProviderId(value || '')}
                disabled={loadingProviders}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProviders ? "Loading..." : "Select umrah visa provider"} />
                </SelectTrigger>
                <SelectContent>
                  {umrahVisaProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.partyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddGroupDialog(false);
              setGroupNumber('');
              setGroupName('');
              setUmrahVisaProviderId('');
            }}>Cancel</Button>
            <Button onClick={handleAddGroupData}>Assign Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
