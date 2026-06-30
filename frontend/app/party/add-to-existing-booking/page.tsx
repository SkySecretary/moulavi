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

interface UploaderBoxProps {
  label: string;
  description: string;
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

const UploaderBox: React.FC<UploaderBoxProps> = ({
  label,
  description,
  files,
  onChange,
  accept = "image/*,.pdf,.zip,.heic,.heif,.webp",
  multiple = true
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (multiple) {
        onChange([...files, ...selected]);
      } else {
        onChange(selected.slice(0, 1));
      }
    }
  };

  const removeFile = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <Card className="border border-gray-150 p-4 bg-white rounded-xl shadow-sm space-y-3">
      <div>
        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">{label}</Label>
        <span className="text-[10px] text-gray-400 mt-0.5 block">{description}</span>
      </div>
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center min-h-[80px]"
      >
        <input 
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        <UploadCloud className="h-5 w-5 text-gray-400 mb-1" />
        <span className="text-[10px] font-bold text-gray-600 uppercase">Click to select files</span>
      </div>
      {files.length > 0 && (
        <div className="space-y-1.5 pt-1.5 border-t border-gray-100 max-h-40 overflow-y-auto">
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
              <span className="font-semibold text-gray-700 truncate max-w-[85%]">{file.name}</span>
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

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
  
  // Categorized upload files state
  const [passportCopies, setPassportCopies] = useState<File[]>([]);
  const [passengerPhotos, setPassengerPhotos] = useState<File[]>([]);
  const [panCardCopies, setPanCardCopies] = useState<File[]>([]);
  const [onwardTickets, setOnwardTickets] = useState<File[]>([]);
  const [returnTickets, setReturnTickets] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.existingBookingId || !formData.newGroupNumber || !formData.newGroupName || !formData.passengerCount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const totalFilesUploaded = 
      passportCopies.length + 
      passengerPhotos.length + 
      panCardCopies.length + 
      onwardTickets.length + 
      returnTickets.length + 
      (zipFile ? 1 : 0);

    if (totalFilesUploaded === 0) {
      toast.error('Please upload at least one document (Passport copies, PAN copies, Passenger photos, onward/return flight tickets, or ZIP)');
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
      
      passportCopies.forEach(file => formDataToSend.append('passportCopies', file));
      passengerPhotos.forEach(file => formDataToSend.append('passengerPhotos', file));
      panCardCopies.forEach(file => formDataToSend.append('panCardCopies', file));
      onwardTickets.forEach(file => formDataToSend.append('onwardTickets', file));
      returnTickets.forEach(file => formDataToSend.append('returnTickets', file));
      if (zipFile) {
        formDataToSend.append('panCardZipFile', zipFile);
      }

      await umrahVisaAPI.addToExistingBooking(formDataToSend);

      toast.success('Group added to existing booking successfully and internal duplicate booking created!');
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

              {/* Document Upload divided into categories */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-gray-900 block border-b pb-1">Document Uploads (Add to Existing)</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UploaderBox
                    label="Passport Copies"
                    description="Upload front and back pages of all passenger passports."
                    files={passportCopies}
                    onChange={setPassportCopies}
                  />

                  <UploaderBox
                    label="Passenger Photos"
                    description="Upload white background passport sized photos."
                    files={passengerPhotos}
                    onChange={setPassengerPhotos}
                  />

                  <UploaderBox
                    label="PAN Card Copies"
                    description="Upload PAN card copies of the passengers."
                    files={panCardCopies}
                    onChange={setPanCardCopies}
                  />

                  <UploaderBox
                    label="Onward Flight Tickets"
                    description="Upload onward flight tickets or itineraries."
                    files={onwardTickets}
                    onChange={setOnwardTickets}
                  />

                  <UploaderBox
                    label="Return Flight Tickets"
                    description="Upload return flight tickets or itineraries."
                    files={returnTickets}
                    onChange={setReturnTickets}
                  />

                  <UploaderBox
                    label="Other / PAN ZIP File"
                    description="Upload single zip file containing PAN cards or other files."
                    files={zipFile ? [zipFile] : []}
                    onChange={(files) => setZipFile(files[0] || null)}
                    multiple={false}
                    accept=".zip,application/zip"
                  />
                </div>
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

