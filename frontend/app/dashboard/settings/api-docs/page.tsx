'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Key, 
  Copy, 
  Check, 
  Play, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Code, 
  Terminal,
  Send,
  Building2,
  ShieldCheck,
  Users,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Bot,
  Zap,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const SAMPLE_INDIVIDUAL_JSON = {
  partyId: "", // Optional for Admin (leave empty for Direct B2C or specify Agency ID/Code)
  visaType: "individual_visa",
  guestName: "Mohammad Farooq",
  guestMobile: "+919876543210",
  passengers: [
    {
      fullName: "Mohammad Farooq",
      isLeadPassenger: true,
      passportNumber: "Z9876543",
      nationality: "IN",
      gender: "male",
      dateOfBirth: "1988-05-12",
      passportExpiry: "2032-11-20",
      phoneNumber: "+919876543210"
    },
    {
      fullName: "Ayesha Farooq",
      isLeadPassenger: false,
      passportNumber: "Z9876544",
      nationality: "IN",
      gender: "female",
      dateOfBirth: "1992-08-15",
      passportExpiry: "2033-04-10"
    }
  ],
  arrivalDate: "2026-11-10",
  arrivalTime: "14:30",
  arrivalAirportCode: "JED",
  arrivalFlightNumber: "SV-742",
  departureDate: "2026-11-24",
  departureTime: "19:00",
  departureAirportCode: "MED",
  departureFlightNumber: "SV-831",
  accommodationType: "hotel",
  hotelBookings: [
    {
      hotelName: "Al-Olayan Al-Khalil",
      cityName: "Makkah",
      checkInDate: "2026-11-10",
      checkOutDate: "2026-11-17",
      bedsQuantity: 2
    },
    {
      hotelName: "Amjad Al-Salam",
      cityName: "Madinah",
      checkInDate: "2026-11-17",
      checkOutDate: "2026-11-24",
      bedsQuantity: 2
    }
  ]
};

const SAMPLE_REENTRY_JSON = {
  partyId: "", // Optional for Admin (leave empty for Direct B2C or specify Agency ID/Code)
  visaType: "re_entry",
  umrahVisaNumber: "6092184910",
  guestName: "Tariq Mahmood",
  guestMobile: "+966551122334",
  passengers: [
    {
      fullName: "Tariq Mahmood",
      isLeadPassenger: true,
      passportNumber: "P4488123",
      nationality: "PK",
      gender: "male",
      dateOfBirth: "1985-03-21",
      passportExpiry: "2030-05-15",
      visaNumber: "6092184910"
    }
  ],
  arrivalDate: "2026-11-05",
  arrivalTime: "08:00",
  arrivalAirportCode: "JED",
  arrivalFlightNumber: "PK-731",
  departureDate: "2026-11-20",
  departureTime: "16:45",
  departureAirportCode: "JED",
  departureFlightNumber: "PK-732",
  accommodationType: "iqama",
  iqamaDetails: {
    iqamaNumber: "2498172635",
    iqamaSponserName: "Al-Rajhi Contracting Co.",
    sponserDob: "1980-01-01",
    sponserMobileNumber: "+966551122334",
    sponserNationalShortAddress: "RRRD2938 Riyadh",
    sponserNationality: "Saudi Arabia",
    makkahHotelName: "Al Diwan Tower",
    madinahHotelName: "Elaf Taiba"
  }
};

const SAMPLE_GROUP_JSON = {
  partyId: "", // Optional for Admin (leave empty for Direct B2C or specify Agency ID/Code)
  visaType: "group_visa",
  groupNumber: "GRP-2026-9921",
  groupName: "Delhi Premier Umrah Group Nov 2026",
  guestName: "Delhi Premier Group",
  guestMobile: "+919811223344",
  passengerCount: 2,
  passengers: [
    {
      fullName: "Usman Ghani",
      isLeadPassenger: true,
      passportNumber: "K1122334",
      nationality: "IN",
      gender: "male",
      dateOfBirth: "1975-02-10",
      passportExpiry: "2030-09-12",
      phoneNumber: "+919811223344"
    },
    {
      fullName: "Zainab Usman",
      isLeadPassenger: false,
      passportNumber: "K1122335",
      nationality: "IN",
      gender: "female",
      dateOfBirth: "1980-04-18",
      passportExpiry: "2031-10-15"
    }
  ],
  arrivalDate: "2026-11-12",
  arrivalTime: "11:20",
  arrivalAirportCode: "JED",
  arrivalFlightNumber: "AI-965",
  departureDate: "2026-11-26",
  departureTime: "22:15",
  departureAirportCode: "MED",
  departureFlightNumber: "AI-966",
  accommodationType: "hotel",
  hotelBookings: [
    {
      hotelName: "fajr alnosk",
      cityName: "Makkah",
      checkInDate: "2026-11-12",
      checkOutDate: "2026-11-19",
      bedsQuantity: 2
    },
    {
      hotelName: "DIWAN ALMADINAH HOTEL",
      cityName: "Madinah",
      checkInDate: "2026-11-19",
      checkOutDate: "2026-11-26",
      bedsQuantity: 2
    }
  ]
};

export default function ApiDocsPage() {
  // Admin Master Key State
  const [adminApiKey, setAdminApiKey] = useState('');
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [copiedAdminKey, setCopiedAdminKey] = useState(false);
  const [isRegeneratingAdminKey, setIsRegeneratingAdminKey] = useState(false);

  // Agency Tokens State
  const [agencies, setAgencies] = useState<any[]>([]);
  const [agencySearch, setAgencySearch] = useState('');
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Sandbox State
  const [authMode, setAuthMode] = useState<'admin' | 'agency'>('admin');
  const [selectedAgencyToken, setSelectedAgencyToken] = useState<string>('');
  const [activeApiKey, setActiveApiKey] = useState('');
  const [selectedVisaType, setSelectedVisaType] = useState<'individual' | 're_entry' | 'group'>('individual');
  const [codeLang, setCodeLang] = useState<'curl' | 'javascript' | 'python' | 'php' | 'whatsapp'>('curl');
  const [testPayload, setTestPayload] = useState(JSON.stringify(SAMPLE_INDIVIDUAL_JSON, null, 2));
  const [testResponse, setTestResponse] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master Catalogs
  const [masterLookups, setMasterLookups] = useState<any>(null);
  const [loadingLookups, setLoadingLookups] = useState(false);

  useEffect(() => {
    fetchAdminMasterKey();
    fetchAgencies();
    fetchLookups();
  }, []);

  useEffect(() => {
    if (authMode === 'admin') {
      setActiveApiKey(adminApiKey || 'ns_master_demo_key');
    } else {
      setActiveApiKey(selectedAgencyToken || 'ns_live_agency_token');
    }
  }, [authMode, adminApiKey, selectedAgencyToken]);

  const fetchAdminMasterKey = async () => {
    try {
      const res = await api.get('/parties/admin/master-api-key');
      if (res.data?.data?.apiKey) {
        setAdminApiKey(res.data.data.apiKey);
        setActiveApiKey(res.data.data.apiKey);
      }
    } catch (e) {
      console.error('Failed to fetch admin master key:', e);
    }
  };

  const handleRegenerateAdminKey = async () => {
    if (!confirm('Are you sure you want to regenerate your Admin Master API Key? Any external automation or bot using the old key will need to be updated.')) {
      return;
    }
    try {
      setIsRegeneratingAdminKey(true);
      const res = await api.post('/parties/admin/generate-master-api-key');
      if (res.data?.data?.apiKey) {
        setAdminApiKey(res.data.data.apiKey);
        setActiveApiKey(res.data.data.apiKey);
        toast.success('Admin Master API Key regenerated successfully!');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to regenerate Master API Key');
    } finally {
      setIsRegeneratingAdminKey(false);
    }
  };

  const fetchAgencies = async () => {
    try {
      setLoadingAgencies(true);
      const res = await api.get('/parties/admin/partner-keys');
      if (res.data?.data) {
        setAgencies(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch partner keys:', e);
    } finally {
      setLoadingAgencies(false);
    }
  };

  const handleIssueAgencyKey = async (agencyId: string) => {
    try {
      setActionInProgressId(agencyId);
      const res = await api.post(`/parties/${agencyId}/generate-api-key`);
      toast.success(res.data?.message || 'Agency API Key issued successfully!');
      await fetchAgencies();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to generate agency API key');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRevokeAgencyKey = async (agencyId: string) => {
    if (!confirm('Are you sure you want to revoke this agency API key? All programmatic requests from this agency will immediately fail.')) {
      return;
    }
    try {
      setActionInProgressId(agencyId);
      const res = await api.post(`/parties/${agencyId}/revoke-api-key`);
      toast.success(res.data?.message || 'Agency API Key revoked successfully!');
      await fetchAgencies();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to revoke agency API key');
    } finally {
      setActionInProgressId(null);
    }
  };

  const fetchLookups = async () => {
    try {
      setLoadingLookups(true);
      const res = await api.get('/v1/external/masters/lookup', {
        headers: { 'x-api-key': adminApiKey || 'ns_master_demo_key' }
      });
      if (res.data?.data) {
        setMasterLookups(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load lookups:', e);
    } finally {
      setLoadingLookups(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleSelectVisaSample = (type: 'individual' | 're_entry' | 'group') => {
    setSelectedVisaType(type);
    if (type === 'individual') {
      setTestPayload(JSON.stringify(SAMPLE_INDIVIDUAL_JSON, null, 2));
    } else if (type === 're_entry') {
      setTestPayload(JSON.stringify(SAMPLE_REENTRY_JSON, null, 2));
    } else {
      setTestPayload(JSON.stringify(SAMPLE_GROUP_JSON, null, 2));
    }
  };

  const handleValidateDryRun = async () => {
    try {
      setIsValidating(true);
      const parsed = JSON.parse(testPayload);
      const res = await api.post('/v1/external/bookings/validate', parsed, {
        headers: { 'x-api-key': activeApiKey }
      });
      setTestResponse({
        status: res.status,
        statusText: res.statusText,
        data: res.data
      });
      toast.success('Validation passed!');
    } catch (error: any) {
      setTestResponse({
        status: error.response?.status || 500,
        statusText: error.response?.statusText || 'Error',
        data: error.response?.data || { error: error.message }
      });
      toast.error(error.response?.data?.message || 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteLiveBooking = async () => {
    try {
      setIsSubmitting(true);
      const parsed = JSON.parse(testPayload);
      const res = await api.post('/v1/external/bookings', parsed, {
        headers: { 'x-api-key': activeApiKey }
      });
      setTestResponse({
        status: res.status,
        statusText: res.statusText,
        data: res.data
      });
      toast.success(`Booking Created: ${res.data?.data?.bookingReference}`);
    } catch (error: any) {
      setTestResponse({
        status: error.response?.status || 500,
        statusText: error.response?.statusText || 'Error',
        data: error.response?.data || { error: error.message }
      });
      toast.error(error.response?.data?.error || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateCodeSnippet = () => {
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/v1/external` : 'https://umra.moulavi.in/api/v1/external';

    if (codeLang === 'curl') {
      return `curl -X POST ${baseUrl}/bookings \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${activeApiKey}" \\\n  -d '${testPayload.replace(/'/g, "'\\''")}'`;
    }

    if (codeLang === 'javascript') {
      return `const axios = require('axios');\n\nconst payload = ${testPayload};\n\nasync function createBooking() {\n  try {\n    const response = await axios.post(\n      '${baseUrl}/bookings',\n      payload,\n      {\n        headers: {\n          'x-api-key': '${activeApiKey}',\n          'Content-Type': 'application/json'\n        }\n      }\n    );\n    console.log('Created Booking Reference:', response.data.data.bookingReference);\n  } catch (error) {\n    console.error('Booking Error:', error.response?.data || error.message);\n  }\n}\n\ncreateBooking();`;
    }

    if (codeLang === 'python') {
      return `import requests\nimport json\n\nurl = "${baseUrl}/bookings"\nheaders = {\n    "x-api-key": "${activeApiKey}",\n    "Content-Type": "application/json"\n}\npayload = ${testPayload.replace(/true/g, 'True').replace(/false/g, 'False')}\n\nresponse = requests.post(url, json=payload, headers=headers)\nprint(response.json())`;
    }

    if (codeLang === 'php') {
      return `<?php\n$curl = curl_init();\n\ncurl_setopt_array($curl, array(\n  CURLOPT_URL => '${baseUrl}/bookings',\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_CUSTOMREQUEST => 'POST',\n  CURLOPT_POSTFIELDS => '${testPayload.replace(/'/g, "\\'")}',\n  CURLOPT_HTTPHEADER => array(\n    'x-api-key: ${activeApiKey}',\n    'Content-Type: application/json'\n  ),\n));\n\n$response = curl_exec($curl);\ncurl_close($curl);\necho $response;`;
    }

    if (codeLang === 'whatsapp') {
      return `// Example WhatsApp Webhook / Node.js Chatbot Handler\napp.post('/whatsapp/webhook', async (req, res) => {\n  const { message, senderPhone } = req.body;\n  \n  // 1. Construct booking payload\n  const bookingPayload = {\n    visaType: 'individual_visa',\n    guestName: message.guestName,\n    guestMobile: senderPhone,\n    passengers: [{ fullName: message.guestName, isLeadPassenger: true }],\n    arrivalDate: message.travelDate,\n    accommodationType: 'hotel',\n    hotelBookings: [{ hotelName: 'fajr alnosk', cityName: 'Makkah', checkInDate: message.travelDate, checkOutDate: message.returnDate }]\n  };\n\n  // 2. Submit to NuSync ERP via Admin Master API Key\n  const { data } = await axios.post('${baseUrl}/bookings', bookingPayload, {\n    headers: { 'x-api-key': '${adminApiKey || "YOUR_ADMIN_MASTER_KEY"}' }\n  });\n\n  // 3. Send confirmation WhatsApp back to customer\n  await sendWhatsApp(senderPhone, 'Booking confirmed! Reference: ' + data.data.bookingReference);\n  res.sendStatus(200);\n});`;
    }

    return '';
  };

  const filteredAgencies = agencies.filter(a => 
    a.partyName?.toLowerCase().includes(agencySearch.toLowerCase()) ||
    a.partyCode?.toLowerCase().includes(agencySearch.toLowerCase()) ||
    a.email?.toLowerCase().includes(agencySearch.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">API Control & Developer Portal</h1>
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-mono text-xs">Admin Master & Partner REST</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Issue and manage API tokens for external agencies, configure master automation keys, and test live booking payloads.
          </p>
        </div>
      </div>

      {/* Admin Master Key Card */}
      <Card className="border-indigo-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg overflow-hidden">
        <CardHeader className="pb-3 border-b border-indigo-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  Admin Master API Key
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-medium">
                    FULL ACCESS
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-indigo-200/70">
                  Use this master key for WhatsApp bots, 3rd-party CRMs, Zapier/n8n, and backend scripts to create bookings for any agency.
                </CardDescription>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerateAdminKey}
              disabled={isRegeneratingAdminKey}
              className="border-indigo-400/30 text-indigo-200 hover:text-white hover:bg-indigo-800/50 bg-transparent text-xs h-8"
            >
              {isRegeneratingAdminKey ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Regenerate Master Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Input
                readOnly
                type={showAdminKey ? 'text' : 'password'}
                value={adminApiKey || 'ns_master_fetching_key...'}
                className="font-mono text-sm bg-slate-950/80 text-emerald-400 border-indigo-800/60 h-11 pr-24"
              />
              <div className="absolute right-2 top-1.5 flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="h-8 px-2 text-indigo-300 hover:text-white hover:bg-slate-800"
                >
                  {showAdminKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleCopy(adminApiKey, 'Admin Master Key');
                    setCopiedAdminKey(true);
                    setTimeout(() => setCopiedAdminKey(false), 2000);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 px-3 text-xs font-bold"
                >
                  {copiedAdminKey ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  Copy
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-indigo-200/80">
            <div className="flex items-center gap-2 bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-800/30">
              <Bot className="h-4 w-4 text-emerald-400 shrink-0" />
              <span><strong>WhatsApp Chatbots:</strong> Direct booking intake</span>
            </div>
            <div className="flex items-center gap-2 bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-800/30">
              <Zap className="h-4 w-4 text-amber-400 shrink-0" />
              <span><strong>Automation:</strong> Route via <code className="text-indigo-300">partyId</code> or Direct</span>
            </div>
            <div className="flex items-center gap-2 bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-800/30">
              <Globe className="h-4 w-4 text-sky-400 shrink-0" />
              <span><strong>Bypass:</strong> No ticket restrictions enforced</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="agencies" className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="agencies" className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Agency Token Issuance
          </TabsTrigger>
          <TabsTrigger value="sandbox" className="flex items-center gap-1.5 text-xs">
            <Play className="h-3.5 w-3.5" />
            Interactive Sandbox
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="flex items-center gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            Endpoints & Schema
          </TabsTrigger>
          <TabsTrigger value="catalogs" className="flex items-center gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            Master Catalogs
          </TabsTrigger>
          <TabsTrigger value="automations" className="flex items-center gap-1.5 text-xs">
            <Bot className="h-3.5 w-3.5" />
            Automation & Webhooks
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AGENCY TOKEN ISSUANCE */}
        <TabsContent value="agencies" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Registered Partner Agencies & API Tokens
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Issue, rotate, or revoke API access tokens for partner agencies. Only Admin can issue and view tokens.
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search agency name, code..."
                    value={agencySearch}
                    onChange={(e) => setAgencySearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingAgencies ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading agencies...
                </div>
              ) : filteredAgencies.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No agencies matching your search.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-3 px-4">Agency Name</th>
                        <th className="py-3 px-4">Party Code</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Token Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAgencies.map((agency) => (
                        <tr key={agency.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {agency.partyName}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {agency.partyCode || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            <div>{agency.email}</div>
                            {agency.whatsappNumber && <div className="text-[10px] text-emerald-600">WA: {agency.whatsappNumber}</div>}
                          </td>
                          <td className="py-3 px-4">
                            {agency.apiKey ? (
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-[10px]">
                                  Active
                                </Badge>
                                <span className="font-mono text-[11px] text-slate-500">
                                  {agency.apiKey.substring(0, 12)}...
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[10px]">
                                Not Issued
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {agency.apiKey ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopy(agency.apiKey, `API Key for ${agency.partyName}`)}
                                  className="h-7 text-xs px-2"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy Key
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleIssueAgencyKey(agency.id)}
                                  disabled={actionInProgressId === agency.id}
                                  className="h-7 text-xs px-2 text-indigo-600 hover:text-indigo-700"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Rotate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRevokeAgencyKey(agency.id)}
                                  disabled={actionInProgressId === agency.id}
                                  className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleIssueAgencyKey(agency.id)}
                                disabled={actionInProgressId === agency.id}
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                <Key className="h-3 w-3 mr-1" />
                                Issue Token
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: INTERACTIVE SANDBOX */}
        <TabsContent value="sandbox" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Request Payload Builder (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-indigo-600" />
                        Request Payload Builder & Tester
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Simulate booking creation live using Master Admin credentials or simulate specific agency tokens.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                      <Button
                        size="sm"
                        variant={selectedVisaType === 'individual' ? 'default' : 'ghost'}
                        onClick={() => handleSelectVisaSample('individual')}
                        className="h-7 text-xs px-2.5"
                      >
                        Individual Visa
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedVisaType === 're_entry' ? 'default' : 'ghost'}
                        onClick={() => handleSelectVisaSample('re_entry')}
                        className="h-7 text-xs px-2.5"
                      >
                        Re-Entry Visa
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedVisaType === 'group' ? 'default' : 'ghost'}
                        onClick={() => handleSelectVisaSample('group')}
                        className="h-7 text-xs px-2.5"
                      >
                        Group Visa
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <textarea
                      value={testPayload}
                      onChange={(e) => setTestPayload(e.target.value)}
                      rows={16}
                      className="w-full font-mono text-xs bg-slate-950 text-slate-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(testPayload, 'Payload JSON')}
                      className="absolute top-3 right-3 h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleValidateDryRun}
                      disabled={isValidating || isSubmitting}
                      className="text-xs font-semibold"
                    >
                      {isValidating ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-sky-600" />}
                      Dry-Run Validate
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleExecuteLiveBooking}
                      disabled={isValidating || isSubmitting}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                    >
                      {isSubmitting ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                      Create Live Booking Request
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Code Snippets Box */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Code className="h-4 w-4 text-indigo-600" />
                      Client Code Snippets
                    </CardTitle>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                      {(['curl', 'javascript', 'python', 'php', 'whatsapp'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setCodeLang(lang)}
                          className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                            codeLang === lang ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {lang === 'javascript' ? 'Node.js' : lang.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto max-h-56 leading-relaxed">
                      {generateCodeSnippet()}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(generateCodeSnippet(), 'Code snippet')}
                      className="absolute top-3 right-3 h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Live Response Inspector (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-slate-200 sticky top-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-600" />
                      Live Response Inspector
                    </CardTitle>
                    {testResponse && (
                      <Badge
                        className={`text-xs font-mono ${
                          testResponse.status >= 200 && testResponse.status < 300
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        HTTP {testResponse.status} {testResponse.statusText}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Real-time response payload returned from the API backend.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {testResponse ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed">
                          {JSON.stringify(testResponse.data, null, 2)}
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(JSON.stringify(testResponse.data, null, 2), 'Response JSON')}
                          className="absolute top-3 right-3 h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {testResponse.data?.data?.bookingReference && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Booking Queued in Admin Portal
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            Booking reference <span className="font-mono font-bold">{testResponse.data.data.bookingReference}</span> has been saved and is immediately visible in <strong>Umrah Visa &gt; Bookings</strong> and <strong>Assign Group</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50/50">
                      <Send className="h-8 w-8 mb-2 text-slate-300" />
                      <p className="text-xs font-medium text-slate-600">No request executed yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Click "Dry-Run Validate" or "Create Live Booking" on the left to inspect the output.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: ENDPOINTS & SCHEMA */}
        <TabsContent value="endpoints" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* POST /bookings */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-mono">POST</Badge>
                    <code className="font-mono font-bold text-xs">/api/v1/external/bookings</code>
                  </div>
                  <Badge variant="outline" className="text-slate-600 text-[10px]">Create Booking</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <p className="text-slate-600">
                  Creates a new booking request in NuSync. Generates a unique reference <code className="text-indigo-600 font-bold font-mono">UB-YYMMDD-XXX</code> and notifies the agency via WhatsApp asynchronously.
                </p>
                <div className="space-y-1">
                  <div className="font-bold text-slate-800">Key Parameters:</div>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                    <li><code className="font-bold font-mono">partyId</code> (Optional for Admin): Target agency ID or partyCode.</li>
                    <li><code className="font-bold font-mono">visaType</code>: <code className="text-emerald-700">individual_visa</code> | <code className="text-sky-700">re_entry</code> | <code className="text-purple-700">group_visa</code></li>
                    <li><code className="font-bold font-mono">passengers[]</code>: Array of passenger objects with names & passports.</li>
                    <li><code className="font-bold font-mono">accommodationType</code>: <code className="font-mono">hotel</code> (with hotelBookings array) or <code className="font-mono">iqama</code> (with iqamaDetails object).</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* POST /bookings/validate */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-sky-600 text-white font-mono">POST</Badge>
                    <code className="font-mono font-bold text-xs">/api/v1/external/bookings/validate</code>
                  </div>
                  <Badge variant="outline" className="text-slate-600 text-[10px]">Dry-Run Check</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <p className="text-slate-600">
                  Pre-flight dry-run check without persisting to the database. Returns boolean <code className="font-mono">valid</code>, with arrays of <code className="font-mono">errors</code> and <code className="font-mono">warnings</code>.
                </p>
                <div className="space-y-1">
                  <div className="font-bold text-slate-800">Validation Rules:</div>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                    <li>Flight date chronological ordering & maximum duration (80 days).</li>
                    <li>Duplicate group number conflict detection.</li>
                    <li>Hotel name/code and city resolution check.</li>
                    <li>Iqama sponsor details and maximum 5 pax ceiling.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* GET /bookings */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-600 text-white font-mono">GET</Badge>
                    <code className="font-mono font-bold text-xs">/api/v1/external/bookings</code>
                  </div>
                  <Badge variant="outline" className="text-slate-600 text-[10px]">Query List</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <p className="text-slate-600">
                  List bookings. Admin credentials return bookings across all agencies (or filterable by <code className="font-mono">?partyId=...</code>). Agency credentials return only their own.
                </p>
                <div className="space-y-1">
                  <div className="font-bold text-slate-800">Query Filters:</div>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                    <li><code className="font-mono">status</code>: <code className="text-slate-700">pending | group_assigned | voucher_generated</code></li>
                    <li><code className="font-mono">search</code>: Search by guest name, passport, or reference.</li>
                    <li><code className="font-mono">page</code> & <code className="font-mono">limit</code>: Standard pagination.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* GET /masters/lookup */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-600 text-white font-mono">GET</Badge>
                    <code className="font-mono font-bold text-xs">/api/v1/external/masters/lookup</code>
                  </div>
                  <Badge variant="outline" className="text-slate-600 text-[10px]">Catalogs</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <p className="text-slate-600">
                  Fetches active lookup values: Airports (JED, MED, RUH), Makkah & Madinah Hotels with internal codes, Cities, Transport Routes, and Agencies.
                </p>
                <div className="space-y-1">
                  <div className="font-bold text-slate-800">Benefits:</div>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                    <li>Pre-populate dropdown menus in external booking engines.</li>
                    <li>Map external hotel names directly to NuSync master codes.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: MASTER CATALOGS */}
        <TabsContent value="catalogs" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    Master Data Lookup Explorer
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live system catalogs used for payload resolution.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchLookups}
                  disabled={loadingLookups}
                  className="h-8 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingLookups ? 'animate-spin' : ''}`} />
                  Refresh Catalogs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLookups ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading master catalogs...
                </div>
              ) : masterLookups ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Airports</span>
                      <Badge variant="secondary" className="font-mono">{masterLookups.airports?.length || 0}</Badge>
                    </h4>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                      {masterLookups.airports?.map((a: any) => (
                        <div key={a.id} className="p-1.5 bg-white rounded border border-slate-100 flex justify-between">
                          <span className="font-bold text-indigo-600">{a.code}</span>
                          <span className="text-slate-600 truncate max-w-[140px]">{a.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Hotels (Sample)</span>
                      <Badge variant="secondary" className="font-mono">{masterLookups.hotels?.length || 0}</Badge>
                    </h4>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                      {masterLookups.hotels?.slice(0, 15).map((h: any) => (
                        <div key={h.id} className="p-1.5 bg-white rounded border border-slate-100 flex justify-between">
                          <span className="font-bold text-emerald-700">{h.code || 'HTL'}</span>
                          <span className="text-slate-600 truncate max-w-[140px]">{h.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Cities</span>
                      <Badge variant="secondary" className="font-mono">{masterLookups.cities?.length || 0}</Badge>
                    </h4>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                      {masterLookups.cities?.map((c: any) => (
                        <div key={c.id} className="p-1.5 bg-white rounded border border-slate-100 flex justify-between">
                          <span className="font-bold text-slate-800">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: AUTOMATIONS & WEBHOOKS */}
        <TabsContent value="automations" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-600" />
                WhatsApp Chatbot & 3rd-Party Automation Blueprint
              </CardTitle>
              <CardDescription className="text-xs">
                How to integrate WhatsApp Business Cloud API bots, Zapier, or n8n with NuSync ERP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Direct Booking Intake from WhatsApp Messages
                </h4>
                <p>
                  When your WhatsApp bot or CRM receives pilgrim details from customer chats, your backend can submit the structured payload to <code className="font-mono bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded">POST /api/v1/external/bookings</code> with your <strong>Admin Master API Key</strong>.
                </p>
                <p>
                  The booking will immediately appear in the admin dashboard with its reference (<code className="font-mono text-emerald-800 font-bold">UB-YYMMDD-XXX</code>) for operator processing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                  <h5 className="font-bold text-slate-900">Step 1: Parse Incoming Chat</h5>
                  <p className="text-slate-500">
                    Extract passenger names, passport numbers, travel dates, and hotel preference from WhatsApp conversation.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                  <h5 className="font-bold text-slate-900">Step 2: Submit with Master Key</h5>
                  <p className="text-slate-500">
                    POST payload to NuSync API with header <code className="font-mono text-indigo-600">x-api-key: {adminApiKey || 'YOUR_MASTER_KEY'}</code>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
