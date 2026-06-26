'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { nusukAPI } from '@/lib/api';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Eye,
  ArrowRight,
  PlaneTakeoff,
  PlaneLanding,
  User,
  Hash,
  Clock,
  MapPin,
  Calendar,
  Loader2,
  Users
} from 'lucide-react';
import Link from 'next/link';

interface MismatchDetails {
  mutamerName?: string;
  passportNumber?: string;
  groupNumber: string;
  expected?: number;
  actual?: number;
  entry?: {
    mismatched: boolean;
    dateTime?: { db: string; excel: string; mismatch: boolean };
    flight?: { db: string; excel: string; mismatch: boolean };
    port?: { db: string; excel: string; mismatch: boolean };
  };
  exit?: {
    mismatched: boolean;
    dateTime?: { db: string; excel: string; mismatch: boolean };
    flight?: { db: string; excel: string; mismatch: boolean };
    port?: { db: string; excel: string; mismatch: boolean };
  };
}

interface MismatchItem {
  id: string;
  bookingId: string;
  passengerId: string | null;
  mismatchType: 'entry' | 'exit' | 'both' | 'pax_count';
  details: MismatchDetails;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  booking: {
    id: string;
    bookingReference: string;
    groupNumber: string | null;
    groupName: string | null;
    status: string;
    party: {
      partyName: string;
    };
  };
  passenger?: {
    fullName: string;
    passportNumber: string;
  };
}

export default function MismatchedTravelPage() {
  const router = useRouter();
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState<MismatchItem[]>([]);
  const [filter, setFilter] = useState<'active' | 'resolved'>('active');

  const loadMismatches = async () => {
    try {
      setLoading(true);
      const response = await nusukAPI.getMismatches({ resolved: filter === 'resolved' });
      setMismatches(response.data || []);
    } catch (error) {
      console.error('Error loading mismatches:', error);
      toast.error('Failed to load travel mismatches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    loadMismatches();
  }, [filter]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      toast.info('Triggering sync from Nusuk...');
      const response = await nusukAPI.triggerSync();
      toast.success(`Sync completed! ${response.data.mismatchesCount} discrepancies detected.`);
      loadMismatches();
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast.error(error.response?.data?.error || error.message || 'Synchronization failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      setResolvingId(id);
      await nusukAPI.resolveMismatch(id);
      toast.success('Mismatch resolved successfully');
      setMismatches(prev => prev.filter(item => item.id !== id));
    } catch (error: any) {
      console.error('Resolve failed:', error);
      toast.error(error.response?.data?.error || 'Failed to resolve mismatch');
    } finally {
      setResolvingId(null);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }) + ' ' + date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) return null;

  return (
    <div className="flex-1">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500 animate-bounce" />
              Mismatched Travel Details
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Review and correct booking flight info that does not match the Nusuk Portal report
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              onClick={handleSync}
              disabled={syncing || loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs lg:text-sm"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing Nusuk...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Report Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setFilter('active')}
            className={`pb-3 px-6 text-sm font-semibold border-b-2 transition-all ${
              filter === 'active'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Active Discrepancies ({filter === 'active' ? mismatches.length : '...'})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`pb-3 px-6 text-sm font-semibold border-b-2 transition-all ${
              filter === 'resolved'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Resolved History
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-32 bg-gray-50 animate-pulse rounded-xl" />
            <div className="h-32 bg-gray-50 animate-pulse rounded-xl" />
            <div className="h-32 bg-gray-50 animate-pulse rounded-xl" />
          </div>
        ) : mismatches.length === 0 ? (
          <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-3">
              <CheckCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-base font-bold text-gray-900">All Travel Details Match!</CardTitle>
            <CardDescription className="max-w-xs mt-1">
              {filter === 'active' 
                ? 'No travel discrepancies were detected during the last synchronization.' 
                : 'No resolved mismatches found in history.'}
            </CardDescription>
          </Card>
        ) : (
          <div className="space-y-6">
            {mismatches.map((item) => (
              <Card key={item.id} className="overflow-hidden border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                {/* Card Top Info */}
                <div className="bg-slate-50 border-b p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-white text-indigo-600 border-indigo-200 text-[11px] font-mono py-0.5">
                      {item.booking.bookingReference}
                    </Badge>
                    <span className="text-gray-400 font-light">|</span>
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      Agency: {item.booking.party.partyName}
                    </span>
                    <span className="text-gray-400 font-light">|</span>
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      Group Num: {item.booking.groupNumber || 'N/A'}
                    </span>
                    <span className="text-gray-400 font-light">|</span>
                    <span className="text-xs text-gray-500 font-mono">
                      Detected: {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <Link href={`/dashboard/umrah-visa/visa-management/edit/${item.bookingId}`} passHref>
                      <Button variant="outline" size="sm" className="h-8 text-xs bg-white">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View Booking
                      </Button>
                    </Link>
                    {filter === 'active' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleResolve(item.id)}
                        disabled={resolvingId === item.id}
                        className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                      >
                        {resolvingId === item.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Resolve
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <CardContent className="p-5 space-y-6">
                  {/* Passenger / Mutamer Info */}
                  {item.mismatchType !== 'pax_count' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b bg-amber-50/20 p-3 rounded-lg border-amber-100">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-amber-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-semibold">Mutamer Name</div>
                          <div className="text-xs font-bold text-gray-900">{item.details.mutamerName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-amber-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-semibold">Passport Number</div>
                          <div className="text-xs font-bold text-gray-900 font-mono">{item.details.passportNumber}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-semibold">Nusuk Group No</div>
                          <div className="text-xs font-bold text-gray-900 font-mono">{item.details.groupNumber}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Passenger Count Mismatch Header */}
                  {item.mismatchType === 'pax_count' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b bg-red-50/20 p-3 rounded-lg border-red-100">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-red-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-semibold">Nusuk Group No</div>
                          <div className="text-xs font-bold text-gray-900 font-mono">{item.details.groupNumber}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-semibold">Mismatch Type</div>
                          <div className="text-xs font-bold text-red-600 uppercase">Passenger Count Mismatch</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Entry Comparison Details */}
                  {item.details.entry?.mismatched && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-red-600 flex items-center gap-1.5 uppercase tracking-wider">
                        <PlaneLanding className="h-4 w-4" />
                        Entry Travel Discrepancy
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* System Database Data */}
                        <div className="bg-slate-50 border rounded-lg p-3">
                          <div className="text-xs font-bold text-slate-800 border-b pb-1.5 mb-2">Local Booking Details</div>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Date/Time:</span>
                              <span className="font-semibold text-slate-800">
                                {formatDateTime(item.details.entry?.dateTime?.db)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><PlaneTakeoff className="h-3 w-3" /> Flight Number:</span>
                              <span className="font-semibold text-slate-800">
                                {item.details.entry?.flight?.db || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Port Name:</span>
                              <span className="font-semibold text-slate-800 max-w-[200px] text-right truncate" title={item.details.entry?.port?.db}>
                                {item.details.entry?.port?.db || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Nusuk Spreadsheet Data */}
                        <div className="bg-red-50/40 border border-red-100 rounded-lg p-3">
                          <div className="text-xs font-bold text-red-800 border-b border-red-100 pb-1.5 mb-2">Nusuk Report Details</div>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Date/Time:</span>
                              <span className={`font-semibold ${item.details.entry?.dateTime?.mismatch ? 'text-red-600 font-bold bg-red-100 px-1 rounded' : 'text-slate-800'}`}>
                                {formatDateTime(item.details.entry?.dateTime?.excel)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><PlaneTakeoff className="h-3 w-3" /> Flight Number:</span>
                              <span className={`font-semibold ${item.details.entry?.flight?.mismatch ? 'text-red-600 font-bold bg-red-100 px-1 rounded' : 'text-slate-800'}`}>
                                {item.details.entry?.flight?.excel || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Port Name:</span>
                              <span className={`font-semibold ${item.details.entry?.port?.mismatch ? 'text-red-600 font-bold bg-red-100 px-1 rounded text-right max-w-[200px] truncate' : 'text-slate-800 text-right max-w-[200px] truncate'}`} title={item.details.entry?.port?.excel}>
                                {item.details.entry?.port?.excel || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Exit Comparison Details */}
                  {item.details.exit?.mismatched && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-red-600 flex items-center gap-1.5 uppercase tracking-wider">
                        <PlaneTakeoff className="h-4 w-4" />
                        Exit Travel Discrepancy
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* System Database Data */}
                        <div className="bg-slate-50 border rounded-lg p-3">
                          <div className="text-xs font-bold text-slate-800 border-b pb-1.5 mb-2">Local Booking Details</div>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Date/Time:</span>
                              <span className="font-semibold text-slate-800">
                                {formatDateTime(item.details.exit?.dateTime?.db)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><PlaneTakeoff className="h-3 w-3" /> Flight Number:</span>
                              <span className="font-semibold text-slate-800">
                                {item.details.exit?.flight?.db || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Port Name:</span>
                              <span className="font-semibold text-slate-800 max-w-[200px] text-right truncate" title={item.details.exit?.port?.db}>
                                {item.details.exit?.port?.db || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Nusuk Spreadsheet Data */}
                        <div className="bg-red-50/40 border border-red-100 rounded-lg p-3">
                          <div className="text-xs font-bold text-red-800 border-b border-red-100 pb-1.5 mb-2">Nusuk Report Details</div>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Date/Time:</span>
                              <span className={`font-semibold ${item.details.exit?.dateTime?.mismatch ? 'text-red-600 font-bold bg-red-100 px-1 rounded' : 'text-slate-800'}`}>
                                {formatDateTime(item.details.exit?.dateTime?.excel)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><PlaneTakeoff className="h-3 w-3" /> Flight Number:</span>
                              <span className={`font-semibold ${item.details.exit?.flight?.mismatch ? 'text-red-600 font-bold bg-red-100 px-1 rounded' : 'text-slate-800'}`}>
                                {item.details.exit?.flight?.excel || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Port Name:</span>
                              <span className={`font-semibold ${item.details.exit?.port?.mismatch ? 'text-red-600 font-bold bg-red-100 px-1 rounded text-right max-w-[200px] truncate' : 'text-slate-800 text-right max-w-[200px] truncate'}`} title={item.details.exit?.port?.excel}>
                                {item.details.exit?.port?.excel || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Passenger Count Mismatch Details */}
                  {item.mismatchType === 'pax_count' && (
                    <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 space-y-2">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        The local booking form expects <span className="font-extrabold text-slate-900">{item.details.expected}</span> passengers, but the Nusuk Portal report contains <span className="font-extrabold text-red-600">{item.details.actual}</span> mutamers successfully synced.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Please review the booking form to see if passengers were added/removed, or if the group count needs to be updated.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
