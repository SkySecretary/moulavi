'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUser, hasRole } from '@/lib/auth';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { UploadCloud, File, X, Hash } from 'lucide-react';
import { umrahVisaAPI } from '@/lib/api';
import { DisclaimerDialog } from '@/components/umrah-booking/shared/DisclaimerDialog';

interface UmrahVisaBooking {
  id: string;
  groupNumber?: string;
  groupName?: string;
  bookingReference?: string;
  passengerCount: number;
  status: string;
  visaType?: 'individual_visa' | 'group_visa';
  createdAt: string;
}

export default function AddToExistingBookingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [bookings, setBookings] = useState<UmrahVisaBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [formData, setFormData] = useState({
    existingBookingId: '',
    newGroupNumber: '',
    newGroupName: '',
    passengerCount: '',
  });
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    setUser(currentUser);
    
    if (!currentUser || !hasRole('party')) {
      router.push('/');
      return;
    }

    loadBookings();
  }, [router]);

  const loadBookings = async () => {
    try {
      setLoadingBookings(true);
      const response = await umrahVisaAPI.getBookings({ page: 1, limit: 1000 });
      const allBookings = response.data.bookings || [];
      // Filter to only show group bookings
      const groupBookings = allBookings.filter((booking: UmrahVisaBooking) => 
        booking.visaType === 'group_visa'
      );
      setBookings(groupBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const isValidZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');
    
    if (!isValidZip) {
      toast.error('Please upload a ZIP file (.zip) containing all PAN cards');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 50MB limit. Please compress your files.');
      return;
    }

    setZipFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setZipFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.existingBookingId || !formData.newGroupNumber || !formData.newGroupName || !formData.passengerCount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!zipFile) {
      toast.error('Please upload a ZIP file containing PAN cards');
      return;
    }

    const passengerCountNum = parseInt(formData.passengerCount);
    if (isNaN(passengerCountNum) || passengerCountNum < 1 || passengerCountNum > 50) {
      toast.error('Passenger count must be between 1 and 50');
      return;
    }

    try {
      setLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append('existingBookingId', formData.existingBookingId);
      formDataToSend.append('newGroupNumber', formData.newGroupNumber);
      formDataToSend.append('newGroupName', formData.newGroupName);
      formDataToSend.append('passengerCount', formData.passengerCount);
      formDataToSend.append('panCardZipFile', zipFile);

      await umrahVisaAPI.addToExistingBooking(formDataToSend);

      toast.success('Group added to existing booking successfully!');
      router.push('/party/dashboard');
    } catch (error: any) {
      console.error('Error adding group to existing booking:', error);
      toast.error(error.response?.data?.error || 'Failed to add group to existing booking');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !user) {
    return null;
  }

  return (
      <PartyLayout 
        title="Add to Existing Booking" 
        subtitle="Add a new group to an existing booking"
      >
        <div className="p-4 sm:p-6">
        <DisclaimerDialog 
          open={showDisclaimer} 
          onConfirm={() => setShowDisclaimer(false)} 
        />
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-lg lg:text-xl">Add Group to Existing Booking</CardTitle>
            <CardDescription className="text-sm lg:text-base">
              Enter the new group details and select which existing booking to add this group to
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
              {/* Select Existing Booking */}
              <div className="space-y-2">
                <Label htmlFor="existingBookingId">Select Existing Booking *</Label>
                {loadingBookings ? (
                  <div className="text-sm text-gray-500 py-2">Loading bookings...</div>
                ) : bookings.length === 0 ? (
                  <div className="text-sm text-gray-500 py-2">No group bookings found. Please create a group booking first.</div>
                ) : (
                  <Select
                    value={formData.existingBookingId}
                    onValueChange={(value) => setFormData({ ...formData, existingBookingId: value })}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a booking" />
                    </SelectTrigger>
                    <SelectContent>
                      {bookings.map((booking) => (
                        <SelectItem key={booking.id} value={booking.id}>
                          {booking.bookingReference || booking.groupNumber || booking.id.slice(0, 8)} - {booking.groupName || 'No group name'} ({booking.passengerCount} pax)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* New Group Number */}
              <div className="space-y-2">
                <Label htmlFor="newGroupNumber">New Group Number *</Label>
                <Input
                  id="newGroupNumber"
                  value={formData.newGroupNumber}
                  onChange={(e) => setFormData({ ...formData, newGroupNumber: e.target.value })}
                  placeholder="e.g., 445566"
                  required
                />
              </div>

              {/* New Group Name */}
              <div className="space-y-2">
                <Label htmlFor="newGroupName">New Group Name *</Label>
                <Input
                  id="newGroupName"
                  value={formData.newGroupName}
                  onChange={(e) => setFormData({ ...formData, newGroupName: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
              </div>

              {/* Number of Passengers */}
              <div className="space-y-2">
                <Label htmlFor="passengerCount">Number of Passengers *</Label>
                <Input
                  id="passengerCount"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.passengerCount}
                  onChange={(e) => setFormData({ ...formData, passengerCount: e.target.value })}
                  placeholder="Enter number of passengers"
                  required
                />
              </div>

              {/* Document Upload */}
              <div className="space-y-2">
                <Label>PAN Cards ZIP File *</Label>
                {!zipFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 lg:p-12 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 bg-gray-50 hover:border-secondary/40 hover:bg-secondary/5'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    
                    <div className="flex flex-col items-center justify-center space-y-3 lg:space-y-4">
                      <UploadCloud className={`w-12 h-12 lg:w-16 lg:h-16 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
                      <div>
                        <p className="text-base lg:text-lg font-black text-primary mb-1 uppercase tracking-tighter italic">
                          {isDragging ? 'Release to Initialize' : 'Initialize Asset Upload'}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          Tactical ZIP package required (MAX. 50MB)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 lg:p-6 border-2 border-emerald-500/20 bg-emerald-50/30 rounded-2xl shadow-xl shadow-emerald-500/5 animate-in zoom-in-95">
                    <div className="flex items-center space-x-4 lg:space-x-6 min-w-0 flex-1">
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-emerald-100">
                        <File className="h-6 w-6 lg:h-8 lg:w-8 text-emerald-600 flex-shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-primary text-sm lg:text-lg truncate uppercase italic">{zipFile.name}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">
                          Payload: {(zipFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-destructive hover:text-white hover:bg-destructive transition-all flex-shrink-0 ml-2 rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest"
                    >
                      Flush
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-secondary/10">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 transition-all active:scale-[0.97]"
                >
                  {loading ? 'Synchronizing...' : 'Execute Deployment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PartyLayout>
  );
}

