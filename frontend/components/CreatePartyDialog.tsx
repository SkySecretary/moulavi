'use client';

import { useState, useEffect } from 'react';
import { useCurrencyMaster } from '@/hooks/useCurrencyMaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { partyAPI, partyDocumentAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Party, CreatePartyRequest, CreatePartyContactRequest, PartyDocumentType } from '@/types';
import { Plus, X, Trash2, Upload } from 'lucide-react';

interface CreatePartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (partyData: CreatePartyRequest) => Promise<void>;
  editingParty?: Party | null;
  title?: string;
}

export default function CreatePartyDialog({
  open,
  onOpenChange,
  onSubmit,
  editingParty,
  title = 'Create New Party'
}: CreatePartyDialogProps) {
  const [formData, setFormData] = useState({
    party_name: '',
    party_code: '',
    email: '',
    contact_number: '',
    whatsapp_number: '',
    address: '',
    gst_number: '',
    pan_number: '',
    aadhaar_number: '',
    supplier_service_types: [] as string[],
    contacts: [] as CreatePartyContactRequest[],
    customer_type: '' as 'direct' | 'b2b' | '',
    account_currency_id: '',
    is_supplier: false,
    is_customer: true,
    login_required: false,
    email_notification: true,
    sms_notification: true,
    marketing_notification: false
  });
  const [documentFiles, setDocumentFiles] = useState<{
    gst_certificate?: File;
    pan_card?: File;
    aadhaar_card?: File;
    logo?: File;
    other?: File;
  }>({});
  const { currencies, loading: currenciesLoading } = useCurrencyMaster();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or editing party changes
  useEffect(() => {
    if (open) {
      if (editingParty) {
        setFormData({
          party_name: editingParty.partyName,
          party_code: editingParty.partyCode || '',
          email: editingParty.email,
          contact_number: editingParty.contactNumber || '',
          whatsapp_number: editingParty.whatsappNumber || '',
          address: editingParty.address || '',
          gst_number: editingParty.gstNumber || '',
          pan_number: editingParty.panNumber || '',
          aadhaar_number: editingParty.aadhaarNumber || '',
          supplier_service_types: editingParty.supplierServiceTypes || [],
          contacts: editingParty.contacts?.map(c => ({
            contact_name: c.contactName,
            contact_number: c.contactNumber,
            department: c.department || ''
          })) || [],
          customer_type: editingParty.customerType,
          account_currency_id: editingParty.accountCurrencyId,
          is_supplier: editingParty.isSupplier,
          is_customer: editingParty.isCustomer,
          login_required: editingParty.loginRequired,
          email_notification: editingParty.emailNotification,
          sms_notification: editingParty.smsNotification,
          marketing_notification: editingParty.marketingNotification
        });
      } else {
        setFormData({
          party_name: '',
          party_code: '',
          email: '',
          contact_number: '',
          whatsapp_number: '',
          address: '',
          gst_number: '',
          pan_number: '',
          aadhaar_number: '',
          supplier_service_types: [],
          contacts: [{ contact_name: '', contact_number: '', department: '' }],
          customer_type: '',
          account_currency_id: currencies.length > 0 ? currencies[0].id : '',
          is_supplier: false,
          is_customer: true,
          login_required: false,
          email_notification: true,
          sms_notification: true,
          marketing_notification: false
        });
      }
      setDocumentFiles({});
      setErrors({});
    }
  }, [open, editingParty]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.party_name.trim()) {
      newErrors.party_name = 'Party name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Validate party_code if provided (must be unique, max 10 chars)
    if (formData.party_code && formData.party_code.length > 10) {
      newErrors.party_code = 'Party code must be 10 characters or less';
    }

    // Customer type is required only if is_customer is true
    if (formData.is_customer && !formData.customer_type) {
      newErrors.customer_type = 'Customer type is required when party is a customer';
    }

    if (!formData.account_currency_id) {
      newErrors.account_currency_id = 'Account currency is required';
    }

    // Validate contact number format if provided
    if (formData.contact_number && !/^[+]?[0-9]{10,15}$/.test(formData.contact_number)) {
      newErrors.contact_number = 'Contact number must be 10-15 digits, optionally starting with +';
    }

    // Validate WhatsApp number format if provided
    if (formData.whatsapp_number && !/^[+]?[0-9]{10,15}$/.test(formData.whatsapp_number)) {
      newErrors.whatsapp_number = 'WhatsApp number must be 10-15 digits, optionally starting with +';
    }

    // Validate supplier service types if supplier is selected
    if (formData.is_supplier && formData.supplier_service_types.length === 0) {
      newErrors.supplier_service_types = 'At least one supplier service type is required';
    }

    // Validate contacts
    if (formData.contacts.length === 0) {
      newErrors.contacts = 'At least one contact person is required';
    }
    formData.contacts.forEach((contact, index) => {
      if (!contact.contact_name?.trim()) {
        newErrors[`contact_name_${index}`] = 'Contact name is required';
      }
      if (!contact.contact_number?.trim()) {
        newErrors[`contact_number_${index}`] = 'Contact number is required';
      } else if (!/^[+]?[0-9]{10,15}$/.test(contact.contact_number)) {
        newErrors[`contact_number_${index}`] = 'Contact number must be 10-15 digits, optionally starting with +';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = validateForm();
    if (!isValid) {
      // Show a toast if validation fails so user knows why form isn't submitting
      setTimeout(() => {
        const errorCount = Object.keys(errors).length;
        if (errorCount > 0) {
          toast.error('Please fix the form errors before submitting');
          // Scroll to first error field
          const firstErrorField = document.querySelector('.border-primary');
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100); // Wait for state to update
      return;
    }

    setLoading(true);
    try {
      // Filter out empty contacts before submission
      const validContacts = formData.contacts.filter(
        contact => contact.contact_name?.trim() && contact.contact_number?.trim()
      );
      
      // Ensure customer_type is set if is_customer is true
      const submitData = {
        ...formData,
        contacts: validContacts,
        customer_type: formData.is_customer ? (formData.customer_type || 'direct') : undefined
      };
      
      console.log('Submitting party data:', submitData);
      
      const party = await onSubmit(submitData);
      const partyId = editingParty?.id || (party as any)?.party?.id || (party as any)?.id;
      
      // Upload documents if any
      if (partyId && Object.keys(documentFiles).length > 0) {
        const uploadPromises = Object.entries(documentFiles).map(([type, file]) => {
          if (file) {
            return partyDocumentAPI.uploadDocument(partyId, file, type as PartyDocumentType).catch(err => {
              console.error(`Failed to upload ${type}:`, err);
              toast.error(`Failed to upload ${type} document`);
            });
          }
        });
        await Promise.all(uploadPromises);
      }
      
      onOpenChange(false);
      // Don't show toast here - parent component will handle it
    } catch (error: any) {
      console.error('Error submitting party:', error);
      toast.error(error.response?.data?.error || 'Failed to save party');
    } finally {
      setLoading(false);
    }
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { contact_name: '', contact_number: '', department: '' }]
    }));
  };

  const removeContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const updateContact = (index: number, field: keyof CreatePartyContactRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const toggleSupplierServiceType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      supplier_service_types: prev.supplier_service_types.includes(type)
        ? prev.supplier_service_types.filter(t => t !== type)
        : [...prev.supplier_service_types, type]
    }));
    if (errors.supplier_service_types) {
      setErrors(prev => ({ ...prev, supplier_service_types: '' }));
    }
  };

  const handleDocumentFileChange = (type: PartyDocumentType, file: File | undefined) => {
    setDocumentFiles(prev => ({
      ...prev,
      [type]: file
    }));
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>{editingParty ? 'Edit Party' : title}</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4 px-1">
          <form id="party-form" onSubmit={handleSubmit} className="space-y-4 pr-2">
          <div className="space-y-2">
            <Label htmlFor="party_name">Party Name *</Label>
            <Input
              id="party_name"
              type="text"
              value={formData.party_name}
              onChange={(e) => handleInputChange('party_name', e.target.value)}
              placeholder="Enter party name"
              className={errors.party_name ? 'border-primary' : ''}
            />
            {errors.party_name && (
              <p className="text-sm text-primary">{errors.party_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="party_code">Party Code (3-digit unique ID)</Label>
            <Input
              id="party_code"
              type="text"
              value={formData.party_code}
              onChange={(e) => handleInputChange('party_code', e.target.value.toUpperCase())}
              placeholder="e.g., 001, 002"
              maxLength={10}
              className={errors.party_code ? 'border-primary' : ''}
            />
            {errors.party_code && (
              <p className="text-sm text-primary">{errors.party_code}</p>
            )}
            <p className="text-xs text-gray-500">Optional: Unique 3-digit code for this party</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
              className={errors.email ? 'border-primary' : ''}
            />
            {errors.email && (
              <p className="text-sm text-primary">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_number">Contact Number</Label>
            <Input
              id="contact_number"
              type="text"
              value={formData.contact_number}
              onChange={(e) => handleInputChange('contact_number', e.target.value)}
              placeholder="+91 1234567890"
              className={errors.contact_number ? 'border-primary' : ''}
            />
            {errors.contact_number && (
              <p className="text-sm text-primary">{errors.contact_number}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
            <Input
              id="whatsapp_number"
              type="text"
              value={formData.whatsapp_number}
              onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
              placeholder="+91 1234567890"
              className={errors.whatsapp_number ? 'border-primary' : ''}
            />
            {errors.whatsapp_number && (
              <p className="text-sm text-primary">{errors.whatsapp_number}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter full address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gst_number">GST Number</Label>
            <Input
              id="gst_number"
              type="text"
              value={formData.gst_number}
              onChange={(e) => handleInputChange('gst_number', e.target.value)}
              placeholder="GST Number"
            />
          </div>

          {/* Contact Person Details */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Contact Person Details</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addContact}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add More Contact
              </Button>
            </div>
            {formData.contacts.length === 0 && (
              <p className="text-sm text-primary">{errors.contacts}</p>
            )}
            {formData.contacts.map((contact, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2 bg-gray-50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Contact {index + 1}</Label>
                  {formData.contacts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContact(index)}
                      className="h-6 w-6 p-0 text-primary"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor={`contact_name_${index}`} className="text-xs">Contact Person Name *</Label>
                    <Input
                      id={`contact_name_${index}`}
                      type="text"
                      value={contact.contact_name}
                      onChange={(e) => updateContact(index, 'contact_name', e.target.value)}
                      placeholder="Contact Person Name"
                      className={errors[`contact_name_${index}`] ? 'border-primary' : ''}
                    />
                    {errors[`contact_name_${index}`] && (
                      <p className="text-xs text-primary">{errors[`contact_name_${index}`]}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`contact_number_${index}`} className="text-xs">Contact Number *</Label>
                    <Input
                      id={`contact_number_${index}`}
                      type="text"
                      value={contact.contact_number}
                      onChange={(e) => updateContact(index, 'contact_number', e.target.value)}
                      placeholder="+91 1234567890"
                      className={errors[`contact_number_${index}`] ? 'border-primary' : ''}
                    />
                    {errors[`contact_number_${index}`] && (
                      <p className="text-xs text-primary">{errors[`contact_number_${index}`]}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`department_${index}`} className="text-xs">Department</Label>
                    <Input
                      id={`department_${index}`}
                      type="text"
                      value={contact.department || ''}
                      onChange={(e) => updateContact(index, 'department', e.target.value)}
                      placeholder="Department"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Address & Identification */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Address & Identification</Label>
            
            <div className="space-y-2">
              <Label htmlFor="pan_number">PAN Number</Label>
              <Input
                id="pan_number"
                type="text"
                value={formData.pan_number}
                onChange={(e) => handleInputChange('pan_number', e.target.value)}
                placeholder="PAN Number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
              <Input
                id="aadhaar_number"
                type="text"
                value={formData.aadhaar_number}
                onChange={(e) => handleInputChange('aadhaar_number', e.target.value)}
                placeholder="Aadhaar Number"
              />
            </div>

            {/* Document Uploads */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Documents & Assets</Label>
              
              <div className="space-y-2 p-3 border-2 border-dashed border-green-100 rounded-lg bg-green-50/30">
                <Label htmlFor="company_logo" className="text-xs font-bold text-green-700 flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  Company Logo (For Voucher Header)
                </Label>
                <div className="flex flex-col gap-2">
                  <Input
                    id="company_logo"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentFileChange('logo', e.target.files?.[0])}
                    className="text-xs bg-white"
                  />
                  {documentFiles.logo ? (
                    <span className="text-[10px] text-green-600 font-medium">✓ {documentFiles.logo.name}</span>
                  ) : editingParty?.logoPath ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-blue-600 font-medium">✓ Existing logo loaded</span>
                      <a href={editingParty.logoPath} target="_blank" rel="noreferrer" className="text-[10px] underline text-blue-500">View</a>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_certificate" className="text-xs">GST Certificate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="gst_certificate"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentFileChange('gst_certificate', e.target.files?.[0])}
                    className="text-xs"
                  />
                  {documentFiles.gst_certificate && (
                    <span className="text-xs text-gray-600">{documentFiles.gst_certificate.name}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan_card" className="text-xs">PAN Card</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="pan_card"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentFileChange('pan_card', e.target.files?.[0])}
                    className="text-xs"
                  />
                  {documentFiles.pan_card && (
                    <span className="text-xs text-gray-600">{documentFiles.pan_card.name}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aadhaar_card" className="text-xs">Aadhaar Card</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="aadhaar_card"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentFileChange('aadhaar_card', e.target.files?.[0])}
                    className="text-xs"
                  />
                  {documentFiles.aadhaar_card && (
                    <span className="text-xs text-gray-600">{documentFiles.aadhaar_card.name}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="other_document" className="text-xs">Other Documents</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="other_document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentFileChange('other', e.target.files?.[0])}
                    className="text-xs"
                  />
                  {documentFiles.other && (
                    <span className="text-xs text-gray-600">{documentFiles.other.name}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Type - Only show if is_customer is true */}
          {formData.is_customer && (
            <div className="space-y-2">
              <Label htmlFor="customer_type">Customer Type *</Label>
              <Select
                value={formData.customer_type}
                onValueChange={(value) => handleInputChange('customer_type', value)}
              >
                <SelectTrigger className={errors.customer_type ? 'border-primary' : ''}>
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="b2b">B2B</SelectItem>
                </SelectContent>
              </Select>
              {errors.customer_type && (
                <p className="text-sm text-primary">{errors.customer_type}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="account_currency_id">Account Currency *</Label>
            <Select
              value={formData.account_currency_id}
              onValueChange={(value) => handleInputChange('account_currency_id', value)}
            >
              <SelectTrigger className={errors.account_currency_id ? 'border-primary' : ''}>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currenciesLoading ? (
                  <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
                ) : (
                  currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.currencyCode} - {currency.currencyName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.account_currency_id && (
              <p className="text-sm text-primary">{errors.account_currency_id}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Party Type</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_supplier"
                  checked={formData.is_supplier}
                  onChange={(e) => handleInputChange('is_supplier', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is_supplier" className="cursor-pointer">
                  Supplier
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_customer"
                  checked={formData.is_customer}
                  onChange={(e) => handleInputChange('is_customer', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is_customer" className="cursor-pointer">
                  Customer
                </Label>
              </div>
            </div>
          </div>

          {/* Supplier Service Types */}
          {formData.is_supplier && (
            <div className="space-y-2 border-t pt-4">
              <Label>Supplier Service Types *</Label>
              {errors.supplier_service_types && (
                <p className="text-sm text-primary">{errors.supplier_service_types}</p>
              )}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ticket_issuing"
                    checked={formData.supplier_service_types.includes('ticket_issuing')}
                    onChange={() => toggleSupplierServiceType('ticket_issuing')}
                    className="rounded"
                  />
                  <Label htmlFor="ticket_issuing" className="cursor-pointer">
                    Ticket Issuing Service
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="umrah_service"
                    checked={formData.supplier_service_types.includes('umrah_service')}
                    onChange={() => toggleSupplierServiceType('umrah_service')}
                    className="rounded"
                  />
                  <Label htmlFor="umrah_service" className="cursor-pointer">
                    Umrah Service
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hotel_service"
                    checked={formData.supplier_service_types.includes('hotel_service')}
                    onChange={() => toggleSupplierServiceType('hotel_service')}
                    className="rounded"
                  />
                  <Label htmlFor="hotel_service" className="cursor-pointer">
                    Hotel Service
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="transport_service"
                    checked={formData.supplier_service_types.includes('transport_service')}
                    onChange={() => toggleSupplierServiceType('transport_service')}
                    className="rounded"
                  />
                  <Label htmlFor="transport_service" className="cursor-pointer">
                    Transport Service
                  </Label>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="login_required"
                checked={formData.login_required}
                onChange={(e) => handleInputChange('login_required', e.target.checked)}
                className="rounded"
                disabled={!!(editingParty && editingParty.userId)}
              />
              <Label 
                htmlFor="login_required" 
                className={`cursor-pointer ${editingParty && editingParty.userId ? 'text-gray-400' : ''}`}
              >
                Create login account for party
              </Label>
            </div>
            {editingParty && editingParty.userId ? (
              <p className="text-xs text-gray-500 ml-6">
                ✓ Login account already exists for this party
              </p>
            ) : editingParty && !editingParty.userId ? (
              <p className="text-xs text-blue-600 ml-6">
                💡 Enable this to create a login account. Credentials will be sent via email.
              </p>
            ) : (
              <p className="text-xs text-gray-500 ml-6">
                Enable this to create a login account. Credentials will be sent via email.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notification Preferences</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="email_notification"
                  checked={formData.email_notification}
                  onChange={(e) => handleInputChange('email_notification', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="email_notification" className="cursor-pointer">
                  Email Notifications
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sms_notification"
                  checked={formData.sms_notification}
                  onChange={(e) => handleInputChange('sms_notification', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="sms_notification" className="cursor-pointer">
                  SMS Notifications
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="marketing_notification"
                  checked={formData.marketing_notification}
                  onChange={(e) => handleInputChange('marketing_notification', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="marketing_notification" className="cursor-pointer">
                  Marketing Notifications
                </Label>
              </div>
            </div>
          </div>
          </form>
        </div>

        <SheetFooter className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="party-form"
            disabled={loading}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            {loading ? 'Saving...' : (editingParty ? 'Update Party' : 'Create Party')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}