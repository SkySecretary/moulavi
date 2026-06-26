'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { nusukAPI } from '@/lib/api';
import {
  Shield,
  Users,
  AlertOctagon,
  TrendingUp,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  History,
  Info,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Lock,
  Unlock,
  Radio,
  Search,
  Activity,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface ComplianceSummary {
  totalMonitoredAgents: number;
  activeSuspensions: number;
  throttledAgents: number;
  primaryRiskFactor: string;
}

interface ComplianceAgent {
  id: string;
  partyName: string;
  partyCode: string;
  totalArrivals: number;
  totalDepartures: number;
  arrivalMismatches: number;
  departureMismatches: number;
  severeViolations: number;
  weightedScore: number;
  complianceStatus: 'GREEN' | 'YELLOW' | 'RED';
  concernDetails: string;
}

interface AuditLog {
  id: string;
  subAgentId: string;
  previousStatus: 'GREEN' | 'YELLOW' | 'RED';
  newStatus: 'GREEN' | 'YELLOW' | 'RED';
  reasonSummary: string;
  createdAt: string;
}

interface ActiveMismatch {
  id: string;
  mismatchType: string;
  createdAt: string;
  details: {
    mutamerName?: string;
    passportNumber?: string;
    entry?: {
      mismatched?: boolean;
      dateTime?: { db?: string; excel?: string; mismatch?: boolean };
      flight?: { db?: string; excel?: string; mismatch?: boolean };
      port?: { db?: string; excel?: string; mismatch?: boolean };
    };
    exit?: {
      mismatched?: boolean;
      dateTime?: { db?: string; excel?: string; mismatch?: boolean };
      flight?: { db?: string; excel?: string; mismatch?: boolean };
      port?: { db?: string; excel?: string; mismatch?: boolean };
    };
  };
}

export default function AgentCompliancePage() {
  const router = useRouter();
  const user = getUser();

  // Primary Data State
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ComplianceSummary>({
    totalMonitoredAgents: 0,
    activeSuspensions: 0,
    throttledAgents: 0,
    primaryRiskFactor: 'None'
  });
  const [agents, setAgents] = useState<ComplianceAgent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<ComplianceAgent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected Agent Details State
  const [selectedAgent, setSelectedAgent] = useState<ComplianceAgent | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [agentMismatches, setAgentMismatches] = useState<ActiveMismatch[]>([]);
  const [loadingMismatches, setLoadingMismatches] = useState(false);

  // Override Dialog State
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideTargetStatus, setOverrideTargetStatus] = useState<'GREEN' | 'YELLOW' | 'RED'>('GREEN');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Anomaly stats computed from mismatches
  const [anomalies, setAnomalies] = useState<{
    batchPatterns: { flight: string; date: string; count: number }[];
    portInconsistencies: { expected: string; actual: string; count: number }[];
  }>({
    batchPatterns: [],
    portInconsistencies: []
  });

  const loadComplianceSummary = async () => {
    try {
      const response = await nusukAPI.getComplianceSummary();
      setSummary(response.data);
    } catch (error) {
      console.error('Error loading compliance summary:', error);
    }
  };

  const loadComplianceAgents = async () => {
    try {
      setLoading(true);
      const response = await nusukAPI.getComplianceAgents();
      const agentList = response.data || [];
      setAgents(agentList);
      setFilteredAgents(agentList);
      
      // Auto-select first agent if none is selected
      if (agentList.length > 0 && !selectedAgent) {
        setSelectedAgent(agentList[0]);
      } else if (selectedAgent) {
        // Refresh selected agent reference if they still exist
        const updated = agentList.find((a: ComplianceAgent) => a.id === selectedAgent.id);
        if (updated) setSelectedAgent(updated);
      }
    } catch (error) {
      console.error('Error loading compliance agents:', error);
      toast.error('Failed to load compliance registry');
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedAgentDetails = async (agentId: string) => {
    // 1. Load historical audit logs
    setLoadingLogs(true);
    try {
      const response = await nusukAPI.getComplianceAgentLogs(agentId);
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error('Error loading agent audit logs:', error);
    } finally {
      setLoadingLogs(false);
    }

    // 2. Load active mismatches for batch detection / port inconsistencies
    setLoadingMismatches(true);
    try {
      const response = await nusukAPI.getMismatches({
        partyId: agentId,
        resolved: false,
        limit: 100 // fetch up to 100 active mismatches to analyze
      });
      const mismatches = response.data?.mismatches || [];
      setAgentMismatches(mismatches);
      
      // Compute Anomaly Profiles
      analyzeAnomalies(mismatches);
    } catch (error) {
      console.error('Error loading agent mismatches:', error);
    } finally {
      setLoadingMismatches(false);
    }
  };

  const analyzeAnomalies = (mismatches: ActiveMismatch[]) => {
    // A. Batch pattern: multiple arrival mismatches on exact same entry flight and date
    const batchMap: Record<string, { flight: string; date: string; count: number }> = {};
    // B. Port inconsistencies: expected vs actual ports mismatch counts
    const portMap: Record<string, { expected: string; actual: string; count: number }> = {};

    for (const item of mismatches) {
      const details = item.details;
      
      // 1. Group entry flights & dates
      if (details?.entry?.mismatched && details.entry.flight?.mismatch && details.entry.flight.excel) {
        const flight = details.entry.flight.excel;
        const dateStr = details.entry.dateTime?.excel ? new Date(details.entry.dateTime.excel).toLocaleDateString() : 'Unknown Date';
        const key = `${flight}_${dateStr}`;
        if (!batchMap[key]) {
          batchMap[key] = { flight, date: dateStr, count: 0 };
        }
        batchMap[key].count++;
      }

      // 2. Group entry port discrepancies
      if (details?.entry?.mismatched && details.entry.port?.mismatch && details.entry.port.excel) {
        const expected = details.entry.port.db || 'Unknown Port';
        const actual = details.entry.port.excel;
        const key = `${expected}_${actual}`;
        if (!portMap[key]) {
          portMap[key] = { expected, actual, count: 0 };
        }
        portMap[key].count++;
      }
    }

    // Filter clusters of 2 or more discrepancies (indicating system dummy flight/port pattern)
    const clusters = Object.values(batchMap).filter(b => b.count >= 2);
    const portInconsistencies = Object.values(portMap).filter(p => p.count >= 2);

    setAnomalies({
      batchPatterns: clusters.sort((a, b) => b.count - a.count),
      portInconsistencies: portInconsistencies.sort((a, b) => b.count - a.count)
    });
  };

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    loadComplianceSummary();
    loadComplianceAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadSelectedAgentDetails(selectedAgent.id);
    }
  }, [selectedAgent]);

  // Search logic
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (term === '') {
      setFilteredAgents(agents);
    } else {
      setFilteredAgents(
        agents.filter(
          (a) =>
            a.partyName.toLowerCase().includes(term) ||
            a.partyCode.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, agents]);

  const handleOpenOverride = (status: 'GREEN' | 'YELLOW' | 'RED') => {
    setOverrideTargetStatus(status);
    setOverrideReason('');
    setOverrideDialogOpen(true);
  };

  const handleConfirmOverride = async () => {
    if (!selectedAgent) return;
    if (overrideReason.trim().length < 5) {
      toast.warning('Please enter a descriptive reason (minimum 5 characters)');
      return;
    }

    try {
      setSubmittingOverride(true);
      await nusukAPI.overrideComplianceStatus(selectedAgent.id, {
        status: overrideTargetStatus,
        reason: overrideReason.trim()
      });
      toast.success(`Agent privileges successfully overridden to ${overrideTargetStatus}.`);
      setOverrideDialogOpen(false);
      
      // Reload everything
      await loadComplianceSummary();
      await loadComplianceAgents();
    } catch (error: any) {
      console.error('Override failed:', error);
      toast.error(error.response?.data?.error || 'Failed to submit override action');
    } finally {
      setSubmittingOverride(false);
    }
  };
 
  const handleRecalculateCompliance = async () => {
    try {
      setRecalculating(true);
      const response = await nusukAPI.recalculateCompliance();
      toast.success(`Recalculated compliance metrics for ${response.data.recalculatedAgentsCount} sub-agents.`);
      // Reload page data
      await loadComplianceSummary();
      await loadComplianceAgents();
      if (selectedAgent) {
        loadSelectedAgentDetails(selectedAgent.id);
      }
    } catch (error: any) {
      console.error('Recalculation failed:', error);
      toast.error(error.response?.data?.error || 'Failed to recalculate compliance metrics');
    } finally {
      setRecalculating(false);
    }
  };

  const getStatusBadge = (status: 'GREEN' | 'YELLOW' | 'RED') => {
    switch (status) {
      case 'GREEN':
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">🟢 Green</Badge>;
      case 'YELLOW':
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">🟡 Yellow</Badge>;
      case 'RED':
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200">🔴 Red</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-indigo-600" />
              Agent Audit & Compliance Page
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Monitor sub-agent compliance scores, overstays, and enforce automatic booking rate-limits or locks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 text-xs border-indigo-200 hover:bg-indigo-50 text-indigo-700 flex items-center gap-1.5"
              onClick={handleRecalculateCompliance}
              disabled={recalculating}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Recalculating...' : 'Recalculate Compliance'}
            </Button>
            <Link href="/dashboard/umrah-visa/mismatched-travel" passHref>
              <Button variant="outline" size="sm" className="h-9 text-xs border-indigo-200 hover:bg-indigo-50 text-indigo-700">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Discrepancy Travel Logs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Network Overview Summary Widgets */}
      <div className="p-4 lg:p-8 space-y-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Monitored Agents */}
          <Card className="shadow-sm border-l-4 border-l-indigo-600">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Monitored Agents</p>
                <h3 className="text-2xl font-extrabold text-slate-800 mt-1 font-mono">{summary.totalMonitoredAgents}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Suspended (Red) */}
          <Card className="shadow-sm border-l-4 border-l-rose-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Active Suspensions (Red)</p>
                <h3 className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{summary.activeSuspensions}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 animate-pulse">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Throttled (Yellow) */}
          <Card className="shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Throttled Agents (Yellow)</p>
                <h3 className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">{summary.throttledAgents}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: System Risk Factor */}
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Systemic Risk Factor</p>
                <h4 className="text-sm font-bold text-slate-800 mt-2 line-clamp-1">{summary.primaryRiskFactor}</h4>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Master Table & Deep-Dive Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Master Table Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border">
              <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-indigo-600 animate-pulse" />
                Master Agent Audit Table
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                <Input
                  placeholder="Filter agents by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white w-full"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-12 bg-gray-50 animate-pulse rounded-lg" />
                <div className="h-16 bg-gray-50 animate-pulse rounded-lg" />
                <div className="h-16 bg-gray-50 animate-pulse rounded-lg" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <Card className="border-dashed py-12 text-center">
                <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <CardDescription>No agents detected in compliance database.</CardDescription>
              </Card>
            ) : (
              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="p-3">Sub-Agent & Code</th>
                        <th className="p-3">Rank</th>
                        <th className="p-3">Score Index</th>
                        <th className="p-3">30D Activity</th>
                        <th className="p-3">Mismatches</th>
                        <th className="p-3 text-right">Concern Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredAgents.map((agent) => {
                        const isSelected = selectedAgent?.id === agent.id;
                        return (
                          <tr
                            key={agent.id}
                            onClick={() => setSelectedAgent(agent)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-3">
                              <div className="font-bold text-gray-900">{agent.partyName}</div>
                              <div className="text-[10px] text-gray-400 font-mono">Code: {agent.partyCode}</div>
                            </td>
                            <td className="p-3">
                              {getStatusBadge(agent.complianceStatus)}
                            </td>
                            <td className="p-3 font-semibold font-mono text-slate-700">
                              {Number(agent.weightedScore).toFixed(4)}
                            </td>
                            <td className="p-3 text-gray-600 font-medium whitespace-nowrap">
                              <div>{agent.totalArrivals} Arrivals</div>
                              <div>{agent.totalDepartures} Departures</div>
                            </td>
                            <td className="p-3 text-gray-600 font-mono whitespace-nowrap">
                              <div className="text-amber-600 font-semibold">{agent.arrivalMismatches} Arr Mismatch</div>
                              <div className="text-purple-600 font-semibold">{agent.departureMismatches} Dep Mismatch</div>
                            </td>
                            <td className="p-3 text-right text-gray-500 italic max-w-[200px] truncate" title={agent.concernDetails}>
                              {agent.concernDetails}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Deep-Dive Panel Grid */}
          <div className="space-y-4">
            <div className="bg-slate-50 p-2.5 rounded-lg border text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Maximize2 className="h-4 w-4 text-indigo-600" />
              Deep-Dive Concern & Details Panel
            </div>

            {selectedAgent ? (
              <Card className="shadow-sm border-indigo-200 overflow-hidden bg-white">
                <CardHeader className="bg-indigo-50/30 border-b p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-indigo-950 uppercase tracking-tight">
                        {selectedAgent.partyName}
                      </CardTitle>
                      <CardDescription className="text-[10px] mt-0.5 font-mono">
                        ID Code: {selectedAgent.partyCode}
                      </CardDescription>
                    </div>
                    {getStatusBadge(selectedAgent.complianceStatus)}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-5">
                  {/* Action Override Buttons */}
                  <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase">Override Agent privileges</Label>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenOverride('GREEN')}
                        disabled={selectedAgent.complianceStatus === 'GREEN'}
                        className="h-7 text-[10px] bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <Unlock className="h-3 w-3 mr-1" />
                        Green
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenOverride('YELLOW')}
                        disabled={selectedAgent.complianceStatus === 'YELLOW'}
                        className="h-7 text-[10px] bg-white border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        Throttle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenOverride('RED')}
                        disabled={selectedAgent.complianceStatus === 'RED'}
                        className="h-7 text-[10px] bg-white border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      >
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        Suspend
                      </Button>
                    </div>
                  </div>

                  {/* Anomaly Profiles & Integrity Indicators */}
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-800 border-b pb-1.5 uppercase tracking-wide">
                      Anomaly Profiles & Integrity
                    </h4>

                    {loadingMismatches ? (
                      <div className="text-[11px] text-gray-400 animate-pulse">Analyzing travel mismatches...</div>
                    ) : (
                      <div className="space-y-2.5 text-[11px]">
                        {/* 1. Batch Pattern Detection */}
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-600 uppercase text-[9px] tracking-wide">Batch Pattern Detection</div>
                          {anomalies.batchPatterns.length === 0 ? (
                            <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 p-2 rounded flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <span>No batch patterns detected (flight delays seem natural).</span>
                            </div>
                          ) : (
                            anomalies.batchPatterns.map((b, idx) => (
                              <div key={idx} className="bg-rose-50 border border-rose-100 text-rose-800 p-2 rounded flex items-start gap-1.5">
                                <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-rose-600 mt-0.5" />
                                <div>
                                  <strong className="block font-bold">Systemic Dummy Ticket Warning!</strong>
                                  <span>{b.count} arrival mismatches detected on flight <strong className="font-mono">{b.flight}</strong> on {b.date}.</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* 2. Port Inconsistencies */}
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-600 uppercase text-[9px] tracking-wide">Port Compliance (Airport Deviations)</div>
                          {anomalies.portInconsistencies.length === 0 ? (
                            <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 p-2 rounded flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <span>Port entry deviations within compliance thresholds.</span>
                            </div>
                          ) : (
                            anomalies.portInconsistencies.map((p, idx) => (
                              <div key={idx} className="bg-amber-50 border border-amber-100 text-amber-800 p-2 rounded flex items-start gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                                <div>
                                  <strong className="block font-bold">Airport Port Deviation!</strong>
                                  <span>{p.count} pilgrims landed at <strong className="font-semibold">{p.actual}</strong> instead of expected port <strong className="font-semibold">{p.expected}</strong>.</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Operational Audit Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 border-b pb-1.5 uppercase tracking-wide flex items-center gap-1">
                      <History className="h-3.5 w-3.5 text-gray-400" />
                      Operational Audit Timeline
                    </h4>

                    {loadingLogs ? (
                      <div className="text-[11px] text-gray-400 animate-pulse">Loading audit timeline...</div>
                    ) : auditLogs.length === 0 ? (
                      <div className="text-[11px] text-gray-400 italic">No historical rank changes recorded.</div>
                    ) : (
                      <div className="relative border-l border-gray-200 pl-3.5 ml-2.5 space-y-4 py-1">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="relative text-[11px]">
                            {/* Circle Marker */}
                            <div className={`absolute -left-[21.5px] top-1.5 h-3 w-3 rounded-full border border-white shadow-sm flex items-center justify-center ${
                              log.newStatus === 'RED' ? 'bg-rose-500' : (log.newStatus === 'YELLOW' ? 'bg-amber-500' : 'bg-emerald-500')
                            }`} />
                            <div className="flex justify-between items-center text-gray-500 font-semibold text-[9px] mb-0.5">
                              <span className="font-bold text-gray-700">
                                {log.newStatus === 'RED' ? 'Downgraded to Red (Suspended)' : (log.newStatus === 'YELLOW' ? 'Downgraded to Yellow (Warning)' : 'Status: Restored to Green')}
                              </span>
                              <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-gray-600 leading-normal text-[10px]">{log.reasonSummary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed py-12 text-center bg-white shadow-sm">
                <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <CardDescription>Select an agent from the registry to view metrics details & audit timeline.</CardDescription>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Override Agent Privileges Dialog Modal */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-gray-900">
              <Shield className="h-5 w-5 text-indigo-600" />
              Override Agent Status
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm manually changing the compliance standing of <strong>{selectedAgent?.partyName}</strong>. This override will log an administrative audit event and apply immediate lockout/limit rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Target Override Status</Label>
              <div className="flex gap-2">
                <Badge
                  onClick={() => setOverrideTargetStatus('GREEN')}
                  className={`cursor-pointer px-2.5 py-1 text-xs border ${
                    overrideTargetStatus === 'GREEN'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  🟢 GREEN (Normal)
                </Badge>
                <Badge
                  onClick={() => setOverrideTargetStatus('YELLOW')}
                  className={`cursor-pointer px-2.5 py-1 text-xs border ${
                    overrideTargetStatus === 'YELLOW'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  🟡 YELLOW (Throttled)
                </Badge>
                <Badge
                  onClick={() => setOverrideTargetStatus('RED')}
                  className={`cursor-pointer px-2.5 py-1 text-xs border ${
                    overrideTargetStatus === 'RED'
                      ? 'bg-rose-500 text-white border-rose-600'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  🔴 RED (Suspended)
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="override-reason" className="text-xs font-semibold text-gray-700">
                Reason Summary
              </Label>
              <Textarea
                id="override-reason"
                placeholder="e.g. Manual override. Agent resolved flight deviation issues and paid booking dues."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="text-xs h-24"
              />
              <p className="text-[10px] text-gray-400">
                Please enter a detailed description of why you are overriding this status. Minimum 5 characters required.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverrideDialogOpen(false)}
              disabled={submittingOverride}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmOverride}
              disabled={submittingOverride}
              className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              {submittingOverride ? 'Saving Override...' : 'Enforce Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
