'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Building2, 
  CreditCard, 
  Save, 
  Calculator, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import api from '@/lib/api';

interface ReentryPricingConfig {
  id?: string;
  hotelFixedVisaFee: number;
  hotelPerDayCost: number;
  iqamaFixedVisaFee: number;
  iqamaPerDayCost: number;
  currency: string;
  upiId: string;
  upiMerchantName: string;
  bankAccountDetails: string;
  isActive: boolean;
}

export default function ReentryPricingMasterPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ReentryPricingConfig>({
    hotelFixedVisaFee: 2000,
    hotelPerDayCost: 200,
    iqamaFixedVisaFee: 2500,
    iqamaPerDayCost: 0,
    currency: 'INR',
    upiId: 'moulavitravels@okhdfcbank',
    upiMerchantName: 'Moulavi Travels',
    bankAccountDetails: 'Bank: HDFC Bank\nAccount: 50200088991122\nIFSC: HDFC0001234\nHolder: Moulavi Travels & Logistics',
    isActive: true,
  });

  // Simulator State
  const [simStayType, setSimStayType] = useState<'hotel' | 'iqama'>('hotel');
  const [simDays, setSimDays] = useState<number>(7);
  const [simPax, setSimPax] = useState<number>(1);
  const [simResult, setSimResult] = useState<any>(null);
  const [calculatingSim, setCalculatingSim] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reentry-pricing-master');
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setConfig({
          id: d.id,
          hotelFixedVisaFee: Number(d.hotelFixedVisaFee ?? 2000),
          hotelPerDayCost: Number(d.hotelPerDayCost ?? 200),
          iqamaFixedVisaFee: Number(d.iqamaFixedVisaFee ?? 2500),
          iqamaPerDayCost: Number(d.iqamaPerDayCost ?? 0),
          currency: d.currency || 'INR',
          upiId: d.upiId || 'moulavitravels@okhdfcbank',
          upiMerchantName: d.upiMerchantName || 'Moulavi Travels',
          bankAccountDetails: d.bankAccountDetails || '',
          isActive: d.isActive !== false,
        });
      }
    } catch (err: any) {
      toast.error('Failed to load Re-Entry Pricing settings: ' + (err.response?.data?.error || err.message));
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
      const res = await api.put('/reentry-pricing-master', config);
      if (res.data?.success) {
        toast.success('Re-Entry Pricing Master saved successfully!');
        if (res.data.data) {
          const d = res.data.data;
          setConfig((prev) => ({ ...prev, ...d }));
        }
        runSimulation();
      }
    } catch (err: any) {
      toast.error('Failed to save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    try {
      setCalculatingSim(true);
      const res = await api.post('/reentry-pricing-master/calculate', {
        stayType: simStayType,
        numberOfDays: simDays,
        passengerCount: simPax,
      });
      if (res.data?.success) {
        setSimResult(res.data.data);
      }
    } catch (err: any) {
      console.error('Simulation error:', err);
    } finally {
      setCalculatingSim(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      runSimulation();
    }
  }, [simStayType, simDays, simPax, config]);

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary flex items-center gap-3">
            <span className="p-2 bg-primary/10 rounded-xl text-primary">
              <DollarSign className="h-7 w-7" />
            </span>
            Re-Entry Visa Fee & Pricing Master
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure default and dynamic pricing formulas for 1-Year Umrah Re-Entry visa activation flows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchConfig} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2 bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Pricing'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full lg:col-span-2" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Pricing Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Hotel Stay Re-Entry Pricing */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="bg-muted/20 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-secondary">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">🏨 Hotel Reservation Re-Entry Formula</CardTitle>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                      Package Included
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Formula applied when pilgrim chooses Moulavi accommodation package (Fixed Visa Fee + Per-Day Stay Rate).
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="hotelFixedVisaFee" className="text-xs font-bold uppercase text-muted-foreground">
                      Fixed Re-Entry Visa Fee ({config.currency})
                    </Label>
                    <div className="relative">
                      <Input
                        id="hotelFixedVisaFee"
                        type="number"
                        min="0"
                        value={config.hotelFixedVisaFee}
                        onChange={(e) =>
                          setConfig({ ...config, hotelFixedVisaFee: Number(e.target.value) || 0 })
                        }
                        className="text-base font-semibold"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">
                        {config.currency}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Base Ministry activation fee (Default: 2,000 INR)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hotelPerDayCost" className="text-xs font-bold uppercase text-muted-foreground">
                      Per Day Stay / Package Rate ({config.currency})
                    </Label>
                    <div className="relative">
                      <Input
                        id="hotelPerDayCost"
                        type="number"
                        min="0"
                        value={config.hotelPerDayCost}
                        onChange={(e) =>
                          setConfig({ ...config, hotelPerDayCost: Number(e.target.value) || 0 })
                        }
                        className="text-base font-semibold"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">
                        {config.currency}/Day
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Rate multiplied by duration days (Default: 200 INR/day)</p>
                  </div>
                </CardContent>
              </Card>

              {/* Iqama Sponsor Re-Entry Pricing */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="bg-muted/20 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-secondary">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">🇸🇦 Saudi Iqama Holder Hosting Formula</CardTitle>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                      Sponsor Stay
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Formula applied when pilgrim stays at a Saudi resident sponsor's address.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="iqamaFixedVisaFee" className="text-xs font-bold uppercase text-muted-foreground">
                      Fixed Iqama Re-Entry Visa Fee ({config.currency})
                    </Label>
                    <div className="relative">
                      <Input
                        id="iqamaFixedVisaFee"
                        type="number"
                        min="0"
                        value={config.iqamaFixedVisaFee}
                        onChange={(e) =>
                          setConfig({ ...config, iqamaFixedVisaFee: Number(e.target.value) || 0 })
                        }
                        className="text-base font-semibold"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">
                        {config.currency}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">All-inclusive Iqama re-entry activation (Default: 2,500 INR)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iqamaPerDayCost" className="text-xs font-bold uppercase text-muted-foreground">
                      Iqama Additional Daily Rate ({config.currency})
                    </Label>
                    <div className="relative">
                      <Input
                        id="iqamaPerDayCost"
                        type="number"
                        min="0"
                        value={config.iqamaPerDayCost}
                        onChange={(e) =>
                          setConfig({ ...config, iqamaPerDayCost: Number(e.target.value) || 0 })
                        }
                        className="text-base font-semibold"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">
                        {config.currency}/Day
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Optional daily fee for Iqama stay (Default: 0 INR)</p>
                  </div>
                </CardContent>
              </Card>

              {/* Payment & Bank Details */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="bg-muted/20 border-b pb-4">
                  <div className="flex items-center gap-2 text-secondary">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">💳 UPI & Bank Account Payment Gateway Details</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Details displayed in the WhatsApp invoice and used to generate dynamic UPI links and QR codes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="upiId" className="text-xs font-bold text-muted-foreground">
                        Official Merchant UPI ID / VPA
                      </Label>
                      <Input
                        id="upiId"
                        value={config.upiId}
                        onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                        placeholder="moulavitravels@okhdfcbank"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upiMerchantName" className="text-xs font-bold text-muted-foreground">
                        Merchant Display Name
                      </Label>
                      <Input
                        id="upiMerchantName"
                        value={config.upiMerchantName}
                        onChange={(e) => setConfig({ ...config, upiMerchantName: e.target.value })}
                        placeholder="Moulavi Travels"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccountDetails" className="text-xs font-bold text-muted-foreground">
                      Full Bank Account Information (for NEFT / RTGS / IMPS)
                    </Label>
                    <Textarea
                      id="bankAccountDetails"
                      rows={4}
                      value={config.bankAccountDetails}
                      onChange={(e) => setConfig({ ...config, bankAccountDetails: e.target.value })}
                      placeholder="Bank: HDFC Bank&#10;Account: 50200088991122&#10;IFSC: HDFC0001234&#10;Branch: Perumbavoor"
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/10 border-t flex justify-end pt-4 pb-4">
                  <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                    <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Re-Entry Configuration'}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>

          {/* Live Simulator & Verification Box */}
          <div className="space-y-6">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card shadow-md">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Calculator className="h-5 w-5" />
                    <CardTitle className="text-base">Live Fee Simulator</CardTitle>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary font-mono rounded">
                    Real-time
                  </span>
                </div>
                <CardDescription className="text-xs">
                  Test the exact total fee and WhatsApp invoice generated for a pilgrim.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Hosting Arrangement</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={simStayType === 'hotel' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSimStayType('hotel')}
                      className="text-xs"
                    >
                      🏨 Hotel Stay
                    </Button>
                    <Button
                      type="button"
                      variant={simStayType === 'iqama' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSimStayType('iqama')}
                      className="text-xs"
                    >
                      🇸🇦 Iqama Stay
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Duration (Days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={simDays}
                      onChange={(e) => setSimDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pax (Pilgrims)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={simPax}
                      onChange={(e) => setSimPax(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </div>
                </div>

                {simResult && (
                  <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-border/60">
                      <span className="text-muted-foreground">Formula Applied:</span>
                      <span className="font-semibold text-secondary">{simResult.stayTypeLabel}</span>
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Fixed Visa Fee:</span>
                        <span className="font-mono text-secondary">₹{simResult.fixedFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration Stay Cost:</span>
                        <span className="font-mono text-secondary">
                          ₹{simResult.perDayRate}/day × {simResult.numberOfDays}d = ₹{simResult.daysCost}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price Per Pilgrim:</span>
                        <span className="font-mono text-secondary">₹{simResult.pricePerPax}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pilgrims:</span>
                        <span className="font-mono text-secondary">{simResult.passengerCount} Pax</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex justify-between items-baseline">
                      <span className="font-bold text-sm text-secondary">Invoice Total:</span>
                      <span className="text-2xl font-black text-primary font-mono">
                        ₹{simResult.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* QR Preview */}
                    {simResult.qrCodeUrl && (
                      <div className="mt-3 pt-3 border-t border-border/60 text-center space-y-2">
                        <p className="text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
                          <QrCode className="h-3.5 w-3.5" /> Generated Dynamic UPI QR:
                        </p>
                        <div className="flex justify-center">
                          <img
                            src={simResult.qrCodeUrl}
                            alt="UPI QR Code"
                            className="w-36 h-36 border rounded-lg p-1 bg-white shadow-sm"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {simResult.upiPayUrl}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-secondary">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Integration Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2.5">
                <div>
                  <p className="font-semibold text-muted-foreground">GET Re-entry Config:</p>
                  <code className="text-[11px] bg-muted px-2 py-0.5 rounded block mt-0.5 truncate">
                    /api/b2c/reentry-pricing
                  </code>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">POST Price Calculate:</p>
                  <code className="text-[11px] bg-muted px-2 py-0.5 rounded block mt-0.5 truncate">
                    /api/b2c/reentry-pricing/calculate
                  </code>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">POST WhatsApp Re-entry Booking:</p>
                  <code className="text-[11px] bg-muted px-2 py-0.5 rounded block mt-0.5 truncate">
                    /api/b2c/whatsapp-booking
                  </code>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
