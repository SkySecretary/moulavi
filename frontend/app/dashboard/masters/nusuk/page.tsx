'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { nusukAPI } from '@/lib/api';
import { 
  Settings, Save, Loader2, RefreshCw, AlertTriangle, CheckCircle, 
  ShieldAlert, Plus, Edit2, Trash2, Building, FileSpreadsheet,
  Globe, Clock, Users, ArrowUpRight, FolderX
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';

interface ExternalAgent {
  id: string;
  name: string;
  entityId: string;
  contractId: string;
  activeEntityTypeId: string;
  isActive: boolean;
  lastSyncedAt?: string | null;
  lastSyncCount?: number | null;
  lastSyncStatus?: string | null;
}

export default function NusukSettingsPage() {
  const router = useRouter();
  const user = getUser();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgressStage, setSyncProgressStage] = useState<string>('');
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Master Settings Data
  const [settingsData, setSettingsData] = useState({
    token: '',
    checkByPassport: false,
    syncSchedule: '08:00, 20:00',
    syncType: 'listing',
    allowOneWayTicket: false,
    allowWithoutTicket: false,
    allowReEntryOneWayTicket: false,
    allowReEntryWithoutTicket: false,
    isValid: true,
    lastSyncedAt: null as string | null,
    stats: {
      totalSyncedMutamers: 0,
      over85DaysCount: 0,
      consulateReviewCount: 0,
    }
  });

  // External Agents List
  const [externalAgents, setExternalAgents] = useState<ExternalAgent[]>([]);
  
  // Modal for Add/Edit External Agent
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Partial<ExternalAgent> | null>(null);
  const [savingAgent, setSavingAgent] = useState(false);

  // Poll sync status worker
  const pollSyncStatus = async (): Promise<boolean> => {
    try {
      const res = await nusukAPI.getSyncStatus();
      if (res.data) {
        if (res.data.isSyncing) {
          setSyncing(true);
          setSyncProgressStage(res.data.stage || 'Synchronization in progress...');
          return true; // Still in progress
        } else {
          setSyncing(false);
          setSyncProgressStage('');
          if (res.data.lastSyncError) {
            toast.error(`Nusuk sync failed: ${res.data.lastSyncError}`);
            if (
              res.data.lastSyncError.toLowerCase().includes('authentication') ||
              res.data.lastSyncError.toLowerCase().includes('token')
            ) {
              setSettingsData(prev => ({ ...prev, isValid: false }));
            }
          } else if (res.data.lastSyncResult) {
            const resData = res.data.lastSyncResult;
            setSettingsData(prev => ({
              ...prev,
              isValid: true,
              lastSyncedAt: resData.syncedAt || new Date().toISOString(),
              stats: {
                totalSyncedMutamers: resData.totalRecords || resData.mutamersCount || prev.stats.totalSyncedMutamers,
                over85DaysCount: resData.over85DaysCount ?? prev.stats.over85DaysCount,
                consulateReviewCount: resData.consulateReviewCount ?? prev.stats.consulateReviewCount,
              }
            }));
            toast.success(
              `Sync completed! Fetched ${resData.totalRecords || resData.mutamersCount || 0} mutamer records across active contracts.`
            );
            loadSettingsAndAgents();
          }
          return false; // Completed
        }
      }
    } catch (e) {
      console.error('Error polling sync status:', e);
    }
    return false;
  };

  // Load Settings and External Agents
  const loadSettingsAndAgents = async () => {
    try {
      setLoading(true);
      const res = await nusukAPI.getSettings();
      if (res.data) {
        setSettingsData({
          token: res.data.token || '',
          checkByPassport: res.data.checkByPassport ?? false,
          syncSchedule: res.data.syncSchedule || '08:00, 20:00',
          syncType: res.data.syncType || 'listing',
          allowOneWayTicket: res.data.allowOneWayTicket ?? false,
          allowWithoutTicket: res.data.allowWithoutTicket ?? false,
          allowReEntryOneWayTicket: res.data.allowReEntryOneWayTicket ?? false,
          allowReEntryWithoutTicket: res.data.allowReEntryWithoutTicket ?? false,
          isValid: res.data.isValid ?? true,
          lastSyncedAt: res.data.lastSyncedAt || null,
          stats: res.data.stats || {
            totalSyncedMutamers: 0,
            over85DaysCount: 0,
            consulateReviewCount: 0,
          }
        });

        if (Array.isArray(res.data.externalAgents)) {
          setExternalAgents(res.data.externalAgents);
        }
      }
    } catch (error: any) {
      console.error('Error loading Nusuk settings:', error);
      toast.error('Failed to load Nusuk settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    loadSettingsAndAgents();

    // Check if background sync is already active on page open
    let pollInterval: NodeJS.Timeout | null = null;
    pollSyncStatus().then(isRunning => {
      if (isRunning) {
        pollInterval = setInterval(async () => {
          const stillRunning = await pollSyncStatus();
          if (!stillRunning && pollInterval) {
            clearInterval(pollInterval);
          }
        }, 2500);
      }
    });

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Save Master Settings (Token & Schedule)
  const handleSaveMasterSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsData.token.trim()) {
      toast.error('Authorization Bearer Token is required');
      return;
    }

    try {
      setSaving(true);
      await nusukAPI.saveSettings({
        token: settingsData.token.trim(),
        checkByPassport: settingsData.checkByPassport,
        syncSchedule: settingsData.syncSchedule,
        syncType: settingsData.syncType,
        allowOneWayTicket: settingsData.allowOneWayTicket,
        allowWithoutTicket: settingsData.allowWithoutTicket,
        allowReEntryOneWayTicket: settingsData.allowReEntryOneWayTicket,
        allowReEntryWithoutTicket: settingsData.allowReEntryWithoutTicket,
      });
      setSettingsData(prev => ({ ...prev, isValid: true }));
      toast.success('Master Nusuk token and configuration saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Open Dialog for New Agent
  const handleOpenAddAgent = () => {
    setEditingAgent({
      name: '',
      entityId: '',
      contractId: '',
      activeEntityTypeId: '52',
      isActive: true,
    });
    setIsAgentDialogOpen(true);
  };

  // Open Dialog for Editing Agent
  const handleOpenEditAgent = (agent: ExternalAgent) => {
    setEditingAgent({ ...agent });
    setIsAgentDialogOpen(true);
  };

  // Save Agent (Create / Update)
  const handleSaveAgent = async () => {
    if (!editingAgent?.name?.trim() || !editingAgent?.entityId?.trim() || !editingAgent?.contractId?.trim()) {
      toast.error('Agent Name, Entity ID, and Contract ID are all required');
      return;
    }

    try {
      setSavingAgent(true);
      const res = await nusukAPI.saveExternalAgent({
        id: editingAgent.id,
        name: editingAgent.name.trim(),
        entityId: editingAgent.entityId.trim(),
        contractId: editingAgent.contractId.trim(),
        activeEntityTypeId: editingAgent.activeEntityTypeId || '52',
        isActive: editingAgent.isActive ?? true,
      });

      toast.success(res.data?.message || 'External Agent saved successfully');
      setIsAgentDialogOpen(false);
      setEditingAgent(null);
      await loadSettingsAndAgents();
    } catch (error: any) {
      console.error('Error saving external agent:', error);
      toast.error(error.response?.data?.error || 'Failed to save External Agent');
    } finally {
      setSavingAgent(false);
    }
  };

  // Toggle Agent Active State
  const handleToggleAgentActive = async (agent: ExternalAgent) => {
    try {
      const nextState = !agent.isActive;
      await nusukAPI.toggleExternalAgent(agent.id, nextState);
      setExternalAgents(prev =>
        prev.map(a => (a.id === agent.id ? { ...a, isActive: nextState } : a))
      );
      toast.success(`External Agent ${nextState ? 'activated' : 'disabled'}`);
    } catch (error: any) {
      console.error('Error toggling agent:', error);
      toast.error('Failed to toggle agent status');
    }
  };

  // Delete Agent
  const handleDeleteAgent = async (agent: ExternalAgent) => {
    if (!confirm(`Are you sure you want to delete External Agent "${agent.name}"?`)) {
      return;
    }

    try {
      await nusukAPI.deleteExternalAgent(agent.id);
      setExternalAgents(prev => prev.filter(a => a.id !== agent.id));
      toast.success('External Agent deleted successfully');
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete External Agent');
    }
  };

  // Trigger Global Sync Across All Active Agents
  const handleGlobalSync = async () => {
    if (!settingsData.token.trim()) {
      toast.error('Please save a valid authorization token first');
      return;
    }

    const activeCount = externalAgents.filter(a => a.isActive).length;
    if (activeCount === 0) {
      toast.error('No active External Agent entities to sync. Please enable at least one agent.');
      return;
    }

    try {
      setSyncing(true);
      setSyncProgressStage(`Initiating sync across ${activeCount} active contracts...`);
      toast.info(`Initiating synchronization for ${activeCount} active External Agent contracts...`);

      await nusukAPI.triggerSync();

      const pollInterval = setInterval(async () => {
        const stillRunning = await pollSyncStatus();
        if (!stillRunning) {
          clearInterval(pollInterval);
        }
      }, 2500);
    } catch (error: any) {
      console.error('Nusuk sync failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Synchronization failed to start';
      toast.error(errorMessage);
      setSyncing(false);
      setSyncProgressStage('');
    }
  };

  // Manual Excel Upload Sync
  const handleExcelUploadSync = async () => {
    if (!excelFile) {
      toast.error('Please select an Excel report file first');
      return;
    }

    try {
      setUploadingExcel(true);
      toast.info('Parsing and synchronizing Nusuk Excel file...');

      const response = await nusukAPI.syncExcel(excelFile);
      const resData = response.data;

      setSettingsData(prev => ({
        ...prev,
        isValid: true,
        lastSyncedAt: resData.syncedAt || new Date().toISOString(),
        stats: {
          totalSyncedMutamers: resData.mutamersCount || prev.stats.totalSyncedMutamers,
          over85DaysCount: resData.over85DaysCount ?? prev.stats.over85DaysCount,
          consulateReviewCount: resData.consulateReviewCount ?? prev.stats.consulateReviewCount,
        }
      }));

      toast.success(`Manual Excel sync completed! Processed ${resData.mutamersCount || 0} mutamers with ${resData.over85DaysCount || 0} overstay flags.`);
      setExcelFile(null);
      const fileInput = document.getElementById('manual-excel-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await loadSettingsAndAgents();
    } catch (error: any) {
      console.error('Manual Excel sync failed:', error);
      toast.error(error.response?.data?.error || error.message || 'Manual synchronization failed');
    } finally {
      setUploadingExcel(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 pb-16">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="h-6 w-6 text-indigo-600" />
              Nusuk API & External Agent Hub
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Manage Master Bearer Token, External Agent Contracts, Multi-Entity Sync & Compliance
            </p>
          </div>
          <div className="flex items-center gap-3">
            {syncing && syncProgressStage && (
              <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-md font-medium animate-pulse flex items-center gap-1.5 max-w-xs truncate">
                <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                {syncProgressStage}
              </span>
            )}
            <Button
              onClick={handleGlobalSync}
              disabled={syncing || !settingsData.token}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing in Background...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync All Active Contracts
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* Overview Stats & Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-indigo-100 bg-indigo-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Total Synced Mutamers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{settingsData.stats.totalSyncedMutamers.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {settingsData.lastSyncedAt
                  ? `Last synced: ${new Date(settingsData.lastSyncedAt).toLocaleString()}`
                  : 'Never synced'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Unlinked Groups</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">Nusuk Groups</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <FolderX className="h-6 w-6 text-purple-700" />
                </div>
              </div>
              <Link 
                href="/dashboard/umrah-visa/unlinked-groups"
                className="text-xs font-semibold text-purple-700 hover:text-purple-800 mt-3 inline-flex items-center gap-1 group"
              >
                View Unlinked Groups
                <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Consulate Review</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{settingsData.stats.consulateReviewCount}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <ShieldAlert className="h-6 w-6 text-amber-700" />
                </div>
              </div>
              <Link 
                href="/dashboard/umrah-visa/consulate-review"
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 mt-3 inline-flex items-center gap-1 group"
              >
                View Consulate Review Cases
                <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-rose-200 bg-rose-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Over 85 Days in KSA</p>
                  <p className="text-2xl font-bold text-rose-900 mt-1">{settingsData.stats.over85DaysCount}</p>
                </div>
                <div className="p-3 bg-rose-100 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-rose-700" />
                </div>
              </div>
              <Link 
                href="/dashboard/umrah-visa/overstay-85-days"
                className="text-xs font-semibold text-rose-700 hover:text-rose-800 mt-3 inline-flex items-center gap-1 group"
              >
                View 85+ Days Overstay List
                <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: External Agent Entities Hub */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b bg-gray-50/50 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Building className="h-5 w-5 text-indigo-600" />
                  External Agent Entities & Contracts
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Configure EA Entity IDs, Contract IDs, and active syncing toggles under your primary master account.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={handleOpenAddAgent}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add External Agent
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {externalAgents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No External Agents configured yet.</p>
                <Button onClick={handleOpenAddAgent} variant="outline" size="sm" className="mt-3">
                  Add Default Agent
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">External Agent Name</th>
                      <th className="py-3 px-4">Entity ID (Active Entity)</th>
                      <th className="py-3 px-4">Contract ID</th>
                      <th className="py-3 px-4">Entity Type</th>
                      <th className="py-3 px-4">Last Sync Status</th>
                      <th className="py-3 px-4 text-center">Sync Active</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {externalAgents.map(agent => (
                      <tr key={agent.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-gray-900">
                          {agent.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-indigo-700 font-semibold">
                          {agent.entityId}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-700">
                          {agent.contractId}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-500">
                          {agent.activeEntityTypeId || '52'}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {agent.lastSyncedAt ? (
                            <div className="flex flex-col">
                              <span className="text-emerald-700 font-medium">
                                ✓ {agent.lastSyncCount || 0} records
                              </span>
                              <span className="text-gray-400 text-[10px]">
                                {new Date(agent.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Not synced</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Switch
                            checked={agent.isActive}
                            onCheckedChange={() => handleToggleAgentActive(agent)}
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-600 hover:text-indigo-600"
                            onClick={() => handleOpenEditAgent(agent)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-600 hover:text-rose-600"
                            onClick={() => handleDeleteAgent(agent)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Section 2: Master Bearer Token & Schedule Settings */}
        <form onSubmit={handleSaveMasterSettings}>
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-indigo-600" />
                    Master User Token & Sync Configuration
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Primary JWT Bearer token extracted from browser network headers (applies across all EA contracts).
                  </CardDescription>
                </div>
                <div>
                  {settingsData.isValid ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Active & Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Token Expired / Invalid
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Token Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="token" className="text-sm font-semibold text-gray-800">
                    Master Authorization Bearer Token <span className="text-rose-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-indigo-600 hover:text-indigo-700 h-6 px-2"
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip) {
                          setSettingsData(prev => ({ ...prev, token: clip.replace(/^Bearer\s+/i, '').trim() }));
                          toast.success('Pasted token from clipboard');
                        }
                      } catch (err) {
                        toast.error('Unable to access clipboard. Please paste manually.');
                      }
                    }}
                  >
                    Paste from Clipboard
                  </Button>
                </div>
                <textarea
                  id="token"
                  rows={4}
                  value={settingsData.token}
                  onChange={e => setSettingsData(prev => ({ ...prev, token: e.target.value }))}
                  placeholder="eyJraWQiOiJyc2FfZGVmYXVsdF9rZXkiLCJhbGciOiJSUzI1NiJ9..."
                  className="w-full rounded-md border border-gray-300 p-3 font-mono text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
                  required
                />
                <p className="text-[11px] text-gray-500">
                  Tip: Copy the authorization header from any <code>GetMutamerReport</code> request in DevTools on <code>masar.nusuk.sa</code>.
                </p>
              </div>

              {/* Schedules and Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="syncSchedule" className="text-sm font-semibold text-gray-800">
                    Automated Sync Schedule (UTC Times)
                  </Label>
                  <Input
                    id="syncSchedule"
                    value={settingsData.syncSchedule}
                    onChange={e => setSettingsData(prev => ({ ...prev, syncSchedule: e.target.value }))}
                    placeholder="08:00, 20:00"
                    className="text-sm"
                  />
                  <p className="text-[11px] text-gray-500">Comma-separated 24h format times (e.g. 08:00, 20:00).</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Allow One-Way Ticket Bookings</Label>
                      <p className="text-xs text-gray-500">Bypass strict roundtrip flight validation during manual booking entry.</p>
                    </div>
                    <Switch
                      checked={settingsData.allowOneWayTicket}
                      onCheckedChange={checked => setSettingsData(prev => ({ ...prev, allowOneWayTicket: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Allow Without-Ticket Bookings</Label>
                      <p className="text-xs text-gray-500">Allow bookings to be submitted without immediate flight ticket upload.</p>
                    </div>
                    <Switch
                      checked={settingsData.allowWithoutTicket}
                      onCheckedChange={checked => setSettingsData(prev => ({ ...prev, allowWithoutTicket: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Section 3: Manual Excel Upload Synchronization */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b bg-gray-50/50 pb-4">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Manual Excel Report Synchronization (Offline Fallback)
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              If API token is temporarily unavailable, export the Mutamers Excel report directly from Nusuk portal and upload here.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                id="manual-excel-file"
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={e => setExcelFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <Button
                type="button"
                onClick={handleExcelUploadSync}
                disabled={uploadingExcel || !excelFile}
                className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap gap-2"
              >
                {uploadingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Upload & Sync Excel
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Dialog for Add / Edit External Agent Entity */}
      <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAgent?.id ? 'Edit External Agent Entity' : 'Add External Agent Entity'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide the EA name, Entity ID (Active Entity), Contract ID, and Entity Type ID (52).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="agentName" className="text-xs font-semibold">
                Agent Company / Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="agentName"
                value={editingAgent?.name || ''}
                onChange={e => setEditingAgent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. EA-Moulavi Travel and Rec Agents Pvt Ltd"
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="entityId" className="text-xs font-semibold">
                  Entity ID <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="entityId"
                  value={editingAgent?.entityId || ''}
                  onChange={e => setEditingAgent(prev => ({ ...prev, entityId: e.target.value }))}
                  placeholder="e.g. 719133"
                  className="text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contractId" className="text-xs font-semibold">
                  Contract ID <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="contractId"
                  value={editingAgent?.contractId || ''}
                  onChange={e => setEditingAgent(prev => ({ ...prev, contractId: e.target.value }))}
                  placeholder="e.g. 230195"
                  className="text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="activeEntityTypeId" className="text-xs font-semibold">
                Active Entity Type ID
              </Label>
              <Input
                id="activeEntityTypeId"
                value={editingAgent?.activeEntityTypeId || '52'}
                onChange={e => setEditingAgent(prev => ({ ...prev, activeEntityTypeId: e.target.value }))}
                placeholder="52"
                className="text-sm font-mono"
              />
              <p className="text-[10px] text-gray-500">Standard External Agent entity type in Nusuk Masar is 52.</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <Label className="text-xs font-semibold">Enable Sync for this Entity</Label>
                <p className="text-[10px] text-gray-500">Include in automatic and manual sync runs.</p>
              </div>
              <Switch
                checked={editingAgent?.isActive ?? true}
                onCheckedChange={checked => setEditingAgent(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAgentDialogOpen(false)}
              disabled={savingAgent}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAgent}
              disabled={savingAgent}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {savingAgent ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
