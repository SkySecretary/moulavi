'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getUser } from '@/lib/auth';
import { hotelInventoryAPI, locationMasterAPI, cityMasterAPI } from '@/lib/api';
import { Plus, Trash2, Edit2, Search, Building2, RefreshCw, Layers } from 'lucide-react';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';

export default function HotelInventoryPage() {
  const router = useRouter();
  const [user] = useState(() => getUser());

  const userHasAccess = useMemo(() => {
    if (!user) return false;
    return ['admin', 'staff'].includes(user.role);
  }, [user]);

  // Inventory data
  const [inventories, setInventories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCityId, setFilterCityId] = useState<string>('all');

  // Master options
  const [cities, setCities] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<any | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState<any | null>(null);

  // Form states
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [brnNumber, setBrnNumber] = useState('');
  const [totalBeds, setTotalBeds] = useState('');
  const [availableBeds, setAvailableBeds] = useState('');

  // Load initial data
  const loadInitialData = async () => {
    if (!userHasAccess) return;
    setLoading(true);
    try {
      // Load Inventories
      const invRes = await hotelInventoryAPI.getAll();
      setInventories(invRes.data || []);

      // Load Cities
      const cityRes = await cityMasterAPI.getActive();
      const cityData = cityRes.data?.cityMasters || cityRes.data || [];
      setCities(Array.isArray(cityData) ? cityData : []);

      // Load Hotels (Location type = HOTEL)
      const locRes = await locationMasterAPI.getActive({ locationType: 'HOTEL' });
      const hotelData = locRes.data?.locationMasters || locRes.data?.data?.locationMasters || locRes.data || [];
      setHotels(Array.isArray(hotelData) ? hotelData : []);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
      toast.error('Failed to load master configuration data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [userHasAccess]);

  // Filtered inventories list
  const filteredInventories = useMemo(() => {
    return inventories.filter((inv) => {
      const hotelName = inv.hotel?.name || '';
      const hotelCity = inv.hotel?.city || '';
      const brn = inv.brnNumber || '';
      
      const matchesSearch = 
        hotelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotelCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brn.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCity = filterCityId === 'all' || inv.hotel?.cityId === filterCityId;

      return matchesSearch && matchesCity;
    });
  }, [inventories, searchTerm, filterCityId]);

  // Dropdown options for hotels based on selected city in Form
  const filteredHotelsForForm = useMemo(() => {
    if (!selectedCityId) return [];
    return hotels.filter((h) => h.cityId === selectedCityId);
  }, [hotels, selectedCityId]);

  // Open Form for Add
  const handleAddOpen = () => {
    setEditingInventory(null);
    setSelectedCityId('');
    setSelectedHotelId('');
    setBrnNumber('');
    setTotalBeds('');
    setAvailableBeds('');
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleEditOpen = (inv: any) => {
    setEditingInventory(inv);
    setSelectedCityId(inv.hotel?.cityId || '');
    setSelectedHotelId(inv.hotelId);
    setBrnNumber(inv.brnNumber);
    setTotalBeds(String(inv.totalBeds));
    setAvailableBeds(String(inv.availableBeds));
    setIsFormOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedHotelId || !brnNumber || !totalBeds) {
      toast.error('Please fill in all required fields');
      return;
    }

    const totalBedsNum = parseInt(totalBeds, 10);
    if (isNaN(totalBedsNum) || totalBedsNum < 0) {
      toast.error('Total beds must be a non-negative number');
      return;
    }

    const payload: any = {
      hotelId: selectedHotelId,
      brnNumber: brnNumber.trim(),
      totalBeds: totalBedsNum,
    };

    try {
      if (editingInventory) {
        // Edit flow
        const availableBedsNum = availableBeds !== '' ? parseInt(availableBeds, 10) : totalBedsNum;
        if (isNaN(availableBedsNum) || availableBedsNum < 0) {
          toast.error('Available beds must be a non-negative number');
          return;
        }
        if (availableBedsNum > totalBedsNum) {
          toast.error('Available beds cannot exceed total beds');
          return;
        }
        
        payload.availableBeds = availableBedsNum;

        await hotelInventoryAPI.update(editingInventory.id, payload);
        toast.success('Inventory record updated successfully');
      } else {
        // Add flow
        await hotelInventoryAPI.create(payload);
        toast.success('Inventory record added successfully');
      }

      setIsFormOpen(false);
      loadInitialData();
    } catch (error: any) {
      console.error('Failed to save inventory:', error);
      toast.error(error.response?.data?.error || 'Failed to save inventory record');
    }
  };

  // Open Delete dialog
  const handleDeleteOpen = (inv: any) => {
    setInventoryToDelete(inv);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!inventoryToDelete) return;
    try {
      await hotelInventoryAPI.delete(inventoryToDelete.id);
      toast.success('Inventory record deleted successfully');
      setDeleteConfirmOpen(false);
      setInventoryToDelete(null);
      loadInitialData();
    } catch (error: any) {
      console.error('Failed to delete inventory:', error);
      toast.error(error.response?.data?.error || 'Failed to delete inventory record');
    }
  };

  if (!userHasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-500">You do not have permission to access the Hotel Inventory master data.</p>
        <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-secondary">Hotel Inventory Master</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Configure hotel lots based on BRN and total beds, and monitor current available inventory counts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadInitialData} variant="outline" size="sm" className="h-9">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={handleAddOpen} size="sm" className="h-9">
            <Plus className="h-4 w-4 mr-2" /> Add Inventory
          </Button>
        </div>
      </div>

      {/* Stats Summary Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Active BRNs</p>
                <h3 className="text-3xl font-extrabold text-secondary mt-1">{inventories.length}</h3>
              </div>
              <Building2 className="h-10 w-10 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Beds Lot Capacity</p>
                <h3 className="text-3xl font-extrabold text-green-700 mt-1">
                  {inventories.reduce((acc, inv) => acc + (inv.totalBeds || 0), 0)}
                </h3>
              </div>
              <Layers className="h-10 w-10 text-green-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Available Beds</p>
                <h3 className="text-3xl font-extrabold text-blue-700 mt-1">
                  {inventories.reduce((acc, inv) => acc + (inv.availableBeds || 0), 0)}
                </h3>
              </div>
              <RefreshCw className="h-10 w-10 text-blue-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card className="border-gray-100 shadow-md">
        <CardHeader className="pb-3 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold text-secondary">Hotel Lot Inventories</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search hotel or BRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              {/* City filter */}
              <Select value={filterCityId} onValueChange={setFilterCityId}>
                <SelectTrigger className="w-full sm:w-44 h-9">
                  <SelectValue placeholder="Filter by City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Loading inventories...</span>
            </div>
          ) : filteredInventories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-medium">No inventory records found</p>
              <p className="text-xs text-gray-400 mt-1">Try resetting filters or add a new hotel inventory lot.</p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm text-left text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider text-xs border-b border-gray-150">
                    <th className="py-3 px-4">Hotel Name</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4 text-center">BRN Code</th>
                    <th className="py-3 px-4 text-center">Total Beds</th>
                    <th className="py-3 px-4 text-center">Available Beds</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInventories.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-secondary">{inv.hotel?.name || 'Unknown Hotel'}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          {inv.hotel?.city || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs font-bold text-gray-800">
                        {inv.brnNumber}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-700">{inv.totalBeds}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            inv.availableBeds === 0
                              ? 'bg-red-100 text-red-800'
                              : inv.availableBeds < (inv.totalBeds * 0.2)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {inv.availableBeds} / {inv.totalBeds} Left
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOpen(inv)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-primary"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOpen(inv)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Sheet Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingInventory ? 'Edit Hotel Inventory' : 'Add Hotel Inventory Lot'}</DialogTitle>
            <DialogDescription>
              {editingInventory
                ? 'Update BRN details and bed capacity counts below.'
                : 'Associate a BRN code with a hotel and specify its initial bed allotment.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* City (Only editable on Add) */}
            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs font-bold text-gray-600 uppercase">City *</Label>
              <Select
                disabled={!!editingInventory}
                value={selectedCityId}
                onValueChange={(val) => {
                  setSelectedCityId(val);
                  setSelectedHotelId(''); // Reset selected hotel
                }}
              >
                <SelectTrigger id="city" className="w-full">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hotel (Only editable on Add) */}
            <div className="space-y-1">
              <Label htmlFor="hotel" className="text-xs font-bold text-gray-600 uppercase">Hotel Name *</Label>
              <Select
                disabled={!!editingInventory || !selectedCityId}
                value={selectedHotelId}
                onValueChange={setSelectedHotelId}
              >
                <SelectTrigger id="hotel" className="w-full">
                  <SelectValue placeholder={selectedCityId ? "Select Hotel" : "First select a city"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredHotelsForForm.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* BRN Code */}
            <div className="space-y-1">
              <Label htmlFor="brn" className="text-xs font-bold text-gray-600 uppercase">BRN / Booking Reference Number *</Label>
              <Input
                id="brn"
                placeholder="e.g. BRN10023482"
                value={brnNumber}
                onChange={(e) => setBrnNumber(e.target.value)}
                required
              />
            </div>

            {/* Capacity Total Beds */}
            <div className="space-y-1">
              <Label htmlFor="totalBeds" className="text-xs font-bold text-gray-600 uppercase">Total Beds Allotted *</Label>
              <Input
                id="totalBeds"
                type="number"
                min="0"
                placeholder="e.g. 50"
                value={totalBeds}
                onChange={(e) => setTotalBeds(e.target.value)}
                required
              />
            </div>

            {/* Available Beds (Only shown on Edit) */}
            {editingInventory && (
              <div className="space-y-1">
                <Label htmlFor="availableBeds" className="text-xs font-bold text-gray-600 uppercase">Available Beds</Label>
                <Input
                  id="availableBeds"
                  type="number"
                  min="0"
                  placeholder="e.g. 45"
                  value={availableBeds}
                  onChange={(e) => setAvailableBeds(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 italic">
                  Note: This will auto-adjust as bookings are assigned. Edit manually only for correction.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingInventory ? 'Update Inventory' : 'Add Inventory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Inventory Lot?"
        description={`Are you sure you want to delete the BRN inventory lot "${inventoryToDelete?.brnNumber}" for "${inventoryToDelete?.hotel?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
