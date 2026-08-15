'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Search, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import api, { locationMasterAPI, transportRouteMasterAPI } from '@/lib/api';

interface TourPackage {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  makkahNights: number;
  madinahNights: number;
  makkahHotelId: string;
  madinahHotelId: string;
  transportRouteId: string;
  flightCost: string;
  baseCost: string;
  price: string;
  isActive: boolean;
  makkahHotel?: { name: string };
  madinahHotel?: { name: string };
}

export default function B2CPackagesPage() {
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TourPackage | null>(null);

  // Selector Masters
  const [hotels, setHotels] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationDays: 7,
    makkahNights: 4,
    madinahNights: 3,
    makkahHotelId: '',
    madinahHotelId: '',
    transportRouteId: '',
    flightCost: '600',
    baseCost: '1000',
    price: '1400',
  });

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await api.get('/b2c/packages');
      if (res.data?.success) {
        setPackages(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load B2C packages: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [hotelsRes, routesRes] = await Promise.all([
        locationMasterAPI.getAll({ limit: 100 }),
        transportRouteMasterAPI.getAll({ limit: 100 }),
      ]);
      
      const allLocations = hotelsRes.data?.data?.locationMasters || hotelsRes.data?.data || [];
      const hotelList = allLocations.filter((loc: any) => loc.locationType === 'HOTEL' || loc.locationType === 'hotel');
      setHotels(hotelList);

      const routeList = routesRes.data?.data?.transportRouteMasters || routesRes.data?.data || [];
      setRoutes(routeList);
    } catch (err: any) {
      console.error('Failed to fetch selector masters:', err.message);
    }
  };

  useEffect(() => {
    fetchPackages();
    fetchMasters();
  }, []);

  const handleEdit = (pkg: TourPackage) => {
    setEditingPackage(pkg);
    setFormData({
      title: pkg.title,
      description: pkg.description,
      durationDays: pkg.durationDays,
      makkahNights: pkg.makkahNights,
      madinahNights: pkg.madinahNights,
      makkahHotelId: pkg.makkahHotelId,
      madinahHotelId: pkg.madinahHotelId,
      transportRouteId: pkg.transportRouteId,
      flightCost: String(pkg.flightCost),
      baseCost: String(pkg.baseCost),
      price: String(pkg.price),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      const res = await api.delete(`/b2c/packages/${id}`);
      if (res.data?.success) {
        toast.success('Package deleted successfully');
        fetchPackages();
      }
    } catch (err: any) {
      toast.error('Failed to delete package: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleStatus = async (pkg: TourPackage) => {
    try {
      const res = await api.put(`/b2c/packages/${pkg.id}`, { isActive: !pkg.isActive });
      if (res.data?.success) {
        toast.success(pkg.isActive ? 'Package deactivated' : 'Package activated');
        fetchPackages();
      }
    } catch (err: any) {
      toast.error('Status update failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.makkahHotelId || !formData.madinahHotelId || !formData.transportRouteId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        durationDays: Number(formData.durationDays),
        makkahNights: Number(formData.makkahNights),
        madinahNights: Number(formData.madinahNights),
        flightCost: Number(formData.flightCost),
        baseCost: Number(formData.baseCost),
        price: Number(formData.price),
      };

      const res = editingPackage
        ? await api.put(`/b2c/packages/${editingPackage.id}`, payload)
        : await api.post('/b2c/packages', payload);

      if (res.data?.success) {
        toast.success(editingPackage ? 'Package updated successfully' : 'Package created successfully');
        setShowForm(false);
        setEditingPackage(null);
        fetchPackages();
        // Reset Form
        setFormData({
          title: '',
          description: '',
          durationDays: 7,
          makkahNights: 4,
          madinahNights: 3,
          makkahHotelId: '',
          madinahHotelId: '',
          transportRouteId: '',
          flightCost: '600',
          baseCost: '1000',
          price: '1400',
        });
      }
    } catch (err: any) {
      toast.error('Failed to save package: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredPackages = packages.filter((pkg) =>
    pkg.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary">B2C Tour Packages</h1>
          <p className="text-muted-foreground text-sm">Manage readymade packages offered directly to retail consumers.</p>
        </div>
        <Button onClick={() => { setEditingPackage(null); setShowForm(true); }} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Tour Package
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search package title..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : filteredPackages.length === 0 ? (
        <Card className="p-8 text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle>No Packages Found</CardTitle>
          <CardDescription className="mt-2">Add a package itinerary to launch direct channel sales.</CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <Card key={pkg.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold text-secondary line-clamp-1">{pkg.title}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`text-xs ${pkg.isActive ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'}`}
                    onClick={() => handleToggleStatus(pkg)}
                  >
                    {pkg.isActive ? 'Active' : 'Draft'}
                  </Button>
                </div>
                <CardDescription className="line-clamp-2 text-xs">{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Makkah Stay:</span>
                    <span className="font-semibold">{pkg.makkahNights} Nights</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Madinah Stay:</span>
                    <span className="font-semibold">{pkg.madinahNights} Nights</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">B2C Retail Price:</span>
                    <span className="font-bold text-primary">{pkg.price} SAR</span>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(pkg)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(pkg.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Slideout Form Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="overflow-y-auto max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingPackage ? 'Edit Tour Package' : 'Create Tour Package'}</SheetTitle>
            <SheetDescription>Configure package services, hotels, and retail prices.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6 pb-8">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Package Title</label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                placeholder="e.g. Deluxe 10-Day Kaaba View"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Description</label>
              <Input 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Brief summary of hotels, transport, and visas"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold">Duration (Days)</label>
                <Input 
                  type="number" 
                  value={formData.durationDays} 
                  onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value, 10) })} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold">Makkah Nights</label>
                <Input 
                  type="number" 
                  value={formData.makkahNights} 
                  onChange={(e) => setFormData({ ...formData, makkahNights: parseInt(e.target.value, 10) })} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold">Madinah Nights</label>
                <Input 
                  type="number" 
                  value={formData.madinahNights} 
                  onChange={(e) => setFormData({ ...formData, madinahNights: parseInt(e.target.value, 10) })} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Makkah Hotel Allotment</label>
              <select 
                className="w-full border rounded-lg p-2 text-sm bg-white"
                value={formData.makkahHotelId}
                onChange={(e) => setFormData({ ...formData, makkahHotelId: e.target.value })}
                required
              >
                <option value="">Select Hotel...</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} ({h.city})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Madinah Hotel Allotment</label>
              <select 
                className="w-full border rounded-lg p-2 text-sm bg-white"
                value={formData.madinahHotelId}
                onChange={(e) => setFormData({ ...formData, madinahHotelId: e.target.value })}
                required
              >
                <option value="">Select Hotel...</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} ({h.city})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Tafweej Transport Route</label>
              <select 
                className="w-full border rounded-lg p-2 text-sm bg-white"
                value={formData.transportRouteId}
                onChange={(e) => setFormData({ ...formData, transportRouteId: e.target.value })}
                required
              >
                <option value="">Select Transport Route...</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.routeType} (Cities: {[r.city1?.cityName, r.city2?.cityName, r.city3?.cityName].filter(Boolean).join(' → ')})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold">Flight Cost (SAR)</label>
                <Input 
                  type="number" 
                  value={formData.flightCost} 
                  onChange={(e) => setFormData({ ...formData, flightCost: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold">Base Cost (SAR)</label>
                <Input 
                  type="number" 
                  value={formData.baseCost} 
                  onChange={(e) => setFormData({ ...formData, baseCost: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold">Retail Price (SAR)</label>
                <Input 
                  type="number" 
                  value={formData.price} 
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })} 
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingPackage ? 'Save Changes' : 'Publish Package'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
