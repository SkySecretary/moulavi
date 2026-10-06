'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Party } from '@/types';
import { partyAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, User, UserPlus, Phone, Mail, MapPin, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerPartySelectorProps {
  parties: Party[];
  selectedPartyId: string;
  onSelectParty: (partyId: string, party?: Party) => void;
  onPartyCreated?: (party: Party) => void;
  title?: string;
  description?: string;
}

export function CustomerPartySelector({
  parties,
  selectedPartyId,
  onSelectParty,
  onPartyCreated,
  title = "Select Customer / Partner",
  description = "Choose whether this booking is for a B2B Partner Agency or a Direct Customer",
}: CustomerPartySelectorProps) {
  const [customerMode, setCustomerMode] = useState<'b2b' | 'direct'>('b2b');
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Direct Customer Form State
  const [directName, setDirectName] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directAddress, setDirectAddress] = useState('');

  // Filter parties based on type
  const b2bParties = parties.filter(p => p.customerType === 'b2b' || (p.customerType as any) !== 'direct');
  const directParties = parties.filter(p => p.customerType === 'direct');

  const handleQuickCreateDirectCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!directPhone.trim()) {
      toast.error('Contact phone number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await partyAPI.createDirectCustomer({
        name: directName.trim(),
        phone: directPhone.trim(),
        email: directEmail.trim() || undefined,
        address: directAddress.trim() || undefined,
      });

      const newParty = response.data?.party;
      if (newParty) {
        toast.success(`Direct customer "${newParty.partyName}" created successfully!`);
        if (onPartyCreated) {
          onPartyCreated(newParty);
        }
        onSelectParty(newParty.id, newParty);
      }
    } catch (error: any) {
      console.error('Error creating direct customer:', error);
      toast.error(error?.response?.data?.error || error?.message || 'Failed to create direct customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <Card className="border-0 shadow-2xl shadow-primary/5 rounded-[2rem] overflow-hidden bg-white">
        {/* Card Header */}
        <div className="bg-primary p-7 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80 opacity-90" />
          <div className="relative z-10">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-inner">
              {customerMode === 'b2b' ? <Building2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
            </div>
            <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">{title}</CardTitle>
            <p className="text-xs text-white/80 font-medium mt-1">{description}</p>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Customer Mode Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setCustomerMode('b2b');
                setShowDirectForm(false);
              }}
              className={cn(
                "flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300",
                customerMode === 'b2b'
                  ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              )}
            >
              <Building2 className="h-4 w-4" />
              <span>Partner Agency (B2B)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCustomerMode('direct');
              }}
              className={cn(
                "flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300",
                customerMode === 'direct'
                  ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              )}
            >
              <User className="h-4 w-4" />
              <span>Direct Customer (B2C)</span>
            </button>
          </div>

          {/* Mode 1: B2B Partner Agency Selector */}
          {customerMode === 'b2b' && (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-primary/70 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Choose Partner Agency *
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {b2bParties.length} Registered Agencies
                  </span>
                </div>
                <SearchableSelect
                  options={b2bParties.map(p => ({
                    value: p.id,
                    label: `${p.partyName} ${p.partyCode ? `(${p.partyCode})` : ''} ${p.email ? `• ${p.email}` : ''}`,
                  }))}
                  value={selectedPartyId}
                  onValueChange={(v) => {
                    const matched = b2bParties.find(p => p.id === v);
                    onSelectParty(v, matched);
                  }}
                  placeholder="Select partner agency..."
                  searchPlaceholder="Search agency name, code or email..."
                  className="h-12 rounded-xl border-gray-200 text-xs shadow-sm bg-white"
                />
              </div>

              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/70 flex items-start gap-2.5 text-[11px] text-gray-500">
                <span className="text-primary font-bold">ℹ️ Note:</span>
                <span>Direct customers are excluded from this list. To book for an individual or guest without agency affiliation, select the <strong>Direct Customer</strong> tab above.</span>
              </div>
            </div>
          )}

          {/* Mode 2: Direct Customer Mode */}
          {customerMode === 'direct' && (
            <div className="space-y-5 animate-in fade-in-50 duration-300">
              {!showDirectForm ? (
                <div className="space-y-4">
                  {directParties.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-primary/70 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        Select Existing Direct Customer
                      </Label>
                      <SearchableSelect
                        options={directParties.map(p => ({
                          value: p.id,
                          label: `${p.partyName} ${p.contactNumber || p.whatsappNumber ? `(${p.contactNumber || p.whatsappNumber})` : ''} ${p.email && !p.email.endsWith('@directcustomer.local') ? `• ${p.email}` : ''}`,
                        }))}
                        value={selectedPartyId}
                        onValueChange={(v) => {
                          const matched = directParties.find(p => p.id === v);
                          onSelectParty(v, matched);
                        }}
                        placeholder="Search existing direct customer..."
                        searchPlaceholder="Search customer name or phone..."
                        className="h-12 rounded-xl border-gray-200 text-xs shadow-sm bg-white"
                      />
                    </div>
                  )}

                  <div className={cn(
                    "p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center",
                    directParties.length === 0
                      ? "border-primary/40 bg-primary/5 py-8"
                      : "border-gray-200 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-300"
                  )}>
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2.5 shadow-sm">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">Add New Direct Customer</h4>
                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                      Quickly register this direct customer with their name and phone number to proceed with the booking.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setShowDirectForm(true)}
                      className="mt-4 h-10 px-6 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-wider shadow-md hover:bg-primary/90 flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>+ Register New Direct Customer</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Inline Direct Customer Quick Create Form */
                <form onSubmit={handleQuickCreateDirectCustomer} className="p-5 rounded-2xl border border-primary/20 bg-primary/[0.02] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Quick Direct Customer Registration</h4>
                        <p className="text-[10px] text-gray-500">Saved as Direct Customer in Party Master</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDirectForm(false)}
                      className="text-xs text-gray-400 hover:text-gray-700 h-7 px-2"
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                        <User className="h-3 w-3 text-primary" />
                        Customer Full Name *
                      </Label>
                      <Input
                        value={directName}
                        onChange={(e) => setDirectName(e.target.value)}
                        placeholder="e.g. Mohammed Ali"
                        className="h-10 text-xs rounded-lg"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                        <Phone className="h-3 w-3 text-primary" />
                        Phone / WhatsApp *
                      </Label>
                      <Input
                        value={directPhone}
                        onChange={(e) => setDirectPhone(e.target.value)}
                        placeholder="e.g. +966501234567 or 9876543210"
                        className="h-10 text-xs rounded-lg"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        Email Address <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        type="email"
                        value={directEmail}
                        onChange={(e) => setDirectEmail(e.target.value)}
                        placeholder="customer@example.com"
                        className="h-10 text-xs rounded-lg"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[10px] font-bold text-gray-700 uppercase flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        City / Address <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        value={directAddress}
                        onChange={(e) => setDirectAddress(e.target.value)}
                        placeholder="e.g. Jeddah, Saudi Arabia"
                        className="h-10 text-xs rounded-lg"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDirectForm(false)}
                      disabled={isSubmitting}
                      className="h-9 px-4 text-xs font-semibold rounded-lg"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting || !directName.trim() || !directPhone.trim()}
                      className="h-9 px-6 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow hover:bg-primary/90 flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <span>Save & Proceed</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
