'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { useUserMaster } from '@/hooks/useUserMaster';
import UserForm from '@/components/user/UserForm';
import UserStatsCards from '@/components/user/UserStatsCards';
import UserTable from '@/components/UserTable';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { Plus, Trash2, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'party';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'staff' | 'party';
  isActive?: boolean;
}

export default function UserMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    open: boolean;
    loading: boolean;
  }>({
    open: false,
    loading: false
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'staff' | 'party'>('all');
  const [formData, setFormData] = useState<CreateUserRequest>({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    isActive: true
  });

  const {
    users,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filteredUsers,
    pagination,
    setPagination,
    createUser,
    updateUser,
    deleteUser
  } = useUserMaster(filterRole);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = editingUser 
      ? await updateUser(editingUser.id, formData)
      : await createUser(formData);
    
    if (success) {
      if (editingUser) {
        handleUserUpdated();
      } else {
        handleUserCreated();
      }
    }
  };

  // Filter users based on role
  const filteredUsersByRole = filteredUsers.filter(user => {
    if (filterRole === 'all') return true;
    return user.role === filterRole;
  });

  const handleUserCreated = () => {
    setShowCreateForm(false);
    setEditingUser(null);
    toast.success('User created successfully!');
  };

  const handleUserUpdated = () => {
    setEditingUser(null);
    setShowCreateForm(false);
    toast.success('User updated successfully!');
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive || true
    });
    setShowCreateForm(true);
  };

  const handleViewUser = (user: User) => {
    setViewingUser(user);
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsersByRole.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsersByRole.map(user => user.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to delete');
      return false;
    }

    try {
      for (const userId of selectedUsers) {
        await deleteUser(userId);
      }
      setSelectedUsers([]);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to delete');
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
      toast.success(`${selectedUsers.length} user(s) deleted successfully!`);
      setBulkDeleteDialog({ open: false, loading: false });
    } else {
      setBulkDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleUserDeleted = () => {
    // Refresh users list
    window.location.reload();
  };

  const handleToggleActive = async (userToToggle: any) => {
    const success = await updateUser(userToToggle.id, { is_active: !userToToggle.isActive } as any);
    if (success) {
      toast.success(`User ${!userToToggle.isActive ? 'activated' : 'blocked'} successfully`);
      window.location.reload(); // Simple refresh to show new status
    } else {
      toast.error('Failed to update user status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      isActive: true
    });
    setEditingUser(null);
    setShowCreateForm(false);
  };

  return (
    <div className="flex-1">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">User Master</h1>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                Manage system users and their permissions
              </p>
            </div>
          </div>
          
          {hasRole(['admin']) && (
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-6">
        {/* Stats Cards */}
        <UserStatsCards users={users} />

        {/* User Management */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-semibold">User Management</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Manage system users and their permissions
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedUsers.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDeleteClick}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedUsers.length})
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
            <UserTable
              users={filteredUsersByRole}
              loading={loading}
              searchTerm={searchTerm}
              filterRole={filterRole}
              selectedUsers={selectedUsers}
              setSearchTerm={(val) => {
                setSearchTerm(val);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              onFilterChange={(role) => {
                setFilterRole(role);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              onSelectUser={handleSelectUser}
              onSelectAll={handleSelectAll}
              onBulkDelete={handleBulkDeleteClick}
              onUserDeleted={handleUserDeleted}
              onEditUser={handleEditUser}
              onViewUser={handleViewUser}
              onToggleActive={handleToggleActive}
            />

            <div className="flex items-center justify-between mt-4 border-t pt-4">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-500">
                  Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Show</span>
                  <Select
                    value={String(pagination.limit)}
                    onValueChange={(val) => {
                      const newLimit = parseInt(val);
                      setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                    }}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-500">per page</span>
                </div>
              </div>
              
              {pagination.totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
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
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form */}
      <Sheet open={showCreateForm} onOpenChange={(open) => {
        setShowCreateForm(open);
        if (!open) {
          resetForm();
        }
      }}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>
              {editingUser ? 'Edit User' : 'Add New User'}
            </SheetTitle>
            <SheetDescription>
              {editingUser ? 'Update user information and permissions' : 'Create a new system user'}
            </SheetDescription>
          </SheetHeader>
          <UserForm
            formData={formData}
            editingUser={editingUser}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialog.open}
        onOpenChange={(open) => setBulkDeleteDialog(prev => ({ ...prev, open }))}
        title="Delete Users"
        message="Are you sure you want to delete the selected users? This will permanently remove all associated data."
        onConfirm={confirmBulkDelete}
        loading={bulkDeleteDialog.loading}
        type="bulk"
        count={selectedUsers.length}
      />
    </div>
  );
}
