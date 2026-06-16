'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { userAPI } from '@/lib/api';
import { Search, Edit, Trash2, Eye, Shield, User, Crown } from 'lucide-react';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'party';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UserTableProps {
  users: User[];
  loading: boolean;
  searchTerm: string;
  filterRole: 'all' | 'admin' | 'staff' | 'party';
  selectedUsers: string[];
  setSearchTerm: (value: string) => void;
  onFilterChange: (role: 'all' | 'admin' | 'staff' | 'party') => void;
  onSelectUser: (userId: string) => void;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  onUserDeleted: () => void;
  onEditUser: (user: User) => void;
  onViewUser: (user: User) => void;
  onToggleActive?: (user: User) => void;
}

export default function UserTable({
  users,
  loading,
  searchTerm,
  filterRole,
  selectedUsers,
  setSearchTerm,
  onFilterChange,
  onSelectUser,
  onSelectAll,
  onBulkDelete,
  onUserDeleted,
  onEditUser,
  onViewUser,
  onToggleActive
}: UserTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: User | null;
    loading: boolean;
  }>({
    open: false,
    user: null,
    loading: false
  });

  const handleDeleteUser = (user: User) => {
    setDeleteDialog({
      open: true,
      user,
      loading: false
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.user) return;

    setDeleteDialog(prev => ({ ...prev, loading: true }));

    try {
      await userAPI.delete(deleteDialog.user.id);
      toast.success('User deleted successfully!');
      onUserDeleted();
      setDeleteDialog({ open: false, user: null, loading: false });
    } catch (error) {
      setDeleteDialog(prev => ({ ...prev, loading: false }));
      // Error handling is done by the API interceptor
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'staff':
        return <Shield className="h-4 w-4" />;
      case 'party':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'staff':
        return 'default';
      case 'party':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {/* Search and Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-16" />
          </div>
        </div>

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
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Search className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
        <p className="text-gray-500">
          {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first user'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterRole === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('all')}
          >
            All
          </Button>
          <Button
            variant={filterRole === 'admin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('admin')}
            className="flex items-center gap-1"
          >
            <Crown className="h-3 w-3" />
            Admin
          </Button>
          <Button
            variant={filterRole === 'staff' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('staff')}
            className="flex items-center gap-1"
          >
            <Shield className="h-3 w-3" />
            Staff
          </Button>
          <Button
            variant={filterRole === 'party' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('party')}
            className="flex items-center gap-1"
          >
            <User className="h-3 w-3" />
            Party
          </Button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={selectedUsers.length === users.length && users.length > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300"
            />
          </div>
          <div className="col-span-3">User Name</div>
          <div className="col-span-2">Email</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Actions</div>
        </div>

        {/* Table Rows */}
        {users.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-12 gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.id)}
                onChange={() => onSelectUser(user.id)}
                className="rounded border-gray-300"
              />
            </div>
            <div className="col-span-3">
              <div className="font-medium text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-500">
                ID: {user.id.slice(0, 8)}...
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-900">{user.email}</div>
            </div>
            <div className="col-span-2">
              <Badge 
                variant={getRoleBadgeVariant(user.role)}
                className="flex items-center gap-1 w-fit"
              >
                {getRoleIcon(user.role)}
                {user.role.toUpperCase()}
              </Badge>
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
                {onToggleActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleActive(user)}
                    className="h-6 text-[10px] px-2"
                  >
                    {user.isActive ? 'Block' : 'Activate'}
                  </Button>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewUser(user)}
                  className="h-8 w-8 p-0"
                  title="View user details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditUser(user)}
                  className="h-8 w-8 p-0"
                  title="Edit user"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteUser(user)}
                  className="h-8 w-8 p-0 text-primary hover:text-destructive hover:bg-destructive/5"
                  title="Delete user"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden">
        {/* Select All Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedUsers.length === users.length && users.length > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All ({users.length})
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {selectedUsers.length} selected
          </span>
        </div>

        {/* User Cards */}
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => onSelectUser(user.id)}
                    className="rounded border-gray-300 mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewUser(user)}
                    className="h-8 w-8 p-0"
                    title="View user details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditUser(user)}
                    className="h-8 w-8 p-0"
                    title="Edit user"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteUser(user)}
                    className="h-8 w-8 p-0 text-primary hover:text-destructive hover:bg-destructive/5"
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Card Content */}
              <div className="space-y-2">
                {/* Role and Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={getRoleBadgeVariant(user.role)}
                      className="flex items-center gap-1 text-xs"
                    >
                      {getRoleIcon(user.role)}
                      {user.role.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {onToggleActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleActive(user)}
                        className="h-6 text-[10px] px-2"
                      >
                        {user.isActive ? 'Block' : 'Activate'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* User ID */}
                <div className="text-xs text-gray-500 pt-1 border-t">
                  <span className="font-medium">User ID:</span> {user.id.slice(0, 8)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Delete User"
        message="Are you sure you want to delete this user? This will permanently remove all associated data."
        itemName={deleteDialog.user?.name}
        onConfirm={confirmDelete}
        loading={deleteDialog.loading}
        type="single"
      />
    </div>
  );
}