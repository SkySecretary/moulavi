'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { CurrencyMaster, CreateCurrencyMasterRequest } from '@/types';

interface CurrencyFormProps {
  formData: CreateCurrencyMasterRequest;
  editingCurrency: CurrencyMaster | null;
  onFormDataChange: (data: CreateCurrencyMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function CurrencyForm({ 
  formData, 
  editingCurrency, 
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: CurrencyFormProps) {
  const handleInputChange = (field: keyof CreateCurrencyMasterRequest, value: string | number) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currencyCode">Currency Code *</Label>
          <Input
            id="currencyCode"
            placeholder="e.g., SAR, USD, AED"
            value={formData.currencyCode}
            onChange={(e) => handleInputChange('currencyCode', e.target.value.toUpperCase())}
            required
            maxLength={3}
          />
          <p className="text-xs text-gray-500">3-letter currency code (ISO 4217)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currencyName">Currency Name *</Label>
          <Input
            id="currencyName"
            placeholder="e.g., Saudi Riyal, US Dollar, UAE Dirham"
            value={formData.currencyName}
            onChange={(e) => handleInputChange('currencyName', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="symbol">Symbol *</Label>
          <Input
            id="symbol"
            placeholder="e.g., ﷼, $, د.إ"
            value={formData.symbol}
            onChange={(e) => handleInputChange('symbol', e.target.value)}
            required
            maxLength={10}
          />
          <p className="text-xs text-gray-500">Currency symbol used for display</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="exchangeRate">Exchange Rate (1 Unit = ? INR) *</Label>
          <Input
            id="exchangeRate"
            type="number"
            step="0.0001"
            placeholder="e.g., 22.5"
            value={formData.exchangeRate || ''}
            onChange={(e) => handleInputChange('exchangeRate', parseFloat(e.target.value))}
            required
          />
          <p className="text-xs text-gray-500">Rate to convert this currency to INR (e.g., 1 SAR = 22.5 INR)</p>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button type="submit" className="flex-1">
            {editingCurrency ? 'Update Currency' : 'Create Currency'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
