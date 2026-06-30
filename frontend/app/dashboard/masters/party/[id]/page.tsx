'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { partyAPI, umrahVisaAPI, nusukAPI } from '@/lib/api';
import CreatePartyDialog from '@/components/CreatePartyDialog';
import { 
  ArrowLeft, Edit, ShieldAlert, AlertTriangle, CheckCircle, ShieldCheck, 
  History, Mail, Phone, MapPin, CreditCard, Building, Users, Calendar, Clock,
  FileText, Plane, AlertCircle, Check
} from 'lucide-react';

interface Party {
  id: string;
  partyName: string;
  partyCode: string;
  email: string;
  contactNumber?: string;
  whatsappNumber?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  customerType: 'direct' | 'b2b';
  loginRequired: boolean;
  emailNotification: boolean;
  smsNotification: boolean;
  marketingNotification: boolean;
  isSupplier: boolean;
  isCustomer: boolean;
  createdAt: string;
  updatedAt: string;
  accountCurrency?: { currencyCode: string };
  complianceMetrics?: {
    id: string;
    complianceStatus: 'GREEN' | 'YELLOW' | 'RED';
    weightedScore: number;
    arrivalMismatches: number;
    departureMismatches: number;
    severeViolations: number;
    totalArrivals: number;
    totalDepartures: number;
  };
}

export default function PartyDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const user = getUser();
  
  const [party, setParty] = useState<Party | null>(null);
  const [loadingParty, setLoadingParty] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Tabs data states
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  
  const [missingBrnBookings, setMissingBrnBookings] = useState<any[]>([]);
  const [loadingMissingBrn, setLoadingMissingBrn] = useState(true);
  
  const [mismatches, setMismatches] = useState<any[]>([]);
  const [loadingMismatches, setLoadingMismatches] = useState(true);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchPartyData = async () => {
    try {
      setLoadingParty(true);
      const response = await partyAPI.getById(id);
      setParty(response.data.party);
    } catch (error) {
      console.error('Failed to load party details:', error);
      toast.error('Failed to load party details');
    } finally {
      setLoadingParty(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      const response = await umrahVisaAPI.getBookings({ partyId: id, limit: 100 });
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Failed to load party bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchMissingBrn = async () => {
    try {
      setLoadingMissingBrn(true);
      const response = await umrahVisaAPI.getMissingBrnBookings({ partyId: id });
      setMissingBrnBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Failed to load missing BRNs:', error);
    } finally {
      setLoadingMissingBrn(false);
    }
  };

  const fetchMismatches = async () => {
    try {
      setLoadingMismatches(true);
      const response = await nusukAPI.getMismatches({ partyId: id, limit: 100 });
      setMismatches(response.data.mismatches || []);
    } catch (error) {
      console.error('Failed to load mismatches:', error);
    } finally {
      setLoadingMismatches(false);
    }
  };

  const fetchComplianceLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await nusukAPI.getComplianceAgentLogs(id);
      setLogs(response.data || []);
    } catch (error) {
      console.error('Failed to load compliance logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }

    if (id) {
      fetchPartyData();
      fetchBookings();
      fetchMissingBrn();
      fetchMismatches();
      fetchComplianceLogs();
    }
  }, [id, router]);

  const handlePartyUpdated = () => {
    setShowEditDialog(false);
    fetchPartyData();
    toast.success('Party updated successfully!');
  };

  if (!user || loadingParty || !party) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-gray-500 animate-pulse font-medium">Loading party profile...</p>
      </div>
    );
  }

  const getComplianceStatus = () => {
    const status = party.complianceMetrics?.complianceStatus || 'GREEN';
    if (status === 'RED') {
      return { 
        label: 'Suspended (Red)', 
        color: 'bg-red-500', 
        text: 'text-red-700', 
        bg: 'bg-red-50', 
        border: 'border-red-200',
        desc: 'Sub-agent is blocked from creating new booking requests due to severe deviations or overstays.',
        icon: <ShieldAlert className="h-5 w-5 text-red-650" />
      };
    }
    if (status === 'YELLOW') {
      return { 
        label: 'Throttled (Yellow)', 
        color: 'bg-amber-500', 
        text: 'text-amber-700', 
        bg: 'bg-amber-50', 
        border: 'border-amber-200',
        desc: 'Daily quota limits: max 1 group booking and 3 individual bookings.',
        icon: <AlertTriangle className="h-5 w-5 text-amber-650" />
      };
    }
    return { 
      label: 'Compliant (Green)', 
      color: 'bg-green-500', 
      text: 'text-green-700', 
      bg: 'bg-green-50', 
      border: 'border-green-200',
      desc: 'Sub-agent in good standing. Standard privileges and full limits active.',
      icon: <CheckCircle className="h-5 w-5 text-green-650" />
    };
  };

  const statusInfo = getComplianceStatus();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 min-h-screen">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/masters/party')}
              className="h-9 w-9 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{party.partyName}</h1>
                <Badge variant="outline" className="font-mono text-xs">{party.partyCode}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                View performance metrics, travel mismatches, missing BRNs, and booking history
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowEditDialog(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            size="sm"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6 pb-24">
        {/* Compliance Banner & Performance Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className={`lg:col-span-2 border ${statusInfo.border} ${statusInfo.bg} shadow-sm overflow-hidden flex flex-col justify-between`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {statusInfo.icon}
                  <div>
                    <CardTitle className={`text-base font-bold ${statusInfo.text} uppercase`}>
                      {statusInfo.label}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600 mt-0.5">
                      {statusInfo.desc}
                    </CardDescription>
                  </div>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${statusInfo.color} animate-pulse`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                <div className="bg-white/80 backdrop-blur-sm border rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Compliance Score</span>
                  <span className="text-lg font-black text-gray-900 mt-1 block font-mono">
                    {party.complianceMetrics?.weightedScore ? Number(party.complianceMetrics.weightedScore).toFixed(4) : '0.0000'}
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">30-Day Activity</span>
                  <span className="text-sm font-bold text-gray-900 mt-1.5 block">
                    {party.complianceMetrics?.totalArrivals || 0} Arr / {party.complianceMetrics?.totalDepartures || 0} Dep
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Mismatches (Arr/Dep)</span>
                  <span className="text-lg font-black text-gray-900 mt-1 block font-mono">
                    {party.complianceMetrics?.arrivalMismatches || 0} / {party.complianceMetrics?.departureMismatches || 0}
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Severe Violations</span>
                  <span className="text-lg font-black text-red-600 mt-1 block font-mono">
                    {party.complianceMetrics?.severeViolations || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <History className="h-4 w-4 text-gray-500" />
                Compliance Status Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="text-xs text-gray-500 py-4 animate-pulse">Loading compliance logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-xs text-gray-400 italic py-4 text-center">No compliance logs found.</div>
              ) : (
                <div className="relative border-l border-gray-200 pl-3.5 space-y-4 max-h-[140px] overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="relative text-[10px]">
                      <div className={`absolute -left-[20px] top-1 h-2 w-2 rounded-full border border-white ${
                        log.newStatus === 'RED' ? 'bg-red-500' : (log.newStatus === 'YELLOW' ? 'bg-amber-500' : 'bg-green-500')
                      }`} />
                      <div className="flex justify-between text-gray-400 font-medium text-[9px] mb-0.5">
                        <span className="font-semibold text-gray-600">Status: {log.previousStatus} &rarr; {log.newStatus}</span>
                        <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700 leading-normal line-clamp-2">{log.reasonSummary}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Listings */}
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="bg-white border rounded-xl p-1 shadow-sm flex-wrap w-full md:w-auto h-auto">
            <TabsTrigger value="bookings" className="text-xs py-2 px-4 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              All Bookings ({bookings.length})
            </TabsTrigger>
            <TabsTrigger value="missing-brn" className="text-xs py-2 px-4 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Missing BRNs ({missingBrnBookings.length})
            </TabsTrigger>
            <TabsTrigger value="mismatches" className="text-xs py-2 px-4 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Nusuk Mismatches ({mismatches.length})
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs py-2 px-4 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Profile Info
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="mt-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-600" /> Bookings Directory
                </CardTitle>
                <CardDescription className="text-xs">
                  Review all group and individual bookings requested by this party
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingBookings ? (
                  <div className="p-6 text-center text-sm text-gray-500 animate-pulse">Loading bookings...</div>
                ) : bookings.length === 0 ? (
                  <div className="p-12 text-center text-sm text-gray-400">No bookings found for this party.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 uppercase text-[10px] font-bold text-gray-600 border-b">
                        <tr>
                          <th className="p-4 w-28">Ref No / Date</th>
                          <th className="p-4">Group Number / Name</th>
                          <th className="p-4 w-20">Type</th>
                          <th className="p-4 w-20 text-center">Pax</th>
                          <th className="p-4">Travel Info (Arr / Dep)</th>
                          <th className="p-4 w-28">Status</th>
                          <th className="p-4 w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50/50">
                            <td className="p-4 font-bold text-gray-900">
                              <div>{booking.bookingReference || 'N/A'}</div>
                              <div className="text-[9px] font-normal text-gray-400 mt-0.5">
                                {new Date(booking.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-gray-900">{booking.groupNumber || 'Not Assigned'}</div>
                              <div className="text-gray-500 mt-0.5">{booking.groupName || '—'}</div>
                            </td>
                            <td className="p-4">
                              <Badge variant={booking.visaType === 'group_visa' ? 'info' : 'outline'} className="text-[9px] px-1 font-bold">
                                {booking.visaType === 'group_visa' ? 'GROUP' : 'INDIVIDUAL'}
                              </Badge>
                            </td>
                            <td className="p-4 text-center font-bold text-gray-900">{booking.passengerCount}</td>
                            <td className="p-4">
                              <div className="flex flex-col text-gray-650">
                                <span className="flex items-center gap-1">
                                  <Plane className="h-3 w-3 text-indigo-500 shrink-0Rotate" style={{ transform: 'rotate(45deg)' }} />
                                  Arr: {booking.travelDetails?.find((t: any) => !t.isAlternate)?.arrivalDateTime ? new Date(booking.travelDetails.find((t: any) => !t.isAlternate).arrivalDateTime).toLocaleString() : 'N/A'}
                                </span>
                                <span className="flex items-center gap-1 mt-1">
                                  <Plane className="h-3 w-3 text-emerald-500 shrink-0" style={{ transform: 'rotate(135deg)' }} />
                                  Dep: {booking.travelDetails?.find((t: any) => !t.isAlternate)?.departureDateTime ? new Date(booking.travelDetails.find((t: any) => !t.isAlternate).departureDateTime).toLocaleString() : 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge className="text-[10px] px-2 py-0.5 font-semibold">
                                {booking.status?.toUpperCase()?.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`/dashboard/umrah-visa/visa-management/view/${booking.id}`, '_blank')}
                                className="text-xs h-8"
                              >
                                View Booking
                              </Button>
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

          {/* Missing BRN Tab */}
          <TabsContent value="missing-brn" className="mt-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-amber-500" /> Pending Hotel BRN Bookings
                </CardTitle>
                <CardDescription className="text-xs">
                  Review group bookings that require hotel block confirmation codes (BRN) to generate Vouchers.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingMissingBrn ? (
                  <div className="p-6 text-center text-sm text-gray-500 animate-pulse">Loading missing BRNs...</div>
                ) : missingBrnBookings.length === 0 ? (
                  <div className="p-12 text-center text-sm text-gray-400">No bookings with missing BRNs found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 uppercase text-[10px] font-bold text-gray-600 border-b">
                        <tr>
                          <th className="p-4">Ref No</th>
                          <th className="p-4">Group Number / Name</th>
                          <th className="p-4 text-center">Pax</th>
                          <th className="p-4">Missing Hotels Description</th>
                          <th className="p-4">Arrival Date</th>
                          <th className="p-4 w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {missingBrnBookings.map((booking) => {
                          const missingHotels = booking.hotelBookings
                            ?.filter((h: any) => !h.brn || (Array.isArray(h.brn) ? h.brn.length === 0 : !String(h.brn).trim()))
                            ?.map((h: any) => `${h.city?.name || 'Hotel'} (${h.hotel?.name || 'N/A'})`)
                            ?.join(', ');

                          return (
                            <tr key={booking.id} className="hover:bg-gray-50/50">
                              <td className="p-4 font-bold text-gray-900">{booking.bookingReference || 'N/A'}</td>
                              <td className="p-4">
                                <div className="font-semibold text-gray-900">{booking.groupNumber || 'Not Assigned'}</div>
                                <div className="text-gray-500 mt-0.5">{booking.groupName || '—'}</div>
                              </td>
                              <td className="p-4 text-center font-bold">{booking.passengerCount}</td>
                              <td className="p-4 text-red-655 font-semibold">{missingHotels || 'Hotel Details BRN Empty'}</td>
                              <td className="p-4">
                                {booking.travelDetails?.find((t: any) => !t.isAlternate)?.arrivalDateTime 
                                  ? new Date(booking.travelDetails.find((t: any) => !t.isAlternate).arrivalDateTime).toLocaleDateString()
                                  : 'N/A'}
                              </td>
                              <td className="p-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(`/dashboard/umrah-visa/visa-management/view/${booking.id}`, '_blank')}
                                  className="text-xs h-8 text-amber-700 border-amber-200 hover:bg-amber-50"
                                >
                                  Fix BRN
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mismatches Tab */}
          <TabsContent value="mismatches" className="mt-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-red-500" /> Nusuk Travel Details Mismatches
                </CardTitle>
                <CardDescription className="text-xs">
                  Travel booking details that deviate from Nusuk sync records. Correct these to protect sub-agent compliance scores.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingMismatches ? (
                  <div className="p-6 text-center text-sm text-gray-500 animate-pulse">Loading mismatches...</div>
                ) : mismatches.length === 0 ? (
                  <div className="p-12 text-center text-sm text-gray-400">No active travel mismatches found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 uppercase text-[10px] font-bold text-gray-600 border-b">
                        <tr>
                          <th className="p-4">Passenger / Passport</th>
                          <th className="p-4">Deviation Type</th>
                          <th className="p-4">Booking Flight Info</th>
                          <th className="p-4">Nusuk Flight Info</th>
                          <th className="p-4">Sync / Deviation Gap</th>
                          <th className="p-4 w-28">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {mismatches.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50/50">
                            <td className="p-4">
                              <div className="font-bold text-gray-900">{m.passengerName}</div>
                              <div className="text-[10px] font-mono text-gray-450 mt-0.5">{m.passportNumber}</div>
                            </td>
                            <td className="p-4 font-bold text-red-600 uppercase tracking-tight">
                              {m.mismatchType?.replace(/_/g, ' ')}
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-gray-900">{m.bookingFlightNumber || 'N/A'}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {m.bookingFlightDateTime ? new Date(m.bookingFlightDateTime).toLocaleString() : 'N/A'}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-indigo-700">{m.nusukFlightNumber || 'N/A'}</div>
                              <div className="text-[10px] text-indigo-500 mt-0.5">
                                {m.nusukFlightDateTime ? new Date(m.nusukFlightDateTime).toLocaleString() : 'N/A'}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-gray-900">
                                {m.deviationGapMinutes ? `${Math.abs(m.deviationGapMinutes)} min gap` : 'Code deviation'}
                              </div>
                              <div className="text-[10px] text-gray-450 mt-0.5">
                                Sync: {new Date(m.lastCheckedAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant={m.resolved ? 'success' : 'destructive'} className="text-[9px] font-bold px-1.5 uppercase">
                                {m.resolved ? 'RESOLVED' : 'UNRESOLVED'}
                              </Badge>
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

          {/* Profile Info Tab */}
          <TabsContent value="info" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information Card */}
              <Card className="shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-indigo-600" /> Contact Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <Label className="text-gray-400 font-semibold block">Email address</Label>
                      <span className="text-sm font-bold text-gray-900 mt-1 block break-all">{party.email}</span>
                    </div>
                    <div>
                      <Label className="text-gray-400 font-semibold block">Mobile number</Label>
                      <span className="text-sm font-bold text-gray-900 mt-1 block">{party.contactNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <Label className="text-gray-400 font-semibold block">WhatsApp number</Label>
                      <span className="text-sm font-bold text-gray-900 mt-1 block">{party.whatsappNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <Label className="text-gray-400 font-semibold block">Registration Date</Label>
                      <span className="text-sm font-bold text-gray-900 mt-1 block">{new Date(party.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-xs border-t pt-4">
                    <Label className="text-gray-400 font-semibold block">Billing Address</Label>
                    <span className="text-sm font-bold text-gray-900 mt-1.5 block leading-relaxed flex items-start gap-1">
                      <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      {party.address || 'Address detail not provided.'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Business settings card */}
              <Card className="shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-indigo-600" /> Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400 font-semibold block">Customer Type</Label>
                      <Badge variant={party.customerType === 'b2b' ? 'info' : 'success'} className="mt-1 font-bold text-[10px] uppercase px-2 py-0.5">
                        {party.customerType}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-gray-400 font-semibold block">Base Currency</Label>
                      <Badge variant="outline" className="mt-1 font-bold text-[10px] px-2 py-0.5">
                        {party.accountCurrency?.currencyCode || 'N/A'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-gray-400 font-semibold block">Tax Identification (GST)</Label>
                      <span className="text-sm font-bold text-gray-900 mt-1 block">{party.gstNumber || '—'}</span>
                    </div>
                    <div>
                      <Label className="text-gray-400 font-semibold block">Income Tax PAN</Label>
                      <span className="text-sm font-bold text-gray-900 mt-1 block">{party.panNumber || '—'}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-gray-400 font-semibold block">Notification preferences</Label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant={party.emailNotification ? 'success' : 'outline'} className="text-[10px] px-2 font-medium flex items-center gap-1">
                        {party.emailNotification ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} Email Alerts
                      </Badge>
                      <Badge variant={party.smsNotification ? 'success' : 'outline'} className="text-[10px] px-2 font-medium flex items-center gap-1">
                        {party.smsNotification ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />} SMS / Mobile Alerts
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Party Profile Dialog Shortcut */}
      <CreatePartyDialog
        open={showEditDialog}
        onOpenChange={(open) => !open && setShowEditDialog(false)}
        editingParty={party}
        title="Edit Party Profile"
        onSubmit={async (partyData) => {
          await partyAPI.update(party.id, partyData);
          handlePartyUpdated();
        }}
      />
    </div>
  );
}
