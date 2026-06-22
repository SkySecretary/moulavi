'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { locationMasterAPI } from '@/lib/api';
import { Search, Edit, Trash2, MapPin, Plane, Building2, Navigation } from 'lucide-react';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { LocationMaster, LocationType } from '@/types';

interface LocationTableProps {
  locations: LocationMaster[];
  loading: boolean;
  searchTerm: string;
  filterLocationType: LocationType | undefined;
  selectedLocations: string[];
  setSearchTerm: (value: string) => void;
  onFilterChange: (type: LocationType | undefined) => void;
  onSelectLocation: (locationId: string) => void;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  onLocationDeleted: () => void;
  onEditLocation: (location: LocationMaster) => void;
  onToggleStatus: (location: LocationMaster) => void;
}

export default function LocationTable({
  locations,
  loading,
  searchTerm,
  filterLocationType,
  selectedLocations,
  setSearchTerm,
  onFilterChange,
  onSelectLocation,
  onSelectAll,
  onBulkDelete,
  onLocationDeleted,
  onEditLocation,
  onToggleStatus
}: LocationTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    location: LocationMaster | null;
    loading: boolean;
  }>({
    open: false,
    location: null,
    loading: false
  });

  const handleDeleteLocation = (location: LocationMaster) => {
    setDeleteDialog({
      open: true,
      location,
      loading: false
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.location) return;

    setDeleteDialog(prev => ({ ...prev, loading: true }));

    try {
      await locationMasterAPI.delete(deleteDialog.location.id);
      toast.success('Location deleted successfully!');
      onLocationDeleted();
      setDeleteDialog({ open: false, location: null, loading: false });
    } catch (error) {
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const getLocationTypeIcon = (type: LocationType) => {
    switch (type) {
      case 'AIRPORT':
        return <Plane className="h-4 w-4" />;
      case 'HOTEL':
        return <Building2 className="h-4 w-4" />;
      case 'ZIYARAT':
        return <Navigation className="h-4 w-4" />;
      case 'OTHERS':
        return <MapPin className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getLocationTypeColor = (type: LocationType) => {
    switch (type) {
      case 'AIRPORT':
        return 'bg-blue-100 text-blue-800';
      case 'HOTEL':
        return 'bg-green-100 text-green-800';
      case 'ZIYARAT':
        return 'bg-purple-100 text-purple-800';
      case 'OTHERS':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLocationTypeBadgeVariant = (type: LocationType) => {
    switch (type) {
      case 'AIRPORT':
        return 'default';
      case 'HOTEL':
        return 'secondary';
      case 'ZIYARAT':
        return 'outline';
      case 'OTHERS':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-3">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, code, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={!filterLocationType ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(undefined)}
          >
            All
          </Button>
          <Button
            variant={filterLocationType === 'AIRPORT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('AIRPORT')}
            className="flex items-center gap-1"
          >
            <Plane className="h-3 w-3" />
            Airports
          </Button>
          <Button
            variant={filterLocationType === 'HOTEL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('HOTEL')}
            className="flex items-center gap-1"
          >
            <Building2 className="h-3 w-3" />
            Hotels
          </Button>
          <Button
            variant={filterLocationType === 'OTHERS' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('OTHERS')}
            className="flex items-center gap-1"
          >
            <MapPin className="h-3 w-3" />
            Others
          </Button>
          <Button
            variant={filterLocationType === 'ZIYARAT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('ZIYARAT')}
            className="flex items-center gap-1"
          >
            <Navigation className="h-3 w-3" />
            Ziyarat
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {/* Desktop Table Skeleton */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg">
              <Skeleton className="col-span-1 h-4" />
              <Skeleton className="col-span-2 h-4" />
              <Skeleton className="col-span-3 h-4" />
              <Skeleton className="col-span-2 h-4" />
              <Skeleton className="col-span-2 h-4" />
              <Skeleton className="col-span-2 h-4" />
            </div>

            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 p-3 border rounded-lg">
                <Skeleton className="col-span-1 h-4" />
                <div className="col-span-2 space-y-2">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="col-span-3 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="col-span-2 h-6 w-20" />
                <Skeleton className="col-span-2 h-6 w-16" />
                <div className="col-span-2 flex gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Card Skeleton */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>

            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-4 w-4 mt-1" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white">
          <div className="text-gray-400 mb-4">
            <MapPin className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No locations found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first location'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={selectedLocations.length === locations.length && locations.length > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300"
            />
          </div>
          <div className="col-span-2">Code</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Actions</div>
        </div>

        {/* Table Rows */}
        {locations.map((location) => (
          <div
            key={location.id}
            className="grid grid-cols-12 gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={selectedLocations.includes(location.id)}
                onChange={() => onSelectLocation(location.id)}
                className="rounded border-gray-300"
              />
            </div>
            <div className="col-span-2">
              <div className="font-medium text-gray-900">{location.code}</div>
            </div>
            <div className="col-span-3">
              <div className="font-medium text-gray-900">{location.name}</div>
              <div className="text-sm text-gray-500">
                {location.city}, {location.country?.countryName || 'N/A'}
              </div>
            </div>
            <div className="col-span-2">
              <Badge 
                variant={getLocationTypeBadgeVariant(location.locationType)}
                className="flex items-center gap-1 w-fit"
              >
                {getLocationTypeIcon(location.locationType)}
                {location.locationType}
              </Badge>
            </div>
            <div className="col-span-2">
              <Badge variant={location.isActive ? "default" : "secondary"}>
                {location.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleStatus(location)}
                  className="h-8 w-8 p-0"
                  title={location.isActive ? "Deactivate" : "Activate"}
                >
                  {location.isActive ? '✓' : '○'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditLocation(location)}
                  className="h-8 w-8 p-0"
                  title="Edit location"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteLocation(location)}
                  className="h-8 w-8 p-0 text-primary hover:text-destructive hover:bg-destructive/5"
                  title="Delete location"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden">
        {/* Select All Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedLocations.length === locations.length && locations.length > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All ({locations.length})
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {selectedLocations.length} selected
          </span>
        </div>

        {/* Location Cards */}
        <div className="space-y-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(location.id)}
                    onChange={() => onSelectLocation(location.id)}
                    className="rounded border-gray-300 mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">
                      {location.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {location.code} • {location.city}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleStatus(location)}
                    className="h-8 w-8 p-0"
                    title={location.isActive ? "Deactivate" : "Activate"}
                  >
                    {location.isActive ? '✓' : '○'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditLocation(location)}
                    className="h-8 w-8 p-0"
                    title="Edit location"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteLocation(location)}
                    className="h-8 w-8 p-0 text-primary hover:text-destructive hover:bg-destructive/5"
                    title="Delete location"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Card Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={getLocationTypeBadgeVariant(location.locationType)}
                      className="flex items-center gap-1 text-xs"
                    >
                      {getLocationTypeIcon(location.locationType)}
                      {location.locationType}
                    </Badge>
                    <Badge variant={location.isActive ? "default" : "secondary"} className="text-xs">
                      {location.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-gray-500 pt-1 border-t">
                  <span className="font-medium">Country:</span> {location.country?.countryName || 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Delete Location"
        message="Are you sure you want to delete this location? This will permanently remove all associated data."
        itemName={deleteDialog.location?.name}
        onConfirm={confirmDelete}
        loading={deleteDialog.loading}
        type="single"
      />
    </div>
  );
}

