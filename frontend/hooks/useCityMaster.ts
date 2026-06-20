'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cityMasterAPI } from '@/lib/api';
import { CityMaster, CreateCityMasterRequest, UpdateCityMasterRequest } from '@/types';

export function useCityMaster() {
  const [cities, setCities] = useState<CityMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const loadCities = async () => {
    try {
      setLoading(true);
      const response = await cityMasterAPI.getAll({ 
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm 
      });
      setCities(response.data.cityMasters || []);
      setPagination(response.data.pagination || {
        page: 1,
        limit: pagination.limit,
        total: response.data.cityMasters?.length || 0,
        totalPages: 1
      });
    } catch (error) {
      console.error('Error loading cities:', error);
      toast.error('Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  const createCity = async (data: CreateCityMasterRequest) => {
    try {
      const response = await cityMasterAPI.create(data);
      await loadCities();
      return response.data.cityMaster;
    } catch (error: any) {
      console.error('Error creating city:', error);
      toast.error(error.response?.data?.error || 'Failed to create city');
      throw error;
    }
  };

  const updateCity = async (id: string, data: UpdateCityMasterRequest) => {
    try {
      const response = await cityMasterAPI.update(id, data);
      await loadCities();
      return response.data.cityMaster;
    } catch (error: any) {
      console.error('Error updating city:', error);
      toast.error(error.response?.data?.error || 'Failed to update city');
      throw error;
    }
  };

  const deleteCity = async (id: string) => {
    try {
      await cityMasterAPI.delete(id);
      await loadCities();
      toast.success('City deleted successfully');
    } catch (error: any) {
      console.error('Error deleting city:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete city';
      const errorDetails = error.response?.data?.details;
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      throw error;
    }
  };

  const toggleCityStatus = async (id: string) => {
    try {
      const response = await cityMasterAPI.toggleStatus(id);
      await loadCities();
      const city = response.data.cityMaster;
      toast.success(`City ${city.isActive ? 'activated' : 'deactivated'} successfully`);
      return city;
    } catch (error: any) {
      console.error('Error toggling city status:', error);
      toast.error(error.response?.data?.error || 'Failed to toggle city status');
      throw error;
    }
  };

  useEffect(() => {
    loadCities();
  }, [searchTerm, pagination.page, pagination.limit]);

  const filteredCities = cities;

  return {
    cities,
    filteredCities,
    loading,
    searchTerm,
    setSearchTerm,
    pagination,
    setPagination,
    loadCities,
    createCity,
    updateCity,
    deleteCity,
    toggleCityStatus,
  };
}
