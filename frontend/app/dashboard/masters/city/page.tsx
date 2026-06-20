'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { useCityMaster } from '@/hooks/useCityMaster';
import { countryMasterAPI } from '@/lib/api';
import CityCard from '@/components/city/CityCard';
import CityForm from '@/components/city/CityForm';
import CityDeleteConfirmationModal from '@/components/city/CityDeleteConfirmationModal';
import { Plus, Search, MapPin } from 'lucide-react';
import { CityMaster, CreateCityMasterRequest } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CityMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCity, setEditingCity] = useState<CityMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<CityMaster | null>(null);
  const [formData, setFormData] = useState<CreateCityMasterRequest>({
    name: '',
    countryId: '',
    isActive: true
  });
  const [countries, setCountries] = useState<Array<{ id: string; countryCode: string; countryName: string }>>([]);

  const {
    cities,
    loading,
    searchTerm,
    setSearchTerm,
    filteredCities,
    pagination,
    setPagination,
    createCity,
    updateCity,
    deleteCity,
    toggleCityStatus,
  } = useCityMaster();

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await countryMasterAPI.getActive();
        const countryData = response.data?.data?.countryMasters || response.data?.countryMasters || [];
        setCountries(Array.isArray(countryData) ? countryData : []);
      } catch (error) {
        console.error('Error loading countries:', error);
        toast.error('Failed to load countries');
      }
    };
    if (user && hasRole(['admin', 'staff'])) {
      loadCountries();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.countryId) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      if (editingCity) {
        await updateCity(editingCity.id, formData);
        toast.success('City updated successfully!');
      } else {
        await createCity(formData);
        toast.success('City created successfully!');
      }
      resetForm();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleEdit = (city: CityMaster) => {
    setEditingCity(city);
    setFormData({
      name: city.name,
      countryId: city.countryId,
      isActive: city.isActive
    });
    setShowCreateForm(true);
  };

  const handleDeleteClick = (city: CityMaster) => {
    setCityToDelete(city);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cityToDelete) return;

    try {
      await deleteCity(cityToDelete.id);
      setShowDeleteModal(false);
      setCityToDelete(null);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCityToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      countryId: '',
      isActive: true
    });
    setEditingCity(null);
    setShowCreateForm(false);
  };

  // Show loading state while checking permissions
  if (loading && cities.length === 0 && !searchTerm) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading cities...</p>
        </div>
      </div>
    );
  }

  const totalCities = cities.length;
  const activeCities = cities.filter(c => c.isActive).length;
  const inactiveCities = totalCities - activeCities;

  return (
    <div className="flex-1">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">City Master</h1>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                Manage cities and their countries
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">Add City</span>
          </Button>
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cities</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCities}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Cities</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCities}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive Cities</p>
                  <p className="text-2xl font-bold text-gray-900">{inactiveCities}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search cities by name or country..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cities List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Cities ({filteredCities.length})
            </CardTitle>
            <CardDescription>
              Manage all cities in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredCities.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No cities found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'No cities match your search criteria' : 'Get started by adding your first city'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add City
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCities.map((city) => (
                  <CityCard
                    key={city.id}
                    city={city}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    onToggleStatus={toggleCityStatus}
                  />
                ))}
              </div>
            )}

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
      <Sheet open={showCreateForm} onOpenChange={(open) => {
        setShowCreateForm(open);
        if (!open) {
          resetForm();
        }
      }}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>
              {editingCity ? 'Edit City' : 'Add New City'}
            </SheetTitle>
            <SheetDescription>
              {editingCity ? 'Update city information' : 'Add a new city to the system'}
            </SheetDescription>
          </SheetHeader>
          <CityForm
            formData={formData}
            editingCity={editingCity}
            countries={countries}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <CityDeleteConfirmationModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        city={cityToDelete}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
