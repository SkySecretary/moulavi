'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { umrahVisaAPI, partyAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Hash, Users, Loader2, Building } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddGroupNumberDialogProps {
  booking: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddGroupNumberDialog({ 
  booking, 
  open, 
  onOpenChange, 
  onSuccess 
}: AddGroupNumberDialogProps) {
  const [groupNumber, setGroupNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  const [brn, setBrn] = useState('');
  const [umrahVisaProviderId, setUmrahVisaProviderId] = useState('');
  const [umrahCompanies, setUmrahCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (booking && open) {
      setGroupNumber(booking.groupNumber || '');
      setGroupName(booking.groupName || '');
      setBrn(booking.brn || '');
      setUmrahVisaProviderId(booking.umrahVisaProviderId || '');
      loadUmrahCompanies();
    }
  }, [booking, open]);

  const loadUmrahCompanies = async () => {
    try {
      const response = await partyAPI.getAll({ 
        is_supplier: 'true', 
        supplier_service_type: 'umra_visa_service',
        limit: '1000' 
      });
      setUmrahCompanies(response.data?.parties || response.data || []);
    } catch (error) {
      console.error('Error loading umrah companies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupNumber.trim()) {
      toast.error('Group number is required');
      return;
    }
    
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    
    try {
      setLoading(true);
      await umrahVisaAPI.updateGroupNumber(
        booking.id, 
        groupNumber.trim(), 
        groupName.trim(), 
        brn.trim(),
        umrahVisaProviderId
      );
      toast.success('Booking info updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating group number:', error);
      toast.error(error?.response?.data?.error || 'Failed to update group number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {booking?.groupNumber ? 'Update Group Number' : 'Add Group Number'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupNumber">
                <div className="flex items-center">
                  <Hash className="h-4 w-4 mr-1" />
                  Group Number *
                </div>
              </Label>
              <Input
                id="groupNumber"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
                placeholder="Enter group number"
                disabled={loading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="groupName">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  Group Name *
                </div>
              </Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brn">
                <div className="flex items-center">
                  <Hash className="h-4 w-4 mr-1" />
                  BRN
                </div>
              </Label>
              <Input
                id="brn"
                value={brn}
                onChange={(e) => setBrn(e.target.value)}
                placeholder="Enter BRN"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="umrahCompany">
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-1" />
                  Umrah Company
                </div>
              </Label>
              <Select 
                value={umrahVisaProviderId} 
                onValueChange={setUmrahVisaProviderId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Umrah Company" />
                </SelectTrigger>
                <SelectContent>
                  {umrahCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.partyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {booking && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Booking:</span> {booking.bookingReference || booking.id.slice(0, 8)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Party:</span> {booking.party?.partyName || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Passengers:</span> {booking.passengerCount}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                booking?.groupNumber ? 'Update' : 'Add'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

