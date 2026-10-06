import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Step1Data } from '@/lib/umrah/types';
import { partyAPI } from '@/lib/api';
import { Party } from '@/types';
import { User, Phone } from 'lucide-react';

interface GroupDetailsStepProps {
  data: Step1Data;
  onChange: (data: Partial<Step1Data>) => void;
  disabled?: boolean;
}

export const GroupDetailsStep: React.FC<GroupDetailsStepProps> = ({
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

    loadUmrahVisaProviders();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-base font-medium">Group Information *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="groupNumber">Group Number *</Label>
            <Input
              id="groupNumber"
              placeholder="Enter group number"
              value={data.groupNumber || ''}
              onChange={(e) => onChange({ groupNumber: e.target.value.replace(/\s+/g, '') })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              placeholder="Enter group name"
              value={data.groupName || ''}
              onChange={(e) => onChange({ groupName: e.target.value })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="umrahVisaProviderId">Umrah Visa Providing Company *</Label>
            <Select
              value={data.umrahVisaProviderId || ''}
              onValueChange={(value) => onChange({ umrahVisaProviderId: value })}
              disabled={disabled || loadingProviders}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingProviders ? "Loading..." : "Select umrah visa provider"} />
              </SelectTrigger>
              <SelectContent>
                {umrahVisaProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.partyCode || provider.partyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Guest Details Section (Optional) */}
      <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-200/80 space-y-3">
        <div>
          <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary" />
            Guest Details <span className="text-[10px] font-normal text-muted-foreground">(Optional - defaults to agency if left blank)</span>
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="groupGuestName" className="text-xs font-medium text-gray-700">
              Guest Name
            </Label>
            <div className="relative">
              <Input
                id="groupGuestName"
                placeholder="Defaults to agency name"
                value={data.guestName || ''}
                onChange={(e) => onChange({ guestName: e.target.value })}
                disabled={disabled}
                className="pl-9 text-xs"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="groupGuestMobile" className="text-xs font-medium text-gray-700">
              Guest Number / Phone
            </Label>
            <div className="relative">
              <Input
                id="groupGuestMobile"
                placeholder="Defaults to agency phone"
                value={data.guestMobile || ''}
                onChange={(e) => onChange({ guestMobile: e.target.value })}
                disabled={disabled}
                className="pl-9 text-xs"
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
