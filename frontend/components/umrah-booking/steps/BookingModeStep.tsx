// Step 1: Booking Mode Component

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Step1Data } from '@/lib/umrah/types';
import { partyAPI } from '@/lib/api';
import { Party } from '@/types';
import { cn } from '@/lib/utils';
import { ShieldCheck, PlaneTakeoff, Building2, KeyRound, Users } from 'lucide-react';

interface BookingModeStepProps {
  data: Step1Data;
  onChange: (data: Partial<Step1Data>) => void;
  disabled?: boolean;
}

export const BookingModeStep: React.FC<BookingModeStepProps> = ({
  data,
  onChange,
  disabled = false,
}) => {
  if (data.visaType === 're_entry') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-primary/5 rounded-2xl p-6 border border-secondary/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
            <Users className="h-24 w-24 text-primary" />
          </div>
          <div className="relative z-10 max-w-sm space-y-3">
            <Label htmlFor="passengerCount" className="text-xs font-bold text-primary uppercase tracking-wider ml-1">
              Number of Passengers (Pax) *
            </Label>
            <div className="relative">
              <Input
                id="passengerCount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter number of passengers"
                value={data.passengerCount || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) {
                    onChange({ 
                      passengerCount: val ? parseInt(val) : undefined,
                      bookingMode: 'travel_details'
                    });
                  }
                }}
                disabled={disabled}
                className="h-12 bg-white border-gray-100 rounded-lg font-bold text-primary focus:ring-secondary/20 text-base pl-12 shadow-sm"
              />
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary" />
            </div>
            <p className="text-[10px] text-muted-foreground ml-1">
              Enter the total count of travelers in this booking.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [umrahVisaProviders, setUmrahVisaProviders] = useState<Party[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  useEffect(() => {
    const loadUmrahVisaProviders = async () => {
      setLoadingProviders(true);
      try {
        const response = await partyAPI.getAll({ 
          supplier_service_type: 'umrah_service',
          limit: 1000 
        });
        setUmrahVisaProviders(response.data.parties || []);
      } catch (error) {
        console.error('Error loading umrah visa providers:', error);
        setUmrahVisaProviders([]);
      } finally {
        setLoadingProviders(false);
      }
    };

    if (data.bookingMode) {
      loadUmrahVisaProviders();
    }
  }, [data.bookingMode]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4">
        <Label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">Select Booking Mode *</Label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Group Number */}
          <div 
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-500 group cursor-pointer overflow-hidden",
              data.bookingMode === 'group_number' 
                ? "bg-primary border-primary shadow-md scale-[1.01]" 
                : "bg-white border-secondary/10 hover:border-secondary/30"
            )}
            onClick={() => !disabled && onChange({ bookingMode: 'group_number' })}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-500",
                data.bookingMode === 'group_number' ? "bg-white text-primary" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"
              )}>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className={cn(
                  "text-sm font-bold tracking-tight",
                  data.bookingMode === 'group_number' ? "text-white" : "text-primary"
                )}>Group Number</h3>
                <p className={cn(
                  "text-[10px] font-medium opacity-60",
                  data.bookingMode === 'group_number' ? "text-secondary" : "text-muted-foreground"
                )}>Masar Login</p>
              </div>
            </div>
          </div>
          
          {/* Option 2: Travel Details */}
          <div 
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-500 group cursor-pointer overflow-hidden",
              data.bookingMode === 'travel_details' 
                ? "bg-primary border-primary shadow-md scale-[1.01]" 
                : "bg-white border-secondary/10 hover:border-secondary/30"
            )}
            onClick={() => !disabled && onChange({ bookingMode: 'travel_details' })}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-500",
                data.bookingMode === 'travel_details' ? "bg-white text-primary" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"
              )}>
                <PlaneTakeoff className="h-4 w-4" />
              </div>
              <div>
                <h3 className={cn(
                  "text-sm font-bold tracking-tight",
                  data.bookingMode === 'travel_details' ? "text-white" : "text-primary"
                )}>Travel Details</h3>
                <p className={cn(
                  "text-[10px] font-medium opacity-60",
                  data.bookingMode === 'travel_details' ? "text-secondary" : "text-muted-foreground"
                )}>Itinerary Info</p>
              </div>
            </div>
          </div>
        </div>

        {data.bookingMode === 'group_number' && (
          <div className="mt-6 p-6 rounded-2xl bg-gray-50/50 border border-secondary/10 space-y-4 animate-in zoom-in-95 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="groupNumber" className="text-[10px] font-bold text-primary/60 uppercase ml-1">Group Number *</Label>
                <div className="relative">
                  <Input
                    id="groupNumber"
                    placeholder="Enter group number"
                    value={data.groupNumber || ''}
                    onChange={(e) => onChange({ groupNumber: e.target.value })}
                    disabled={disabled}
                    className="h-10 bg-white border-gray-100 rounded-lg font-bold text-primary focus:ring-secondary/20 pl-10 text-xs"
                  />
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="groupName" className="text-[10px] font-bold text-primary/60 uppercase ml-1">Group Name *</Label>
                <div className="relative">
                  <Input
                    id="groupName"
                    placeholder="Enter group name"
                    value={data.groupName || ''}
                    onChange={(e) => onChange({ groupName: e.target.value })}
                    disabled={disabled}
                    className="h-10 bg-white border-gray-100 rounded-lg font-bold text-primary focus:ring-secondary/20 pl-10 text-xs"
                  />
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="umrahVisaProviderId" className="text-[10px] font-bold text-primary/60 uppercase ml-1">Umrah Visa Providing Company *</Label>
                <Select
                  value={data.umrahVisaProviderId || ''}
                  onValueChange={(value) => onChange({ umrahVisaProviderId: value })}
                  disabled={disabled || loadingProviders}
                >
                  <SelectTrigger className="h-10 bg-white border-gray-100 rounded-lg font-bold text-primary focus:ring-secondary/20 shadow-sm text-xs">
                    <SelectValue placeholder={loadingProviders ? "Loading..." : "Select provider"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-2xl p-1">
                    {umrahVisaProviders.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id} className="font-bold text-[10px] p-2 hover:bg-primary/5 rounded-md transition-colors">
                        {provider.partyCode || provider.partyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {data.bookingMode === 'travel_details' && (
          <div className="mt-6 p-6 rounded-2xl bg-gray-50/50 border border-secondary/10 space-y-4 animate-in zoom-in-95 duration-500">
            <div className="space-y-1.5">
              <Label htmlFor="umrahVisaProviderId" className="text-[10px] font-bold text-primary/60 uppercase ml-1">Umrah Visa Providing Company</Label>
              <Select
                value={data.umrahVisaProviderId || ''}
                onValueChange={(value) => onChange({ umrahVisaProviderId: value })}
                disabled={disabled || loadingProviders}
              >
                <SelectTrigger className="h-10 bg-white border-gray-100 rounded-lg font-bold text-primary focus:ring-secondary/20 shadow-sm text-xs">
                  <SelectValue placeholder={loadingProviders ? "Loading..." : "Select provider (optional)"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-0 shadow-2xl p-1">
                  {umrahVisaProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id} className="font-bold text-[10px] p-2 hover:bg-primary/5 rounded-md transition-colors">
                      {provider.partyCode || provider.partyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
