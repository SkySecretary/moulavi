'use client';

import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, DollarSign } from 'lucide-react';

import { CurrencyMaster } from '@/types';

interface CurrencyCardProps {
  currency: CurrencyMaster;
  onEdit: (currency: CurrencyMaster) => void;
  onDelete: (currency: CurrencyMaster) => void;
  onView?: (currency: CurrencyMaster) => void;
}

export default function CurrencyCard({ 
  currency, 
  onEdit, 
  onDelete, 
  onView 
}: CurrencyCardProps) {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <span className="text-xl font-bold text-green-600">{currency.symbol}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900">{currency.currencyName} ({currency.currencyCode})</h3>
          </div>
          <p className="text-sm text-gray-600 font-medium">Rate: 1 {currency.currencyCode} = ₹{currency.exchangeRate?.toFixed(2)}</p>
          {currency.createdAt && (
            <p className="text-xs text-gray-400 mt-1">
              Created: {formatDate(currency.createdAt)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(currency)}
            title="View currency details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(currency)}
          title="Edit currency"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(currency)}
          className="text-primary hover:text-destructive"
          title="Delete currency"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
