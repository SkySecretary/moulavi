'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { useCurrencyMaster } from '@/hooks/useCurrencyMaster';
import CurrencyCard from '@/components/currency/CurrencyCard';
import CurrencyForm from '@/components/currency/CurrencyForm';
import CurrencyDeleteConfirmationModal from '@/components/currency/CurrencyDeleteConfirmationModal';
import CurrencyStatsCards from '@/components/currency/CurrencyStatsCards';
import { Plus, Search, DollarSign } from 'lucide-react';

import { CurrencyMaster, CreateCurrencyMasterRequest } from '@/types';

export default function CurrencyMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currencyToDelete, setCurrencyToDelete] = useState<CurrencyMaster | null>(null);
  const [formData, setFormData] = useState<CreateCurrencyMasterRequest>({
    currencyCode: '',
    currencyName: '',
    symbol: ''
  });

  const {
    currencies,
    loading,
    searchTerm,
    setSearchTerm,
    filteredCurrencies,
    createCurrency,
    updateCurrency,
    deleteCurrency
  } = useCurrencyMaster();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = editingCurrency 
      ? await updateCurrency(editingCurrency.id, formData)
      : await createCurrency(formData);
    
    if (success) {
      resetForm();
    }
  };

  const handleEdit = (currency: CurrencyMaster) => {
    setEditingCurrency(currency);
    setFormData({
      currencyCode: currency.currencyCode,
      currencyName: currency.currencyName,
      symbol: currency.symbol
    });
    setShowCreateForm(true);
  };

  const handleDeleteClick = (currency: CurrencyMaster) => {
    setCurrencyToDelete(currency);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currencyToDelete) return;

    const success = await deleteCurrency(currencyToDelete.id);
    if (success) {
      setShowDeleteModal(false);
      setCurrencyToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCurrencyToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      currencyCode: '',
      currencyName: '',
      symbol: ''
    });
    setEditingCurrency(null);
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="flex-1">
        {/* Header Bar */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Currency Master</h1>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                Manage currencies and exchange rates
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Currency
            </Button>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Currencies</CardTitle>
              <CardDescription>
                Manage currencies and their information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search currencies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled
                  />
                </div>

                {/* Loading Skeleton */}
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <div className="flex space-x-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Currency Master</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Manage currencies and symbols
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Currency
          </Button>
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-6">
        {/* Stats Cards */}
        <CurrencyStatsCards currencies={currencies} />

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search currencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currencies List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currencies ({filteredCurrencies.length})
            </CardTitle>
            <CardDescription>
              Manage currencies and their information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCurrencies.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No currencies found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'No currencies match your search criteria' : 'Get started by adding your first currency'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Currency
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCurrencies.map((currency) => (
                  <CurrencyCard
                    key={currency.id}
                    currency={currency}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            )}
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
              {editingCurrency ? 'Edit Currency' : 'Add New Currency'}
            </SheetTitle>
            <SheetDescription>
              {editingCurrency ? 'Update currency information' : 'Create a new currency'}
            </SheetDescription>
          </SheetHeader>
          <CurrencyForm
            formData={formData}
            editingCurrency={editingCurrency}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <CurrencyDeleteConfirmationModal
        isOpen={showDeleteModal}
        currency={currencyToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
