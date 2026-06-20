import { useState, useEffect, useCallback } from 'react';
import { transportRouteMasterAPI } from '@/lib/api';
import { TransportRouteMaster, RouteType, CreateTransportRouteMasterRequest, UpdateTransportRouteMasterRequest } from '@/types';
import { toast } from 'sonner';

export function useTransportRouteMaster() {
  const [routes, setRoutes] = useState<TransportRouteMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRouteType, setFilterRouteType] = useState<RouteType | undefined>(undefined);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await transportRouteMasterAPI.getAll({ 
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        routeType: filterRouteType
      });
      const routesData = response.data?.transportRouteMasters || response.data?.data?.transportRouteMasters || [];
      setRoutes(routesData);
      setPagination(response.data?.pagination || {
        page: 1,
        limit: pagination.limit,
        total: routesData.length,
        totalPages: 1
      });
    } catch (error: any) {
      console.error('[useTransportRouteMaster] Error loading routes:', error);
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, filterRouteType]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const createRoute = useCallback(async (data: CreateTransportRouteMasterRequest): Promise<boolean> => {
    try {
      await transportRouteMasterAPI.create(data);
      await loadRoutes();
      return true;
    } catch (error: any) {
      console.error('[useTransportRouteMaster] Error creating route:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create route';
      toast.error(errorMessage);
      return false;
    }
  }, [loadRoutes]);

  const updateRoute = useCallback(async (id: string, data: UpdateTransportRouteMasterRequest): Promise<boolean> => {
    try {
      await transportRouteMasterAPI.update(id, data);
      await loadRoutes();
      return true;
    } catch (error: any) {
      console.error('Error updating route:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update route';
      toast.error(errorMessage);
      return false;
    }
  }, [loadRoutes]);

  const deleteRoute = useCallback(async (id: string): Promise<boolean> => {
    try {
      await transportRouteMasterAPI.delete(id);
      await loadRoutes();
      return true;
    } catch (error: any) {
      console.error('Error deleting route:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete route';
      toast.error(errorMessage);
      return false;
    }
  }, [loadRoutes]);

  const toggleRouteStatus = useCallback(async (route: TransportRouteMaster): Promise<boolean> => {
    try {
      await transportRouteMasterAPI.toggleStatus(route.id);
      await loadRoutes();
      return true;
    } catch (error: any) {
      console.error('Error toggling route status:', error);
      const errorMessage = error.response?.data?.error || 'Failed to toggle route status';
      toast.error(errorMessage);
      return false;
    }
  }, [loadRoutes]);

  const filteredRoutes = routes;

  return {
    routes,
    loading,
    searchTerm,
    setSearchTerm,
    filterRouteType,
    setFilterRouteType,
    filteredRoutes,
    pagination,
    setPagination,
    createRoute,
    updateRoute,
    deleteRoute,
    toggleRouteStatus,
    refreshRoutes: loadRoutes,
  };
}
