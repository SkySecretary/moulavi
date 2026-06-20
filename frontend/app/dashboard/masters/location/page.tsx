'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { useLocationMaster } from '@/hooks/useLocationMaster';
import LocationStatsCards from '@/components/location/LocationStatsCards';
import LocationTable from '@/components/LocationTable';
import LocationForm from '@/components/location/LocationForm';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { countryMasterAPI, cityMasterAPI } from '@/lib/api';
import { Plus, Trash2, Download } from 'lucide-react';
import { LocationMaster, LocationType, CreateLocationMasterRequest } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LocationMasterPage() {
  const router = useRouter();
  const [user] = useState(() => getUser()); // Memoize user to prevent unnecessary re-renders
  // Memoize hasRole check using the memoized user to prevent re-evaluation
  const userHasAccess = useMemo(() => {
    if (!user) return false;
    const roles = ['admin', 'staff'];
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  }, [user]);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationMaster | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    open: boolean;
    loading: boolean;
  }>({
    open: false,
    loading: false
  });
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [filterLocationType, setFilterLocationType] = useState<LocationType | undefined>(undefined);
  const [formData, setFormData] = useState<CreateLocationMasterRequest>({
    code: '',
    name: '',
    locationType: 'HOTEL',
    countryId: '',
    cityId: '',
    city: '',
    isActive: true
  });
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [countriesLoaded, setCountriesLoaded] = useState(false);
  
  // Extract countryId separately to prevent useEffect from running on every formData change
  const selectedCountryId = formData.countryId;

  const {
    locations,
    loading,
    searchTerm,
    setSearchTerm,
    setFilterLocationType: setHookFilterLocationType,
    filteredLocations,
    pagination,
    setPagination,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationStatus
  } = useLocationMaster();

  useEffect(() => {
    // Only load countries once when component mounts
    if (countriesLoaded || !userHasAccess) {
      return;
    }

    let cancelled = false;
    
    const loadCountries = async () => {
      try {
        const response = await countryMasterAPI.getActive();
        if (cancelled) return;
        
        const countries = response.data?.data?.countryMasters || response.data?.countryMasters || [];
        const countryArray = Array.isArray(countries) ? countries : [];
        setCountries(countryArray);
        setCountriesLoaded(true);
      } catch (error: any) {
        if (cancelled) return;
        toast.error('Failed to load countries. Please check if countries are seeded.');
        setCountries([]);
        setCountriesLoaded(true); 
      }
    };
    
    loadCountries();
    
    return () => {
      cancelled = true;
    };
  }, [user, countriesLoaded, userHasAccess]);

  // Load cities when country changes in form (only when form is open)
  useEffect(() => {
    if (!showCreateForm || !selectedCountryId) {
      if (!showCreateForm) {
        setCities([]);
      }
      return;
    }

    let cancelled = false;

    const loadCities = async () => {
      try {
        const response = await cityMasterAPI.getActive({ countryId: selectedCountryId });
        const cityData = response.data?.cityMasters || [];
        
        if (cancelled) return;
        
        setCities(Array.isArray(cityData) ? cityData : []);
        
        // If editing and cityId exists, ensure it's still valid
        if (editingLocation && editingLocation.cityId && !cityData.find((c: any) => c.id === editingLocation.cityId)) {
          const responseAll = await cityMasterAPI.getAll({ countryId: selectedCountryId });
          const allCityData = responseAll.data?.cityMasters || [];
          
          if (!cancelled) {
            setCities(Array.isArray(allCityData) ? allCityData : []);
          }
        }
      } catch (error) {
        if (cancelled) return;
        console.error('[LocationMaster] Error loading cities:', error);
        setCities([]);
      }
    };

    if (userHasAccess) {
      loadCities();
    }
    
    return () => {
      cancelled = true;
    };
  }, [selectedCountryId, showCreateForm, editingLocation?.id, userHasAccess]); 

  // Sync filter state with hook
  useEffect(() => {
    setHookFilterLocationType(filterLocationType);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filterLocationType, setHookFilterLocationType, setPagination]); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.countryId || !formData.cityId || !formData.city) {
      toast.error('Please fill in all required fields including city');
      return;
    }
    
    const success = editingLocation 
      ? await updateLocation(editingLocation.id, formData)
      : await createLocation(formData);
    
    if (success) {
      if (editingLocation) {
        handleLocationUpdated();
      } else {
        handleLocationCreated();
      }
    }
  };

  const handleLocationCreated = () => {
    setShowCreateForm(false);
    setEditingLocation(null);
    toast.success('Location created successfully!');
  };

  const handleLocationUpdated = () => {
    setEditingLocation(null);
    setShowCreateForm(false);
    toast.success('Location updated successfully!');
  };

  const handleEdit = async (location: LocationMaster) => {
    setEditingLocation(location);
    setFormData({
      code: location.code,
      name: location.name,
      locationType: location.locationType,
      countryId: location.countryId,
      cityId: location.cityId || '',
      city: location.city,
      isActive: location.isActive
    });
    setShowCreateForm(true);
  };

  const handleSelectLocation = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === filteredLocations.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(filteredLocations.map(location => location.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLocations.length === 0) {
      toast.error('Please select locations to delete');
      return false;
    }

    try {
      for (const locationId of selectedLocations) {
        await deleteLocation(locationId);
      }
      setSelectedLocations([]);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedLocations.length === 0) {
      toast.error('Please select locations to delete');
      return;
    }

    setBulkDeleteDialog({
      open: true,
      loading: false
    });
  };

  const confirmBulkDelete = async () => {
    setBulkDeleteDialog(prev => ({ ...prev, loading: true }));

    const success = await handleBulkDelete();
    if (success) {
      toast.success(`${selectedLocations.length} location(s) deleted successfully!`);
      setBulkDeleteDialog({ open: false, loading: false });
    } else {
      setBulkDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleLocationDeleted = () => {
    // Refresh locations list
    window.location.reload();
  };

  const resetForm = () => {
    setEditingLocation(null);
    setShowCreateForm(false);
    setCities([]);
  };

  return (
    <div className="flex-1">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Location Master</h1>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                Manage hotels, airports, ziyarat, and other locations
              </p>
            </div>
          </div>
          
          {user && hasRole(['admin']) && (
            <Button 
              onClick={() => {
                setEditingLocation(null);
                setFormData({
                  code: '',
                  name: '',
                  locationType: 'HOTEL',
                  countryId: '',
                  cityId: '',
                  city: '',
                  isActive: true
                });
                setCities([]);
                setShowCreateForm(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-6">
        {/* Stats Cards */}
        <LocationStatsCards locations={locations} />

        {/* Location Management */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-semibold">Location Management</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Manage hotels, airports, ziyarat, and other locations
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedLocations.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDeleteClick}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedLocations.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Export functionality coming soon')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LocationTable
              locations={filteredLocations}
              loading={loading}
              searchTerm={searchTerm}
              filterLocationType={filterLocationType}
              selectedLocations={selectedLocations}
              setSearchTerm={(val) => {
                setSearchTerm(val);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              onFilterChange={(type) => {
                setFilterLocationType(type);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              onSelectLocation={handleSelectLocation}
              onSelectAll={handleSelectAll}
              onBulkDelete={handleBulkDeleteClick}
              onLocationDeleted={handleLocationDeleted}
              onEditLocation={handleEdit}
              onToggleStatus={toggleLocationStatus}
            />

            <div className="flex items-center justify-between mt-4 border-t pt-4">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-500">
                  Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Show</span>
                  <Select
                    value={String(pagination.limit)}
                    onValueChange={(val) => {
                      const newLimit = parseInt(val);
                      setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                    }}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-500">per page</span>
                </div>
              </div>
              
              {pagination.totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form */}
      <Sheet 
        open={showCreateForm} 
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
          } else {
            setShowCreateForm(true);
          }
        }}
      >
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </SheetTitle>
            <SheetDescription>
              {editingLocation ? 'Update location information' : 'Create a new hotel, airport, ziyarat, or other location'}
            </SheetDescription>
          </SheetHeader>
          <LocationForm
            formData={formData}
            editingLocation={editingLocation}
            countries={countries}
            cities={cities}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialog.open}
        onOpenChange={(open) => setBulkDeleteDialog(prev => ({ ...prev, open }))}
        title="Delete Locations"
        message="Are you sure you want to delete the selected locations? This will permanently remove all associated data."
        onConfirm={confirmBulkDelete}
        loading={bulkDeleteDialog.loading}
        type="bulk"
        count={selectedLocations.length}
      />
    </div>
  );
}
