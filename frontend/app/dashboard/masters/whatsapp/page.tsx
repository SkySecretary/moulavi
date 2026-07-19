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
  AlertCircle
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseCaseMapping {
  id: string;
  useCase: string;
  channelId: string;
  isActive?: boolean;
  channel?: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

export default function WhatsappMastersPage() {
  const router = useRouter();
  
  // States
  const [channels, setChannels] = useState<WhatsappChannel[]>([]);
  const [mappings, setMappings] = useState<UseCaseMapping[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sheet Form State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<WhatsappChannel | null>(null);
  const [formName, setFormName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('https://wa.linalapro.com/api/v1');
  const [formApiKey, setFormApiKey] = useState('');
  const [formApiSecret, setFormApiSecret] = useState('');
  const [formChannelId, setFormChannelId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [showKeys, setShowKeys] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Test Dialog State
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testChannel, setTestChannel] = useState<WhatsappChannel | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from the NuSync WhatsApp Multichannel system. 🚀');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Use Case Definitions
  const systemUseCases = [
    { key: 'credentials', name: 'User Account Credentials', desc: 'Sent to new users when credentials are created.' },
    { key: 'service_confirmation', name: 'Service Booking Confirmation', desc: 'Sent to pilgrims/parties when a booking is submitted.' },
    { key: 'movement_update', name: 'General Transport & Movement Updates', desc: 'Sent when travel dates or general route updates are configured.' },
    { key: 'driver_update', name: 'Driver Details Assignment', desc: 'Sent to B2B agencies with specific driver name, phone number, reporting time, and vehicle numbers.' },
    { key: 'iqama_confirmation', name: 'Absher / Iqama Approvals', desc: 'Sent to sponsors to approve visa requests in Absher.' },
    { key: 'custom', name: 'Custom Alerts & Manual Logs', desc: 'Sent when manually triggering test or custom messages.' },
  ];

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
    setFormIsActive(channel.isActive);
    setIsSheetOpen(true);
  };

  // Submit Profile Form
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
      const res = await whatsappChannelAPI.saveMapping(useCase, channelId, true);
      if (res.data?.success) {
        toast.success(`Mapping updated for '${useCase}'`);
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
        const res = await whatsappChannelAPI.saveMapping(useCaseKey, defaultChannel.id, checked);
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

  // Open Test Dialog
  const handleTestClick = (channel: WhatsappChannel) => {
    setTestChannel(channel);
    setTestResult(null);
    setTestTo('');
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
        message: testMessage,
      });

      if (res.data?.success) {
        setTestResult({
          success: true,
          message: 'Message sent successfully!',
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
            Configure external QR Code WhatsApp API channels and distribute them across system triggers.
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
              Use Case Router
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
                  Add your first WhatsApp QR Code channel to route message templates through individual sender channels.
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
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 line-clamp-1">{channel.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400 block max-w-[200px] truncate">
                            ID: {channel.id}
                          </span>
                        </div>
                        <Badge 
                          variant={channel.isActive ? 'default' : 'secondary'}
                          className={channel.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 border'}
                        >
                          {channel.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {/* Card Content Details */}
                      <div className="p-5 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-400">Base Endpoint</Label>
                          <p className="text-xs text-slate-600 font-mono break-all line-clamp-1 bg-slate-100 p-1.5 rounded">
                            {channel.baseUrl}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-semibold text-slate-400">Channel ID</Label>
                            <p className="text-xs text-slate-700 font-medium truncate mt-0.5">{channel.channelId}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-slate-400">Mappings</Label>
                            <p className="text-xs text-slate-700 font-medium mt-0.5">
                              {channel.mappings?.length || 0} active router(s)
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
                        className="text-primary hover:text-primary hover:bg-primary/5 flex items-center gap-1 border-primary/20"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Test Channel
                      </Button>
                      <div className="flex gap-1.5">
                        <Button
                          onClick={() => handleEditClick(channel)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:bg-slate-200"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(channel.id)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
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

          {/* Tab 2: Use Case Router Mappings */}
          <TabsContent value="router" className="focus-visible:outline-none">
            <Card className="border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-850">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                  UseCase Routing Matrix
                </CardTitle>
                <CardDescription>
                  Map specific notification templates to send through individual WhatsApp channel connections.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {systemUseCases.map((usecase) => {
                    const mappedChannelId = getMappedChannelId(usecase.key);
                    const currentChannelMapping = mappings.find(m => m.useCase === usecase.key);
                    
                    return (
                      <div key={usecase.key} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-sm md:text-base">
                              {usecase.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono capitalize">
                              {usecase.key}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {usecase.desc}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 min-w-[380px]">
                          {/* Disable / Enable toggle switch */}
                          <div className="flex items-center gap-2 border-r pr-4 border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[50px] text-right">
                              {currentChannelMapping?.isActive === false ? 'Stopped' : 'Active'}
                            </span>
                            <Switch 
                              checked={currentChannelMapping?.isActive !== false}
                              onCheckedChange={(checked) => handleToggleMappingActive(usecase.key, currentChannelMapping, checked)}
                            />
                          </div>

                          <Select
                            value={mappedChannelId}
                            onValueChange={(val) => handleMappingChange(usecase.key, val)}
                            disabled={currentChannelMapping?.isActive === false}
                          >
                            <SelectTrigger className="w-full bg-white border-slate-200">
                              <SelectValue placeholder="Select Sender Channel" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="legacy">
                                🔌 Default / Legacy Fallback (.env)
                              </SelectItem>
                              {channels
                                .filter(c => c.isActive)
                                .map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    🟢 {c.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          
                          {currentChannelMapping?.isActive === false ? (
                            <Badge variant="destructive" className="bg-red-50 text-red-700 border border-red-100 whitespace-nowrap shrink-0">
                              Stopped
                            </Badge>
                          ) : mappedChannelId !== 'legacy' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap shrink-0">
                              Mapped
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 whitespace-nowrap shrink-0">
                              Fallback
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Note alert */}
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-amber-800">Fallback Mechanism Note</h5>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  If you select "Default / Legacy Fallback" or the mapped channel is set to inactive, the notification will automatically fall back to the first available active database channel. If no active channels exist in the database, the system will use the configuration defined in your local <code>.env</code> file (SMSIdea).
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
              Provide configuration parameters for the wa.linalapro.com API QR Code channel.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channelName" className="font-semibold text-xs">Profile / Sender Name</Label>
                <Input 
                  id="channelName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Booking confirmations sender"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl" className="font-semibold text-xs">API Base URL</Label>
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
                    API Key (x-api-key)
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
                  placeholder="Your Linalapro API Key"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiSecret" className="font-semibold text-xs flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-slate-400" />
                  API Secret (x-api-secret)
                </Label>
                <Input 
                  id="apiSecret"
                  type={showKeys ? 'text' : 'password'}
                  value={formApiSecret}
                  onChange={(e) => setFormApiSecret(e.target.value)}
                  placeholder="Your Linalapro API Secret"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channelId" className="font-semibold text-xs flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-slate-400" />
                  QR Code Channel ID (x-channel-id)
                </Label>
                <Input 
                  id="channelId"
                  value={formChannelId}
                  onChange={(e) => setFormChannelId(e.target.value)}
                  placeholder="e.g. 104"
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

      {/* Dialog Modal: Test Sender Channel */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-500 fill-current" />
              Test Send Profile: {testChannel?.name}
            </DialogTitle>
            <DialogDescription>
              Verify connection settings by routing a live message through this WhatsApp channel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testTo" className="text-xs font-semibold">Recipient Number</Label>
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
