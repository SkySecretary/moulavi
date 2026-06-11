import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, ArrowRight } from 'lucide-react';
import { TransportBooking, Location, LocationMaster } from '@/lib/umrah/types';

interface ZiyarathEntry {
  id: string;
  ziyarathId: string;
  date: string;
  time: string;
}

interface JourneyFlowSummaryProps {
  transportSegments: TransportBooking[];
  ziyaraths?: ZiyarathEntry[];
  locations: Location[];
  locationMasters: LocationMaster[];
}

export const JourneyFlowSummary: React.FC<JourneyFlowSummaryProps> = ({
  transportSegments,
  ziyaraths = [],
  locations,
  locationMasters,
}) => {
  const flowItems = useMemo(() => {
    const items: Array<{ 
      city: string; 
      locationName: string; 
      date?: string; 
      time?: string;
      ziyarathInfo?: { name: string; date: string; time: string };
    }> = [];
    
    // Create a map of ziyaraths by city (normalized city name)
    const ziyarathByCity = new Map<string, { name: string; date: string; time: string }>();
    ziyaraths.forEach((ziyarath) => {
      const ziyarathLocation = locationMasters.find((lm) => lm.id === ziyarath.ziyarathId);
      if (ziyarathLocation) {
        const cityName = (ziyarathLocation.city || '').toLowerCase().trim();
        ziyarathByCity.set(cityName, {
          name: ziyarathLocation.name,
          date: ziyarath.date,
          time: ziyarath.time,
        });
      }
    });
    
    // Process transport segments only (movements between locations)
    if (transportSegments.length > 0) {
      // Process first segment's "from"
      const firstSegment = transportSegments[0];
      if (firstSegment.fromLocationId) {
        const fromCity = locations.find((l) => l.id === firstSegment.fromLocationId);
        const fromLocation = firstSegment.fromHotelId 
          ? locationMasters.find((lm) => lm.id === firstSegment.fromHotelId)
          : null;
        
        if (fromCity) {
          const cityName = fromCity.destinationName || fromCity.city || 'Unknown City';
          const locationName = fromLocation ? fromLocation.name : (fromCity.destinationName || 'City Center');
          
          items.push({
            city: cityName,
            locationName,
            date: firstSegment.travelDate,
            time: firstSegment.travelTime,
            ziyarathInfo: ziyarathByCity.get(cityName.toLowerCase()),
          });
        }
      }

      // Process all segments' "to" locations
      transportSegments.forEach((segment) => {
        if (segment.toLocationId) {
          const toCity = locations.find((l) => l.id === segment.toLocationId);
          const toLocation = segment.toHotelId 
            ? locationMasters.find((lm) => lm.id === segment.toHotelId)
            : null;
          
          if (toCity) {
            // Avoid duplicates if same as previous (same city and location)
            const lastItem = items[items.length - 1];
            const cityName = toCity.destinationName || toCity.city || 'Unknown City';
            const locationName = toLocation ? toLocation.name : (toCity.destinationName || 'City Center');
            
            // Only add if different city/location
            if (!lastItem || lastItem.city !== cityName || lastItem.locationName !== locationName) {
              items.push({
                city: cityName,
                locationName,
                date: segment.travelDate,
                time: segment.travelTime,
                ziyarathInfo: ziyarathByCity.get(cityName.toLowerCase()),
              });
            }
          }
        }
      });
    }

    return items;
  }, [transportSegments, ziyaraths, locations, locationMasters]);

  if (flowItems.length === 0) return null;

  return (
    <Card className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-gray-900">Journey Overview</h4>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {flowItems.map((item, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col gap-1">
              {/* Main location card */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-sm border bg-white border-blue-100">
                <span className="font-medium text-gray-900">{item.city}</span>
                {item.locationName !== item.city && (
                  <span className="text-xs px-2 py-0.5 rounded text-gray-600 bg-gray-100">
                    {item.locationName}
                  </span>
                )}
                {item.date && (() => {
                  const d = new Date(item.date);
                  if (isNaN(d.getTime())) return null;
                  return (
                    <span className="text-xs font-medium text-blue-600">
                      {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      {item.time && (() => {
                        const t = new Date(`2000-01-01T${item.time}`);
                        if (isNaN(t.getTime())) return null;
                        return (
                          <span className="ml-1">
                            {t.toLocaleTimeString('en-GB', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                        );
                      })()}
                    </span>
                  );
                })()}
              </div>
              
              {/* Ziyarath info badge (if available for this city) */}
              {item.ziyarathInfo && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 ml-2">
                  <span className="text-xs text-green-700 font-medium">Ziyarath:</span>
                  <span className="text-xs text-green-700">{item.ziyarathInfo.name}</span>
                  {(() => {
                    const d = new Date(item.ziyarathInfo.date);
                    if (isNaN(d.getTime())) return null;
                    return (
                      <span className="text-xs text-green-600">
                        {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        {item.ziyarathInfo.time && (() => {
                          const t = new Date(`2000-01-01T${item.ziyarathInfo.time}`);
                          if (isNaN(t.getTime())) return null;
                          return (
                            <span className="ml-1">
                              {t.toLocaleTimeString('en-GB', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </span>
                          );
                        })()}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
            
            {index < flowItems.length - 1 && (
              <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0 self-center" />
            )}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};

