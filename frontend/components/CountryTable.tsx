'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { countryMasterAPI } from '@/lib/api';
import { Search, Edit, Trash2, MapPin, CheckCircle, XCircle } from 'lucide-react';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { CountryMaster } from '@/types';

interface CountryTableProps {
  countries: CountryMaster[];
  loading: boolean;
  searchTerm: string;
  selectedCountries: string[];
  setSearchTerm: (value: string) => void;
  onSelectCountry: (countryId: string) => void;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  onCountryDeleted: () => void;
  onEditCountry: (country: CountryMaster) => void;
  onToggleStatus: (country: CountryMaster) => void;
}

export default function CountryTable({
  countries,
  loading,
  searchTerm,
  selectedCountries,
  setSearchTerm,
  onSelectCountry,
  onSelectAll,
  onBulkDelete,
  onCountryDeleted,
  onEditCountry,
  onToggleStatus
}: CountryTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    country: CountryMaster | null;
    loading: boolean;
  }>({
    open: false,
    country: null,
    loading: false
  });

  const handleDeleteCountry = (country: CountryMaster) => {
    setDeleteDialog({
      open: true,
      country,
      loading: false
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.country) return;

    setDeleteDialog(prev => ({ ...prev, loading: true }));

    try {
      await countryMasterAPI.delete(deleteDialog.country.id);
      toast.success('Country deleted successfully!');
      onCountryDeleted();
      setDeleteDialog({ open: false, country: null, loading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to delete country';
      toast.error(errorMessage);
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, code, or currency..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {/* Desktop Table Skeleton */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg">
              <Skeleton className="col-span-1 h-4" />
              <Skeleton className="col-span-3 h-4" />
              <Skeleton className="col-span-2 h-4" />
              <Skeleton className="col-span-2 h-4" />
              <Skeleton className="col-span-2 h-4" />
              <Skeleton className="col-span-2 h-4" />
            </div>

            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 p-3 border rounded-lg">
                <Skeleton className="col-span-1 h-4" />
                <div className="col-span-3 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-2 h-6 w-16" />
                <Skeleton className="col-span-2 h-6 w-12" />
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
      ) : countries.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white">
          <div className="text-gray-400 mb-4">
            <MapPin className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No countries found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first country'}
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
              checked={selectedCountries.length === countries.length && countries.length > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300"
            />
          </div>
          <div className="col-span-3">Country Name</div>
          <div className="col-span-2">Country Code</div>
          <div className="col-span-2">Currency</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Actions</div>
        </div>

        {/* Table Rows */}
        {countries.map((country) => (
          <div
            key={country.id}
            className="grid grid-cols-12 gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={selectedCountries.includes(country.id)}
                onChange={() => onSelectCountry(country.id)}
                className="rounded border-gray-300"
              />
            </div>
            <div className="col-span-3">
              <div className="font-medium text-gray-900">{country.countryName}</div>
              <div className="text-sm text-gray-500">
                ID: {country.id.slice(0, 8)}...
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-900 font-mono">{country.countryCode}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-900">{country.currencyCode}</div>
            </div>
            <div className="col-span-2">
              <Badge variant={country.isActive ? "default" : "secondary"}>
                {country.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleStatus(country)}
                  className="h-8 w-8 p-0"
                  title={country.isActive ? "Deactivate" : "Activate"}
                >
                  {country.isActive ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditCountry(country)}
                  className="h-8 w-8 p-0"
                  title="Edit country"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCountry(country)}
                  className="h-8 w-8 p-0 text-primary hover:text-destructive hover:bg-destructive/5"
                  title="Delete country"
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
              checked={selectedCountries.length === countries.length && countries.length > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All ({countries.length})
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {selectedCountries.length} selected
          </span>
        </div>

        {/* Country Cards */}
        <div className="space-y-3">
          {countries.map((country) => (
            <div
              key={country.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(country.id)}
                    onChange={() => onSelectCountry(country.id)}
                    className="rounded border-gray-300 mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">
                      {country.countryName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {country.countryCode} • {country.currencyCode}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleStatus(country)}
                    className="h-8 w-8 p-0"
                    title={country.isActive ? "Deactivate" : "Activate"}
                  >
                    {country.isActive ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditCountry(country)}
                    className="h-8 w-8 p-0"
                    title="Edit country"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCountry(country)}
                    className="h-8 w-8 p-0 text-primary hover:text-destructive hover:bg-destructive/5"
                    title="Delete country"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Card Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={country.isActive ? "default" : "secondary"} className="text-xs">
                      {country.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
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
        title="Delete Country"
        message="Are you sure you want to delete this country? This will permanently remove all associated data."
        itemName={deleteDialog.country?.countryName}
        onConfirm={confirmDelete}
        loading={deleteDialog.loading}
        type="single"
      />
    </div>
  );
}

