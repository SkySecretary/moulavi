'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  Check, 
  Trash2, 
  Edit3, 
  Play, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Radio, 
  FileKey,
  Database,
  ArrowLeftRight,
  ShieldCheck,
  AlertCircle,
  Cloud,
  QrCode,
  FileCode,
  RotateCcw,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { whatsappChannelAPI } from '@/lib/api';

interface WhatsappChannel {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  channelId: string;
  isCloudApi: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  mappings?: UseCaseMapping[];
}

interface UseCaseMapping {
  id: string;
  useCase: string;
  channelId: string;
  templateName?: string | null;
  language?: string | null;
  customMessage?: string | null;
  isCloudApi?: boolean | null;
  isActive?: boolean;
  channel?: {
    id: string;
    name: string;
    isCloudApi: boolean;
    isActive: boolean;
  };
}

// System Use Cases with default templates and dynamic variable placeholders
const SYSTEM_USE_CASES = [
  {
    key: 'credentials',
    name: 'User Account Credentials',
    desc: 'Sent to new users when credentials are created.',
    defaultTemplateName: 'account_credentials',
    placeholders: ['name', 'email', 'password', 'frontendUrl'],
    defaultMessage: `🔐 *MOULAVI ERP - Account Credentials*

Dear {name},

Welcome to NuSync! Your account has been successfully created.

📧 *Email:* {email}
🔑 *Password:* {password}

⚠️ *Security Notice:* Please change your password after your first login.

🌐 *Login Link:* {frontendUrl}/

📞 *Support:* Info@moulavi.com
📱 *Phone:* +91-XXX-XXX-XXXX

Thank you for choosing NuSync!`,
  },
  {
    key: 'service_confirmation',
    name: 'Service Booking Confirmation',
    desc: 'Sent to pilgrims/parties when a booking is submitted.',
    defaultTemplateName: 'service_confirmation',
    placeholders: ['name', 'serviceType', 'bookingId', 'date'],
    defaultMessage: `✅ *MOULAVI ERP - Service Request Confirmation*

Dear {name},

Your {serviceType} service request has been successfully submitted!

📋 *Booking ID:* {bookingId}
📅 *Submitted:* {date}

📊 *Status:* Under Review
⏰ *Processing Time:* 24-48 hours

🔄 *What happens next?*
✓ Document verification
✓ Processing updates
✓ Final confirmation
✓ Support assistance

📞 *Need Help?*
📧 Email: Info@moulavi.com
📱 Phone: +91-XXX-XXX-XXXX

Thank you for choosing NuSync!`,
  },
  {
    key: 'movement_update',
    name: 'General Transport & Movement Updates',
    desc: 'Sent when travel dates or general route updates are configured.',
    defaultTemplateName: 'movement_update',
    placeholders: ['partyName', 'name', 'voucherNumber', 'date', 'time', 'fromLocation', 'toLocation', 'driverDetails1', 'driverDetails2', 'vehicleNumber'],
    defaultMessage: `🚗 *Movement Update - Voucher {voucherNumber}*

Dear {partyName},

Your movement details have been updated:

📅 *Date:* {date}
⏰ *Time:* {time}
📍 *From:* {fromLocation}
📍 *To:* {toLocation}
👤 *Driver 1:* {driverDetails1}
👤 *Driver 2:* {driverDetails2}
🚗 *Vehicle Number:* {vehicleNumber}

Thank you for choosing our services!`,
  },
  {
    key: 'driver_update',
    name: 'Driver Details Assignment',
    desc: 'Sent to B2B agencies with specific driver name, phone number, reporting time, and vehicle numbers.',
    defaultTemplateName: 'driver_details_update',
    placeholders: ['voucherNumber', 'agencyName', 'routeName', 'date', 'reportingTime', 'driverName', 'driverMobile', 'transportCompany'],
    defaultMessage: `*Welcome to {transportCompany}*
═══════════════════
🔹 *Voucher No:* {voucherNumber}
🏢 *Agency*:
{agencyName}

🛣️ *Route:* {routeName}

📅 *Service Date:* {date}
🕗 *Reporting Time:* {reportingTime}

👨✈️ *Driver:* {driverName}
📞 *Mobile:* {driverMobile}

═══════════════════
⚠️ *TRAVEL GUIDELINES*
📍 *Before Pickup*
Please contact the driver in advance and send Hotel Name & Location.

✈️ *Airport Arrivals* - Waiting time: Max 2 Hours after flight landing.
🏙️ *City Transfers* - Waiting time: Max 1 Hour.
🕌 *Ziyarat* - Pickup: 07:00-08:00 AM | Departure: 08:30 AM Sharp.

🤲 We wish you a safe and blessed journey.`,
  },
  {
    key: 'iqama_confirmation',
    name: 'Absher / Iqama Approvals',
    desc: 'Sent to sponsors to approve visa requests in Absher.',
    defaultTemplateName: 'absher_approval_request',
    placeholders: ['name', 'groupCode', 'bookingRef', 'passengerCount'],
    defaultMessage: `🌙 Greetings from Umra Company, Saudi Arabia 🇸🇦

Dear *{name}*,

Your family has applied for an Umrah Visa under your Iqama sponsorship.

🧾 *Booking Group Code:* {groupCode}
🔖 *Booking Reference:* {bookingRef}

✅ *Action Required:*
Please log in to your Absher account and approve the pending request at your earliest convenience so that we can proceed with issuing the Umrah visas.

📲 *Steps to Approve:*
1️⃣ Log in to Absher (Individual Account)
2️⃣ Go to My Services (خدماتي)
3️⃣ Select Inquiries (الاستعلامات)
4️⃣ Open General Services (الخدمات العامة)
5️⃣ Tap Qabul Services (قبول الخدمات)
6️⃣ Review the pending request and click Accept (قبول)

📞 If you need any assistance, please contact your travel agency.`,
  },
  {
    key: 'package_expired',
    name: 'Package Expired Alert',
    desc: "Sent to Iqama hosts when a pilgrim's package/visa duration has expired.",
    defaultTemplateName: 'package_expired_alert',
    placeholders: ['hostName', 'hostIqamaNo', 'pilgrimDetails'],
    defaultMessage: `🏢 NUSUK - OFFICIAL SYSTEM UPDATE 🏢

Dear {hostName},
(Host Iqama No.: {hostIqamaNo})

Our records indicate that your hosted pilgrim's Umrah visa program duration has expired. An immediate system update is required through your Absher account to maintain compliance.

👤 Pilgrim Details:
{pilgrimDetails}

⚠️ IMPORTANT NOTICE:
Please confirm the return date to synchronize the system. Failure to proceed may result in restrictions or delays for future Umrah visa issuances.`,
  },
  {
    key: 'custom',
    name: 'Custom Alerts & Manual Logs',
    desc: 'Sent when manually triggering test or custom messages.',
    defaultTemplateName: 'hello_world',
    placeholders: ['name', 'message'],
    defaultMessage: `Hello {name},

{message}

Powered by NuSync`,
  },
];

export default function WhatsappMastersPage() {
  const router = useRouter();
  
  // States
  const [channels, setChannels] = useState<WhatsappChannel[]>([]);
  const [mappings, setMappings] = useState<UseCaseMapping[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sheet Form State (Add/Edit Channel)
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<WhatsappChannel | null>(null);
  const [formName, setFormName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('https://wa.linalapro.com/api/v1');
  const [formApiKey, setFormApiKey] = useState('');
  const [formApiSecret, setFormApiSecret] = useState('');
  const [formChannelId, setFormChannelId] = useState('');
  const [formIsCloudApi, setFormIsCloudApi] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [showKeys, setShowKeys] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Test Dialog State
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testChannel, setTestChannel] = useState<WhatsappChannel | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testIsCloudApi, setTestIsCloudApi] = useState(false);
  const [testTemplateName, setTestTemplateName] = useState('hello_world');
  const [testLanguage, setTestLanguage] = useState('en_US');
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from the NuSync WhatsApp Multichannel system. 🚀');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // UseCase Message / Template Editor Dialog State
  const [isTemplateEditOpen, setIsTemplateEditOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<typeof SYSTEM_USE_CASES[0] | null>(null);
  const [templateFormChannelId, setTemplateFormChannelId] = useState('');
  const [templateFormIsCloudApi, setTemplateFormIsCloudApi] = useState(false);
  const [templateFormTemplateName, setTemplateFormTemplateName] = useState('');
  const [templateFormLanguage, setTemplateFormLanguage] = useState('en_US');
  const [templateFormCustomMessage, setTemplateFormCustomMessage] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [channelsRes, mappingsRes] = await Promise.all([
        whatsappChannelAPI.getAll(),
        whatsappChannelAPI.getMappings(),
      ]);

      if (channelsRes.data?.success) {
        setChannels(channelsRes.data.data.whatsappChannels || []);
      }
      if (mappingsRes.data?.success) {
        setMappings(mappingsRes.data.data.mappings || []);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load WhatsApp configuration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Form Reset
  const resetForm = () => {
    setEditingChannel(null);
    setFormName('');
    setFormBaseUrl('https://wa.linalapro.com/api/v1');
    setFormApiKey('');
    setFormApiSecret('');
    setFormChannelId('');
    setFormIsCloudApi(false);
    setFormIsActive(true);
    setShowKeys(false);
  };

  // Open Edit Form
  const handleEditClick = (channel: WhatsappChannel) => {
    setEditingChannel(channel);
    setFormName(channel.name);
    setFormBaseUrl(channel.baseUrl);
    setFormApiKey(channel.apiKey);
    setFormApiSecret(channel.apiSecret);
    setFormChannelId(channel.channelId);
    setFormIsCloudApi(channel.isCloudApi || false);
    setFormIsActive(channel.isActive);
    setIsSheetOpen(true);
  };

  // Submit Channel Profile Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formBaseUrl || !formApiKey || !formApiSecret || !formChannelId) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formName,
        baseUrl: formBaseUrl,
        apiKey: formApiKey,
        apiSecret: formApiSecret,
        channelId: formChannelId,
        isCloudApi: formIsCloudApi,
        isActive: formIsActive,
      };

      let res;
      if (editingChannel) {
        res = await whatsappChannelAPI.update(editingChannel.id, payload);
      } else {
        res = await whatsappChannelAPI.create(payload);
      }

      if (res.data?.success) {
        toast.success(editingChannel ? 'Channel profile updated.' : 'Channel profile created.');
        setIsSheetOpen(false);
        resetForm();
        fetchData();
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.error || 'Failed to save channel profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Profile
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile? This will remove all use case mappings to it.')) return;
    try {
      const res = await whatsappChannelAPI.delete(id);
      if (res.data?.success) {
        toast.success('Channel profile deleted.');
        fetchData();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete channel profile.');
    }
  };

  // Map Use Case to Channel
  const handleMappingChange = async (useCase: string, channelId: string) => {
    try {
      const currentMapping = mappings.find(m => m.useCase === useCase);
      const selectedCh = channels.find(c => c.id === channelId);
      
      const res = await whatsappChannelAPI.saveMapping({
        useCase,
        channelId,
        templateName: currentMapping?.templateName,
        language: currentMapping?.language || 'en_US',
        customMessage: currentMapping?.customMessage,
        isCloudApi: selectedCh ? selectedCh.isCloudApi : (currentMapping?.isCloudApi || false),
        isActive: true,
      });

      if (res.data?.success) {
        toast.success(`Sender channel updated for '${useCase}'`);
        fetchData();
      }
    } catch (error: any) {
      console.error('Mapping error:', error);
      toast.error('Failed to save use case mapping.');
    }
  };

  // Toggle usecase mapping active status
  const handleToggleMappingActive = async (useCaseKey: string, currentMapping: UseCaseMapping | undefined, checked: boolean) => {
    try {
      if (currentMapping) {
        const res = await whatsappChannelAPI.toggleMapping(currentMapping.id, checked);
        if (res.data?.success) {
          toast.success(`Notification use case '${useCaseKey}' ${checked ? 'enabled' : 'disabled'} successfully.`);
          fetchData();
        }
      } else {
        const defaultChannel = channels.find(c => c.isActive) || channels[0];
        if (!defaultChannel) {
          toast.error('Please create at least one WhatsApp channel profile first.');
          return;
        }
        const res = await whatsappChannelAPI.saveMapping({
          useCase: useCaseKey,
          channelId: defaultChannel.id,
          isCloudApi: defaultChannel.isCloudApi,
          isActive: checked,
        });
        if (res.data?.success) {
          toast.success(`Notification use case '${useCaseKey}' ${checked ? 'enabled' : 'disabled'} successfully.`);
          fetchData();
        }
      }
    } catch (error: any) {
      console.error('Toggle mapping error:', error);
      toast.error('Failed to toggle usecase mapping status.');
    }
  };

  // Open Template / Custom Message Editor Dialog
  const handleOpenTemplateEditor = (useCase: typeof SYSTEM_USE_CASES[0]) => {
    setSelectedUseCase(useCase);
    const existingMapping = mappings.find(m => m.useCase === useCase.key);
    const mappedChannel = channels.find(c => c.id === existingMapping?.channelId);

    const isCloud = existingMapping?.isCloudApi !== undefined && existingMapping?.isCloudApi !== null
      ? existingMapping.isCloudApi
      : (mappedChannel?.isCloudApi || false);

    setTemplateFormChannelId(existingMapping?.channelId || channels.find(c => c.isActive)?.id || channels[0]?.id || '');
    setTemplateFormIsCloudApi(isCloud);
    setTemplateFormTemplateName(existingMapping?.templateName || useCase.defaultTemplateName);
    setTemplateFormLanguage(existingMapping?.language || 'en_US');
    setTemplateFormCustomMessage(existingMapping?.customMessage || useCase.defaultMessage);
    setIsTemplateEditOpen(true);
  };

  // Save Template Configuration
  const handleSaveTemplateConfig = async () => {
    if (!selectedUseCase) return;
    if (!templateFormChannelId) {
      toast.error('Please select a sender channel.');
      return;
    }

    setSavingTemplate(true);
    try {
      const res = await whatsappChannelAPI.saveMapping({
        useCase: selectedUseCase.key,
        channelId: templateFormChannelId,
        templateName: templateFormTemplateName.trim() || null,
        language: templateFormLanguage.trim() || 'en_US',
        customMessage: templateFormCustomMessage.trim() || null,
        isCloudApi: templateFormIsCloudApi,
        isActive: true,
      });

      if (res.data?.success) {
        toast.success(`Configuration saved for '${selectedUseCase.name}'`);
        setIsTemplateEditOpen(false);
        fetchData();
      }
    } catch (error: any) {
      console.error('Save template config error:', error);
      toast.error(error.response?.data?.error || 'Failed to save template configuration.');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Open Test Dialog
  const handleTestClick = (channel: WhatsappChannel) => {
    setTestChannel(channel);
    setTestResult(null);
    setTestTo('');
    setTestIsCloudApi(channel.isCloudApi || false);
    setTestTemplateName('hello_world');
    setTestLanguage('en_US');
    setTestMessage('Hello! This is a test message from the NuSync WhatsApp Multichannel system. 🚀');
    setIsTestOpen(true);
  };

  // Send Test Message
  const handleSendTest = async () => {
    if (!testChannel) return;
    if (!testTo) {
      toast.error('Please enter a recipient phone number.');
      return;
    }

    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await whatsappChannelAPI.testConfig({
        baseUrl: testChannel.baseUrl,
        apiKey: testChannel.apiKey,
        apiSecret: testChannel.apiSecret,
        channelId: testChannel.channelId,
        to: testTo,
        isCloudApi: testIsCloudApi,
        templateName: testTemplateName,
        language: testLanguage,
        message: testMessage,
      });

      if (res.data?.success) {
        setTestResult({
          success: true,
          message: res.data.message || 'Message sent successfully!',
          details: res.data.data,
        });
        toast.success('Test message sent!');
      }
    } catch (error: any) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        message: error.response?.data?.error || error.message || 'Failed to send test message.',
        details: error.response?.data?.details || error.response?.data || error,
      });
      toast.error('Test message failed.');
    } finally {
      setTestLoading(false);
    }
  };

  // Check which channel is mapped to a usecase
  const getMappedChannelId = (useCaseKey: string): string => {
    const mapping = mappings.find(m => m.useCase === useCaseKey);
    return mapping?.channelId || 'legacy';
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50/50">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 lg:px-8 py-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              WhatsApp Multi-Channel Settings
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure Meta Cloud API and QR Code WhatsApp sender channels, and dynamically customize message templates per use case.
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setIsSheetOpen(true);
          }} 
          className="flex items-center gap-2 bg-primary hover:bg-primary/95 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Channel Profile
        </Button>
      </div>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <Tabs defaultValue="channels" className="space-y-6">
          <TabsList className="bg-white border p-1 rounded-xl shadow-sm inline-flex">
            <TabsTrigger value="channels" className="rounded-lg px-4 py-2 font-medium">
              <Database className="h-4 w-4 mr-2" />
              Channel Profiles ({channels.length})
            </TabsTrigger>
            <TabsTrigger value="router" className="rounded-lg px-4 py-2 font-medium">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Use Case Router & Message Templates
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Channels List */}
          <TabsContent value="channels" className="space-y-6 focus-visible:outline-none">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <Card key={n} className="border-slate-100 shadow-sm animate-pulse">
                    <CardHeader className="h-32 bg-slate-100/50" />
                    <CardContent className="h-20" />
                  </Card>
                ))}
              </div>
            ) : channels.length === 0 ? (
              <div className="text-center py-20 bg-white border rounded-2xl shadow-sm">
                <MessageSquare className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-850">No Channel Profiles Configured</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">
                  Add your first WhatsApp Cloud API or QR Code channel to route message templates through individual sender channels.
                </p>
                <Button 
                  onClick={() => setIsSheetOpen(true)} 
                  className="mt-6"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Profile
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.map((channel) => (
                  <Card key={channel.id} className="overflow-hidden hover:shadow-md transition-all duration-300 border-slate-200/80 bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      {/* Card Top / Header */}
                      <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 line-clamp-1">{channel.name}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            {channel.isCloudApi ? (
                              <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold flex items-center gap-1">
                                <Cloud className="h-3 w-3" />
                                Cloud API
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold flex items-center gap-1">
                                <QrCode className="h-3 w-3" />
                                QR Code / Text
                              </Badge>
                            )}
                            <span className="text-[10px] font-mono text-slate-400">
                              ID: {channel.channelId}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant={channel.isActive ? 'default' : 'secondary'}
                          className={channel.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border'}
                        >
                          {channel.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {/* Card Content Details */}
                      <div className="p-5 space-y-4">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target Endpoint</Label>
                          <p className="text-xs text-slate-700 font-mono break-all bg-slate-100 p-1.5 rounded">
                            {channel.baseUrl.replace(/\/$/, '')}{channel.isCloudApi ? '/messages/template' : '/messages'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-100">
                          <div>
                            <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Channel ID</Label>
                            <p className="text-xs text-slate-700 font-medium truncate mt-0.5">{channel.channelId}</p>
                          </div>
                          <div>
                            <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Routes</Label>
                            <p className="text-xs text-slate-700 font-medium mt-0.5">
                              {channel.mappings?.length || 0} active use case(s)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                      <Button
                        onClick={() => handleTestClick(channel)}
                        variant="outline"
                        size="sm"
                        className="text-primary hover:text-primary hover:bg-primary/5 flex items-center gap-1.5 border-primary/20 text-xs font-semibold"
                      >
                        <Play className="h-3.5 w-3.5 fill-current text-primary" />
                        Test Channel
                      </Button>
                      <div className="flex gap-1.5">
                        <Button
                          onClick={() => handleEditClick(channel)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:bg-slate-200"
                          title="Edit Profile"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(channel.id)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete Profile"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Use Case Router & Dynamic Template Editor */}
          <TabsContent value="router" className="space-y-6 focus-visible:outline-none">
            <Card className="border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-850">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                  UseCase Routing & Template Matrix
                </CardTitle>
                <CardDescription>
                  Route each system trigger to a specific WhatsApp channel, and dynamically configure custom message texts or Cloud API template names.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {SYSTEM_USE_CASES.map((usecase) => {
                    const mappedChannelId = getMappedChannelId(usecase.key);
                    const currentMapping = mappings.find(m => m.useCase === usecase.key);
                    const assignedChannel = channels.find(c => c.id === mappedChannelId);
                    const isCloud = currentMapping?.isCloudApi !== undefined && currentMapping?.isCloudApi !== null
                      ? currentMapping.isCloudApi
                      : (assignedChannel?.isCloudApi || false);
                    
                    return (
                      <div key={usecase.key} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                        <div className="space-y-1.5 max-w-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm md:text-base">
                              {usecase.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono capitalize">
                              {usecase.key}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {usecase.desc}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {isCloud ? (
                              <Badge className="bg-sky-50 text-sky-800 border-sky-200 text-[10px] font-medium flex items-center gap-1">
                                <Cloud className="h-3 w-3" />
                                Template: <span className="font-mono font-bold">{currentMapping?.templateName || usecase.defaultTemplateName}</span> ({currentMapping?.language || 'en_US'})
                              </Badge>
                            ) : currentMapping?.customMessage ? (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-medium flex items-center gap-1">
                                <FileCode className="h-3 w-3" />
                                Custom Dynamic Message Configured
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-[10px] font-medium">
                                Standard System Message
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 min-w-[380px]">
                          {/* Disable / Enable toggle switch */}
                          <div className="flex items-center gap-2 border-r pr-3 border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[45px] text-right">
                              {currentMapping?.isActive === false ? 'Stopped' : 'Active'}
                            </span>
                            <Switch 
                              checked={currentMapping?.isActive !== false}
                              onCheckedChange={(checked) => handleToggleMappingActive(usecase.key, currentMapping, checked)}
                            />
                          </div>

                          {/* Channel Selector */}
                          <div className="flex-1 min-w-[180px]">
                            <Select
                              value={mappedChannelId}
                              onValueChange={(val) => handleMappingChange(usecase.key, val)}
                              disabled={currentMapping?.isActive === false}
                            >
                              <SelectTrigger className="w-full bg-white border-slate-200 text-xs">
                                <SelectValue placeholder="Select Sender Channel" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="legacy">
                                  🔌 Default / Legacy Fallback (.env)
                                </SelectItem>
                                {channels
                                  .filter(c => c.isActive)
                                  .map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                      {c.isCloudApi ? '☁️' : '📱'} {c.name} {c.isCloudApi ? '(Cloud API)' : '(QR)'}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Edit Message / Template Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenTemplateEditor(usecase)}
                            className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs whitespace-nowrap flex items-center gap-1.5"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                            Edit Message
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Note alert */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-amber-800">Cloud API & Dynamic Placeholders Guide</h5>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  For <strong>Cloud API</strong> channels, the system sends pre-approved Meta message templates via <code>/messages/template</code> using your specified <code>templateName</code> and <code>language</code>. For <strong>QR Code / Text</strong> channels, you can fully customize the message text and use dynamic variables like <code>{'{name}'}</code>, <code>{'{bookingId}'}</code>, <code>{'{voucherNumber}'}</code>, etc.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sheet Form: Add/Edit Channel Profile */}
      <Sheet open={isSheetOpen} onOpenChange={(open) => {
        setIsSheetOpen(open);
        if (!open) resetForm();
      }}>
        <SheetContent side="right" className="w-[450px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              {editingChannel ? 'Edit Channel Profile' : 'Add Channel Profile'}
            </SheetTitle>
            <SheetDescription>
              Configure WhatsApp sender credentials for Meta Cloud API or QR Code gateway.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channelName" className="font-semibold text-xs">Profile / Sender Name *</Label>
                <Input 
                  id="channelName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Meta Cloud Alerts Sender"
                  required
                />
              </div>

              {/* Cloud API Type Toggle */}
              <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-sky-600" />
                    <Label htmlFor="isCloudApi" className="font-bold text-xs text-sky-900 cursor-pointer">
                      Cloud API Channel
                    </Label>
                  </div>
                  <p className="text-[11px] text-sky-700">
                    Enable if using Meta Cloud API with pre-approved message templates (routes to <code>/messages/template</code>).
                  </p>
                </div>
                <Switch 
                  id="isCloudApi"
                  checked={formIsCloudApi}
                  onCheckedChange={setFormIsCloudApi}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl" className="font-semibold text-xs">API Base URL *</Label>
                <Input 
                  id="baseUrl"
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                  placeholder="e.g. https://wa.linalapro.com/api/v1"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="apiKey" className="font-semibold text-xs flex items-center gap-1">
                    <FileKey className="h-3 w-3 text-slate-400" />
                    API Key (x-api-key) *
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] text-slate-500 hover:text-slate-700"
                    onClick={() => setShowKeys(!showKeys)}
                  >
                    {showKeys ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    {showKeys ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <Input 
                  id="apiKey"
                  type={showKeys ? 'text' : 'password'}
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="Your API Key"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiSecret" className="font-semibold text-xs flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-slate-400" />
                  API Secret (x-api-secret) *
                </Label>
                <Input 
                  id="apiSecret"
                  type={showKeys ? 'text' : 'password'}
                  value={formApiSecret}
                  onChange={(e) => setFormApiSecret(e.target.value)}
                  placeholder="Your API Secret"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channelId" className="font-semibold text-xs flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-slate-400" />
                  {formIsCloudApi ? 'Meta Channel ID (x-channel-id) *' : 'QR Code Channel ID (x-channel-id) *'}
                </Label>
                <Input 
                  id="channelId"
                  value={formChannelId}
                  onChange={(e) => setFormChannelId(e.target.value)}
                  placeholder={formIsCloudApi ? 'e.g. YOUR_META_CHANNEL_ID' : 'e.g. 104'}
                  required
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="font-semibold text-xs">Profile Status</Label>
                  <p className="text-[10px] text-slate-500">Enable or disable this sender channel dynamically.</p>
                </div>
                <Switch 
                  id="isActive"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            </div>

            <SheetFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingChannel ? 'Update Profile' : 'Save Profile'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog Modal: Edit Message / Template for Use Case */}
      <Dialog open={isTemplateEditOpen} onOpenChange={setIsTemplateEditOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Edit3 className="h-5 w-5 text-indigo-600" />
              Configure Template: {selectedUseCase?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Customize dynamic message content for QR Code channels or enter Meta template name for Cloud API channels.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Channel Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Sender WhatsApp Channel *</Label>
              <Select
                value={templateFormChannelId}
                onValueChange={(val) => {
                  setTemplateFormChannelId(val);
                  const ch = channels.find(c => c.id === val);
                  if (ch) {
                    setTemplateFormIsCloudApi(ch.isCloudApi);
                  }
                }}
              >
                <SelectTrigger className="w-full bg-white text-xs">
                  <SelectValue placeholder="Select Sender Channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.isCloudApi ? '☁️' : '📱'} {c.name} {c.isCloudApi ? '(Cloud API)' : '(QR Code)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cloud API Mode Switch */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-sky-600" />
                  <span className="font-bold text-xs text-slate-800">Cloud API Template Mode</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Switch on to send pre-approved template name via <code>/messages/template</code>.
                </p>
              </div>
              <Switch
                checked={templateFormIsCloudApi}
                onCheckedChange={setTemplateFormIsCloudApi}
              />
            </div>

            {/* Cloud API Fields */}
            {templateFormIsCloudApi ? (
              <div className="space-y-4 p-4 rounded-xl bg-sky-50/60 border border-sky-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-sky-950">Template Name *</Label>
                    <Input
                      value={templateFormTemplateName}
                      onChange={(e) => setTemplateFormTemplateName(e.target.value)}
                      placeholder="e.g. hello_world"
                      className="bg-white text-xs font-mono"
                    />
                    <p className="text-[10px] text-sky-700">Must match your Meta approved template name exactly.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-sky-950">Language Code *</Label>
                    <Input
                      value={templateFormLanguage}
                      onChange={(e) => setTemplateFormLanguage(e.target.value)}
                      placeholder="e.g. en_US, ar, en"
                      className="bg-white text-xs font-mono"
                    />
                    <p className="text-[10px] text-sky-700">Language code configured in Meta (e.g. en_US, ar).</p>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Payload Preview:</Label>
                  <pre className="text-[10px] font-mono bg-white p-2.5 rounded-lg border border-sky-200 overflow-x-auto text-slate-800">
{`curl -X POST https://wa.linalapro.com/api/v1/messages/template \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-api-secret: YOUR_API_SECRET" \\
  -H "x-channel-id: YOUR_META_CHANNEL_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+1234567890",
    "templateName": "${templateFormTemplateName || 'hello_world'}",
    "language": "${templateFormLanguage || 'en_US'}"
  }'`}
                  </pre>
                </div>
              </div>
            ) : (
              /* QR Code / Text Dynamic Message Fields */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">Custom Message Content (Text / QR API)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedUseCase) {
                        setTemplateFormCustomMessage(selectedUseCase.defaultMessage);
                      }
                    }}
                    className="h-6 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset to Default
                  </Button>
                </div>

                <Textarea
                  value={templateFormCustomMessage}
                  onChange={(e) => setTemplateFormCustomMessage(e.target.value)}
                  rows={8}
                  className="font-mono text-xs bg-white"
                  placeholder="Enter message template..."
                />

                {/* Placeholders chips */}
                {selectedUseCase?.placeholders && selectedUseCase.placeholders.length > 0 && (
                  <div className="space-y-1.5 p-3 rounded-lg bg-slate-100 border border-slate-200">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Available Dynamic Variables (Click to insert):
                    </Label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedUseCase.placeholders.map((ph) => (
                        <button
                          key={ph}
                          type="button"
                          onClick={() => setTemplateFormCustomMessage(prev => `${prev} {${ph}}`)}
                          className="px-2 py-0.5 rounded bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 text-[10px] font-mono font-semibold text-indigo-700 transition-colors shadow-2xs"
                        >
                          +{`{${ph}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsTemplateEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTemplateConfig} 
              disabled={savingTemplate}
              className="bg-primary text-white"
            >
              {savingTemplate ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modal: Test Sender Channel */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-500 fill-current" />
              Test Profile: {testChannel?.name}
            </DialogTitle>
            <DialogDescription>
              Verify connection settings by routing a live message through this WhatsApp channel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testTo" className="text-xs font-semibold">Recipient Number *</Label>
              <Input 
                id="testTo"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="Include country code, e.g. +919000000000"
                required
              />
              <p className="text-[10px] text-slate-400">
                Number must start with a country code (e.g., +91 for India, +966 for Saudi Arabia).
              </p>
            </div>

            {testIsCloudApi ? (
              <div className="space-y-3 p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                  <Cloud className="h-4 w-4 text-sky-600" />
                  Cloud API Template Test (/messages/template)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-sky-900">Template Name</Label>
                    <Input
                      value={testTemplateName}
                      onChange={(e) => setTestTemplateName(e.target.value)}
                      placeholder="hello_world"
                      className="bg-white text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-sky-900">Language</Label>
                    <Input
                      value={testLanguage}
                      onChange={(e) => setTestLanguage(e.target.value)}
                      placeholder="en_US"
                      className="bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="testMessage" className="text-xs font-semibold">Message Text</Label>
                <Textarea 
                  id="testMessage"
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Write test message here..."
                  required
                />
              </div>
            )}

            {/* Test Results Output */}
            {testResult && (
              <div className={`p-4 rounded-xl border ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'} space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-xs">
                  {testResult.success ? '✅ Success' : '❌ Error Sending'}
                </div>
                <p className="text-[11px] font-medium leading-relaxed">{testResult.message}</p>
                {testResult.details && (
                  <pre className="text-[9px] font-mono bg-white/60 p-2 rounded max-h-[120px] overflow-auto border border-black/5 whitespace-pre-wrap">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsTestOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={handleSendTest} 
              disabled={testLoading || !testTo}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {testLoading ? 'Testing Connection...' : 'Send Live Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
