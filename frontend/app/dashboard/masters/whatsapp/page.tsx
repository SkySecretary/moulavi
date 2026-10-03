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
  Copy,
  ListOrdered,
  Heading,
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  HelpCircle,
  CheckCheck
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
  headerType?: string | null;
  headerText?: string | null;
  headerUrl?: string | null;
  templateParams?: string | null;
  buttonUrlParam?: string | null;
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
  const [testHeaderType, setTestHeaderType] = useState('none');
  const [testHeaderText, setTestHeaderText] = useState('');
  const [testHeaderUrl, setTestHeaderUrl] = useState('');
  const [testParameters, setTestParameters] = useState<string[]>([]);
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
  const [templateFormHeaderType, setTemplateFormHeaderType] = useState<'none' | 'text' | 'image' | 'document' | 'video'>('none');
  const [templateFormHeaderText, setTemplateFormHeaderText] = useState('');
  const [templateFormHeaderUrl, setTemplateFormHeaderUrl] = useState('');
  const [templateFormParams, setTemplateFormParams] = useState<string[]>([]);
  const [templateFormButtonUrlParam, setTemplateFormButtonUrlParam] = useState('');
  const [focusedParamIndex, setFocusedParamIndex] = useState<number | null>(0);
  const [isHeaderFocused, setIsHeaderFocused] = useState(false);
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

  const [isBodyFocused, setIsBodyFocused] = useState(false);

  // Helper to extract variables {{1}}, {{2}}, etc. from template body text with surrounding snippet context
  const getDetectedVariables = (bodyText: string) => {
    if (!bodyText) return [];
    const regex = /\{\{(\d+|[a-zA-Z0-9_-]+)\}\}/g;
    const matches: { index: number; raw: string; label: string; context: string }[] = [];
    let m;
    const seenIndices = new Set<number>();

    while ((m = regex.exec(bodyText)) !== null) {
      const raw = m[0];
      const key = m[1];
      const num = parseInt(key, 10);
      const varIndex = !isNaN(num) && num > 0 ? num - 1 : matches.length;

      const start = Math.max(0, m.index - 20);
      const end = Math.min(bodyText.length, m.index + raw.length + 20);
      const snippet = bodyText.substring(start, end).replace(/\n/g, ' ').trim();

      if (!seenIndices.has(varIndex)) {
        seenIndices.add(varIndex);
        matches.push({
          index: varIndex,
          raw,
          label: `{{${varIndex + 1}}}`,
          context: (start > 0 ? '...' : '') + snippet + (end < bodyText.length ? '...' : ''),
        });
      }
    }

    return matches.sort((a, b) => a.index - b.index);
  };

  // Helper to generate simulated message preview with realistic test values
  const getSimulatedPreview = () => {
    const body = templateFormCustomMessage || selectedUseCase?.defaultMessage || '';
    if (!body) return 'No template body content entered.';

    let preview = body;
    const sampleValues: Record<string, string> = {
      name: 'Ahmed Khan',
      partyName: 'Al-Madinah Travels',
      agencyName: 'Al-Madinah Travels',
      email: 'ahmed.khan@example.com',
      password: 'TemporaryPass#2026',
      frontendUrl: 'https://umra.moulavi.in',
      bookingId: 'UB-260630-008',
      bookingRef: 'UB-260630-008',
      bookingReference: 'UB-260630-008',
      groupNumber: '480900194418',
      groupCode: '480900194418',
      serviceType: 'Umrah Visa (Individual)',
      voucherNumber: '191',
      date: '24-Oct-2026',
      time: '14:30',
      fromLocation: 'Jeddah KAIA Airport',
      toLocation: 'Makkah Hotel',
      driverDetails1: 'Mohammed Ali (+966-50-123-4567)',
      driverDetails2: 'Tariq Saeed (+966-55-987-6543)',
      driverName: 'Mohammed Ali',
      driverMobile: '+966-50-123-4567',
      vehicleNumber: 'KSA-9821-B',
      routeName: 'JEDDAH AIRPORT -> MAKKAH HOTEL',
      reportingTime: '14:00 (30 mins before arrival)',
      transportCompany: 'Qafilat Hijaz Transport',
      passengerCount: '4',
      makkahHotel: 'Al-Olayan Al-Khalil',
      madinaHotel: 'Amjad Al-Salam',
    };

    if (templateFormIsCloudApi) {
      // Replace {{1}}, {{2}}, etc. with mapped parameter sample values
      templateFormParams.forEach((paramVal, i) => {
        let resolved = paramVal || `[Param {{${i + 1}}} Unmapped]`;
        if (paramVal) {
          resolved = resolved.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => sampleValues[key] || `{${key}}`);
        }
        preview = preview.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), resolved);
      });
    }

    // Also replace any remaining {placeholder} tokens in preview
    preview = preview.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => sampleValues[key] || `{${key}}`);

    return preview;
  };

  // Open Template / Custom Message Editor Dialog
  const handleOpenTemplateEditor = (useCase: typeof SYSTEM_USE_CASES[0]) => {
    setSelectedUseCase(useCase);
    const existingMapping = mappings.find(m => m.useCase === useCase.key);
    const mappedChannel = channels.find(c => c.id === existingMapping?.channelId);

    const isCloud = existingMapping?.isCloudApi !== undefined && existingMapping?.isCloudApi !== null
      ? existingMapping.isCloudApi
      : (mappedChannel?.isCloudApi || false);

    let parsedParams: string[] = [];
    if (existingMapping?.templateParams) {
      try {
        const parsed = JSON.parse(existingMapping.templateParams);
        if (Array.isArray(parsed)) parsedParams = parsed;
      } catch {
        parsedParams = existingMapping.templateParams.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (useCase.placeholders && useCase.placeholders.length > 0) {
      // Default to common placeholders
      parsedParams = useCase.placeholders.slice(0, 4).map(p => `{${p}}`);
    }

    // Initialize template body: if already saved, load it.
    // If empty and cloud api, convert default template to {{1}}, {{2}} format
    let initialBody = existingMapping?.customMessage || '';
    if (!initialBody) {
      if (useCase.placeholders && useCase.placeholders.length > 0) {
        let converted = useCase.defaultMessage;
        useCase.placeholders.forEach((ph, i) => {
          converted = converted.replace(new RegExp(`\\{${ph}\\}`, 'g'), `{{${i + 1}}}`);
        });
        initialBody = converted;
      } else {
        initialBody = useCase.defaultMessage;
      }
    }

    setTemplateFormChannelId(existingMapping?.channelId || channels.find(c => c.isActive)?.id || channels[0]?.id || '');
    setTemplateFormIsCloudApi(isCloud);
    setTemplateFormTemplateName(existingMapping?.templateName || useCase.defaultTemplateName);
    setTemplateFormLanguage(existingMapping?.language || 'en_US');
    setTemplateFormHeaderType((existingMapping?.headerType as any) || 'none');
    setTemplateFormHeaderText(existingMapping?.headerText || '');
    setTemplateFormHeaderUrl(existingMapping?.headerUrl || '');
    setTemplateFormParams(parsedParams);
    setTemplateFormButtonUrlParam(existingMapping?.buttonUrlParam || '');
    setTemplateFormCustomMessage(initialBody);
    setFocusedParamIndex(parsedParams.length > 0 ? 0 : null);
    setIsHeaderFocused(false);
    setIsBodyFocused(false);
    setIsTemplateEditOpen(true);
  };

  // Add a parameter row
  const handleAddParam = () => {
    setTemplateFormParams(prev => {
      const next = [...prev, ''];
      setFocusedParamIndex(next.length - 1);
      setIsHeaderFocused(false);
      setIsBodyFocused(false);
      return next;
    });
  };

  // Remove a parameter row
  const handleRemoveParam = (index: number) => {
    setTemplateFormParams(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (focusedParamIndex === index) {
        setFocusedParamIndex(next.length > 0 ? Math.max(0, index - 1) : null);
      } else if (focusedParamIndex !== null && focusedParamIndex > index) {
        setFocusedParamIndex(focusedParamIndex - 1);
      }
      return next;
    });
  };

  // Change a parameter value
  const handleParamChange = (index: number, val: string) => {
    setTemplateFormParams(prev => {
      const next = [...prev];
      // Auto extend if index exceeds array length
      while (next.length <= index) {
        next.push('');
      }
      next[index] = val;
      return next;
    });
  };

  // Insert placeholder helper
  const handleInsertPlaceholder = (ph: string) => {
    const token = `{${ph}}`;
    if (isHeaderFocused) {
      if (templateFormHeaderType === 'text') {
        setTemplateFormHeaderText(prev => prev ? `${prev} ${token}` : token);
      } else if (['image', 'document', 'video'].includes(templateFormHeaderType)) {
        setTemplateFormHeaderUrl(prev => prev ? `${prev}${token}` : token);
      }
      return;
    }

    if (isBodyFocused) {
      setTemplateFormCustomMessage(prev => prev ? `${prev} ${token}` : token);
      return;
    }

    if (templateFormIsCloudApi) {
      if (focusedParamIndex !== null && focusedParamIndex >= 0) {
        handleParamChange(
          focusedParamIndex,
          templateFormParams[focusedParamIndex]
            ? `${templateFormParams[focusedParamIndex]} ${token}`
            : token
        );
      } else {
        // Append as new parameter
        setTemplateFormParams(prev => {
          const next = [...prev, token];
          setFocusedParamIndex(next.length - 1);
          return next;
        });
      }
    } else {
      setTemplateFormCustomMessage(prev => prev ? `${prev} ${token}` : token);
    }
  };

  // Insert token like {{1}}, {{2}} into template body text
  const handleInsertTokenToBody = (token: string) => {
    setTemplateFormCustomMessage(prev => prev ? `${prev} ${token}` : token);
  };

  // Auto sync parameters from detected variables in body
  const handleSyncParamsFromDetected = () => {
    const detected = getDetectedVariables(templateFormCustomMessage);
    if (detected.length === 0) {
      toast.info('No {{1}}, {{2}} variables detected in the template body text.');
      return;
    }
    const maxIdx = Math.max(...detected.map(d => d.index));
    setTemplateFormParams(prev => {
      const next = [...prev];
      while (next.length <= maxIdx) {
        const defaultPh = selectedUseCase?.placeholders?.[next.length] ? `{${selectedUseCase.placeholders[next.length]}}` : '';
        next.push(defaultPh);
      }
      return next;
    });
    toast.success(`Synced ${maxIdx + 1} parameter mapping slots from template body.`);
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
        headerType: templateFormHeaderType || 'none',
        headerText: templateFormHeaderText.trim() || null,
        headerUrl: templateFormHeaderUrl.trim() || null,
        templateParams: JSON.stringify(templateFormParams.filter(p => p !== undefined)),
        buttonUrlParam: templateFormButtonUrlParam.trim() || null,
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
    setTestHeaderType('none');
    setTestHeaderText('');
    setTestHeaderUrl('');
    setTestParameters([]);
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
        headerType: testHeaderType,
        headerText: testHeaderText,
        headerUrl: testHeaderUrl,
        parameters: testParameters.filter(Boolean),
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
        <DialogContent className="sm:max-w-[860px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Edit3 className="h-5 w-5 text-indigo-600" />
              Configure Template: {selectedUseCase?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure Meta Cloud API approved template name, headers, full message body, and map variables ({`{{1}}`}, {`{{2}}`}) to ERP placeholders.
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
                  Switch on to send Meta pre-approved templates via <code>/messages/template</code> with headers, body text, and parameters.
                </p>
              </div>
              <Switch
                checked={templateFormIsCloudApi}
                onCheckedChange={setTemplateFormIsCloudApi}
              />
            </div>

            {/* Cloud API Fields */}
            {templateFormIsCloudApi ? (
              <div className="space-y-4">
                {/* 1. Template Basics */}
                <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 space-y-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950 uppercase tracking-wider">
                    <FileCode className="h-4 w-4 text-sky-600" />
                    1. Approved Template Details (Meta WhatsApp Manager)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-sky-950">Template Name *</Label>
                      <Input
                        value={templateFormTemplateName}
                        onChange={(e) => setTemplateFormTemplateName(e.target.value)}
                        placeholder="e.g. booking_confirmation"
                        className="bg-white text-xs font-mono"
                      />
                      <p className="text-[10px] text-sky-700">Must match your approved Meta template name exactly.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-sky-950">Language Code *</Label>
                      <Input
                        value={templateFormLanguage}
                        onChange={(e) => setTemplateFormLanguage(e.target.value)}
                        placeholder="e.g. en_US, ar, en"
                        className="bg-white text-xs font-mono"
                      />
                      <p className="text-[10px] text-sky-700">Language code configured in Meta (e.g. en_US, ar).</p>
                    </div>
                  </div>
                </div>

                {/* 2. Header Configuration */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                      <Heading className="h-4 w-4 text-indigo-600" />
                      2. Template Header (Optional)
                    </div>
                    {templateFormHeaderType !== 'none' && (
                      <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200 text-[10px] uppercase">
                        {templateFormHeaderType} Header
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Header Type</Label>
                      <Select
                        value={templateFormHeaderType}
                        onValueChange={(val: any) => setTemplateFormHeaderType(val)}
                      >
                        <SelectTrigger className="bg-white text-xs">
                          <SelectValue placeholder="Select Header Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">None (No Header)</SelectItem>
                          <SelectItem value="text" className="text-xs">Text Header</SelectItem>
                          <SelectItem value="image" className="text-xs">Image Header</SelectItem>
                          <SelectItem value="document" className="text-xs">Document (PDF) Header</SelectItem>
                          <SelectItem value="video" className="text-xs">Video Header</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {templateFormHeaderType === 'text' && (
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">Header Text</Label>
                        <Input
                          value={templateFormHeaderText}
                          onChange={(e) => setTemplateFormHeaderText(e.target.value)}
                          onFocus={() => { 
                            setIsHeaderFocused(true); 
                            setIsBodyFocused(false);
                            setFocusedParamIndex(null);
                          }}
                          placeholder="e.g. NuSync - {agencyName}"
                          className={`bg-white text-xs font-mono ${isHeaderFocused ? 'ring-2 ring-indigo-400' : ''}`}
                        />
                        <p className="text-[10px] text-slate-500">Supports static text and dynamic variables.</p>
                      </div>
                    )}

                    {['image', 'document', 'video'].includes(templateFormHeaderType) && (
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">Header Media URL</Label>
                        <Input
                          value={templateFormHeaderUrl}
                          onChange={(e) => setTemplateFormHeaderUrl(e.target.value)}
                          onFocus={() => { 
                            setIsHeaderFocused(true); 
                            setIsBodyFocused(false);
                            setFocusedParamIndex(null);
                          }}
                          placeholder="e.g. https://... or {voucherPdfUrl}"
                          className={`bg-white text-xs font-mono ${isHeaderFocused ? 'ring-2 ring-indigo-400' : ''}`}
                        />
                        <p className="text-[10px] text-slate-500">Direct HTTPS URL to image/document/video asset.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Template Body Content (Direct CRM Copy & Paste) */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                        3. Template Body / Content (Paste from Meta / CRM)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Paste your CRM or Meta approved message body. Use <code>{`{{1}}`}</code>, <code>{`{{2}}`}</code>, etc. for variables.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-500 mr-1">Insert Variable:</span>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleInsertTokenToBody(`{{${num}}}`)}
                          className="px-2 py-0.5 rounded bg-emerald-100/70 hover:bg-emerald-200 border border-emerald-300 text-[10px] font-mono font-bold text-emerald-800 transition-colors shadow-2xs"
                          title={`Insert {{${num}}} into template body`}
                        >
                          +{`{{${num}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Textarea
                    value={templateFormCustomMessage}
                    onChange={(e) => setTemplateFormCustomMessage(e.target.value)}
                    onFocus={() => {
                      setIsBodyFocused(true);
                      setIsHeaderFocused(false);
                      setFocusedParamIndex(null);
                    }}
                    rows={5}
                    className={`font-mono text-xs bg-white resize-y transition-all ${
                      isBodyFocused ? 'ring-2 ring-emerald-400 border-emerald-400' : ''
                    }`}
                    placeholder={`e.g. Assalamu Alaikum {{1}},\nYour Umrah Booking {{2}} has been confirmed with {{3}}.\nService: {{4}}\nVoucher #: {{5}}\nDates: {{6}} to {{7}}\nHotel: {{8}}`}
                  />

                  {/* Body Variable Detection Summary & Sync Tools */}
                  {(() => {
                    const detected = getDetectedVariables(templateFormCustomMessage);
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {detected.length > 0 ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] font-mono px-2 py-0.5">
                              ✨ {detected.length} Variable{detected.length > 1 ? 's' : ''} Detected ({detected.map(d => d.label).join(', ')})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 text-[10px]">
                              No {`{{1}}`} variables detected in body
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {detected.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSyncParamsFromDetected}
                              className="h-7 text-xs bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Auto-Sync {detected.length} Parameter Rows
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (selectedUseCase) {
                                let converted = selectedUseCase.defaultMessage;
                                if (selectedUseCase.placeholders && selectedUseCase.placeholders.length > 0) {
                                  selectedUseCase.placeholders.forEach((ph, i) => {
                                    converted = converted.replace(new RegExp(`\\{${ph}\\}`, 'g'), `{{${i + 1}}}`);
                                  });
                                }
                                setTemplateFormCustomMessage(converted);
                              }
                            }}
                            className="h-7 text-[11px] text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                          >
                            Reset Template
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 4. Body Parameters Mapping Config */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                        <ListOrdered className="h-4 w-4 text-emerald-600" />
                        4. Variable Mapping & Parameters ({`{{1}}`}, {`{{2}}`}, {`{{3}}`}...)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Map each variable to an ERP dynamic placeholder (e.g. <code>{`{name}`}</code>, <code>{`{bookingReference}`}</code>) or static value.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedUseCase?.placeholders) {
                            setTemplateFormParams(selectedUseCase.placeholders.slice(0, 5).map(p => `{${p}}`));
                            setFocusedParamIndex(0);
                            setIsHeaderFocused(false);
                            setIsBodyFocused(false);
                          }
                        }}
                        className="h-7 text-[10px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Load Defaults
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddParam}
                        className="h-7 text-xs bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Param
                      </Button>
                    </div>
                  </div>

                  {templateFormParams.length === 0 ? (
                    <div className="p-4 text-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-500 text-xs">
                      No parameters mapped yet. Click <strong>+ Add Param</strong> or <strong>Auto-Sync Parameter Rows</strong> above.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {templateFormParams.map((paramVal, idx) => {
                        const detectedList = getDetectedVariables(templateFormCustomMessage);
                        const match = detectedList.find(d => d.index === idx);

                        return (
                          <div 
                            key={idx} 
                            className={`p-2.5 rounded-lg border transition-all space-y-2 ${
                              focusedParamIndex === idx && !isHeaderFocused && !isBodyFocused
                                ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-mono text-[11px] px-2 py-0.5 shrink-0 font-bold">
                                {`{{${idx + 1}}}`}
                              </Badge>

                              {match?.context && (
                                <span className="text-[11px] font-mono text-slate-500 truncate max-w-[220px] bg-slate-100 px-2 py-0.5 rounded" title={match.context}>
                                  {match.context}
                                </span>
                              )}

                              <Input
                                value={paramVal}
                                onChange={(e) => handleParamChange(idx, e.target.value)}
                                onFocus={() => {
                                  setFocusedParamIndex(idx);
                                  setIsHeaderFocused(false);
                                  setIsBodyFocused(false);
                                }}
                                placeholder={`Mapped value e.g. {${selectedUseCase?.placeholders?.[idx] || 'name'}} or static text`}
                                className="text-xs font-mono h-8 bg-transparent flex-1"
                              />

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveParam(idx)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                title="Remove Parameter"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {/* Quick Select Variable Pills for this param */}
                            {selectedUseCase?.placeholders && selectedUseCase.placeholders.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pl-8">
                                <span className="text-[10px] text-slate-400">Quick Map:</span>
                                {selectedUseCase.placeholders.slice(0, 6).map((ph) => (
                                  <button
                                    key={ph}
                                    type="button"
                                    onClick={() => handleParamChange(idx, `{${ph}}`)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                      paramVal === `{${ph}}`
                                        ? 'bg-emerald-600 text-white font-bold'
                                        : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200'
                                    }`}
                                  >
                                    {`{${ph}}`}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 5. Available System Variables Tray */}
                {selectedUseCase?.placeholders && selectedUseCase.placeholders.length > 0 && (
                  <div className="space-y-2 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                        All Dynamic ERP Variables (Click to insert):
                      </Label>
                      <span className="text-[10px] text-indigo-700 font-medium">
                        {isHeaderFocused 
                          ? '👉 Inserting into Header' 
                          : isBodyFocused 
                            ? '👉 Inserting into Body Content'
                            : focusedParamIndex !== null 
                              ? `👉 Inserting into Parameter {{${focusedParamIndex + 1}}}` 
                              : 'Click chip to insert into active input'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedUseCase.placeholders.map((ph) => (
                        <button
                          key={ph}
                          type="button"
                          onClick={() => handleInsertPlaceholder(ph)}
                          className="px-2.5 py-1 rounded-md bg-white hover:bg-indigo-100/80 border border-indigo-200 hover:border-indigo-400 text-[11px] font-mono font-semibold text-indigo-800 transition-colors shadow-2xs cursor-pointer"
                        >
                          +{`{${ph}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. WhatsApp Chat Simulated Live Preview & Payload */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      Live WhatsApp Simulated Preview
                    </Label>
                    <Badge variant="outline" className="text-[10px] text-slate-500 bg-white">
                      Rendered with test data
                    </Badge>
                  </div>

                  {/* WhatsApp Bubble Preview */}
                  <div className="p-4 rounded-xl bg-[#e5ddd5] border border-slate-300 space-y-3">
                    <div className="max-w-[480px] bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-md space-y-2 border border-slate-100">
                      {/* Optional Header Rendering */}
                      {templateFormHeaderType === 'text' && templateFormHeaderText && (
                        <div className="font-bold text-xs text-slate-900 border-b border-slate-100 pb-1.5">
                          {templateFormHeaderText.replace(/\{([a-zA-Z0-9_]+)\}/g, 'Al-Madinah Travels')}
                        </div>
                      )}
                      {['image', 'document', 'video'].includes(templateFormHeaderType) && (
                        <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-2 text-xs text-slate-700">
                          {templateFormHeaderType === 'image' && <ImageIcon className="h-4 w-4 text-emerald-600" />}
                          {templateFormHeaderType === 'document' && <FileText className="h-4 w-4 text-emerald-600" />}
                          {templateFormHeaderType === 'video' && <VideoIcon className="h-4 w-4 text-emerald-600" />}
                          <span className="font-medium truncate font-mono text-[11px]">
                            [{templateFormHeaderType.toUpperCase()} Header: {templateFormHeaderUrl || 'Media Asset'}]
                          </span>
                        </div>
                      )}

                      {/* Body Message */}
                      <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                        {getSimulatedPreview()}
                      </div>

                      {/* Timestamp & Read Tick */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                        <span>12:45 PM</span>
                        <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  {/* JSON Payload Details (Collapsible Preview) */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Live Cloud API JSON Payload:</Label>
                      <span className="text-[10px] font-mono text-slate-400">POST /v18.0/{'{phone_number_id}'}/messages</span>
                    </div>
                    <pre className="text-[10px] font-mono bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto max-h-36">
{JSON.stringify({
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: "+966501234567",
  type: "template",
  template: {
    name: templateFormTemplateName || 'booking_confirmation',
    language: {
      code: templateFormLanguage || 'en_US'
    },
    components: [
      ...(templateFormHeaderType !== 'none' ? [{
        type: 'header',
        parameters: [
          templateFormHeaderType === 'text' 
            ? { type: 'text', text: templateFormHeaderText || 'Header Text' }
            : { type: templateFormHeaderType, [templateFormHeaderType]: { link: templateFormHeaderUrl || 'https://...' } }
        ]
      }] : []),
      ...(templateFormParams.length > 0 ? [{
        type: 'body',
        parameters: templateFormParams.map(p => ({
          type: 'text',
          text: p || '{placeholder}'
        }))
      }] : [])
    ]
  }
}, null, 2)}
                    </pre>
                  </div>
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
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
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
              <div className="space-y-3.5 p-3.5 rounded-xl bg-sky-50 border border-sky-200">
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

                {/* Optional Test Header */}
                <div className="space-y-2 pt-1 border-t border-sky-200">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-sky-900">Header Type</Label>
                      <Select
                        value={testHeaderType}
                        onValueChange={(val) => setTestHeaderType(val)}
                      >
                        <SelectTrigger className="bg-white text-xs h-8">
                          <SelectValue placeholder="Header" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">None</SelectItem>
                          <SelectItem value="text" className="text-xs">Text</SelectItem>
                          <SelectItem value="image" className="text-xs">Image</SelectItem>
                          <SelectItem value="document" className="text-xs">Document</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {testHeaderType === 'text' ? (
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] font-semibold text-sky-900">Header Text</Label>
                        <Input
                          value={testHeaderText}
                          onChange={(e) => setTestHeaderText(e.target.value)}
                          placeholder="Header text..."
                          className="bg-white text-xs h-8"
                        />
                      </div>
                    ) : testHeaderType !== 'none' ? (
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] font-semibold text-sky-900">Media URL</Label>
                        <Input
                          value={testHeaderUrl}
                          onChange={(e) => setTestHeaderUrl(e.target.value)}
                          placeholder="https://..."
                          className="bg-white text-xs h-8 font-mono"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Optional Test Parameters */}
                <div className="space-y-2 pt-1 border-t border-sky-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-semibold text-sky-900">Body Parameters (Optional)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTestParameters(prev => [...prev, ''])}
                      className="h-5 text-[10px] text-sky-700 hover:bg-sky-100"
                    >
                      + Add Param
                    </Button>
                  </div>
                  {testParameters.map((p, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-sky-800 shrink-0">{`{{${pIdx + 1}}}`}:</span>
                      <Input
                        value={p}
                        onChange={(e) => {
                          const next = [...testParameters];
                          next[pIdx] = e.target.value;
                          setTestParameters(next);
                        }}
                        placeholder={`Value for {{${pIdx + 1}}}`}
                        className="bg-white text-xs h-7"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTestParameters(prev => prev.filter((_, i) => i !== pIdx))}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
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
