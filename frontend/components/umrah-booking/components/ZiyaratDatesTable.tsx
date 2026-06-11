import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HotelBooking } from '@/lib/umrah/types';

// Helper function to add days to a date string (yyyy-MM-dd)
const addDaysToDate = (dateString: string, days: number): string => {
  try {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

// Helper function to format date string (yyyy-MM-dd) to display format
const formatDateDisplay = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateString;
  }
};

interface ZiyaratDatesTableProps {
  hotelBookings: HotelBooking[];
  locations: Array<{ id: string; destinationName: string; city?: string; cityId?: string }>;
  cities?: Array<{ id: string; name: string }>; // Optional cities data to map cityId to city name
  ziyarahDates: Array<{ cityId: string; cityName: string; date: string }>;
  onUpdateDate: (cityId: string, date: string) => void;
  disabled?: boolean;
}

export const ZiyaratDatesTable: React.FC<ZiyaratDatesTableProps> = ({
  hotelBookings,
  locations,
  cities = [],
  ziyarahDates,
  onUpdateDate,
  disabled = false,
}) => {
  // Helper to get city name from cityId
  const getCityNameFromId = (cityId: string): string => {
    const city = cities.find((c) => c.id === cityId);
    if (city) return city.name.toLowerCase();
    
    // Fallback: try to find in locations by cityId
    const location = locations.find((l) => l.cityId === cityId);
    return (location?.city || location?.destinationName || '').toLowerCase();
  };

  // Find Makkah and Madinah hotel bookings by cityId
  const makkahBooking = hotelBookings.find((hb) => {
    const cityName = getCityNameFromId(hb.cityId);
    return cityName.includes('makkah') || cityName.includes('mecca');
  });

  const madinahBooking = hotelBookings.find((hb) => {
    const cityName = getCityNameFromId(hb.cityId);
    return cityName.includes('madinah') || cityName.includes('medina') || cityName.includes('madinah');
  });

  // Get city IDs from locations
  const getCityId = (cityName: string): string | undefined => {
    const location = locations.find(
      (l) =>
        (l.city || l.destinationName || '').toLowerCase().includes(cityName.toLowerCase())
    );
    return location?.id;
  };

  const makkahCityId = getCityId('makkah');
  const madinahCityId = getCityId('madinah');

  // Auto-calculate ziyarat dates (2 days after check-in)
  const calculateZiyaratDate = (checkInDate: string): string => {
    return addDaysToDate(checkInDate, 2);
  };

  // Get or calculate ziyarat date
  const getZiyaratDate = (cityId: string | undefined, checkInDate: string | undefined): string => {
    if (!cityId || !checkInDate) return '';
    
    const existing = ziyarahDates.find((zd) => zd.cityId === cityId);
    if (existing) return existing.date;
    
    return calculateZiyaratDate(checkInDate);
  };

  const handleDateChange = (cityId: string, cityName: string, newDate: string) => {
    onUpdateDate(cityId, newDate);
  };

  const rows = [];

  if (makkahBooking && makkahCityId) {
    const cityName = getCityNameFromId(makkahBooking.cityId);
    const displayCityName = cities.find((c) => c.id === makkahBooking.cityId)?.name || 
                            locations.find((l) => l.cityId === makkahBooking.cityId)?.city ||
                            locations.find((l) => l.cityId === makkahBooking.cityId)?.destinationName ||
                            'Makkah';
    const ziyaratDate = getZiyaratDate(makkahCityId, makkahBooking.checkInDate);
    
    rows.push({
      cityId: makkahCityId,
      cityName: displayCityName,
      checkInDate: makkahBooking.checkInDate,
      ziyaratDate,
    });
  }

  if (madinahBooking && madinahCityId) {
    const cityName = getCityNameFromId(madinahBooking.cityId);
    const displayCityName = cities.find((c) => c.id === madinahBooking.cityId)?.name || 
                            locations.find((l) => l.cityId === madinahBooking.cityId)?.city ||
                            locations.find((l) => l.cityId === madinahBooking.cityId)?.destinationName ||
                            'Madinah';
    const ziyaratDate = getZiyaratDate(madinahCityId, madinahBooking.checkInDate);
    
    rows.push({
      cityId: madinahCityId,
      cityName: displayCityName,
      checkInDate: madinahBooking.checkInDate,
      ziyaratDate,
    });
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-gray-500">
          No Makkah or Madinah hotel bookings found. Ziyarat dates will be set after you add hotels for these cities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Ziyarat Dates</h4>
        <p className="text-sm text-gray-600">
          Set the dates for Ziyarat visits. Default is 2 days after hotel check-in.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>City</TableHead>
              <TableHead>Hotel Check-in Date</TableHead>
              <TableHead>Ziyarat Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.cityId}>
                <TableCell className="font-medium">{row.cityName}</TableCell>
                <TableCell>{formatDateDisplay(row.checkInDate)}</TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={row.ziyaratDate}
                    onChange={(e) => handleDateChange(row.cityId, row.cityName, e.target.value)}
                    disabled={disabled}
                    className="w-full"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

