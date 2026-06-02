'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { locationMasterAPI, countryMasterAPI, cityMasterAPI } from '@/lib/api';
import { toast } from 'sonner';

interface QuickAddHotelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hotelId: string) => void;
  initialCityId?: string;
}

export const QuickAddHotelDialog: React.FC<QuickAddHotelDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCityId,
}) => {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    countryId: '',
    cityId: initialCityId || '',
    cityName: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadCountries();
      if (initialCityId) {
        setFormData(prev => ({ ...prev, cityId: initialCityId }));
      }
    }
  }, [isOpen, initialCityId]);

  const loadCountries = async () => {
    try {
      const res = await countryMasterAPI.getActive();
      const countryList = res.data?.data?.countryMasters || res.data?.countryMasters || [];
      setCountries(countryList);
      
      // Auto-select Saudi Arabia if available
      const saudi = countryList.find((c: any) => 
        c.countryName.toLowerCase().includes('saudi') || 
        c.countryCode === 'SA'
      );
      if (saudi && !formData.countryId) {
        setFormData(prev => ({ ...prev, countryId: saudi.id }));
      }
    } catch (err) {
      console.error('Failed to load countries', err);
    }
  };

  const loadCities = async (countryId: string) => {
    try {
      const res = await cityMasterAPI.getActive({ countryId });
      const cityList = res.data?.cityMasters || [];
      setCities(cityList);
      
      if (initialCityId) {
        const currentCity = cityList.find((c: any) => c.id === initialCityId);
        if (currentCity) {
          setFormData(prev => ({ ...prev, cityName: currentCity.name }));
        }
      }
    } catch (err) {
      console.error('Failed to load cities', err);
    }
  };

  useEffect(() => {
    if (formData.countryId) {
      loadCities(formData.countryId);
    } else {
      setCities([]);
    }
  }, [formData.countryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedCity = cities.find(c => c.id === formData.cityId);
    const cityName = selectedCity?.name || formData.cityName;

    if (!formData.name || !formData.cityId || !formData.countryId || !cityName) {
      toast.error('Please fill in all required fields (Name, Country, City)');
      return;
    }

    try {
      setLoading(true);
      const res = await locationMasterAPI.create({
        name: formData.name,
        code: formData.code || formData.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100),
        locationType: 'HOTEL',
        countryId: formData.countryId,
        cityId: formData.cityId,
        city: cityName,
        isActive: true,
      });

      toast.success('Hotel added successfully');
      onSuccess(res.data.locationMaster.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to add hotel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Add Hotel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="hotelName">Hotel Name *</Label>
            <Input
              id="hotelName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter hotel name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hotelCode">Hotel Code (Optional)</Label>
            <Input
              id="hotelCode"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. HILTON-MAK"
            />
          </div>

          <div className="space-y-2">
            <Label>Country *</Label>
            <Select
              value={formData.countryId}
              onValueChange={(val) => setFormData({ ...formData, countryId: val, cityId: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.countryName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>City *</Label>
            <Select
              value={formData.cityId}
              onValueChange={(val) => setFormData({ ...formData, cityId: val })}
              disabled={!formData.countryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Hotel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
