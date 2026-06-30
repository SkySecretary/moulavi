'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { partyAPI } from '@/lib/api';
import { Search, Edit, Trash2, Eye, Download } from 'lucide-react';
import { Party, PaginationInfo } from '@/types';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

const getComplianceStatus = (party: Party) => {
  const metrics = party.complianceMetrics;
  if (!metrics) {
    return { label: 'Compliant', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' };
  }
  
  if (metrics.complianceStatus === 'RED') {
    return { label: 'Suspended (Red)', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' };
  }
  if (metrics.complianceStatus === 'YELLOW') {
    return { label: 'Throttled (Yellow)', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
  }
  return { label: 'Compliant (Green)', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' };
};

interface PartyTableProps {
  parties: Party[];
  loading: boolean;
  pagination: PaginationInfo | null;
  searchTerm: string;
  filterType: 'all' | 'direct' | 'b2b';
  selectedParties: string[];
  setSearchTerm: (value: string) => void;
  onFilterChange: (type: 'all' | 'direct' | 'b2b') => void;
  onSelectParty: (partyId: string) => void;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  onPartyDeleted: () => void;
  onPageChange: (page: number) => void;
  onEditParty: (party: Party) => void;
  onViewParty: (party: Party) => void;
}

export default function PartyTable({
  parties,
  loading,
  pagination,
  searchTerm,
  filterType,
  selectedParties,
  setSearchTerm,
  onFilterChange,
  onSelectParty,
  onSelectAll,
  onBulkDelete,
  onPartyDeleted,
  onPageChange,
  onEditParty,
  onViewParty
}: PartyTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    party: Party | null;
    loading: boolean;
  }>({
    open: false,
    party: null,
    loading: false
  });

  const handleDeleteParty = (party: Party) => {
    setDeleteDialog({
      open: true,
      party,
      loading: false
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.party) return;

    setDeleteDialog(prev => ({ ...prev, loading: true }));

    try {
      await partyAPI.delete(deleteDialog.party.id);
      toast.success('Party deleted successfully!');
      onPartyDeleted();
      setDeleteDialog({ open: false, party: null, loading: false });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete party');
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search parties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('all')}
          >
            All
          </Button>
          <Button
            variant={filterType === 'direct' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('direct')}
          >
            Direct Customers
          </Button>
          <Button
            variant={filterType === 'b2b' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('b2b')}
          >
            B2B Agents
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {/* Desktop Table Skeleton */}
          <div className="hidden lg:block">
            {/* Table Header Skeleton */}
            <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg">
              <Skeleton className="col-span-1 h-4" />
              <Skeleton className="col-span-3 h-4" />
              <Skeleton className="col-span-2 h-4" />
              <Skeleton className="col-span-2 h-4" />
              <Skeleton className="col-span-2 h-4" />
              <Skeleton className="col-span-2 h-4" />
            </div>

            {/* Table Rows Skeleton */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 p-3 border rounded-lg">
                <Skeleton className="col-span-1 h-4" />
                <div className="col-span-3 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="col-span-2 h-6 w-16" />
                <Skeleton className="col-span-2 h-6 w-12" />
                <div className="col-span-2 flex gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Card Skeleton */}
          <div className="lg:hidden">
            {/* Select All Header Skeleton */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>

            {/* Card Skeleton */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                {/* Card Header Skeleton */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-4 w-4 mt-1" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>

                {/* Card Content Skeleton */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-10" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="pt-1 border-t">
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : parties.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No parties found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first party'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={selectedParties.length === parties.length && parties.length > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300"
            />
          </div>
          <div className="col-span-1">ID</div>
          <div className="col-span-2">Party Name</div>
          <div className="col-span-2">Contact</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-1">Currency</div>
          <div className="col-span-2 text-center">Compliance</div>
          <div className="col-span-2">Actions</div>
        </div>

        {/* Table Rows */}
        {parties.map((party) => {
          const compliance = getComplianceStatus(party);
          return (
            <div
              key={party.id}
              className="grid grid-cols-12 gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedParties.includes(party.id)}
                  onChange={() => onSelectParty(party.id)}
                  className="rounded border-gray-300"
                />
              </div>
              <div className="col-span-1">
                <div className="text-sm font-medium text-gray-900">
                  {party.partyCode || '—'}
                </div>
              </div>
              <div className="col-span-2">
                {party.isCustomer ? (
                  <Link
                    href={`/dashboard/masters/party/${party.id}`}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {party.partyName}
                  </Link>
                ) : (
                  <div className="font-medium text-gray-900">{party.partyName}</div>
                )}
                <div className="text-sm text-gray-500">{party.email}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-900">
                  {party.contactNumber || 'N/A'}
                </div>
                {party.whatsappNumber && (
                  <div className="text-xs text-gray-500">
                    WA: {party.whatsappNumber}
                  </div>
                )}
              </div>
              <div className="col-span-1">
                <Badge 
                  variant={party.customerType === 'b2b' ? 'info' : 'success'}
                  className="text-[10px] px-1"
                >
                  {party.customerType.toUpperCase()}
                </Badge>
              </div>
              <div className="col-span-1">
                <Badge variant="outline" className="text-[10px] px-1">
                  {party.accountCurrency?.currencyCode || 'N/A'}
                </Badge>
              </div>
              <div className="col-span-2 flex justify-center items-center">
                 <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${compliance.bg} ${compliance.text} text-[10px] font-bold border border-current opacity-80`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${compliance.color} animate-pulse`}></div>
                    {compliance.label}
                 </div>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewParty(party)}
                    className="h-8 w-8 p-0"
                    title="View party details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditParty(party)}
                    className="h-8 w-8 p-0"
                    title="Edit party"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteParty(party)}
                    className="h-8 w-8 p-0 text-primary hover:text-destructive hover:bg-destructive/5"
                    title="Delete party"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden">
        {/* Select All Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedParties.length === parties.length && parties.length > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All ({parties.length})
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {selectedParties.length} selected
          </span>
        </div>

        {/* Party Cards */}
        <div className="space-y-3">
          {parties.map((party) => (
            <div
              key={party.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedParties.includes(party.id)}
                    onChange={() => onSelectParty(party.id)}
                    className="rounded border-gray-300 mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">
                      {party.isCustomer ? (
                        <Link href={`/dashboard/masters/party/${party.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                          {party.partyName}
                        </Link>
                      ) : (
                        <span className="text-gray-900">{party.partyName}</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {party.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewParty(party)}
                    className="h-8 w-8 p-0"
                    title="View party details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditParty(party)}
                    className="h-8 w-8 p-0"
                    title="Edit party"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteParty(party)}
                    className="h-8 w-8 p-0 text-primary hover:text-destructive hover:bg-destructive/5"
                    title="Delete party"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Card Content */}
              <div className="space-y-2">
                {/* Contact Info */}
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-500">Contact:</span>
                    <span className="ml-2 text-gray-900">
                      {party.contactNumber || 'N/A'}
                    </span>
                  </div>
                  {party.whatsappNumber && (
                    <div className="text-xs text-gray-500">
                      WA: {party.whatsappNumber}
                    </div>
                  )}
                </div>

                {/* Type and Currency */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={party.customerType === 'b2b' ? 'info' : 'success'}
                      className="text-xs"
                    >
                      {party.customerType.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {party.accountCurrency?.currencyCode || 'N/A'}
                    </Badge>
                  </div>
                  {party.loginRequired && (
                    <div className="text-xs text-indigo-600 font-medium">
                      ✓ Login enabled
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                {party.address && (
                  <div className="text-xs text-gray-500 pt-1 border-t">
                    <span className="font-medium">Address:</span> {party.address}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Delete Party"
        message="Are you sure you want to delete this party? This will permanently remove all associated data."
        itemName={deleteDialog.party?.partyName}
        onConfirm={confirmDelete}
        loading={deleteDialog.loading}
        type="single"
      />
    </div>
  );
}
