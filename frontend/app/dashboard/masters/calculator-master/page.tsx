'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Calculator, 
  Building2, 
  Users, 
  Calendar, 
  BedDouble, 
  Save, 
  RotateCcw, 
  Coins, 
  Sparkles,
  Plane,
  ShieldCheck,
  Percent
} from 'lucide-react';
import api from '@/lib/api';

interface CalculatorMasterConfig {
  id?: string;
  defaultPersons: number;
  minPersons: number;
  maxPersons: number;
  defaultDays: number;
  minDays: number;
  maxDays: number;
  defaultRooms: number;
  minRooms: number;
  maxRooms: number;
  defaultCurrency: string;
  defaultTier: string;
  visaFeeSAR: number;
  economyMakkahRateSAR: number;
  comfortMakkahRateSAR: number;
  luxuryMakkahRateSAR: number;
  economyMadinahRateSAR: number;
  comfortMadinahRateSAR: number;
  luxuryMadinahRateSAR: number;
  transportBaseSAR: number;
  transportGroupSAR: number;
  madinahTransferSAR: number;
  madinahTransferGroupSAR: number;
  discountPercentage: number;
  sarToInrRate: number;
  sarToUsdRate: number;
  sarToAedRate: number;
  sarToEurRate: number;
  sarToGbpRate: number;
  isActive: boolean;
}

const DEFAULT_CONFIG: CalculatorMasterConfig = {
  defaultPersons: 1,
  minPersons: 1,
  maxPersons: 50,
  defaultDays: 1,
  minDays: 1,
  maxDays: 30,
  defaultRooms: 1,
  minRooms: 1,
  maxRooms: 20,
  defaultCurrency: 'INR',
  defaultTier: 'comfort',
  visaFeeSAR: 450,
  economyMakkahRateSAR: 220,
  comfortMakkahRateSAR: 360,
  luxuryMakkahRateSAR: 550,
  economyMadinahRateSAR: 200,
  comfortMadinahRateSAR: 330,
  luxuryMadinahRateSAR: 520,
  transportBaseSAR: 450,
  transportGroupSAR: 650,
  madinahTransferSAR: 250,
  madinahTransferGroupSAR: 400,
  discountPercentage: 9,
  sarToInrRate: 22.8,
  sarToUsdRate: 0.266,
  sarToAedRate: 0.98,
  sarToEurRate: 0.245,
  sarToGbpRate: 0.21,
  isActive: true,
};

export default function CalculatorMasterPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [config, setConfig] = useState<CalculatorMasterConfig>(DEFAULT_CONFIG);

  // Live Simulator state
  const [simPax, setSimPax] = useState(1);
  const [simDays, setSimDays] = useState(1);
  const [simRooms, setSimRooms] = useState(1);
  const [simMadinah, setSimMadinah] = useState(false);
  const [simTier, setSimTier] = useState<'economy' | 'comfort' | 'luxury'>('comfort');
  const [simCurrency, setSimCurrency] = useState('INR');

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/calculator-master');
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setConfig({
          id: d.id,
          defaultPersons: Number(d.defaultPersons ?? 1),
          minPersons: Number(d.minPersons ?? 1),
          maxPersons: Number(d.maxPersons ?? 50),
          defaultDays: Number(d.defaultDays ?? 1),
          minDays: Number(d.minDays ?? 1),
          maxDays: Number(d.maxDays ?? 30),
          defaultRooms: Number(d.defaultRooms ?? 1),
          minRooms: Number(d.minRooms ?? 1),
          maxRooms: Number(d.maxRooms ?? 20),
          defaultCurrency: d.defaultCurrency || 'INR',
          defaultTier: d.defaultTier || 'comfort',
          visaFeeSAR: Number(d.visaFeeSAR ?? 450),
          economyMakkahRateSAR: Number(d.economyMakkahRateSAR ?? 220),
          comfortMakkahRateSAR: Number(d.comfortMakkahRateSAR ?? 360),
          luxuryMakkahRateSAR: Number(d.luxuryMakkahRateSAR ?? 550),
          economyMadinahRateSAR: Number(d.economyMadinahRateSAR ?? 200),
          comfortMadinahRateSAR: Number(d.comfortMadinahRateSAR ?? 330),
          luxuryMadinahRateSAR: Number(d.luxuryMadinahRateSAR ?? 520),
          transportBaseSAR: Number(d.transportBaseSAR ?? 450),
          transportGroupSAR: Number(d.transportGroupSAR ?? 650),
          madinahTransferSAR: Number(d.madinahTransferSAR ?? 250),
          madinahTransferGroupSAR: Number(d.madinahTransferGroupSAR ?? 400),
          discountPercentage: Number(d.discountPercentage ?? 9),
          sarToInrRate: Number(d.sarToInrRate ?? 22.8),
          sarToUsdRate: Number(d.sarToUsdRate ?? 0.266),
          sarToAedRate: Number(d.sarToAedRate ?? 0.98),
          sarToEurRate: Number(d.sarToEurRate ?? 0.245),
          sarToGbpRate: Number(d.sarToGbpRate ?? 0.21),
          isActive: d.isActive !== false,
        });
        setSimPax(Number(d.defaultPersons ?? 1));
        setSimDays(Number(d.defaultDays ?? 1));
        setSimRooms(Number(d.defaultRooms ?? 1));
        setSimCurrency(d.defaultCurrency || 'INR');
        setSimTier((d.defaultTier as any) || 'comfort');
      }
    } catch (err: any) {
      toast.error('Failed to load Umrah Calculator settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/calculator-master', config);
      if (res.data?.success) {
        toast.success('Umrah Calculator Master saved successfully!');
        if (res.data.data) {
          setConfig((prev) => ({ ...prev, ...res.data.data }));
        }
      }
    } catch (err: any) {
      toast.error('Failed to save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all calculator defaults to system factory settings?')) return;
    try {
      setResetting(true);
      const res = await api.post('/calculator-master/reset');
      if (res.data?.success) {
        toast.success('Calculator settings reset to factory defaults!');
        if (res.data.data) {
          setConfig(res.data.data);
        }
      }
    } catch (err: any) {
      toast.error('Failed to reset: ' + (err.response?.data?.error || err.message));
    } finally {
      setResetting(false);
    }
  };

  // Live Simulator Calculation
  const simRates: Record<string, { symbol: string; rate: number }> = {
    INR: { symbol: '₹', rate: config.sarToInrRate },
    SAR: { symbol: 'SAR', rate: 1 },
    USD: { symbol: '$', rate: config.sarToUsdRate },
    AED: { symbol: 'AED', rate: config.sarToAedRate },
    EUR: { symbol: '€', rate: config.sarToEurRate },
    GBP: { symbol: '£', rate: config.sarToGbpRate },
  };

  const makkahNights = simMadinah ? (simDays <= 4 ? Math.max(1, simDays - 1) : Math.max(1, Math.round(simDays * 0.6))) : simDays;
  const madinahNights = simMadinah ? Math.max(1, simDays - makkahNights) : 0;

  const makkahRate = simTier === 'luxury' ? config.luxuryMakkahRateSAR : simTier === 'comfort' ? config.comfortMakkahRateSAR : config.economyMakkahRateSAR;
  const madinahRate = simTier === 'luxury' ? config.luxuryMadinahRateSAR : simTier === 'comfort' ? config.comfortMadinahRateSAR : config.economyMadinahRateSAR;

  const makkahHotelCost = makkahNights * makkahRate * simRooms;
  const madinahHotelCost = madinahNights * madinahRate * simRooms;
  const visaCost = config.visaFeeSAR * simPax;
  const transportCost = (simPax >= 4 ? config.transportGroupSAR : config.transportBaseSAR) + (simMadinah ? (simPax >= 4 ? config.madinahTransferGroupSAR : config.madinahTransferSAR) : 0);

  let discount = 0;
  if (simPax >= 3 && simDays >= 5) {
    discount = Math.round((makkahHotelCost + madinahHotelCost) * (config.discountPercentage / 100) + simPax * 60);
  } else {
    discount = Math.round(simPax * 40);
  }

  const subtotalSAR = makkahHotelCost + madinahHotelCost + visaCost + transportCost - discount;
  const simTotalSAR = Math.max(400, subtotalSAR);
  const simPerPersonSAR = Math.round(simTotalSAR / simPax);
  const curr = simRates[simCurrency] || simRates.INR;
  const simTotalFormatted = Math.round(simTotalSAR * curr.rate).toLocaleString();
  const simPerPersonFormatted = Math.round(simPerPersonSAR * curr.rate).toLocaleString();

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600/10 text-emerald-700 rounded-xl">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Umrah Package Calculator Master
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Control slider limits, default start values (1 pax, 1 day, 1 room, INR), hotel tier rates, and currency exchange factors.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleReset} 
            disabled={resetting || saving}
            className="text-slate-600 hover:text-red-600 gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            {resetting ? 'Resetting...' : 'Factory Reset'}
          </Button>
          <Button 
            type="button" 
            size="sm" 
            onClick={handleSave} 
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* SECTION 1: SLIDER DEFAULTS & BOUNDS */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/80 border-b pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Users className="h-4 w-4 text-emerald-600" />
                Slider Defaults &amp; Limits
              </CardTitle>
              <CardDescription className="text-xs">
                Starting values when visitor opens the calculator app.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              
              {/* Persons Slider Bounds */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Pilgrims (Persons)</span>
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                    Default: {config.defaultPersons}
                  </span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">Min</span>
                    <Input 
                      type="number" 
                      min="1"
                      value={config.minPersons}
                      onChange={(e) => setConfig({ ...config, minPersons: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">Default</span>
                    <Input 
                      type="number" 
                      min={config.minPersons}
                      max={config.maxPersons}
                      value={config.defaultPersons}
                      onChange={(e) => setConfig({ ...config, defaultPersons: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs font-mono font-bold text-emerald-700 bg-emerald-50/50"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">Max</span>
                    <Input 
                      type="number" 
                      value={config.maxPersons}
                      onChange={(e) => setConfig({ ...config, maxPersons: parseInt(e.target.value) || 50 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Days Slider Bounds */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Duration (Days / Nights)</span>
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                    Default: {config.defaultDays}
                  </span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">Min</span>
                    <Input 
                      type="number" 
                      min="1"
                      value={config.minDays}
                      onChange={(e) => setConfig({ ...config, minDays: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">Default</span>
                    <Input 
                      type="number" 
                      min={config.minDays}
                      max={config.maxDays}
                      value={config.defaultDays}
                      onChange={(e) => setConfig({ ...config, defaultDays: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs font-mono font-bold text-emerald-700 bg-emerald-50/50"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">Max</span>
                    <Input 
                      type="number" 
                      value={config.maxDays}
                      onChange={(e) => setConfig({ ...config, maxDays: parseInt(e.target.value) || 30 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Rooms Slider Bounds */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Hotel Rooms</span>
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                    Default: {config.defaultRooms}
                  </span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">Min</span>
                    <Input 
                      type="number" 
                      min="1"
                      value={config.minRooms}
                      onChange={(e) => setConfig({ ...config, minRooms: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">Default</span>
                    <Input 
                      type="number" 
                      min={config.minRooms}
                      max={config.maxRooms}
                      value={config.defaultRooms}
                      onChange={(e) => setConfig({ ...config, defaultRooms: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs font-mono font-bold text-emerald-700 bg-emerald-50/50"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">Max</span>
                    <Input 
                      type="number" 
                      value={config.maxRooms}
                      onChange={(e) => setConfig({ ...config, maxRooms: parseInt(e.target.value) || 20 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Default Currency & Tier */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="font-semibold text-slate-700">Default Currency</Label>
                  <Select 
                    value={config.defaultCurrency} 
                    onValueChange={(val) => setConfig({ ...config, defaultCurrency: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">🇮🇳 INR (₹)</SelectItem>
                      <SelectItem value="SAR">🇸🇦 SAR (SAR)</SelectItem>
                      <SelectItem value="USD">🇺🇸 USD ($)</SelectItem>
                      <SelectItem value="AED">🇦🇪 AED (AED)</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR (€)</SelectItem>
                      <SelectItem value="GBP">🇬🇧 GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold text-slate-700">Default Hotel Tier</Label>
                  <Select 
                    value={config.defaultTier} 
                    onValueChange={(val) => setConfig({ ...config, defaultTier: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">Economy (3★)</SelectItem>
                      <SelectItem value="comfort">Comfort (4★)</SelectItem>
                      <SelectItem value="luxury">Luxury VIP (5★)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* SECTION 2: HOTEL RATES & SERVICE BASE COSTS (SAR) */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/80 border-b pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Hotel Tier Rates &amp; Visa Fees (SAR)
              </CardTitle>
              <CardDescription className="text-xs">
                Base prices in SAR multiplied by room count and duration.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              
              {/* Makkah Hotel Nightly Rates */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  Makkah Room Rate / Night (SAR)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">Economy 3★</span>
                    <Input 
                      type="number" 
                      value={config.economyMakkahRateSAR}
                      onChange={(e) => setConfig({ ...config, economyMakkahRateSAR: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Comfort 4★</span>
                    <Input 
                      type="number" 
                      value={config.comfortMakkahRateSAR}
                      onChange={(e) => setConfig({ ...config, comfortMakkahRateSAR: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Luxury 5★</span>
                    <Input 
                      type="number" 
                      value={config.luxuryMakkahRateSAR}
                      onChange={(e) => setConfig({ ...config, luxuryMakkahRateSAR: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Madinah Hotel Nightly Rates */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  Madinah Room Rate / Night (SAR)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">Economy 3★</span>
                    <Input 
                      type="number" 
                      value={config.economyMadinahRateSAR}
                      onChange={(e) => setConfig({ ...config, economyMadinahRateSAR: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Comfort 4★</span>
                    <Input 
                      type="number" 
                      value={config.comfortMadinahRateSAR}
                      onChange={(e) => setConfig({ ...config, comfortMadinahRateSAR: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Luxury 5★</span>
                    <Input 
                      type="number" 
                      value={config.luxuryMadinahRateSAR}
                      onChange={(e) => setConfig({ ...config, luxuryMadinahRateSAR: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Visa & Transfers */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="font-semibold text-slate-700">Visa Fee / Pax (SAR)</Label>
                  <Input 
                    type="number" 
                    value={config.visaFeeSAR}
                    onChange={(e) => setConfig({ ...config, visaFeeSAR: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-semibold text-slate-700">Family Discount (%)</Label>
                  <Input 
                    type="number" 
                    value={config.discountPercentage}
                    onChange={(e) => setConfig({ ...config, discountPercentage: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Transport Costs */}
              <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border text-[11px] text-slate-600">
                <div className="flex justify-between items-center py-0.5">
                  <span>Base Transfer (1-3 Pax):</span>
                  <Input 
                    type="number" 
                    value={config.transportBaseSAR}
                    onChange={(e) => setConfig({ ...config, transportBaseSAR: parseFloat(e.target.value) || 0 })}
                    className="w-20 h-6 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Group Transfer (4+ Pax):</span>
                  <Input 
                    type="number" 
                    value={config.transportGroupSAR}
                    onChange={(e) => setConfig({ ...config, transportGroupSAR: parseFloat(e.target.value) || 0 })}
                    className="w-20 h-6 text-xs font-mono text-right"
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* SECTION 3: EXCHANGE RATES & LIVE SIMULATOR */}
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/80 border-b pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <Coins className="h-4 w-4 text-emerald-600" />
                  Live Currency Exchange Factors
                </CardTitle>
                <CardDescription className="text-xs">
                  Multiplier per 1 SAR (Saudi Riyal)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="font-semibold text-slate-700">1 SAR = INR (₹)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={config.sarToInrRate}
                      onChange={(e) => setConfig({ ...config, sarToInrRate: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono font-bold text-emerald-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-semibold text-slate-700">1 SAR = USD ($)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      value={config.sarToUsdRate}
                      onChange={(e) => setConfig({ ...config, sarToUsdRate: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-semibold text-slate-700">1 SAR = AED (Dirham)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={config.sarToAedRate}
                      onChange={(e) => setConfig({ ...config, sarToAedRate: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-semibold text-slate-700">1 SAR = EUR (€)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      value={config.sarToEurRate}
                      onChange={(e) => setConfig({ ...config, sarToEurRate: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* LIVE SIMULATOR PREVIEW CARD */}
            <Card className="border-emerald-500 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 text-white shadow-lg">
              <CardHeader className="pb-2 border-b border-emerald-800/60">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-300">
                    <Sparkles className="h-4 w-4" />
                    Interactive Calculator Preview
                  </CardTitle>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Live Engine
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {/* Simulator controls */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-emerald-300">Pax: {simPax}</span>
                    <input 
                      type="range" 
                      min={config.minPersons} 
                      max={Math.min(10, config.maxPersons)} 
                      value={simPax} 
                      onChange={(e) => setSimPax(parseInt(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-300">Days: {simDays}</span>
                    <input 
                      type="range" 
                      min={config.minDays} 
                      max={Math.min(14, config.maxDays)} 
                      value={simDays} 
                      onChange={(e) => setSimDays(parseInt(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-300">Rooms: {simRooms}</span>
                    <input 
                      type="range" 
                      min={config.minRooms} 
                      max={Math.min(6, config.maxRooms)} 
                      value={simRooms} 
                      onChange={(e) => setSimRooms(parseInt(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400">Total Price:</span>
                    <div className="text-xl font-black text-amber-300">
                      {simTotalFormatted} {curr.symbol}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Per Pilgrim:</span>
                    <div className="text-sm font-bold text-emerald-400">
                      ~{simPerPersonFormatted} {curr.symbol}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </form>
    </div>
  );
}
