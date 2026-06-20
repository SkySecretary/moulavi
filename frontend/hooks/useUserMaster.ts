'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { userAPI } from '@/lib/api';

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

export function useUserMaster(role: string = 'all') {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userAPI.getAll({ 
        search: searchTerm,
        role: role !== 'all' ? role : undefined,
        page: pagination.page,
        limit: pagination.limit
      });
      setUsers(response.data.users || []);
      setPagination(response.data.pagination || {
        page: 1,
        limit: pagination.limit,
        total: response.data.users?.length || 0,
        totalPages: 1
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load users';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (data: CreateUserRequest) => {
    try {
      await userAPI.create(data);
      await loadUsers();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create user';
      toast.error(errorMessage);
      console.error('Error creating user:', error);
      return false;
    }
  };

  const updateUser = async (id: string, data: CreateUserRequest) => {
    try {
      await userAPI.update(id, data);
      await loadUsers();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update user';
      toast.error(errorMessage);
      console.error('Error updating user:', error);
      return false;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await userAPI.delete(id);
      await loadUsers();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete user';
      toast.error(errorMessage);
      console.error('Error deleting user:', error);
      return false;
    }
  };

  const filteredUsers = users;

  useEffect(() => {
    loadUsers();
  }, [searchTerm, role, pagination.page, pagination.limit]);

  return {
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
    deleteUser,
    loadUsers
  };
}
