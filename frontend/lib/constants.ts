import { UmrahVisaStatus, VisaType } from '@/types';

export const UMRAH_VISA_STATUS_CONFIG: Record<UmrahVisaStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-900 border border-yellow-200' },
  documents_downloaded: { label: 'Documents Downloaded', color: 'bg-purple-50 text-purple-900 border border-purple-200' },
  group_assigned: { label: 'Group Assigned', color: 'bg-blue-50 text-blue-900 border border-blue-200' },
  voucher: { label: 'Voucher Pending', color: 'bg-orange-50 text-orange-900 border border-orange-200' },
  bill: { label: 'Bill Ready', color: 'bg-indigo-50 text-indigo-900 border border-indigo-200' },
  booking_success: { label: 'Booking Success', color: 'bg-green-50 text-green-900 border border-green-200' },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/5 text-red-900 border border-red-200' },
};

export const VISA_TYPE_CONFIG: Record<VisaType, { label: string; color: string }> = {
  individual_visa: { label: 'Individual Visa', color: 'bg-blue-50 text-blue-900 border border-blue-200' },
  group_visa: { label: 'Group Visa', color: 'bg-green-50 text-green-900 border border-green-200' },
  re_entry: { label: 'Re-Entry', color: 'bg-amber-50 text-amber-900 border border-amber-200' },
};

export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
