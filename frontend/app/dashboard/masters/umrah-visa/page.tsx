'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaMasterAPI } from '@/lib/api';
import { Calendar, Save, Loader2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { fromDisplayDate, toDisplayDate } from '@/lib/umrah/validation';

interface UmrahVisaMaster {
  id: string;
  lastArrivalDate: string;
  lastDepartureDate: string;
  isActive: boolean;
}

export default function UmrahVisaMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [master, setMaster] = useState<UmrahVisaMaster | null>(null);
  const [formData, setFormData] = useState({
    lastArrivalDate: '',
    lastDepartureDate: '',
  });

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }

    // Load master dates once on mount
    const loadMasterDates = async () => {
      try {
        setLoading(true);
        const response = await umrahVisaMasterAPI.getDates();
        const masterData = response.data.umrahVisaMaster;
        
        if (masterData) {
          setMaster(masterData);
          setFormData({
            lastArrivalDate: toDisplayDate(masterData.lastArrivalDate),
            lastDepartureDate: toDisplayDate(masterData.lastDepartureDate),
          });
        }
      } catch (error: any) {
        console.error('Error loading master dates:', error);
        toast.error(error.response?.data?.error || 'Failed to load master dates');
      } finally {
        setLoading(false);
      }
    };

    loadMasterDates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lastArrivalDate || !formData.lastDepartureDate) {
      toast.error('Please fill in both dates');
      return;
    }

    // Validate dates
    const arrivalDate = new Date(fromDisplayDate(formData.lastArrivalDate));
    const departureDate = new Date(fromDisplayDate(formData.lastDepartureDate));

    if (isNaN(arrivalDate.getTime()) || isNaN(departureDate.getTime())) {
      toast.error('Invalid date format');
      return;
    }

    try {
      setSaving(true);
      const response = await umrahVisaMasterAPI.updateDates({
        lastArrivalDate: fromDisplayDate(formData.lastArrivalDate),
        lastDepartureDate: fromDisplayDate(formData.lastDepartureDate),
      });
      
      // Update local state with the response
      const updatedMaster = response.data.umrahVisaMaster;
      if (updatedMaster) {
        setMaster(updatedMaster);
      }
      
      toast.success('Master dates updated successfully');
    } catch (error: any) {
      console.error('Error updating master dates:', error);
      toast.error(error.response?.data?.error || 'Failed to update master dates');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex-1">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Umrah Visa Master</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Manage last allowed arrival and departure dates for Umrah visa bookings
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <CardTitle>Date Limits</CardTitle>
            </div>
            <CardDescription>
              Set the maximum allowed arrival and departure dates for Umrah visa bookings. 
              Bookings with dates exceeding these limits will be rejected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="h-20 bg-gray-200 animate-pulse rounded" />
                <div className="h-20 bg-gray-200 animate-pulse rounded" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="lastArrivalDate">
                    Last Allowed Arrival Date *
                  </Label>
                  <DatePicker
                    value={formData.lastArrivalDate}
                    onChange={(v) =>
                      setFormData({ ...formData, lastArrivalDate: v })
                    }
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500">
                    Bookings with arrival dates after this date will be rejected
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastDepartureDate">
                    Last Allowed Departure Date *
                  </Label>
                  <DatePicker
                    value={formData.lastDepartureDate}
                    onChange={(v) =>
                      setFormData({ ...formData, lastDepartureDate: v })
                    }
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500">
                    Bookings with departure dates after this date will be rejected
                  </p>
                </div>

                {master && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Current Settings:</strong> Arrival limit: {toDisplayDate(master.lastArrivalDate)}, 
                      Departure limit: {toDisplayDate(master.lastDepartureDate)}
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving || loading}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
