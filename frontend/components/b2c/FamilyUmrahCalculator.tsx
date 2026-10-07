'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { B2CCheckoutModal } from './B2CCheckoutModal';
import {
  Users,
  Calendar,
  Sparkles,
  MapPin,
  Hotel,
  Plane,
  Car,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  HeartHandshake,
  Star,
  Award,
  Zap,
  Globe,
  Compass,
  MessageSquare,
  Moon,
  Sun,
  Flame,
} from 'lucide-react';

const CURRENCY_RATES: Record<string, { symbol: string; rate: number; flag: string }> = {
  SAR: { symbol: 'SAR', rate: 1, flag: '🇸🇦' },
  INR: { symbol: '₹', rate: 22.8, flag: '🇮🇳' },
  USD: { symbol: '$', rate: 0.266, flag: '🇺🇸' },
  AED: { symbol: 'AED', rate: 0.98, flag: '🇦🇪' },
  EUR: { symbol: '€', rate: 0.245, flag: '🇪🇺' },
};

export function FamilyUmrahCalculator() {
  // Primary Sliders
  const [persons, setPersons] = useState<number>(3); // Default 3
  const [days, setDays] = useState<number>(5); // Default 5
  const [includeMadinah, setIncludeMadinah] = useState<boolean>(false); // Default false as requested
  const [madinahSparkleTrigger, setMadinahSparkleTrigger] = useState<boolean>(false);

  // Accommodation Tier
  const [tier, setTier] = useState<'economy' | 'comfort' | 'luxury'>('comfort');
  const [currency, setCurrency] = useState<string>('SAR');
  const [checkoutOpen, setCheckoutOpen] = useState<boolean>(false);

  // Nights split
  const { makkahNights, madinahNights } = useMemo(() => {
    if (!includeMadinah) {
      return { makkahNights: days, madinahNights: 0 };
    }
    if (days <= 4) {
      return { makkahNights: days - 1, madinahNights: 1 };
    }
    if (days === 5) {
      return { makkahNights: 3, madinahNights: 2 };
    }
    if (days === 7) {
      return { makkahNights: 4, madinahNights: 3 };
    }
    if (days === 10) {
      return { makkahNights: 6, madinahNights: 4 };
    }
    if (days === 14) {
      return { makkahNights: 8, madinahNights: 6 };
    }
    const mad = Math.max(2, Math.round(days * 0.4));
    return { makkahNights: days - mad, madinahNights: mad };
  }, [days, includeMadinah]);

  // Trigger sparkle effect when Madinah is toggled ON
  const handleToggleMadinah = (checked: boolean) => {
    setIncludeMadinah(checked);
    if (checked) {
      setMadinahSparkleTrigger(true);
      setTimeout(() => setMadinahSparkleTrigger(false), 2000);
    }
  };

  // Pricing Engine Calculation
  const { totalSAR, perPersonSAR, familySavingsSAR } = useMemo(() => {
    // Tier base room rate / night (shared quad/triple for family)
    const tierRatePerNight = tier === 'luxury' ? 550 : tier === 'comfort' ? 360 : 220;
    const madinahTierRatePerNight = tier === 'luxury' ? 520 : tier === 'comfort' ? 330 : 200;

    // Room count needed for family (1 room up to 4 persons, 2 rooms for 5-8, etc.)
    const roomCount = Math.max(1, Math.ceil(persons / 4));

    // Stay Cost
    const makkahStay = makkahNights * tierRatePerNight * roomCount;
    const madinahStay = includeMadinah ? madinahNights * madinahTierRatePerNight * roomCount : 0;

    // Visa & Insurance per person
    const visaCost = 450 * persons;

    // Ground Transportation (Private family transfer or shared luxury coach)
    const transportBase = persons >= 4 ? 650 : 450;
    const madinahTransfer = includeMadinah ? (persons >= 4 ? 400 : 250) : 0;
    const transportTotal = transportBase + madinahTransfer;

    // Family bundle discount
    let discount = 0;
    if (persons >= 3 && days >= 5) {
      discount = Math.round((makkahStay + madinahStay) * 0.08 + persons * 50);
    }

    const subtotal = makkahStay + madinahStay + visaCost + transportTotal - discount;
    const total = Math.max(1000, subtotal);
    const perPerson = Math.round(total / persons);

    return {
      totalSAR: total,
      perPersonSAR: perPerson,
      familySavingsSAR: discount > 0 ? discount : 250,
    };
  }, [persons, days, includeMadinah, makkahNights, madinahNights, tier]);

  // Format currency
  const curr = CURRENCY_RATES[currency] || CURRENCY_RATES['SAR'];
  const formattedTotal = Math.round(totalSAR * curr.rate).toLocaleString();
  const formattedPerPerson = Math.round(perPersonSAR * curr.rate).toLocaleString();
  const formattedSavings = Math.round(familySavingsSAR * curr.rate).toLocaleString();

  // Dynamic Tawaf speed calculation based on days (shorter days = dynamic, longer = steady)
  const tawafSpeedClass = days <= 5 ? 'anim-tawaf-fast' : days <= 10 ? 'anim-tawaf-medium' : 'anim-tawaf-slow';

  // Count of orbiting pilgrim dots around Kaaba
  const pilgrimOrbitCount = Math.min(persons, 12);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Interactive Main Calculator Card */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-emerald-800/40 bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 text-white p-5 sm:p-8">
        
        {/* Background Decorative Islamic Geometric Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Header Ribbon & Currency Switcher */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-800/50 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider px-3 py-1 shadow-md">
                ✨ Interactive Simulator
              </Badge>
              <Badge variant="outline" className="text-emerald-300 border-emerald-600/60 bg-emerald-950/60 text-xs">
                🕋 Direct B2C Umrah Portal
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-wide">
              Family Umrah Package Calculator
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 max-w-xl">
              Slide pilgrims, adjust days, and watch the live Tawaf visualizer calculate your instant VIP package.
            </p>
          </div>

          {/* Currency Selector */}
          <div className="flex items-center gap-2 self-start sm:self-center bg-emerald-900/60 p-1.5 rounded-2xl border border-emerald-700/50 backdrop-blur-md">
            {Object.keys(CURRENCY_RATES).map((cKey) => {
              const c = CURRENCY_RATES[cKey];
              return (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => setCurrency(cKey)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    currency === cKey
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md scale-105'
                      : 'text-emerald-200/80 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{cKey}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Game-Like Dual Arena (Left: Visual Tawaf Orbit, Right: Live Cost & Checkout) */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
          
          {/* LEFT: 3D-Styled Tawaf Orbit Visualizer (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-900/60 rounded-3xl border border-emerald-700/30 backdrop-blur-md relative overflow-hidden">
            
            {/* Sparkle explosion on Madinah toggle */}
            {madinahSparkleTrigger && (
              <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
                <div className="w-full h-full bg-emerald-500/10 animate-ping rounded-3xl" />
                <div className="absolute text-amber-300 font-bold text-sm animate-bounce flex items-center gap-1 bg-slate-950/90 px-3 py-1.5 rounded-full border border-amber-400 shadow-xl">
                  ✨ Madinah Al-Munawwarah Added! 🕌
                </div>
              </div>
            )}

            {/* Visualizer Status Header */}
            <div className="flex items-center justify-between w-full mb-3 text-xs">
              <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-amber-400 animate-spin" style={{ animationDuration: '18s' }} />
                Tawaf Simulation
              </span>
              <span className="text-[11px] text-amber-300 font-mono bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                {persons} Pilgrims in Tawaf
              </span>
            </div>

            {/* Central Orbital Arena */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2 select-none">
              
              {/* Outer Day Orbit Track (Celestial Path) */}
              <div className="absolute inset-0 rounded-full border border-dashed border-emerald-600/40 opacity-70" />
              
              {/* Middle Tawaf Orbit Track */}
              <div className="absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-emerald-500/30" />
              
              {/* Inner Tawaf Track */}
              <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-amber-400/30 bg-emerald-950/30 shadow-inner" />

              {/* Central Sacred Kaaba Emblem */}
              <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-950 via-slate-900 to-black rounded-2xl border-2 border-amber-400/80 shadow-2xl flex flex-col items-center justify-center text-center anim-pulse-glow">
                {/* Gold Kiswah Band */}
                <div className="w-full h-2.5 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 absolute top-2.5 shadow-xs" />
                <span className="text-2xl select-none mt-2">🕋</span>
                <span className="text-[9px] font-bold font-display uppercase tracking-widest text-amber-300 mt-1">
                  Holy Kaaba
                </span>
              </div>

              {/* Orbiting Pilgrims Container (Counter-Clockwise Tawaf) */}
              <div className={`absolute inset-0 ${tawafSpeedClass}`}>
                {Array.from({ length: pilgrimOrbitCount }).map((_, i) => {
                  const angle = (i * 360) / pilgrimOrbitCount;
                  return (
                    <div
                      key={i}
                      className="absolute w-full h-full flex items-center justify-center"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <div
                        className="absolute -top-3 sm:-top-3.5 flex flex-col items-center justify-center anim-counter-rotate"
                        title={`Pilgrim #${i + 1}`}
                      >
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 font-bold text-[10px] flex items-center justify-center shadow-lg ring-2 ring-emerald-400/50 hover:scale-125 transition-transform">
                          👤
                        </div>
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping mt-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Madinah Green Dome Aura Indicator (When toggled) */}
              {includeMadinah && (
                <div className="absolute -bottom-2 right-0 z-20 bg-gradient-to-br from-emerald-800 to-teal-900 text-emerald-100 px-3 py-1.5 rounded-2xl border border-emerald-400/60 shadow-xl flex items-center gap-1.5 text-xs anim-float">
                  <span className="text-base">🕌</span>
                  <div>
                    <strong className="block text-[11px] font-bold text-amber-300 leading-tight">Madinah Included</strong>
                    <span className="text-[9px] text-emerald-200">{madinahNights} Blessed Nights</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Live Snapshot Badge */}
            <div className="w-full mt-3 pt-3 border-t border-emerald-800/40 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-emerald-950/70 p-2 rounded-xl border border-emerald-700/40">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Stay in Makkah</span>
                <strong className="text-amber-300 text-xs">{makkahNights} Nights (Haram)</strong>
              </div>
              <div className="bg-emerald-950/70 p-2 rounded-xl border border-emerald-700/40">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Stay in Madinah</span>
                <strong className="text-emerald-300 text-xs">
                  {includeMadinah ? `${madinahNights} Nights` : '0 Nights'}
                </strong>
              </div>
            </div>
          </div>

          {/* RIGHT: Dynamic Sliders & Real-Time Price Deck (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Control 1: Persons Slider (Default 3) */}
            <div className="p-4 sm:p-5 bg-slate-900/70 rounded-2xl border border-emerald-700/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-400/10 text-amber-400 rounded-xl">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-white flex items-center gap-2">
                      Number of Pilgrims (Family Members)
                    </Label>
                    <span className="text-xs text-emerald-300/80">
                      {persons === 1 ? 'Individual Solo Traveler' : persons === 2 ? 'Couple Pilgrimage' : `Family Group of ${persons} Persons`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-amber-400/20 px-3.5 py-1.5 rounded-xl border border-amber-400/40">
                  <span className="text-xl font-bold font-mono text-amber-300">{persons}</span>
                  <span className="text-[11px] font-semibold text-amber-200 uppercase">Pax</span>
                </div>
              </div>

              {/* Slider Track */}
              <div className="space-y-1 pt-1">
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={persons}
                  onChange={(e) => setPersons(parseInt(e.target.value, 10))}
                  className="w-full h-2.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-amber-400 transition-all hover:brightness-110"
                />
                <div className="flex justify-between text-[10px] text-emerald-400/70 font-mono">
                  <span>1 Person</span>
                  <span>3 (Default)</span>
                  <span>6 Family</span>
                  <span>10+ Group</span>
                  <span>15 Max</span>
                </div>
              </div>

              {/* Quick Chip Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'Solo (1)', val: 1 },
                  { label: 'Couple (2)', val: 2 },
                  { label: 'Small Family (3)', val: 3 },
                  { label: 'Family (4)', val: 4 },
                  { label: 'Large Family (6)', val: 6 },
                  { label: 'Group (10)', val: 10 },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => setPersons(chip.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      persons === chip.val
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                        : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-800/60 border border-emerald-700/40'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 2: Days Slider (Default 5) */}
            <div className="p-4 sm:p-5 bg-slate-900/70 rounded-2xl border border-emerald-700/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-400/10 text-emerald-400 rounded-xl">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-white flex items-center gap-2">
                      Total Duration (Days of Stay)
                    </Label>
                    <span className="text-xs text-emerald-300/80">
                      {days} Days / {days - 1} Nights in Holy Cities
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-emerald-400/20 px-3.5 py-1.5 rounded-xl border border-emerald-400/40">
                  <span className="text-xl font-bold font-mono text-emerald-300">{days}</span>
                  <span className="text-[11px] font-semibold text-emerald-200 uppercase">Days</span>
                </div>
              </div>

              {/* Slider Track */}
              <div className="space-y-1 pt-1">
                <input
                  type="range"
                  min="3"
                  max="28"
                  step="1"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value, 10))}
                  className="w-full h-2.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-400 transition-all hover:brightness-110"
                />
                <div className="flex justify-between text-[10px] text-emerald-400/70 font-mono">
                  <span>3 Days</span>
                  <span>5 (Express)</span>
                  <span>7 (Classic)</span>
                  <span>14 (Sunnah)</span>
                  <span>21+ (Ramadan)</span>
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: '5 Days Express', val: 5 },
                  { label: '7 Days Classic', val: 7 },
                  { label: '10 Days Comfort', val: 10 },
                  { label: '14 Days Complete', val: 14 },
                  { label: '21 Days Extended', val: 21 },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => setDays(chip.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      days === chip.val
                        ? 'bg-emerald-400 text-slate-950 font-bold shadow-xs'
                        : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-800/60 border border-emerald-700/40'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 3: Madinah Visit Switch (With Sparkling Animation) */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
              includeMadinah
                ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 border-emerald-400/60 shadow-lg ring-1 ring-emerald-400/30'
                : 'bg-slate-900/70 border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center text-lg shadow-inner">
                  🕌
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      Include Madinah Al-Munawwarah Visit
                    </span>
                    {includeMadinah && (
                      <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full animate-pulse">
                        + {madinahNights} Nights
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-200/80">
                    Visit Al-Masjid an-Nabawi & Rawdah Sharifah with intercity transfer included.
                  </p>
                </div>
              </div>

              <Switch
                checked={includeMadinah}
                onCheckedChange={handleToggleMadinah}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            {/* Control 4: Hotel Luxury Tier Selector */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { key: 'economy', label: '3★ Economy', desc: 'Haram Shuttle' },
                { key: 'comfort', label: '4★ Comfort', desc: 'Central Walking' },
                { key: 'luxury', label: '5★ Luxury VIP', desc: 'Front-Row View' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTier(t.key as any)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    tier === t.key
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border-amber-300 font-bold shadow-md scale-102'
                      : 'bg-slate-900/60 text-emerald-200/90 border-emerald-800/50 hover:border-emerald-600'
                  }`}
                >
                  <span className="block text-xs font-bold">{t.label}</span>
                  <span className={`block text-[10px] ${tier === t.key ? 'text-slate-900' : 'text-slate-400'}`}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Financial Summary & CTA Arena */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900/90 via-teal-950 to-slate-900 border-2 border-amber-400/60 shadow-xl space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider block">
                    Estimated Total Family Package ({persons} Pax)
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl sm:text-4xl font-bold font-mono text-amber-300 drop-shadow-md">
                      {curr.symbol} {formattedTotal}
                    </span>
                    <span className="text-xs text-emerald-200/80 font-medium">
                      ({curr.symbol} {formattedPerPerson} / pilgrim)
                    </span>
                  </div>
                </div>

                <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-xs px-3 py-1.5 self-start sm:self-center font-bold">
                  🎉 Family Bundle Saves {curr.symbol} {formattedSavings}
                </Badge>
              </div>

              {/* Inclusions Pill Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-800/60 text-[11px] text-emerald-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                  Official Umrah Visa
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                  Medical Insurance
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                  {calculatorDataInclusions(tier)}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                  Private Transfers
                </span>
              </div>

              {/* Large High-Converting CTA */}
              <Button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                className="w-full h-12 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold text-sm sm:text-base rounded-xl shadow-lg transition-transform hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <Sparkles className="h-5 w-5 text-slate-950" />
                Customize Flights, Hotels & Book Package Now
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal Dialog */}
      <B2CCheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        calculatorData={{
          persons,
          days,
          includeMadinah,
          makkahNights,
          madinahNights,
          tier,
          currency,
          totalAmount: totalSAR * curr.rate,
          perPersonAmount: perPersonSAR * curr.rate,
        }}
      />
    </div>
  );
}

function calculatorDataInclusions(tier: string) {
  if (tier === 'luxury') return '5★ Haram View Hotel';
  if (tier === 'comfort') return '4★ Walking Hotel';
  return '3★ Standard Hotel';
}
