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
  FileCode, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Code, 
  BookOpen, 
  Terminal,
  Send,
  Building2,
  Plane,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const SAMPLE_INDIVIDUAL_JSON = {
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
  arrivalTime: "10:00",
  arrivalAirportCode: "JED",
  arrivalFlightNumber: "SV-711",
  departureDate: "2026-11-15",
  departureTime: "18:00",
  departureAirportCode: "JED",
  departureFlightNumber: "SV-712",
  accommodationType: "iqama",
  iqamaDetails: {
    iqamaNumber: "2489012345",
    iqamaSponserName: "Abdulrahman Al-Ghamdi",
    sponserDob: "1978-06-14",
    sponserMobileNumber: "+966509988776",
    sponserNationalShortAddress: "RRTA2941, Jeddah",
    sponserNationality: "Saudi Arabia",
    makkahHotelName: "Iqama Resident Host Makkah"
  }
};

const SAMPLE_GROUP_JSON = {
  visaType: "group_visa",
  groupNumber: "GRP-88992201",
  groupName: "Al-Badr Group Nov 2026",
  guestName: "Sheikh Usman Ghani",
  guestMobile: "+919844556677",
  passengers: [
    {
      fullName: "Sheikh Usman Ghani",
      isLeadPassenger: true,
      passportNumber: "K1122334",
      nationality: "IN",
      gender: "male",
      dateOfBirth: "1975-01-10",
      passportExpiry: "2031-09-12"
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
  const [apiKey, setApiKey] = useState('ns_live_test_api_key_123456789');
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedVisaType, setSelectedVisaType] = useState<'individual' | 're_entry' | 'group'>('individual');
  const [codeLang, setCodeLang] = useState<'curl' | 'javascript' | 'python' | 'php'>('curl');
  const [testPayload, setTestPayload] = useState(JSON.stringify(SAMPLE_INDIVIDUAL_JSON, null, 2));
  const [testResponse, setTestResponse] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [masterLookups, setMasterLookups] = useState<any>(null);
  const [loadingLookups, setLoadingLookups] = useState(false);

  useEffect(() => {
    fetchMyApiKey();
    fetchLookups();
  }, []);

  const fetchMyApiKey = async () => {
    try {
      const res = await api.get('/parties/my-api-key');
      if (res.data?.data?.apiKey) {
        setApiKey(res.data.data.apiKey);
      }
    } catch {
      // Keep default fallback
    }
  };

  const fetchLookups = async () => {
    try {
      setLoadingLookups(true);
      const res = await api.get('/v1/external/masters/lookup', {
        headers: { 'x-api-key': apiKey }
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
        headers: { 'x-api-key': apiKey }
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
        headers: { 'x-api-key': apiKey }
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
      return `curl -X POST ${baseUrl}/bookings \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${apiKey}" \\\n  -d '${testPayload.replace(/'/g, "'\\''")}'`;
    }

    if (codeLang === 'javascript') {
      return `const axios = require('axios');\n\nconst payload = ${testPayload};\n\nasync function createBooking() {\n  try {\n    const response = await axios.post(\n      '${baseUrl}/bookings',\n      payload,\n      {\n        headers: {\n          'x-api-key': '${apiKey}',\n          'Content-Type': 'application/json'\n        }\n      }\n    );\n    console.log('Booking Reference:', response.data.data.bookingReference);\n  } catch (error) {\n    console.error('Booking Error:', error.response?.data || error.message);\n  }\n}\n\ncreateBooking();`;
    }

    if (codeLang === 'python') {
      return `import requests\nimport json\n\nurl = "${baseUrl}/bookings"\nheaders = {\n    "x-api-key": "${apiKey}",\n    "Content-Type": "application/json"\n}\npayload = ${testPayload.replace(/true/g, 'True').replace(/false/g, 'False')}\n\nresponse = requests.post(url, json=payload, headers=headers)\nprint(response.json())`;
    }

    if (codeLang === 'php') {
      return `<?php\n$curl = curl_init();\n\ncurl_setopt_array($curl, array(\n  CURLOPT_URL => '${baseUrl}/bookings',\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_CUSTOMREQUEST => 'POST',\n  CURLOPT_POSTFIELDS => '${testPayload.replace(/'/g, "\\'")}',\n  CURLOPT_HTTPHEADER => array(\n    'x-api-key: ${apiKey}',\n    'Content-Type: application/json'\n  ),\n));\n\n$response = curl_exec($curl);\ncurl_close($curl);\necho $response;`;
    }

    return '';
  };

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Partner & External Booking API</h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-xs">v1.0 REST</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Comprehensive developer documentation and sandbox for integrating Individual, Group, and Re-Entry Umrah Visa bookings.
          </p>
        </div>

        {/* API Key Box */}
        <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-800">
          <Key className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Your Agency API Key</span>
            <span className="font-mono text-xs font-semibold text-emerald-300">{apiKey}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              handleCopy(apiKey, 'API Key');
              setCopiedKey(true);
              setTimeout(() => setCopiedKey(false), 2000);
            }}
            className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800 ml-2"
          >
            {copiedKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sandbox" className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
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
          <TabsTrigger value="lifecycle" className="flex items-center gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin Lifecycle
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: INTERACTIVE SANDBOX */}
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
                        Request Payload Builder
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Select a template or customize JSON to test live against the API.
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
                      className="text-xs bg-primary text-white font-semibold shadow-sm"
                    >
                      {isSubmitting ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                      Create Live Booking Request
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Code Generator Card */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Code className="h-4 w-4 text-emerald-600" />
                      Client Code Snippet Generator
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {(['curl', 'javascript', 'python', 'php'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setCodeLang(lang)}
                          className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                            codeLang === lang ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {lang.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-3.5 rounded-xl overflow-x-auto max-h-56">
                      {generateCodeSnippet()}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(generateCodeSnippet(), `${codeLang.toUpperCase()} snippet`)}
                      className="absolute top-2 right-2 h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: API Response Viewer (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-slate-200 h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-emerald-600" />
                      Live API Response
                    </CardTitle>
                    {testResponse && (
                      <Badge className={testResponse.status < 300 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}>
                        HTTP {testResponse.status} {testResponse.statusText}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Real-time output returned from the server endpoint.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  {testResponse ? (
                    <div className="relative h-full">
                      <pre className="text-xs font-mono bg-slate-950 text-emerald-300 p-4 rounded-xl overflow-x-auto max-h-[550px] leading-relaxed">
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
                  ) : (
                    <div className="h-64 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center">
                      <Send className="h-8 w-8 mb-2 opacity-40" />
                      Click <strong>Dry-Run Validate</strong> or <strong>Create Live Booking Request</strong> to view response payload.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: ENDPOINTS CATALOG */}
        <TabsContent value="endpoints" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Endpoint 1: POST /bookings */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-600 text-white font-mono uppercase text-xs px-2.5 py-0.5">POST</Badge>
                  <code className="text-sm font-bold text-slate-900">/api/v1/external/bookings</code>
                  <Badge variant="outline" className="ml-auto text-slate-500">Core Booking Endpoint</Badge>
                </div>
                <CardDescription className="text-xs pt-1">
                  Creates a new booking request in the ERP. Assigns a unique reference number (e.g. <code>UB-261004-001</code>) and places the booking in Admin queue for group assignment, trip info, and voucher issuance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase">Core Request Fields</Label>
                  <div className="border rounded-lg overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="p-2.5 font-semibold">Field</th>
                          <th className="p-2.5 font-semibold">Type</th>
                          <th className="p-2.5 font-semibold">Required</th>
                          <th className="p-2.5 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-mono text-[11px]">
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-600">visaType</td>
                          <td className="p-2.5">string</td>
                          <td className="p-2.5"><Badge variant="default" className="text-[10px] bg-red-500">Required</Badge></td>
                          <td className="p-2.5 font-sans"><code>individual_visa</code> | <code>group_visa</code> | <code>re_entry</code></td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-600">guestName</td>
                          <td className="p-2.5">string</td>
                          <td className="p-2.5"><Badge variant="outline" className="text-[10px]">Optional</Badge></td>
                          <td className="p-2.5 font-sans">Lead passenger / contact name.</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-600">passengers</td>
                          <td className="p-2.5">array</td>
                          <td className="p-2.5"><Badge variant="default" className="text-[10px] bg-red-500">Required</Badge></td>
                          <td className="p-2.5 font-sans">Array of passenger objects (<code>fullName</code>, <code>passportNumber</code>, <code>nationality</code>, <code>gender</code>, <code>dateOfBirth</code>, <code>passportExpiry</code>).</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-600">accommodationType</td>
                          <td className="p-2.5">string</td>
                          <td className="p-2.5"><Badge variant="default" className="text-[10px] bg-red-500">Required</Badge></td>
                          <td className="p-2.5 font-sans"><code>hotel</code> (requires <code>hotelBookings</code>) or <code>iqama</code> (requires <code>iqamaDetails</code>).</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-600">arrivalDate</td>
                          <td className="p-2.5">string</td>
                          <td className="p-2.5"><Badge variant="default" className="text-[10px] bg-red-500">Required</Badge></td>
                          <td className="p-2.5 font-sans">Arrival date (<code>YYYY-MM-DD</code>).</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-600">departureDate</td>
                          <td className="p-2.5">string</td>
                          <td className="p-2.5"><Badge variant="default" className="text-[10px] bg-red-500">Required</Badge></td>
                          <td className="p-2.5 font-sans">Departure date (<code>YYYY-MM-DD</code>). Max 80 days from arrival.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endpoint 2: GET /bookings/:idOrReference */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-sky-600 text-white font-mono uppercase text-xs px-2.5 py-0.5">GET</Badge>
                  <code className="text-sm font-bold text-slate-900">/api/v1/external/bookings/:bookingReference</code>
                </div>
                <CardDescription className="text-xs pt-1">
                  Fetches single booking by Reference Number (e.g. <code>UB-261004-001</code>) or Database ID, returning complete passenger roster, flight schedule, hotel stay dates, and issued voucher status.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Endpoint 3: POST /bookings/validate */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-600 text-white font-mono uppercase text-xs px-2.5 py-0.5">POST</Badge>
                  <code className="text-sm font-bold text-slate-900">/api/v1/external/bookings/validate</code>
                </div>
                <CardDescription className="text-xs pt-1">
                  Dry-run validation endpoint. Validates all business rules (date limits, passport numbers, Iqama restrictions) without writing records to the database.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Endpoint 4: GET /masters/lookup */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-sky-600 text-white font-mono uppercase text-xs px-2.5 py-0.5">GET</Badge>
                  <code className="text-sm font-bold text-slate-900">/api/v1/external/masters/lookup</code>
                </div>
                <CardDescription className="text-xs pt-1">
                  Returns active catalogs for Airports, Hotels (Makkah & Madinah), Cities, Transport Routes, and Visa Providers for client-side dropdown building.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: MASTER CATALOGS */}
        <TabsContent value="catalogs" className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    Active Master Catalogs
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live system catalogs used for Location & Airport resolution.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={fetchLookups} disabled={loadingLookups} className="h-8 text-xs">
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingLookups ? 'animate-spin' : ''}`} />
                  Refresh Catalogs
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Airports */}
                <div className="border rounded-xl p-4 bg-slate-50/50 space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <Plane className="h-4 w-4 text-sky-600" />
                    Supported Airports ({masterLookups?.airports?.length || 0})
                  </h3>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                    {masterLookups?.airports?.map((apt: any) => (
                      <div key={apt.id} className="flex items-center justify-between bg-white p-2 rounded-lg border text-xs">
                        <span className="font-medium text-slate-800">{apt.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50">{apt.code}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hotels */}
                <div className="border rounded-xl p-4 bg-slate-50/50 space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    Sample Registered Hotels ({masterLookups?.hotels?.length || 0})
                  </h3>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                    {masterLookups?.hotels?.slice(0, 15).map((htl: any) => (
                      <div key={htl.id} className="flex items-center justify-between bg-white p-2 rounded-lg border text-xs">
                        <span className="font-medium text-slate-800 truncate max-w-[200px]">{htl.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] text-indigo-700 bg-indigo-50">{htl.city}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: ADMIN LIFECYCLE */}
        <TabsContent value="lifecycle" className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Booking Status Lifecycle & Admin Review Flow
              </CardTitle>
              <CardDescription className="text-xs">
                How created bookings move through operations to final Voucher and Tafweej dispatch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <Badge className="bg-amber-500 text-white font-mono text-[10px]">1. pending</Badge>
                  <h4 className="font-bold text-xs text-amber-950">Booking Request Created</h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Created via API. Awaiting Group Number allocation by admin operator.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                  <Badge className="bg-blue-600 text-white font-mono text-[10px]">2. group_assigned</Badge>
                  <h4 className="font-bold text-xs text-blue-950">Group Number Attached</h4>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Group Number and provider are attached. Ready for Trip Info verification.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
                  <Badge className="bg-purple-600 text-white font-mono text-[10px]">3. voucher_generated</Badge>
                  <h4 className="font-bold text-xs text-purple-950">Voucher Issued</h4>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    Official Voucher # assigned. Hotel BRNs and transport movements locked.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <Badge className="bg-emerald-600 text-white font-mono text-[10px]">4. completed</Badge>
                  <h4 className="font-bold text-xs text-emerald-950">Trip Completed</h4>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Pilgrims departed Kingdom after successful Umrah completion.
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
