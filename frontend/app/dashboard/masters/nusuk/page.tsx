'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { nusukAPI, partyAPI } from '@/lib/api';
import { Settings, Save, Loader2, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Party } from '@/types';

export default function NusukSettingsPage() {
  const router = useRouter();
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [umrahCompanies, setUmrahCompanies] = useState<Party[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [currentSyncingCompany, setCurrentSyncingCompany] = useState<string | null>(null);

  const handleExcelUploadSync = async () => {
    if (!excelFile) {
      toast.error('Please select an Excel file first');
      return;
    }

    const companiesToSync = umrahCompanies.filter(c => selectedCompanyIds.includes(c.id));
    if (companiesToSync.length === 0) {
      toast.error('Please select at least one Umrah Company to sync.');
      return;
    }

    try {
      setUploadingExcel(true);
      let totalMismatches = 0;
      let lastSyncedAt = null;

      for (let i = 0; i < companiesToSync.length; i++) {
        const company = companiesToSync[i];
        setCurrentSyncingCompany(company.partyName);
        toast.info(`Manually syncing ${company.partyName} (${i + 1}/${companiesToSync.length})...`);

        const response = await nusukAPI.syncExcel(excelFile, company.id);
        totalMismatches += response.data.mismatchesCount || 0;
        lastSyncedAt = response.data.syncedAt;
      }

      setSettingsData(prev => ({
        ...prev,
        isValid: true,
        lastSyncedAt: lastSyncedAt || new Date().toISOString(),
      }));

      toast.success(`Manual sync completed! Found ${totalMismatches} total travel detail mismatches.`);
      setExcelFile(null);
      
      const fileInput = document.getElementById('manual-excel-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error('Manual Nusuk sync failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Manual synchronization failed';
      toast.error(errorMessage);
    } finally {
      setUploadingExcel(false);
      setCurrentSyncingCompany(null);
    }
  };
  
  const [settingsData, setSettingsData] = useState({
    token: '',
    activeEntityId: '525592',
    activeEntityTypeId: '32',
    entityId: '525592',
    checkByPassport: false,
    externalAgentCodes: '22282, 6655, 1001828',
    syncSchedule: '08:00, 20:00',
    isValid: true,
    lastSyncedAt: null as string | null,
  });

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        // Load all Umrah companies
        const companiesRes = await partyAPI.getAll({ 
          supplier_service_type: 'umrah_service',
          limit: 1000 
        });
        const companiesList = companiesRes.data.parties || [];
        setUmrahCompanies(companiesList);

        const response = await nusukAPI.getSettings();
        if (response.data) {
          setSettingsData({
            token: response.data.token || '',
            activeEntityId: response.data.activeEntityId || '525592',
            activeEntityTypeId: response.data.activeEntityTypeId || '32',
            entityId: response.data.entityId || '525592',
            checkByPassport: response.data.checkByPassport ?? false,
            externalAgentCodes: response.data.externalAgentCodes || '22282, 6655, 1001828',
            syncSchedule: response.data.syncSchedule || '08:00, 20:00',
            isValid: response.data.isValid ?? true,
            lastSyncedAt: response.data.lastSyncedAt || null,
          });

          const ids = response.data.selectedUmrahCompanyIds
            ? response.data.selectedUmrahCompanyIds.split(',').map((id: string) => id.trim()).filter(Boolean)
            : [];
          setSelectedCompanyIds(ids);
        }
      } catch (error: any) {
        console.error('Error loading Nusuk settings:', error);
        toast.error('Failed to load Nusuk settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsData.token) {
      toast.error('Authorization Bearer Token is required');
      return;
    }

    try {
      setSaving(true);
      await nusukAPI.saveSettings({
        token: settingsData.token,
        activeEntityId: settingsData.activeEntityId,
        activeEntityTypeId: settingsData.activeEntityTypeId,
        entityId: settingsData.entityId,
        selectedUmrahCompanyIds: selectedCompanyIds.join(','),
        checkByPassport: settingsData.checkByPassport,
        externalAgentCodes: settingsData.externalAgentCodes,
        syncSchedule: settingsData.syncSchedule,
      });
      setSettingsData(prev => ({ ...prev, isValid: true }));
      toast.success('Nusuk settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompany = (companyId: string) => {
    setSelectedCompanyIds(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSync = async () => {
    if (!settingsData.token) {
      toast.error('Please save a valid authorization token first');
      return;
    }

    const companiesToSync = umrahCompanies.filter(c => selectedCompanyIds.includes(c.id));
    if (companiesToSync.length === 0) {
      toast.error('Please select at least one Umrah Company to sync.');
      return;
    }

    try {
      setSyncing(true);
      let totalMismatches = 0;
      let lastSyncedAt = null;

      for (let i = 0; i < companiesToSync.length; i++) {
        const company = companiesToSync[i];
        setCurrentSyncingCompany(company.partyName);
        toast.info(`Syncing ${company.partyName} (${i + 1}/${companiesToSync.length})...`);

        // Trigger manual sync for this specific company
        const response = await nusukAPI.triggerSync(company.id);
        totalMismatches += response.data.mismatchesCount || 0;
        lastSyncedAt = response.data.syncedAt;
      }

      setSettingsData(prev => ({
        ...prev,
        isValid: true,
        lastSyncedAt: lastSyncedAt || new Date().toISOString(),
      }));

      toast.success(`Sync completed! Found ${totalMismatches} total travel detail mismatches.`);
    } catch (error: any) {
      console.error('Nusuk sync failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Synchronization failed';
      toast.error(errorMessage);
      
      if (errorMessage.toLowerCase().includes('authentication') || errorMessage.toLowerCase().includes('token')) {
        setSettingsData(prev => ({ ...prev, isValid: false }));
      }
    } finally {
      setSyncing(false);
      setCurrentSyncingCompany(null);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-indigo-600" />
              Nusuk API Integration
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              Configure Bearer token credentials to sync travel reports from Saudi Nusuk portal
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-8 max-w-4xl space-y-6">
        {/* Token warning / failure alerts */}
        {!settingsData.isValid && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800 text-sm">Authentication Failure Detected</h3>
              <p className="text-xs text-red-700 mt-1">
                The current Nusuk Authorization Bearer token has expired or is invalid. Please copy a new Bearer token from your Nusuk Portal web developer console and save it below.
              </p>
            </div>
          </div>
        )}

        {settingsData.isValid && settingsData.token && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-800 text-sm">Connection Active</h3>
              <p className="text-xs text-green-700 mt-1">
                Your Bearer token is verified as valid. Next scheduled sync runs in background.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main settings form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Authentication Credentials</CardTitle>
                <CardDescription>
                  Enter the credentials gathered from the Nusuk Portal session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4 py-4 animate-pulse">
                    <div className="h-8 bg-gray-100 rounded w-1/4"></div>
                    <div className="h-20 bg-gray-100 rounded"></div>
                    <div className="h-10 bg-gray-100 rounded"></div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="token" className="text-sm font-semibold">
                        Authorization Bearer Token *
                      </Label>
                      <textarea
                        id="token"
                        rows={6}
                        className="w-full text-xs font-mono p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="eyJraWQiOiJyc2FfZGVmYXVsdF9rZXkiLC..."
                        value={settingsData.token}
                        onChange={(e) => setSettingsData({ ...settingsData, token: e.target.value })}
                        disabled={saving || syncing}
                        required
                      />
                      <p className="text-xs text-gray-500">
                        Copy the entire 'Authorization' header string (including or excluding 'Bearer ') from the network inspection log.
                      </p>
                    </div>

                    <div className="space-y-3 p-3 bg-slate-50 border rounded-lg border-slate-100">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-slate-800">Global Fallback Credentials</Label>
                        <p className="text-[11px] text-gray-500">
                          These values are used as defaults if no company is selected below, or if a selected company does not have custom entity IDs configured.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        <div className="space-y-2">
                          <Label htmlFor="activeEntityId" className="text-xs">Active Entity ID</Label>
                          <Input
                            id="activeEntityId"
                            className="text-xs font-mono bg-white"
                            value={settingsData.activeEntityId}
                            onChange={(e) => setSettingsData({ ...settingsData, activeEntityId: e.target.value })}
                            disabled={saving || syncing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="activeEntityTypeId" className="text-xs">Active Entity Type ID</Label>
                          <Input
                            id="activeEntityTypeId"
                            className="text-xs font-mono bg-white"
                            value={settingsData.activeEntityTypeId}
                            onChange={(e) => setSettingsData({ ...settingsData, activeEntityTypeId: e.target.value })}
                            disabled={saving || syncing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="entityId" className="text-xs">Entity ID</Label>
                          <Input
                            id="entityId"
                            className="text-xs font-mono bg-white"
                            value={settingsData.entityId}
                            onChange={(e) => setSettingsData({ ...settingsData, entityId: e.target.value })}
                            disabled={saving || syncing}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-800">Umrah Companies to Sync *</Label>
                      <div className="border rounded-lg p-3 bg-white max-h-48 overflow-y-auto space-y-2">
                        {umrahCompanies.map((company) => {
                          const isSelected = selectedCompanyIds.includes(company.id);
                          return (
                            <label key={company.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleCompany(company.id)}
                                disabled={saving || syncing}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-700">{company.partyName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {company.nusukEntityId ? `Entity ID: ${company.nusukEntityId}` : 'No Entity ID set'}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                        {umrahCompanies.length === 0 && (
                          <p className="text-xs text-muted-foreground p-2 text-center">
                            No Umrah service providers found. Configure them in Masters &gt; Parties first.
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Select which Umrah Companies to run syncs for. Each company will sync with its configured Entity ID settings.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="externalAgentCodes" className="text-sm font-semibold">
                        Filter by External Agent Codes *
                      </Label>
                      <Input
                        id="externalAgentCodes"
                        className="text-xs font-mono"
                        placeholder="22282, 6655, 1001828"
                        value={settingsData.externalAgentCodes}
                        onChange={(e) => setSettingsData({ ...settingsData, externalAgentCodes: e.target.value })}
                        disabled={saving || syncing}
                        required
                      />
                      <p className="text-xs text-gray-500">
                        Enter comma-separated codes of External Agents to process (e.g. 22282, 6655, 1001828). Rows from other external agents in the Nusuk report will be ignored during synchronization.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="syncSchedule" className="text-sm font-semibold">
                        Automated Sync Schedule (Times of Day) *
                      </Label>
                      <Input
                        id="syncSchedule"
                        className="text-xs font-mono"
                        placeholder="08:00, 20:00"
                        value={settingsData.syncSchedule}
                        onChange={(e) => setSettingsData({ ...settingsData, syncSchedule: e.target.value })}
                        disabled={saving || syncing}
                        required
                      />
                      <p className="text-xs text-gray-500">
                        Enter comma-separated 24-hour times (HH:MM format) when the system should automatically fetch and sync Nusuk travel data (e.g. 08:00, 20:00).
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="checkByPassport" className="text-sm font-semibold text-slate-800">
                          Match with Passport Number
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          By default, synchronizations match solely by Group Number. Turn this on to also search by Passport Number when matching passengers.
                        </p>
                      </div>
                      <Switch
                        id="checkByPassport"
                        checked={settingsData.checkByPassport}
                        onCheckedChange={(checked) => setSettingsData({ ...settingsData, checkByPassport: checked })}
                        disabled={saving || syncing}
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={saving || syncing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Credentials
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sync control and status sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Synchronizer Status</CardTitle>
                <CardDescription>
                  Trigger report syncs and check health.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sync Type</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">Automatic & Manual</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-fetches data twice every day (every 12 hours) from Nusuk.
                  </p>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Synced</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {settingsData.lastSyncedAt 
                      ? new Date(settingsData.lastSyncedAt).toLocaleString() 
                      : 'Never'}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <Button
                    onClick={handleSync}
                    disabled={syncing || saving || loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {currentSyncingCompany ? `Syncing ${currentSyncingCompany}...` : 'Synchronizing...'}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sync Report Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manual Excel Sync</CardTitle>
                <CardDescription>
                  Upload a manually downloaded Nusuk report (.xlsx) to synchronize data directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-excel-file" className="text-xs font-semibold">
                    Select Nusuk Report (.xlsx)
                  </Label>
                  <Input
                    id="manual-excel-file"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setExcelFile(e.target.files[0]);
                      }
                    }}
                    disabled={uploadingExcel || syncing || saving}
                    className="text-xs cursor-pointer"
                  />
                </div>

                <Button
                  onClick={handleExcelUploadSync}
                  disabled={!excelFile || uploadingExcel || syncing || saving || loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 text-xs"
                >
                  {uploadingExcel ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {currentSyncingCompany ? `Syncing ${currentSyncingCompany}...` : 'Processing File...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Sync Uploaded Excel
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-amber-50/50 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Integration Notice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Authentication tokens on Nusuk expire periodically (usually every 24-48 hours). If synchronization fails, fetch a new Bearer token and update it here.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
