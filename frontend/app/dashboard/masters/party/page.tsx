'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { partyAPI } from '@/lib/api';
import PartyStatsCards from '@/components/PartyStatsCards';
import PartyTable from '@/components/PartyTable';
import CreatePartyDialog from '@/components/CreatePartyDialog';
import ViewPartyDialog from '@/components/ViewPartyDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { useParties } from '@/hooks/useParties';
import { Party } from '@/types';
import { Plus, Trash2, Download } from 'lucide-react';

export default function PartyMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [viewingParty, setViewingParty] = useState<Party | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    open: boolean;
    loading: boolean;
  }>({
    open: false,
    loading: false
  });
  
  // Use custom hook for party management
  const {
    parties,
    loading,
    searchTerm,
    page,
    pagination,
    selectedParties,
    filterType,
    totalStats,
    setSearchTerm,
    handleFilterChange,
    handlePageChange,
    handleSelectParty,
    handleSelectAll,
    handleBulkDelete,
    handlePartyDeleted,
    refreshParties,
  } = useParties();

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
  }, [user, router]);

  const handlePartyCreated = () => {
    setShowCreateDialog(false);
    setEditingParty(null);
    refreshParties();
    toast.success('Party created successfully!');
  };

  const handlePartyUpdated = () => {
    setEditingParty(null);
    refreshParties();
    toast.success('Party updated successfully!');
  };

  const handleEditParty = (party: Party) => {
    setEditingParty(party);
    setShowCreateDialog(true);
  };

  const handleViewParty = (party: Party) => {
    router.push(`/dashboard/masters/party/${party.id}`);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingParty(null);
  };

  const handleBulkDeleteClick = () => {
    if (selectedParties.length === 0) {
      toast.error('Please select parties to delete');
      return;
    }

    setBulkDeleteDialog({
      open: true,
      loading: false
    });
  };

  const confirmBulkDelete = async () => {
    setBulkDeleteDialog(prev => ({ ...prev, loading: true }));

    const success = await handleBulkDelete();
    if (success) {
      toast.success(`${selectedParties.length} party(ies) deleted successfully!`);
      setBulkDeleteDialog({ open: false, loading: false });
    } else {
      setBulkDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex-1">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Party Master</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Manage all party/client information
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            size="sm"
          >
            <Plus className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Add New Party</span>
          </Button>
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-6">
        {/* Stats Cards */}
        <PartyStatsCards 
          parties={parties}
          pagination={pagination}
          loading={loading}
          totalStats={totalStats}
        />

        {/* Party Management */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-semibold">Party Management</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Manage all your clients and business partners
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedParties.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDeleteClick}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedParties.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Export functionality coming soon')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
             <PartyTable
               parties={parties}
               loading={loading}
               pagination={pagination}
               searchTerm={searchTerm}
               filterType={filterType}
               selectedParties={selectedParties}
               setSearchTerm={setSearchTerm}
               onFilterChange={handleFilterChange}
               onSelectParty={handleSelectParty}
               onSelectAll={handleSelectAll}
               onBulkDelete={handleBulkDeleteClick}
               onPartyDeleted={handlePartyDeleted}
               onPageChange={handlePageChange}
               onEditParty={handleEditParty}
               onViewParty={handleViewParty}
             />
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Party Dialog */}
      <CreatePartyDialog
        open={showCreateDialog}
        onOpenChange={handleCloseDialog}
        editingParty={editingParty}
        title={editingParty ? 'Edit Party' : 'Create New Party'}
        onSubmit={async (partyData) => {
          try {
            if (editingParty) {
              const response = await partyAPI.update(editingParty.id, partyData);
              handlePartyUpdated();
              return response.data; // Return the updated party data
            } else {
              const response = await partyAPI.create(partyData);
              handlePartyCreated();
              return response.data; // Return the created party data
            }
          } catch (error) {
            throw error; // Re-throw to let the dialog handle the error display
          }
        }}
      />

      {/* View Party Dialog */}
      <ViewPartyDialog
        open={!!viewingParty}
        onOpenChange={(open) => !open && setViewingParty(null)}
        party={viewingParty}
        onEdit={handleEditParty}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialog.open}
        onOpenChange={(open) => setBulkDeleteDialog(prev => ({ ...prev, open }))}
        title="Delete Parties"
        message="Are you sure you want to delete the selected parties? This will permanently remove all associated data."
        onConfirm={confirmBulkDelete}
        loading={bulkDeleteDialog.loading}
        type="bulk"
        count={selectedParties.length}
      />
    </div>
  );
}
