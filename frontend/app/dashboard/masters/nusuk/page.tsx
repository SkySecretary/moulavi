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
import { Settings, Save, Loader2, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function NusukSettingsPage() {
  const router = useRouter();
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
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

  const handleSync = async () => {
    if (!settingsData.token) {
      toast.error('Please save a valid authorization token first');
      return;
    }

    try {
      setSyncing(true);
      toast.info('Triggering report sync from Nusuk portal...');
      const response = await nusukAPI.triggerSync();
      
      setSettingsData(prev => ({
        ...prev,
        isValid: true,
        lastSyncedAt: response.data.syncedAt,
      }));
      
      toast.success(`Sync completed! Found ${response.data.mismatchesCount} mismatched travel details.`);
    } catch (error: any) {
      console.error('Nusuk sync failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Synchronization failed';
      toast.error(errorMessage);
      
      if (errorMessage.toLowerCase().includes('authentication') || errorMessage.toLowerCase().includes('token')) {
        setSettingsData(prev => ({ ...prev, isValid: false }));
      }
    } finally {
      setSyncing(false);
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="activeEntityId" className="text-xs">Active Entity ID</Label>
                        <Input
                          id="activeEntityId"
                          className="text-xs font-mono"
                          value={settingsData.activeEntityId}
                          onChange={(e) => setSettingsData({ ...settingsData, activeEntityId: e.target.value })}
                          disabled={saving || syncing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="activeEntityTypeId" className="text-xs">Active Entity Type ID</Label>
                        <Input
                          id="activeEntityTypeId"
                          className="text-xs font-mono"
                          value={settingsData.activeEntityTypeId}
                          onChange={(e) => setSettingsData({ ...settingsData, activeEntityTypeId: e.target.value })}
                          disabled={saving || syncing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="entityId" className="text-xs">Entity ID</Label>
                        <Input
                          id="entityId"
                          className="text-xs font-mono"
                          value={settingsData.entityId}
                          onChange={(e) => setSettingsData({ ...settingsData, entityId: e.target.value })}
                          disabled={saving || syncing}
                        />
                      </div>
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
                        Synchronizing...
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
