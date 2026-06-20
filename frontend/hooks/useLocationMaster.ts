'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { locationMasterAPI } from '@/lib/api';
import { LocationMaster, CreateLocationMasterRequest, UpdateLocationMasterRequest, LocationType } from '@/types';

export function useLocationMaster() {
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocationType, setFilterLocationType] = useState<LocationType | undefined>();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await locationMasterAPI.getAll({ 
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        locationType: filterLocationType
      });
      const locationsData = response.data.locationMasters || [];
      setLocations(locationsData);
      setPagination(response.data.pagination || {
        page: 1,
        limit: pagination.limit,
        total: locationsData.length,
        totalPages: 1
      });
    } catch (error) {
      console.error('[useLocationMaster] Error loading locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, filterLocationType]);

  const createLocation = useCallback(async (data: CreateLocationMasterRequest): Promise<boolean> => {
    try {
      await locationMasterAPI.create(data);
      await loadLocations();
      return true;
    } catch (error: any) {
      console.error('[useLocationMaster] Error creating location:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create location';
      toast.error(errorMessage);
      return false;
    }
  }, [loadLocations]);

  const updateLocation = useCallback(async (id: string, data: UpdateLocationMasterRequest): Promise<boolean> => {
    try {
      await locationMasterAPI.update(id, data);
      await loadLocations();
      return true;
    } catch (error: any) {
      console.error('Error updating location:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update location';
      toast.error(errorMessage);
      return false;
    }
  }, [loadLocations]);

  const deleteLocation = useCallback(async (id: string): Promise<boolean> => {
    try {
      await locationMasterAPI.delete(id);
      await loadLocations();
      return true;
    } catch (error: any) {
      console.error('Error deleting location:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete location';
      toast.error(errorMessage);
      return false;
    }
  }, [loadLocations]);

  const toggleLocationStatus = useCallback(async (location: LocationMaster): Promise<boolean> => {
    try {
      await locationMasterAPI.toggleStatus(location.id);
      await loadLocations();
      return true;
    } catch (error: any) {
      console.error('Error toggling location status:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update location status';
      toast.error(errorMessage);
      return false;
    }
  }, [loadLocations]);

  // Get locations by type
  const getLocationsByType = (type: LocationType) => {
    return locations.filter(loc => loc.locationType === type && loc.isActive);
  };

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const filteredLocations = locations;

  return {
    locations,
    loading,
    searchTerm,
    setSearchTerm,
    filterLocationType,
    setFilterLocationType,
    filteredLocations,
    pagination,
    setPagination,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationStatus,
    loadLocations,
    getLocationsByType,
  };
}
