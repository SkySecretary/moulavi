// Step 1: Booking Mode Component

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Step1Data } from '@/lib/umrah/types';
import { partyAPI } from '@/lib/api';
import { Party } from '@/types';
import { cn } from '@/lib/utils';
import { ShieldCheck, PlaneTakeoff, Building2, KeyRound } from 'lucide-react';

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
                )}>
                  {data.visaType === 're_entry' ? 'Visa Number' : 'Group Number'}
                </h3>
                <p className={cn(
                  "text-[10px] font-medium opacity-60",
                  data.bookingMode === 'group_number' ? "text-secondary" : "text-muted-foreground"
                )}>
                  {data.visaType === 're_entry' ? 'Umrah Visa Info' : 'Masar Login'}
                </p>
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
                <Label htmlFor="groupNumber" className="text-[10px] font-bold text-primary/60 uppercase ml-1">
                  {data.visaType === 're_entry' ? 'Visa Number *' : 'Group Number *'}
                </Label>
                <div className="relative">
                  <Input
                    id="groupNumber"
                    placeholder={data.visaType === 're_entry' ? 'Enter visa number' : 'Enter group number'}
                    value={data.visaType === 're_entry' ? (data.umrahVisaNumber || '') : (data.groupNumber || '')}
                    onChange={(e) => {
                      if (data.visaType === 're_entry') {
                        onChange({ umrahVisaNumber: e.target.value });
                      } else {
                        onChange({ groupNumber: e.target.value });
                      }
                    }}
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
