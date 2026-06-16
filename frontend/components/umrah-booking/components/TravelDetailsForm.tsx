import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Plane, MapPin, Clock, ArrowRightLeft } from 'lucide-react';
import { Airport, Step2Data } from '@/lib/umrah/types';
import { formatFlightNumber, toDisplayDate, fromDisplayDate } from '@/lib/umrah/validation';
import { cn } from '@/lib/utils';
import { TimePicker } from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';

interface TravelDetailsFormProps {
  data: Step2Data;
  onChange: (data: Partial<Step2Data>) => void;
  airports: Airport[];
  disabled?: boolean;
  durationDays?: number;
  durationError?: string;
  onDateChange?: (field: 'arrivalDate' | 'departureDate', value: string) => void;
  onAirportChange?: (field: 'arrivalAirportId' | 'departureAirportId', value: string) => void;
}

export const TravelDetailsForm: React.FC<TravelDetailsFormProps> = ({
  data,
  onChange,
  airports,
  disabled = false,
  durationDays = 0,
  durationError = '',
  onDateChange,
  onAirportChange,
}) => {
  const handleDateChange = (field: 'arrivalDate' | 'departureDate', value: string) => {
    if (onDateChange) {
      onDateChange(field, value);
    } else {
      onChange({ [field]: value });
    }
  };

  const handleAirportChange = (field: 'arrivalAirportId' | 'departureAirportId', value: string) => {
    if (onAirportChange) {
      onAirportChange(field, value);
    } else {
      onChange({ [field]: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Desktop Table Architecture - More Compact */}
      <div className="hidden lg:block overflow-hidden rounded-2xl border border-secondary/10 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-primary/5">
              <th className="px-6 py-3 text-left text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] w-[150px]">
                Vector
              </th>
              <th className="px-6 py-3 text-left text-[8px] font-black text-primary/40 uppercase tracking-[0.2em]">
                Entry/Exit Hub
              </th>
              <th className="px-6 py-3 text-left text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] w-[220px]">
                Carrier
              </th>
              <th className="px-6 py-3 text-left text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] w-[150px]">
                Timeline
              </th>
              <th className="px-6 py-3 text-left text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] w-[120px]">
                Time (24h)
              </th>
              <th className="px-6 py-3 text-left text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] w-[150px]">
                Travel BRN
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {/* Arrival Vector */}
            <tr className="group hover:bg-emerald-50/20 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-all shadow-sm">
                    <Plane className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-black text-primary uppercase italic">Arrival</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <Select
                  value={data.arrivalAirportId}
                  onValueChange={(value) => handleAirportChange('arrivalAirportId', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-12 border-gray-100 rounded-lg font-semibold text-primary focus:ring-secondary/20 bg-gray-50/30 text-base">
                    <SelectValue placeholder="Select Hub" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-2xl p-1">
                    {airports.map((airport) => (
                      <SelectItem key={airport.id} value={airport.id} className="font-medium text-base p-3">
                        {airport.airportCode} • {airport.airportName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-6 py-4">
                <Input
                  placeholder="SV-XXXX"
                  value={data.arrivalFlightNumber}
                  onChange={(e) => {
                    const formatted = formatFlightNumber(e.target.value);
                    onChange({ arrivalFlightNumber: formatted });
                  }}
                  disabled={disabled}
                  className="h-12 border-gray-100 rounded-lg font-bold text-secondary focus:ring-secondary/20 bg-gray-50/30 text-center tracking-widest text-sm"
                />
              </td>
              <td className="px-6 py-4">
                <DatePicker
                  value={data.arrivalDate}
                  onChange={(val) => handleDateChange('arrivalDate', val)}
                  disabled={disabled}
                />
              </td>
              <td className="px-6 py-4">
                <TimePicker
                  value={data.arrivalTime || ''}
                  onChange={(value) => onChange({ arrivalTime: value })}
                  disabled={disabled}
                  className="h-12"
                />
              </td>
            </tr>

            {/* Departure Vector */}
            <tr className="group hover:bg-secondary/5 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary border border-primary/10 group-hover:scale-110 transition-all shadow-sm">
                    <Plane className="h-4 w-4 -rotate-45" />
                  </div>
                  <span className="text-xs font-black text-primary uppercase italic">Depart</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <Select
                  value={data.departureAirportId}
                  onValueChange={(value) => handleAirportChange('departureAirportId', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-12 border-gray-100 rounded-lg font-semibold text-primary focus:ring-secondary/20 bg-gray-50/30 text-base">
                    <SelectValue placeholder="Select Hub" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-2xl p-1">
                    {airports.map((airport) => (
                      <SelectItem key={airport.id} value={airport.id} className="font-medium text-base p-3">
                        {airport.airportCode} • {airport.airportName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-6 py-4">
                <Input
                  placeholder="SV-XXXX"
                  value={data.departureFlightNumber}
                  onChange={(e) => {
                    const formatted = formatFlightNumber(e.target.value);
                    onChange({ departureFlightNumber: formatted });
                  }}
                  disabled={disabled}
                  className="h-12 border-gray-100 rounded-lg font-bold text-secondary focus:ring-secondary/20 bg-gray-50/30 text-center tracking-widest text-sm"
                />
              </td>
              <td className="px-6 py-4">
                <DatePicker
                  value={data.departureDate}
                  onChange={(val) => handleDateChange('departureDate', val)}
                  disabled={disabled}
                />
              </td>
              <td className="px-6 py-4">
                <TimePicker
                  value={data.departureTime || ''}
                  onChange={(value) => onChange({ departureTime: value })}
                  disabled={disabled}
                  className="h-12"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile Tactical View - More Compact */}
      <div className="lg:hidden space-y-4">
        {/* Arrival Segment */}
        <Card className="rounded-2xl border-0 shadow-lg shadow-primary/5 bg-white overflow-hidden">
          <div className="bg-emerald-50/30 px-6 py-3 border-b border-emerald-100 flex items-center gap-3">
            <Plane className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Arrival Vector</span>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[8px] font-black text-primary/40 uppercase tracking-widest ml-1">Timeline</Label>
                <DatePicker
                  value={data.arrivalDate}
                  onChange={(val) => handleDateChange('arrivalDate', val)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[8px] font-black text-primary/40 uppercase tracking-widest ml-1">Time (24h)</Label>
                <TimePicker value={data.arrivalTime || ''} onChange={(value) => onChange({ arrivalTime: value })} disabled={disabled} className="h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[8px] font-black text-primary/40 uppercase tracking-widest ml-1">Hub</Label>
              <Select value={data.arrivalAirportId} onValueChange={(value) => handleAirportChange('arrivalAirportId', value)} disabled={disabled}>
                <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50/30 font-semibold text-primary text-sm">
                  <SelectValue placeholder="Select Hub" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-0 shadow-2xl">
                  {airports.map(a => <SelectItem key={a.id} value={a.id} className="text-sm font-medium">{a.airportCode} - {a.airportName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[8px] font-black text-primary/40 uppercase tracking-widest ml-1">Flight Number</Label>
              <Input
                placeholder="SV-XXXX"
                value={data.arrivalFlightNumber}
                onChange={(e) => {
                  const formatted = formatFlightNumber(e.target.value);
                  onChange({ arrivalFlightNumber: formatted });
                }}
                disabled={disabled}
                className="h-10 rounded-xl border-gray-100 bg-gray-50/30 font-bold text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Departure Segment */}
        <Card className="rounded-2xl border-0 shadow-lg shadow-primary/5 bg-white overflow-hidden">
          <div className="bg-primary/5 px-6 py-3 border-b border-secondary/10 flex items-center gap-3">
            <Plane className="h-4 w-4 text-primary -rotate-45" />
            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Exit Vector</span>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[8px] font-black text-primary/40 uppercase tracking-widest ml-1">Timeline</Label>
                <DatePicker
                  value={data.departureDate}
                  onChange={(val) => handleDateChange('departureDate', val)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[8px] font-black text-primary/40 uppercase tracking-widest ml-1">Time (24h)</Label>
                <TimePicker value={data.departureTime || ''} onChange={(value) => onChange({ departureTime: value })} disabled={disabled} className="h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[8px] font-black text-primary/40 uppercase tracking-widest ml-1">Hub</Label>
              <Select value={data.departureAirportId} onValueChange={(value) => handleAirportChange('departureAirportId', value)} disabled={disabled}>
                <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50/30 font-semibold text-primary text-sm">
                  <SelectValue placeholder="Select Hub" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-0 shadow-2xl">
                  {airports.map(a => <SelectItem key={a.id} value={a.id} className="text-sm font-medium">{a.airportCode} - {a.airportName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[8px] font-black text-primary/40 uppercase tracking-widest ml-1">Flight Number</Label>
              <Input
                placeholder="SV-XXXX"
                value={data.departureFlightNumber}
                onChange={(e) => {
                  const formatted = formatFlightNumber(e.target.value);
                  onChange({ departureFlightNumber: formatted });
                }}
                disabled={disabled}
                className="h-10 rounded-xl border-gray-100 bg-gray-50/30 font-bold text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

