'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Step4Data, Step2Data, Step1Data, Step3Data, LocationMaster } from '@/lib/umrah/types';
import { transportRouteMasterAPI, transportMasterAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Truck, Loader2, Users, MapPin, Plus, Minus, Star } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TransportRouteMaster, TransportMaster, RouteType, CurrencyMaster } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface TransportVehicleSelectionStepProps {
  data: Step3Data; // Now Step 3 is transport selection
  step1Data: Step1Data;
  step2Data: Step2Data;
  step3Data?: Step3Data; // Optional: for individual bookings where hotels are in step3
  locationMasters?: LocationMaster[];
  onChange: (data: Partial<Step3Data>) => void; // Now updates Step3Data
  disabled?: boolean;
  currency?: {
    symbol: string;
    currencyCode: string;
    exchangeRate: number;
  };
}


export const TransportVehicleSelectionStep: React.FC<TransportVehicleSelectionStepProps> = ({
  data,
  step1Data,
  step2Data,
  step3Data,
  locationMasters = [],
  onChange,
  disabled = false,
  currency,
}) => {
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingTransports, setLoadingTransports] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  // Default route type filter to "airporttocity" if accommodation is iqama
  const [routeTypeFilter, setRouteTypeFilter] = useState<RouteType | 'all'>(() => {
    // For individual bookings: check step3Data.accommodationType
    // For group bookings: check step2Data (but group bookings don't have iqama)
    const accommodationType = step3Data?.accommodationType;
    return accommodationType === 'iqama' ? 'airporttocity' : 'all';
  });
  const [availableRoutes, setAvailableRoutes] = useState<TransportRouteMaster[]>([]);
  const [routeTransports, setRouteTransports] = useState<TransportMaster[]>([]);
  // Track selected vehicles with quantities
  const [selectedVehicles, setSelectedVehicles] = useState<Map<string, number>>(new Map());

  // Determine route from airports and hotels
  const determinedRoute = useMemo(() => {
    const cityIds: string[] = [];

    // Get arrival airport city
    const arrivalAirport = locationMasters.find(
      (lm) => lm.id === step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
    );
    if (arrivalAirport?.cityMaster?.id) {
      cityIds.push(arrivalAirport.cityMaster.id);
    }

    // Get hotel cities - check both step2Data (group bookings) and step3Data (individual bookings)
    const hotelBookings = step2Data.hotelBookings || step3Data?.hotelBookings || [];

    // Add hotel cities in order (preserve ALL hotel bookings including duplicates)
    // This ensures routes like Jeddah → Makkah → Madinah → Makkah → Jeddah are preserved
    hotelBookings.forEach((booking) => {
      const hotel = locationMasters.find((lm) => lm.id === booking.hotelId && lm.locationType === 'HOTEL');
      const cityId = hotel?.cityMaster?.id;
      if (cityId) {
        cityIds.push(cityId); // Always add, even if duplicate
      }
    });

    // Get departure airport city - ALWAYS add at the end to complete the round trip
    // Even if it's the same as arrival airport (e.g., Jeddah → Makkah → Madinah → Jeddah)
    const departureAirport = locationMasters.find(
      (lm) => lm.id === step2Data.departureAirportId && lm.locationType === 'AIRPORT'
    );
    if (departureAirport?.cityMaster?.id) {
      cityIds.push(departureAirport.cityMaster.id);
    }

    return cityIds;
  }, [step2Data.arrivalAirportId, step2Data.departureAirportId, step2Data.hotelBookings, step3Data?.hotelBookings, locationMasters]);

  // Helper function to format route display
  const formatRouteDisplay = (route: TransportRouteMaster): string => {
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    const routeString = cities.join(' → ');
    // Format routeType: fulltrip -> Full Trip, airporttocity -> Airport To City, etc.
    const routeTypeLabel = route.routeType
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital letters
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${routeString} (${routeTypeLabel})`;
  };

  // Helper function to find route matching determined cities
  const findRouteByCities = (routes: TransportRouteMaster[], cityIds: string[]): TransportRouteMaster | null => {
    return routes.find(route => {
      const routeCities = [
        route.city1Id,
        route.city2Id,
        route.city3Id,
        route.city4Id,
      ].filter(Boolean);
      
      if (routeCities.length !== cityIds.length) return false;
      
      return routeCities.every((cityId, idx) => cityId === cityIds[idx]);
    }) || null;
  };

  // Load all active routes - only when step is accessed (lazy loading)
  useEffect(() => {
    // Only load if we have the minimum required data (at least 2 cities in route)
    if (determinedRoute.length < 2) {
      return;
    }

    const loadRoutes = async () => {
      setLoadingRoutes(true);
      try {
        const response = await transportRouteMasterAPI.getActive();
        const routes: TransportRouteMaster[] = response.data.transportRouteMasters || [];
        setAvailableRoutes(routes);

        // For iqama accommodation: Auto-select "Jeddah → Jeddah" route if arrival airport is Jeddah
        const accommodationType = step3Data?.accommodationType;
        if (accommodationType === 'iqama') {
          const arrivalAirport = locationMasters.find(
            (lm) => lm.id === step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
          );
          const arrivalCityName = arrivalAirport?.cityMaster?.name || arrivalAirport?.city || '';
          const isJeddah = arrivalCityName.toLowerCase().includes('jeddah');
          
          if (isJeddah) {
            // Find "Jeddah → Jeddah" route with routeType "airporttocity"
            const jeddahRoute = routes.find(route => {
              const city1Name = route.city1?.name?.toLowerCase() || '';
              const city2Name = route.city2?.name?.toLowerCase() || '';
              const isJeddahToJeddah = city1Name.includes('jeddah') && city2Name.includes('jeddah');
              return isJeddahToJeddah && route.routeType === 'airporttocity';
            });
            
            if (jeddahRoute) {
              setSelectedRouteId(jeddahRoute.id);
              return; // Exit early, don't try to match determined route
            }
          }
        }

        // Auto-select determined route if it exists
        const matchingRoute = findRouteByCities(routes, determinedRoute);
        if (matchingRoute) {
          setSelectedRouteId(matchingRoute.id);
        }
      } catch (error: any) {
        console.error('Error loading routes:', error);
        toast.error('Failed to load routes');
      } finally {
        setLoadingRoutes(false);
      }
    };

    loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [determinedRoute.join(',')]); // Use stringified version to avoid unnecessary re-renders

  // Filter routes by routeType
  const filteredRoutes = useMemo(() => {
    if (routeTypeFilter === 'all') {
      return availableRoutes;
    }
    return availableRoutes.filter(route => route.routeType === routeTypeFilter);
  }, [availableRoutes, routeTypeFilter]);

  // Load transports when route is selected
  useEffect(() => {
    const loadTransports = async () => {
      if (!selectedRouteId) {
        setRouteTransports([]);
        setSelectedVehicles(new Map()); // Clear selections when no route is selected
        return;
      }

      setLoadingTransports(true);
      try {
        const response = await transportMasterAPI.getByRoute(selectedRouteId);
        const transports: TransportMaster[] = response.data.transportMasters || [];
        setRouteTransports(transports);
        
        // Filter selectedVehicles to only include transports that are still in the new route
        setSelectedVehicles(prev => {
          const filtered = new Map<string, number>();
          prev.forEach((quantity, transportId) => {
            if (transports.some(t => t.id === transportId)) {
              filtered.set(transportId, quantity);
            }
          });
          return filtered;
        });
      } catch (error: any) {
        console.error('Error loading transports:', error);
        toast.error('Failed to load transport vehicles');
        setRouteTransports([]);
        setSelectedVehicles(new Map());
      } finally {
        setLoadingTransports(false);
      }
    };

    loadTransports();
  }, [selectedRouteId]);

  // Update route type filter when accommodation type changes to iqama
  useEffect(() => {
    const accommodationType = step3Data?.accommodationType;
    if (accommodationType === 'iqama' && routeTypeFilter !== 'airporttocity') {
      setRouteTypeFilter('airporttocity');
    }
  }, [step3Data?.accommodationType, routeTypeFilter]);

  // Initialize selected vehicles from data when component mounts or data changes
  useEffect(() => {
    if (data.selectedTransports && data.selectedTransports.length > 0) {
      const vehicleMap = new Map<string, number>();
      data.selectedTransports.forEach(st => {
        vehicleMap.set(st.transportId, st.quantity);
      });
      setSelectedVehicles(vehicleMap);
      
      // Set the route ID from the first selected transport if available
      if (data.selectedTransports[0]?.routeId && !selectedRouteId) {
        setSelectedRouteId(data.selectedTransports[0].routeId);
      }
    } else if (data.selectedTransport) {
      // Backward compatibility: convert single selection to quantity-based
      const vehicleMap = new Map<string, number>();
      vehicleMap.set(data.selectedTransport.transportId, 1);
      setSelectedVehicles(vehicleMap);
    } else {
      // Clear selection if no data
      setSelectedVehicles(new Map());
    }
  }, [data.selectedTransports, data.selectedTransport, selectedRouteId]);

  const handleQuantityChange = (transportId: string, delta: number) => {
    const currentQty = selectedVehicles.get(transportId) || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    const newMap = new Map(selectedVehicles);
    if (newQty === 0) {
      newMap.delete(transportId);
    } else {
      newMap.set(transportId, newQty);
    }
    setSelectedVehicles(newMap);

    // Update parent data - always use selectedTransports format
    const selectedTransports = Array.from(newMap.entries())
      .map(([transportId, quantity]) => {
        const transport = routeTransports.find(t => t.id === transportId);
        if (!transport || !transport.vehicleType) return null;
        return {
          routeId: transport.routeId,
          transportId: transport.id,
          vehicleTypeId: transport.vehicleType.id,
          price: Number(transport.price),
          quantity,
          paxCapacity: transport.vehicleType.paxCount,
        };
      })
      .filter(Boolean) as Array<{
        routeId: string;
        transportId: string;
        vehicleTypeId: string;
        price: number;
        quantity: number;
        paxCapacity?: number;
      }>;

    onChange({
      selectedTransports: selectedTransports.length > 0 ? selectedTransports : undefined,
      selectedTransport: undefined, // Always clear single selection format
    });
  };


  if (determinedRoute.length < 2) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Please complete the previous steps (airports and hotels) to see transport options.
        </p>
      </div>
    );
  }

  const routeDisplay = determinedRoute.map((cityId, idx) => {
    const city = locationMasters.find(lm => lm.cityMaster?.id === cityId);
    return city?.cityMaster?.name || city?.city || `City ${idx + 1}`;
  }).join(' → ');

  const selectedRoute = availableRoutes.find(r => r.id === selectedRouteId);
  const routeNotFound = determinedRoute.length >= 2 && !selectedRoute;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Route Summary - Compact */}
      <div className="flex items-center space-x-3 pb-3 border-b border-secondary/10">
        <MapPin className="h-4 w-4 text-secondary" />
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-tight">{routeDisplay}</p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase tracking-widest">
            {step2Data.passengerCount || 0} Passengers
          </p>
        </div>
      </div>

      {/* Filters - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loadingRoutes ? (
          <>
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary/60 uppercase ml-1 tracking-widest">Filter by Route Type</label>
              <Select
                value={routeTypeFilter}
                onValueChange={(value) => setRouteTypeFilter(value as RouteType | 'all')}
                disabled={disabled || loadingRoutes}
              >
                <SelectTrigger className="h-9 rounded-lg border-gray-100 bg-white text-[10px] font-bold">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-0 shadow-2xl p-1">
                  <SelectItem value="all" className="text-[9px] font-bold p-2 uppercase">All Route Types</SelectItem>
                  <SelectItem value="fulltrip" className="text-[9px] font-bold p-2 uppercase">Full Trip</SelectItem>
                  <SelectItem value="airporttocity" className="text-[9px] font-bold p-2 uppercase">Airport to City</SelectItem>
                  <SelectItem value="citytoairport" className="text-[9px] font-bold p-2 uppercase">City to Airport</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary/60 uppercase ml-1 tracking-widest">Select Route</label>
              <Select
                value={selectedRouteId || ''}
                onValueChange={(value) => setSelectedRouteId(value || null)}
                disabled={disabled || loadingRoutes || filteredRoutes.length === 0}
              >
                <SelectTrigger className="h-9 rounded-lg border-gray-100 bg-white text-[10px] font-bold overflow-hidden">
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-0 shadow-2xl p-1 max-w-[300px]">
                  {filteredRoutes.map((route) => (
                    <SelectItem key={route.id} value={route.id} className="text-[9px] font-bold p-2">
                      {formatRouteDisplay(route)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Transport Table - Ultra Compact */}
      {selectedRouteId && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
          {loadingTransports ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
          ) : (
            <div className="bg-white rounded-xl border border-secondary/10 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow className="h-8 border-b border-secondary/5">
                    <TableHead className="px-4 text-[8px] font-bold uppercase py-0 text-primary/40">Vehicle Name</TableHead>
                    <TableHead className="text-[8px] font-bold uppercase py-0 text-primary/40 text-center">Capacity</TableHead>
                    <TableHead className="text-[8px] font-bold uppercase py-0 text-primary/40">Price</TableHead>
                    <TableHead className="text-[8px] font-bold uppercase py-0 text-primary/40 text-center">Quantity</TableHead>
                    <TableHead className="px-4 text-[8px] font-bold uppercase py-0 text-primary/40 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const passengerCount = step1Data?.passengerCount || step2Data?.passengerCount || 0;
                    let recommendedId: string | null = null;
                    if (passengerCount > 0) {
                      const suitable = routeTransports.filter(t => t.vehicleType && t.vehicleType.paxCount >= passengerCount).sort((a,b) => a.vehicleType!.paxCount - b.vehicleType!.paxCount);
                      if (suitable.length > 0) recommendedId = suitable[0].id;
                    }
                    
                    return routeTransports.map((transport) => {
                      if (!transport.vehicleType) return null;
                      const quantity = selectedVehicles.get(transport.id) || 0;
                      const total = Number(transport.price) * quantity;
                      const isSelected = quantity > 0;
                      const isRecommended = transport.id === recommendedId;
                    
                    return (
                      <TableRow key={transport.id} className={cn("h-10 transition-colors", isSelected ? 'bg-primary/5' : isRecommended ? 'bg-secondary/5' : '')}>
                        <TableCell className="px-4 py-0">
                          <div className="flex items-center gap-2">
                            <Truck className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-[10px] font-bold text-primary uppercase">{transport.vehicleType.vehicleName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-0"><span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded uppercase">{transport.vehicleType.paxCount} PAX</span></TableCell>
                        <TableCell className="py-0"><span className="text-[10px] font-bold text-primary">{formatCurrency(Number(transport.price), currency)}</span></TableCell>
                        <TableCell className="py-0">
                          <div className="flex items-center justify-center gap-2 bg-gray-50 p-0.5 rounded-md border border-gray-100 w-fit mx-auto">
                            <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(transport.id, -1)} disabled={disabled || quantity === 0} className="h-5 w-5 rounded hover:text-destructive"><Minus className="h-2 w-2" /></Button>
                            <span className="text-[10px] font-bold w-3 text-center">{quantity}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(transport.id, 1)} disabled={disabled} className="h-5 w-5 rounded hover:text-emerald-600"><Plus className="h-2 w-2" /></Button>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-0 text-right"><span className={cn("text-[10px] font-bold", isSelected ? 'text-secondary' : 'text-primary/10')}>{formatCurrency(total, currency)}</span></TableCell>
                      </TableRow>
                    );
                  });
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

