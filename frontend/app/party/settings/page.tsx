'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { getUser, hasRole } from '@/lib/auth';
import { partyAPI, authAPI } from '@/lib/api';
import { Loader2, Save, Lock, User } from 'lucide-react';

interface Party {
  id: string;
  partyName: string;
  email: string;
  contactNumber?: string;
  whatsappNumber?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  customerType: 'direct' | 'b2b';
  accountCurrency?: {
    id: string;
    currencyCode: string;
    currencyName: string;
  };
  emailNotification: boolean;
  smsNotification: boolean;
  marketingNotification: boolean;
}

export default function PartySettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [party, setParty] = useState<Party | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  const [formData, setFormData] = useState({
    partyName: '',
    contactNumber: '',
    whatsappNumber: '',
    address: '',
    gstNumber: '',
    panNumber: '',
    aadhaarNumber: '',
    emailNotification: true,
    smsNotification: true,
    marketingNotification: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    setUser(currentUser);
    
    if (!currentUser || !hasRole('party')) {
      router.push('/');
      return;
    }

    loadPartyData();
  }, [router]);

  // Update formData when party data loads
  useEffect(() => {
    if (party) {
      setFormData({
        partyName: party.partyName || '',
        contactNumber: party.contactNumber || '',
        whatsappNumber: party.whatsappNumber || '',
        address: party.address || '',
        gstNumber: party.gstNumber || '',
        panNumber: party.panNumber || '',
        aadhaarNumber: party.aadhaarNumber || '',
        emailNotification: party.emailNotification ?? true,
        smsNotification: party.smsNotification ?? true,
        marketingNotification: party.marketingNotification ?? false,
      });
    }
  }, [party]);

  const loadPartyData = async () => {
    try {
      setLoading(true);
      const response = await partyAPI.getMyParty();
      const partyData = response.data.party;
      
      console.log('Loaded party data:', partyData); // Debug log
      
      if (!partyData) {
        toast.error('Party data not found');
        return;
      }
      
      setParty(partyData);
      
      // FormData will be set via useEffect when party state updates
      console.log('Loaded party data:', partyData); // Debug log
    } catch (error: any) {
      console.error('Error loading party data:', error);
      toast.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!party) return;

    try {
      setSaving(true);
      
      // Use the new my-party endpoint for party users
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/parties/my-party`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          party_name: formData.partyName,
          contact_number: formData.contactNumber,
          whatsapp_number: formData.whatsappNumber,
          address: formData.address,
          gst_number: formData.gstNumber,
          pan_number: formData.panNumber,
          aadhaar_number: formData.aadhaarNumber,
          email_notification: formData.emailNotification,
          sms_notification: formData.smsNotification,
          marketing_notification: formData.marketingNotification,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      loadPartyData(); // Reload to get updated data
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!mounted || !user) {
    return null;
  }

  if (loading) {
    return (
      <PartyLayout title="Settings" subtitle="Manage your profile and account settings">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PartyLayout>
    );
  }

  return (
      <PartyLayout title="Settings" subtitle="Manage your profile and account settings">
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50/30">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Tab Navigation */}
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex gap-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'profile'
                    ? 'bg-primary/20 text-secondary shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <User className="h-4 w-4" />
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'password'
                    ? 'bg-primary/20 text-secondary shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <Lock className="h-4 w-4" />
                Security & Password
              </button>
          </div>

          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-none shadow-md overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-50">
                <CardTitle className="text-xl font-bold text-secondary">Profile Details</CardTitle>
                <CardDescription>
                  Update your agency profile information. Email and Currency are managed by the administrator.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                     <div className="h-8 w-1 bg-primary rounded-full"></div>
                     <h3 className="text-lg font-bold text-secondary">Agency Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="partyName" className="text-xs font-bold uppercase tracking-wider text-gray-500">Agency Name *</Label>
                      <Input
                        id="partyName"
                        value={formData.partyName}
                        onChange={(e) => handleInputChange('partyName', e.target.value)}
                        placeholder="Enter agency name"
                        className="border-gray-200 focus:border-primary focus:ring-primary/20 h-11"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-gray-500">Official Email</Label>
                      <Input
                        id="email"
                        value={party?.email || ''}
                        disabled
                        className="bg-gray-50 border-gray-100 text-gray-500 h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactNumber" className="text-xs font-bold uppercase tracking-wider text-gray-500">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        value={formData.contactNumber}
                        onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                        placeholder="Enter contact number"
                        className="border-gray-200 focus:border-primary focus:ring-primary/20 h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsappNumber" className="text-xs font-bold uppercase tracking-wider text-gray-500">WhatsApp Number</Label>
                      <Input
                        id="whatsappNumber"
                        value={formData.whatsappNumber}
                        onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                        placeholder="Enter WhatsApp number"
                        className="border-gray-200 focus:border-primary focus:ring-primary/20 h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-gray-500">Business Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter full business address"
                      className="border-gray-200 focus:border-primary focus:ring-primary/20 h-11"
                    />
                  </div>
                </div>

                {/* Document Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                     <div className="h-8 w-1 bg-primary rounded-full"></div>
                     <h3 className="text-lg font-bold text-secondary">Document Verification</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="gstNumber" className="text-xs font-bold uppercase tracking-wider text-gray-500">GST Number</Label>
                      <Input
                        id="gstNumber"
                        value={formData.gstNumber}
                        onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                        placeholder="Enter GST number"
                        className="border-gray-200 focus:border-primary focus:ring-primary/20 h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="panNumber" className="text-xs font-bold uppercase tracking-wider text-gray-500">PAN Number</Label>
                      <Input
                        id="panNumber"
                        value={formData.panNumber}
                        onChange={(e) => handleInputChange('panNumber', e.target.value)}
                        placeholder="Enter PAN number"
                        className="border-gray-200 focus:border-primary focus:ring-primary/20 h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="aadhaarNumber" className="text-xs font-bold uppercase tracking-wider text-gray-500">Aadhaar Number</Label>
                      <Input
                        id="aadhaarNumber"
                        value={formData.aadhaarNumber}
                        onChange={(e) => handleInputChange('aadhaarNumber', e.target.value)}
                        placeholder="Enter Aadhaar number"
                        className="border-gray-200 focus:border-primary focus:ring-primary/20 h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Preferences */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                     <div className="h-8 w-1 bg-primary rounded-full"></div>
                     <h3 className="text-lg font-bold text-secondary">Notifications</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all">
                      <div>
                        <Label htmlFor="emailNotification" className="font-bold text-secondary cursor-pointer">Email</Label>
                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Status alerts</p>
                      </div>
                      <input
                        type="checkbox"
                        id="emailNotification"
                        checked={formData.emailNotification}
                        onChange={(e) => handleInputChange('emailNotification', e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/20"
                      />
                    </div>

                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all">
                      <div>
                        <Label htmlFor="smsNotification" className="font-bold text-secondary cursor-pointer">WhatsApp</Label>
                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Instant updates</p>
                      </div>
                      <input
                        type="checkbox"
                        id="smsNotification"
                        checked={formData.smsNotification}
                        onChange={(e) => handleInputChange('smsNotification', e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/20"
                      />
                    </div>

                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all">
                      <div>
                        <Label htmlFor="marketingNotification" className="font-bold text-secondary cursor-pointer">Marketing</Label>
                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">News & Offers</p>
                      </div>
                      <input
                        type="checkbox"
                        id="marketingNotification"
                        checked={formData.marketingNotification}
                        onChange={(e) => handleInputChange('marketingNotification', e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-white font-bold h-11 px-8 shadow-lg transition-all"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Profile Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-none shadow-md overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-50">
                <CardTitle className="text-xl font-bold text-secondary">Security Settings</CardTitle>
                <CardDescription>
                  Protect your account by using a strong password.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-6 max-w-md mx-auto py-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-xs font-bold uppercase tracking-wider text-gray-500">Current Password *</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="border-gray-200 focus:border-primary focus:ring-primary/20 h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-xs font-bold uppercase tracking-wider text-gray-500">New Password *</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="border-gray-200 focus:border-primary focus:ring-primary/20 h-11"
                      required
                    />
                    <p className="text-[10px] text-gray-400 font-medium">Must be at least 6 characters long</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-gray-500">Confirm New Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="border-gray-200 focus:border-primary focus:ring-primary/20 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-6">
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-white font-bold h-11 px-12 shadow-lg transition-all"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </div>
    </PartyLayout>
  );
}

