'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Database, 
  Ticket, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Server, 
  Route, 
  Users, 
  Clock, 
  Layers, 
  FileText,
  Building,
  Plane,
  XCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { systemHealthAPI } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function SystemHealthPage() {
  const router = useRouter();
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [checkpointing, setCheckpointing] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Access restricted to Superadmin / Admin');
      router.push('/dashboard');
      return;
    }
  }, [user, router]);

  const fetchHealthData = async () => {
    if (user && user.role !== 'admin') return;
    try {
      setLoading(true);
      const res = await systemHealthAPI.getSystemHealth();
      setData(res.data);
    } catch (err: any) {
      toast.error('Failed to load system health: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  if (user && user.role !== 'admin') {
    return (
      <div className="container mx-auto p-12 text-center">
        <div className="max-w-md mx-auto p-8 bg-red-50 border border-red-200 rounded-2xl">
          <ShieldCheck className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-sm text-red-700 mb-4">The System Health & Operational Diagnostics console is restricted strictly to Superadmin and Administrators.</p>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const res = await systemHealthAPI.inspect(searchQuery.trim());
      setSearchResult(res.data);
      if (res.data.vouchers.length === 0 && res.data.bookings.length === 0) {
        toast.info(`No matching records found for "${searchQuery}"`);
      }
    } catch (err: any) {
      toast.error('Search failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSearching(false);
    }
  };

  const handleCheckpoint = async () => {
    try {
      setCheckpointing(true);
      const res = await systemHealthAPI.triggerCheckpoint();
      toast.success(res.data.message || 'SQLite WAL checkpoint completed');
      fetchHealthData();
    } catch (err: any) {
      toast.error('Checkpoint failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setCheckpointing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-secondary flex items-center gap-2.5">
            <Activity className="h-7 w-7 text-primary animate-pulse" />
            System Health & Operational Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time audit of database integrity, voucher sequences, group codes, and booking workflows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCheckpoint}
            disabled={checkpointing || loading}
            className="text-xs h-9"
          >
            <Database className={`h-4 w-4 mr-1.5 ${checkpointing ? 'animate-spin' : ''}`} />
            {checkpointing ? 'Flushing...' : 'Flush WAL Checkpoint'}
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={fetchHealthData}
            disabled={loading}
            className="bg-primary text-primary-foreground text-xs h-9 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Auditing...' : 'Run Diagnostics'}
          </Button>
        </div>
      </div>

      {/* Global Status Banner */}
      {data && (
        <Card className={`border-2 shadow-sm ${
          data.totalAnomalies === 0 
            ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/20' 
            : 'bg-amber-50/70 border-amber-300 dark:bg-amber-950/20'
        }`}>
          <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {data.totalAnomalies === 0 ? (
                <div className="p-2.5 bg-emerald-600 text-white rounded-full">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              ) : (
                <div className="p-2.5 bg-amber-600 text-white rounded-full">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {data.totalAnomalies === 0 
                    ? 'All Core Systems 100% Healthy & Synchronized' 
                    : `${data.totalAnomalies} Workflow Warnings / Discrepancies Identified`}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last audit completed at: {formatDate(data.timestamp)} • SQLite response latency: {data.database.latencyMs}ms
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={data.totalAnomalies === 0 ? "outline" : "destructive"} className="text-xs px-3 py-1 font-semibold">
                {data.totalAnomalies === 0 ? 'STATUS: OPTIMAL' : `${data.totalAnomalies} ISSUES TO REVIEW`}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Metrics Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-semibold flex items-center justify-between">
                DATABASE STORAGE
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-xl font-bold text-secondary">
                {data.database.dbSizeMB} <span className="text-xs font-normal text-muted-foreground">MB</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-emerald-600 font-medium">
                WAL: {data.database.walSizeMB} MB ({data.database.journalMode})
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-semibold flex items-center justify-between">
                TOTAL VOUCHERS
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-xl font-bold text-secondary">
                {data.vouchers.total}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground">
                Sequence: #{data.vouchers.minNumber} ➔ #{data.vouchers.maxNumber}
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-semibold flex items-center justify-between">
                PENDING VOUCHERS
                <Clock className="h-4 w-4 text-amber-500" />
              </CardDescription>
              <CardTitle className="text-xl font-bold text-amber-600">
                {data.bookings.pendingVouchersCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground">
                Bookings awaiting generation
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-semibold flex items-center justify-between">
                ACTIVE BOOKINGS
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-xl font-bold text-secondary">
                {data.bookings.total}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground">
                Total active in system
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-semibold flex items-center justify-between">
                TRANSPORT ROUTES
                <Route className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-xl font-bold text-secondary">
                {data.routes.totalRoutes}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground">
                Latest Route #{data.routes.latestRoute}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deep Search / Inspection Box */}
      <Card className="border-gray-100 shadow-sm bg-gradient-to-r from-gray-50/50 to-white dark:from-slate-900/50 dark:to-slate-900">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Deep Entity Inspection & Live Troubleshooting
          </CardTitle>
          <CardDescription className="text-xs">
            Search across Vouchers, Group Numbers, Booking References, Passports, or Agency Names to see linked timelines and records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Enter Voucher # (e.g. 636), Group Code, Booking Reference (UB-...), or Agency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 text-sm bg-white dark:bg-slate-950"
            />
            <Button type="submit" disabled={searching || !searchQuery.trim()} className="h-10 px-5">
              {searching ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : <Search className="h-4 w-4 mr-1.5" />}
              Inspect
            </Button>
          </form>

          {/* Search Results Display */}
          {searchResult && (
            <div className="mt-4 pt-4 border-t space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Search Results for: &ldquo;{searchResult.term}&rdquo;
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setSearchResult(null)} className="h-7 text-xs">
                  Clear Results
                </Button>
              </div>

              {/* Vouchers found */}
              {searchResult.vouchers.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-secondary flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5" /> Matching Vouchers ({searchResult.vouchers.length})
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResult.vouchers.map((v: any) => (
                      <div key={v.id} className="p-3 bg-white dark:bg-slate-950 border rounded-lg shadow-2xs space-y-1.5 text-xs">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-bold text-primary text-sm">Voucher #{v.voucherNumber}</span>
                          <Badge variant={v.bookingReference ? "secondary" : "outline"} className="text-[10px]">
                            {v.bookingReference || 'Quick / Standalone'}
                          </Badge>
                        </div>
                        <p><span className="text-muted-foreground">Agency:</span> <span className="font-medium">{v.party?.partyName || 'N/A'}</span></p>
                        <p><span className="text-muted-foreground">Group Code:</span> <span className="font-mono">{v.groupCode || 'None'}</span></p>
                        <p><span className="text-muted-foreground">Transport Co:</span> <span>{v.transportCompany?.partyName || 'None'}</span></p>
                        <p><span className="text-muted-foreground">Created:</span> <span>{formatDate(v.createdAt)} by {v.generatedByUser?.name || 'Unknown'}</span></p>
                        <div className="pt-1 flex gap-2 text-[11px] text-muted-foreground">
                          <span>Movements: <b>{v.movements?.length || 0}</b></span> • 
                          <span>Hotels: <b>{v.hotels?.length || 0}</b></span> • 
                          <span>Pax: <b>{v.paxCount}</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bookings found */}
              {searchResult.bookings.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-secondary flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Matching Bookings ({searchResult.bookings.length})
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResult.bookings.map((b: any) => (
                      <div key={b.id} className="p-3 bg-white dark:bg-slate-950 border rounded-lg shadow-2xs space-y-1.5 text-xs">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-bold text-secondary text-sm">{b.bookingReference || b.id}</span>
                          <Badge variant={b.status === 'voucher' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                            Status: {b.status}
                          </Badge>
                        </div>
                        <p><span className="text-muted-foreground">Agency:</span> <span className="font-medium">{b.party?.partyName || 'N/A'}</span></p>
                        <p><span className="text-muted-foreground">Group Number:</span> <span className="font-mono">{b.groupNumber || 'None'}</span></p>
                        <p><span className="text-muted-foreground">Pax Count:</span> <span>{b.passengerCount} (Records: {b.passengers?.length || 0})</span></p>
                        <p><span className="text-muted-foreground">Linked Vouchers:</span> <span className="font-bold text-primary">{b.vouchers?.map((v: any) => `#${v.voucherNumber}`).join(', ') || 'None'}</span></p>
                        
                        {b.statusHistory && b.statusHistory.length > 0 && (
                          <div className="pt-1 border-t text-[11px]">
                            <p className="font-semibold text-muted-foreground mb-1">Status Timeline:</p>
                            <div className="space-y-0.5">
                              {b.statusHistory.map((sh: any) => (
                                <div key={sh.id} className="text-muted-foreground">
                                  • {formatDate(sh.changedAt)} ➔ <b className="text-gray-800 dark:text-gray-200">{sh.newStatus}</b> ({sh.user?.name || 'System'})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Diagnostic Tabs */}
      {data && (
        <Tabs defaultValue="vouchers" className="w-full space-y-4">
          <TabsList className="bg-muted/60 p-1 rounded-lg">
            <TabsTrigger value="vouchers" className="text-xs flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5" />
              Vouchers & Groups ({data.vouchers.duplicateGroupCodes.length})
            </TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Bookings & Queue ({data.bookings.pendingVouchersCount})
            </TabsTrigger>
            <TabsTrigger value="travel" className="text-xs flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5" />
              Travel & Hotels ({data.travel.duplicateBrnsCount})
            </TabsTrigger>
            <TabsTrigger value="database" className="text-xs flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Database & Engine
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: VOUCHERS */}
          <TabsContent value="vouchers" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Duplicate Groups Alert */}
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>Duplicate Group Code Assignments</span>
                    <Badge variant={data.vouchers.duplicateGroupCodes.length > 0 ? "destructive" : "outline"}>
                      {data.vouchers.duplicateGroupCodes.length} duplicate groups
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Identifies group codes that have multiple vouchers generated across different times.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {data.vouchers.duplicateGroupCodes.length === 0 ? (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 py-4">
                      <CheckCircle2 className="h-4 w-4" /> No duplicate group codes detected across vouchers!
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {data.vouchers.duplicateGroupCodes.map((item: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md text-xs space-y-1">
                          <p className="font-bold text-amber-900 dark:text-amber-300">Group Code: {item.groupCode}</p>
                          <div className="space-y-0.5 text-muted-foreground">
                            {item.vouchers.map((v: any, vIdx: number) => (
                              <div key={vIdx} className="flex items-center justify-between text-[11px]">
                                <span>• Voucher #{v.voucherNumber} ({v.bookingReference || 'Quick'})</span>
                                <span>{v.createdBy} ({formatDate(v.createdAt)})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Vouchers */}
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>Recent 10 Generated Vouchers</span>
                    <Badge variant="secondary">{data.vouchers.total} Total</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Latest vouchers created in chronological order.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {data.vouchers.recentVouchers.map((v: any) => (
                      <div key={v.id} className="p-2 bg-muted/30 border rounded-md text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-primary">Voucher #{v.voucherNumber}</span>
                          <span className="text-muted-foreground text-[11px] ml-2">({v.bookingReference || 'Quick'})</span>
                          <p className="text-[11px] text-muted-foreground truncate max-w-xs">{v.party?.partyName || 'N/A'}</p>
                        </div>
                        <div className="text-right text-[11px] text-muted-foreground">
                          <p className="font-medium text-gray-800 dark:text-gray-200">{v.generatedByUser?.name || 'Unknown'}</p>
                          <p>{formatDate(v.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: BOOKINGS */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pending Voucher Queue */}
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>Pending Voucher Generation Queue</span>
                    <Badge variant={data.bookings.pendingVouchersCount > 0 ? "default" : "outline"} className="bg-amber-600">
                      {data.bookings.pendingVouchersCount} Pending
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Bookings currently in &lsquo;voucher&rsquo; status awaiting action.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {data.bookings.pendingVouchersCount === 0 ? (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 py-4">
                      <CheckCircle2 className="h-4 w-4" /> All bookings are caught up! Zero pending vouchers.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {data.bookings.pendingVouchersList.map((b: any) => (
                        <div key={b.id} className="p-2.5 bg-amber-50/40 border border-amber-200 rounded-md text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-secondary">{b.bookingReference || b.id}</span>
                            <span className="text-[11px] text-muted-foreground ml-2">({b.passengerCount} pax)</span>
                            <p className="text-[11px] text-muted-foreground truncate max-w-xs">{b.party?.partyName || 'N/A'}</p>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{formatDate(b.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Passenger Mismatches */}
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>Passenger Count Discrepancies</span>
                    <Badge variant={data.bookings.passengerMismatchesCount > 0 ? "destructive" : "outline"}>
                      {data.bookings.passengerMismatchesCount} Mismatches
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Bookings where header passenger count differs from records in passenger table.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {data.bookings.passengerMismatchesCount === 0 ? (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 py-4">
                      <CheckCircle2 className="h-4 w-4" /> All passenger counts match table records!
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {data.bookings.passengerMismatchesList.map((b: any) => (
                        <div key={b.id} className="p-2.5 bg-muted/40 border rounded-md text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-secondary">{b.bookingReference || b.id}</span>
                            <p className="text-[11px] text-muted-foreground">Header: <b>{b.passengerCount}</b> pax vs Records: <b>{b._count.passengers}</b> pax</p>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{formatDate(b.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: TRAVEL & HOTELS */}
          <TabsContent value="travel" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chronology & Dates */}
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>Date & Flight Chronology Validation</span>
                    <Badge variant={data.travel.invertedFlightsCount > 0 ? "destructive" : "outline"}>
                      {data.travel.invertedFlightsCount} Inverted
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Checks for invalid dates (arrival after departure, or 0-night hotel stays).
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {data.travel.invertedFlightsCount === 0 && data.travel.invalidHotelStaysCount === 0 ? (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 py-4">
                      <CheckCircle2 className="h-4 w-4" /> All travel & hotel chronology is in valid sequential order!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.travel.invalidHotelStaysList.map((h: any, idx: number) => (
                        <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-900">
                          Invalid Hotel Stay: <b>{h.bookingReference}</b> (CheckIn: {h.checkIn?.split('T')[0]} &gt;= CheckOut: {h.checkOut?.split('T')[0]})
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Duplicate BRNs */}
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>Shared / Duplicate Hotel BRNs</span>
                    <Badge variant={data.travel.duplicateBrnsCount > 0 ? "secondary" : "outline"}>
                      {data.travel.duplicateBrnsCount} Shared BRNs
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    BRN numbers allocated across multiple bookings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {data.travel.duplicateBrnsCount === 0 ? (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 py-4">
                      <CheckCircle2 className="h-4 w-4" /> No cross-booking shared BRNs detected!
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {data.travel.duplicateBrnsList.map((item: any, idx: number) => (
                        <div key={idx} className="p-2 bg-muted/40 border rounded text-xs">
                          <p className="font-mono font-bold text-secondary">BRN: {item.brn}</p>
                          <p className="text-[11px] text-muted-foreground">Bookings: {item.bookings.join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: DATABASE */}
          <TabsContent value="database" className="space-y-4">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  SQLite Engine & Physical Storage Parameters
                </CardTitle>
                <CardDescription className="text-xs">
                  Physical database diagnostics and write-ahead log performance.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-muted/30 border rounded-lg">
                    <p className="text-muted-foreground font-semibold">PRAGMA Integrity</p>
                    <p className="text-base font-bold text-emerald-600 capitalize mt-1">{data.database.integrity}</p>
                  </div>
                  <div className="p-3 bg-muted/30 border rounded-lg">
                    <p className="text-muted-foreground font-semibold">Journal Mode</p>
                    <p className="text-base font-bold text-secondary mt-1">{data.database.journalMode}</p>
                  </div>
                  <div className="p-3 bg-muted/30 border rounded-lg">
                    <p className="text-muted-foreground font-semibold">Database File Size</p>
                    <p className="text-base font-bold text-secondary mt-1">{data.database.dbSizeMB} MB</p>
                  </div>
                  <div className="p-3 bg-muted/30 border rounded-lg">
                    <p className="text-muted-foreground font-semibold">WAL File Size</p>
                    <p className="text-base font-bold text-secondary mt-1">{data.database.walSizeMB} MB</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/20 border rounded-lg text-xs space-y-2">
                  <h4 className="font-bold text-secondary flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4" /> Operational Maintenance Notes
                  </h4>
                  <p className="text-muted-foreground">
                    • <b>SQLite WAL Mode:</b> Write-Ahead Logging allows concurrent reads and writes. A background process automatically backs up the database every 2 hours.
                  </p>
                  <p className="text-muted-foreground">
                    • <b>Flushing WAL:</b> If the WAL file grows unexpectedly large (&gt; 20 MB), clicking the &ldquo;Flush WAL Checkpoint&rdquo; button above safely transfers all pending WAL transactions into the main database file without downtime.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
