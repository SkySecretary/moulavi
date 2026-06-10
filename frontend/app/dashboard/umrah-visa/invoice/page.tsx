'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Receipt,
  CheckCircle,
  RefreshCw,
  Download,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { UmrahVisaBooking, UmrahVisaStatus } from '@/types';
import { umrahVisaAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';

export default function InvoicePage() {
  const user = getUser();
  const [bookingList, setBookingList] = useState<UmrahVisaBooking[]>([]);
  const [filteredData, setFilteredData] = useState<UmrahVisaBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<UmrahVisaBooking | null>(null);
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [fetchResults, setFetchResults] = useState<any>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [isGeneratingBills, setIsGeneratingBills] = useState(false);

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, bookingList]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings({ limit: 1000 });
      const data = response.data;
      
      const bookingsData = data.bookings
        .filter((booking: any) => booking.status === 'bill')
        .map((booking: any) => booking);

      setBookingList(bookingsData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchFromSheet = async () => {
    try {
      setIsFetchingSheet(true);
      const response = await umrahVisaAPI.fetchFromSheet();
      const data = response.data;
      
      setFetchResults(data);
      setShowResultsDialog(true);
      
      toast.success(`Successfully updated ${data.summary.totalPassengersUpdated} passengers from ${data.summary.totalGroupsProcessed} groups`);
      
      // Refresh bookings after fetch
      await fetchBookings();
    } catch (error: any) {
      console.error('Error fetching from sheet:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to fetch from sheet');
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const filterData = () => {
    let filtered = bookingList.filter(booking => 
      booking.status === 'bill'
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

  const handleGenerateBill = async () => {
    if (!selectedBooking || !selectedBooking.id) return;
    
    try {
      setIsGeneratingBills(true);
      const response = await umrahVisaAPI.generateBill(selectedBooking.id);
      
      // Download the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bill_${selectedBooking.bookingReference || selectedBooking.groupNumber || selectedBooking.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      toast.success('Bill generated successfully');
      setShowGenerateDialog(false);
      setSelectedBooking(null);
      // Refresh data after generation
      handleFetchFromSheet();
    } catch (error: any) {
      console.error('Error generating bill:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to generate bill');
    } finally {
      setIsGeneratingBills(false);
    }
  };

  const handleGenerateBillsForReady = async () => {
    if (!fetchResults || !fetchResults.results) {
      toast.error('No results available');
      return;
    }

    // Filter ready groups
    const readyGroups = fetchResults.results.filter((result: any) => result.isReady && result.bookingId);
    
    if (readyGroups.length === 0) {
      toast.warning('No ready groups to generate bills for');
      return;
    }

    try {
      setIsGeneratingBills(true);
      const bookingIds = readyGroups.map((group: any) => group.bookingId);
      
      const response = await umrahVisaAPI.generateBills(bookingIds);
      const data = response.data;

      // Download PDFs for successful bills
      data.results.forEach((result: any) => {
        if (result.success && result.pdfBase64 && result.fileName) {
          try {
            const byteCharacters = atob(result.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch (downloadError) {
            console.error(`Failed to download PDF for ${result.groupNumber}:`, downloadError);
          }
        }
      });

      // Show summary
      const successCount = data.summary.success;
      const errorCount = data.summary.errors;
      
      if (errorCount > 0) {
        const errorMessages = data.results
          .filter((r: any) => !r.success)
          .map((r: any) => `${r.groupNumber}: ${r.error}`)
          .join('\n');
        
        toast.error(
          `Generated ${successCount} bills successfully, ${errorCount} failed. Check console for details.`,
          { duration: 5000 }
        );
        console.error('Bill generation errors:', errorMessages);
      } else {
        toast.success(`Successfully generated ${successCount} bills and sent emails`);
      }

      // Refresh bookings after generation
      await fetchBookings();
    } catch (error: any) {
      console.error('Error generating bills:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to generate bills');
    } finally {
      setIsGeneratingBills(false);
    }
  };

  const renderActionButton = (booking: UmrahVisaBooking) => {
    if (booking.status === 'bill') {
      return (
        <Button size="sm" onClick={() => { setSelectedBooking(booking); setShowGenerateDialog(true); }} className="flex items-center gap-1">
          <Receipt className="h-3 w-3" />
          Generate Bill
        </Button>
      );
    } else if (booking.status === 'booking_success') {
      return (
        <Badge variant="outline" className="whitespace-nowrap">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Invoice</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">Manage billing and completion status</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleFetchFromSheet} 
                disabled={isFetchingSheet}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isFetchingSheet ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Fetching...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Fetch from Sheet</span>
                  </>
                )}
              </Button>
              <Button onClick={fetchBookings} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8">
            <Card>
              <CardHeader>
                <CardTitle>Invoice</CardTitle>
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
                        <TableHead className="w-[200px]">Group Details</TableHead>
                        <TableHead className="w-[180px]">Party Name</TableHead>
                        <TableHead className="w-[150px]">Arrival Date</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="w-[200px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">No bookings found</TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <Badge variant={booking.visaType === 'group_visa' ? 'default' : 'secondary'} className="text-xs">
                                {booking.visaType === 'group_visa' ? 'Group Visa' : 'Individual Visa'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-semibold">{booking.groupNumber || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{booking.groupName || 'No group'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{booking.party?.partyName || 'N/A'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {(() => {
                                  const mainTravel = booking.travelDetails?.find(t => !t.isAlternate);
                                  return mainTravel?.arrivalDateTime ? formatDate(mainTravel.arrivalDateTime) : 'N/A';
                                })()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${UMRAH_VISA_STATUS_CONFIG[booking.status || 'bill'].color} text-xs`}>
                                {UMRAH_VISA_STATUS_CONFIG[booking.status || 'bill'].label}
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
      </div>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Bill</DialogTitle>
            <DialogDescription>Generate bill for this booking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to generate the bill for this booking? This will create a PDF and send it to the party's email.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)} disabled={isGeneratingBills}>Cancel</Button>
            <Button onClick={handleGenerateBill} disabled={isGeneratingBills}>
              {isGeneratingBills ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : 'Generate Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fetch from Sheet Results</DialogTitle>
            <DialogDescription>Passenger data update summary</DialogDescription>
          </DialogHeader>
          {fetchResults && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Groups Processed</div>
                    <div className="text-lg font-semibold text-gray-900">{fetchResults.summary.totalGroupsProcessed}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Passengers Updated</div>
                    <div className="text-lg font-semibold text-gray-900">{fetchResults.summary.totalPassengersUpdated}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Groups Ignored</div>
                    <div className="text-lg font-semibold text-gray-900">{fetchResults.summary.totalGroupsIgnored}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Group Details:</h4>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group Number</TableHead>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Total Passengers</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fetchResults.results.map((result: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{result.groupNumber}</TableCell>
                          <TableCell>{result.groupName}</TableCell>
                          <TableCell>{result.totalPassengers}</TableCell>
                          <TableCell className="text-green-600">{result.updatedPassengers}</TableCell>
                          <TableCell className={result.pendingPassengers > 0 ? 'text-orange-600' : 'text-gray-600'}>
                            {result.pendingPassengers}
                          </TableCell>
                          <TableCell>
                            {result.isReady ? (
                              <Badge className="bg-green-100 text-green-800 border-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Ready
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex items-center justify-between">
            <div>
              {fetchResults && fetchResults.results && fetchResults.results.filter((r: any) => r.isReady).length > 0 && (
                <Button
                  onClick={handleGenerateBillsForReady}
                  disabled={isGeneratingBills}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isGeneratingBills ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Bills...
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4 mr-2" />
                      Generate Bill for All Ready ({fetchResults.results.filter((r: any) => r.isReady).length})
                    </>
                  )}
                </Button>
              )}
            </div>
            <Button onClick={() => setShowResultsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
