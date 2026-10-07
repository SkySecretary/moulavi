import { useState, useMemo, useEffect, useRef } from 'react';

import {
  Users,
  Calendar,
  Building,
  ShieldCheck,
  ChevronRight,
  Zap,
  Sparkles,
  Gift,
  Award,
  X,
  Volume2,
  VolumeX,
  ArrowLeft
} from 'lucide-react';

const CURRENCY_RATES: Record<string, { symbol: string; rate: number; label: string; flag: string }> = {
  SAR: { symbol: 'SAR', rate: 1, label: '🇸🇦 SAR (Saudi Riyal)', flag: '🇸🇦' },
  INR: { symbol: '₹', rate: 22.8, label: '🇮🇳 INR (Indian Rupee)', flag: '🇮🇳' },
  USD: { symbol: '$', rate: 0.266, label: '🇺🇸 USD (US Dollar)', flag: '🇺🇸' },
  AED: { symbol: 'AED', rate: 0.98, label: '🇦🇪 AED (UAE Dirham)', flag: '🇦🇪' },
  EUR: { symbol: '€', rate: 0.245, label: '🇪🇺 EUR (Euro)', flag: '🇪🇺' },
  GBP: { symbol: '£', rate: 0.21, label: '🇬🇧 GBP (British Pound)', flag: '🇬🇧' },
};

export interface CalculatorPackageParams {
  persons: number;
  days: number;
  makkahNights: number;
  madinahNights: number;
  includeMadinah: boolean;
  tier: 'economy' | 'comfort' | 'luxury';
  totalSAR: number;
  perPersonSAR: number;
}

interface FamilyUmrahCalculatorProps {
  onProceedToBooking?: (params: CalculatorPackageParams) => void;
  onBackToPortal?: () => void;
}

export function FamilyUmrahCalculator({ onProceedToBooking, onBackToPortal }: FamilyUmrahCalculatorProps) {
  // Primary Sliders
  const [persons, setPersons] = useState<number>(3); // Default 3
  const [days, setDays] = useState<number>(5); // Default 5
  const [includeMadinah, setIncludeMadinah] = useState<boolean>(false); // Default false
  const [madinahSparkleTrigger, setMadinahSparkleTrigger] = useState<boolean>(false);

  // Accommodation Tier & Currency
  const [tier, setTier] = useState<'economy' | 'comfort' | 'luxury'>('comfort');
  const [currency, setCurrency] = useState<string>('SAR');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Instant Price Popup Modal State
  const [showPriceModal, setShowPriceModal] = useState<boolean>(false);
  const isInitialMount = useRef<boolean>(true);

  // Audio synthesizer using Web Audio API
  const playChime = (freq: number = 540, type: OscillatorType = 'sine', duration: number = 0.25) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context blocked
    }
  };

  // Nights split calculation
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

  // Handle Madinah Toggle
  const handleToggleMadinah = (checked: boolean) => {
    setIncludeMadinah(checked);
    if (checked) {
      playChime(784, 'triangle', 0.45);
      setMadinahSparkleTrigger(true);
      setTimeout(() => setMadinahSparkleTrigger(false), 2400);
    } else {
      playChime(350, 'sine', 0.2);
    }
    triggerPopupModal();
  };

  // Trigger popup when sliders or options change (after initial mount)
  const triggerPopupModal = () => {
    if (isInitialMount.current) return;
    setShowPriceModal(true);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
  }, []);

  // Pricing Engine Calculation
  const { totalSAR, perPersonSAR, familySavingsSAR } = useMemo(() => {
    const tierRatePerNight = tier === 'luxury' ? 550 : tier === 'comfort' ? 360 : 220;
    const madinahTierRatePerNight = tier === 'luxury' ? 520 : tier === 'comfort' ? 330 : 200;

    const roomCount = Math.max(1, Math.ceil(persons / 4));
    const makkahStay = makkahNights * tierRatePerNight * roomCount;
    const madinahStay = includeMadinah ? madinahNights * madinahTierRatePerNight * roomCount : 0;

    const visaCost = 450 * persons;
    const transportBase = persons >= 4 ? 650 : 450;
    const madinahTransfer = includeMadinah ? (persons >= 4 ? 400 : 250) : 0;
    const transportTotal = transportBase + madinahTransfer;

    let discount = 0;
    if (persons >= 3 && days >= 5) {
      discount = Math.round((makkahStay + madinahStay) * 0.09 + persons * 60);
    } else {
      discount = Math.round(persons * 40);
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

  // Dynamic Tawaf speed based on days
  const tawafDuration = days <= 5 ? '8s' : days <= 10 ? '13s' : '18s';
  const pilgrimOrbitCount = Math.min(persons, 10);

  const handleBookNow = () => {
    if (onProceedToBooking) {
      onProceedToBooking({
        persons,
        days,
        makkahNights,
        madinahNights,
        includeMadinah,
        tier,
        totalSAR,
        perPersonSAR
      });
    }
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        maxWidth: '780px', 
        margin: '0 auto', 
        padding: '0.5rem', 
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      {/* Top App Control Bar */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '0.5rem', 
          marginBottom: '1rem',
          padding: '0.6rem 0.9rem',
          background: 'rgba(3, 20, 14, 0.85)',
          borderRadius: '16px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          backdropFilter: 'blur(12px)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onBackToPortal && (
            <button
              type="button"
              onClick={onBackToPortal}
              title="Return to Main Booking Portal"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#a7f3d0',
                padding: '0.4rem 0.65rem',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🕋</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              Family Umrah App
            </span>
          </div>
        </div>

        {/* Right controls: Sound Toggle + Currency Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            style={{
              background: 'rgba(6, 78, 59, 0.6)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: soundEnabled ? '#fbbf24' : '#6b7280',
              padding: '0.4rem',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Compact Currency Dropdown */}
          <select
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              playChime(620, 'sine', 0.2);
            }}
            style={{
              padding: '0.4rem 0.6rem',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#02120b',
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
            }}
          >
            {Object.keys(CURRENCY_RATES).map((cKey) => (
              <option key={cKey} value={cKey} style={{ color: '#000000', background: '#ffffff' }}>
                {CURRENCY_RATES[cKey].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Glass Game Arena */}
      <div 
        style={{
          position: 'relative',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.55), 0 0 40px rgba(19, 92, 70, 0.25)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          background: 'linear-gradient(180deg, #02120b 0%, #05261b 45%, #02100a 100%)',
          color: '#ffffff',
          padding: '1.25rem 1rem',
          boxSizing: 'border-box'
        }}
      >
        {/* Ambient Top Glow */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '380px',
            height: '260px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* ========================================================
            SECTION 1: BIG CENTRAL KAABA & TAWAF ORBIT VISUALIZER
            ======================================================== */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem 0 1.25rem 0',
            position: 'relative'
          }}
        >
          {/* Sparkle celebration on Madinah toggle */}
          {madinahSparkleTrigger && (
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'sparkleBurst 2.2s ease-out forwards'
              }}
            >
              <div 
                style={{
                  backgroundColor: 'rgba(3, 18, 12, 0.95)',
                  color: '#fef08a',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '50px',
                  border: '2px solid #facc15',
                  boxShadow: '0 0 30px rgba(250, 204, 21, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  textAlign: 'center'
                }}
              >
                <Sparkles className="h-5 w-5 text-amber-300 animate-spin" />
                🕌 Madinah Added! (+{madinahNights} Nights) ✨
              </div>
            </div>
          )}

          {/* Tawaf Status Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <span 
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Sparkles className="h-3 w-3" />
              Tawaf Visualizer &bull; {persons} Pilgrims Circling
            </span>
          </div>

          {/* Central Big Orbital Tawaf Arena */}
          <div 
            style={{
              position: 'relative',
              width: 'min(270px, 76vw)',
              height: 'min(270px, 76vw)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              margin: '0.25rem auto'
            }}
          >
            {/* Outer Orbit Ring */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px dashed rgba(52, 211, 153, 0.35)',
                boxShadow: 'inset 0 0 15px rgba(16, 185, 129, 0.08)'
              }} 
            />
            
            {/* Middle Orbit Ring */}
            <div 
              style={{
                position: 'absolute',
                width: '76%',
                height: '76%',
                borderRadius: '50%',
                border: '2px solid rgba(16, 185, 129, 0.3)'
              }} 
            />
            
            {/* Inner Ring */}
            <div 
              style={{
                position: 'absolute',
                width: '55%',
                height: '55%',
                borderRadius: '50%',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                backgroundColor: 'rgba(6, 78, 59, 0.15)'
              }} 
            />

            {/* BIG SACRED KAABA IN CENTER */}
            <div 
              style={{
                position: 'relative',
                zIndex: 10,
                width: 'min(92px, 26vw)',
                height: 'min(92px, 26vw)',
                background: 'linear-gradient(135deg, #09090b 0%, #1c1917 50%, #000000 100%)',
                borderRadius: '18px',
                border: '2.5px solid rgba(251, 191, 36, 0.9)',
                boxShadow: '0 0 30px rgba(251, 191, 36, 0.4), 0 10px 25px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                animation: 'pulseGlow 3.5s ease-in-out infinite'
              }}
            >
              {/* Gold Kiswah Band */}
              <div 
                style={{
                  width: '100%',
                  height: '10px',
                  background: 'linear-gradient(90deg, #fcd34d 0%, #fef08a 50%, #f59e0b 100%)',
                  position: 'absolute',
                  top: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.6)'
                }} 
              />
              <span style={{ fontSize: '1.9rem', marginTop: '0.65rem' }}>🕋</span>
              <span style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#fcd34d', marginTop: '0.1rem' }}>
                Holy Kaaba
              </span>
            </div>

            {/* Orbiting Pilgrims (Counter-Clockwise Tawaf) */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                animation: `tawafCounterClockwise ${tawafDuration} linear infinite`
              }}
            >
              {Array.from({ length: pilgrimOrbitCount }).map((_, i) => {
                const angle = (i * 360) / pilgrimOrbitCount;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: `rotate(${angle}deg)`
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '-12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: `counterRotate ${tawafDuration} linear infinite`
                      }}
                      title={`Pilgrim #${i + 1}`}
                    >
                      <div 
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 100%)',
                          color: '#02120b',
                          fontWeight: 800,
                          fontSize: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
                          border: '1.5px solid rgba(52, 211, 153, 0.9)'
                        }}
                      >
                        👤
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Madinah Indicator (When selected) */}
            {includeMadinah && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  zIndex: 20,
                  background: 'linear-gradient(135deg, #065f46 0%, #115e59 100%)',
                  color: '#e6fffa',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '14px',
                  border: '1.5px solid rgba(52, 211, 153, 0.7)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  animation: 'float 3s ease-in-out infinite'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>🕌</span>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#fef08a', lineHeight: 1.1 }}>
                    Madinah Added!
                  </strong>
                  <span style={{ fontSize: '0.62rem', color: '#a7f3d0' }}>{madinahNights} Blessed Nights</span>
                </div>
              </div>
            )}
          </div>

          {/* Nights Summary Banner */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              marginTop: '0.85rem',
              backgroundColor: 'rgba(3, 20, 14, 0.65)',
              padding: '0.45rem 0.9rem',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 600 }}>Makkah Stay</span>
              <strong style={{ color: '#fcd34d', fontSize: '0.8rem' }}>{makkahNights} Nights (Haram)</strong>
            </div>
            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(16, 185, 129, 0.3)' }} />
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 600 }}>Madinah Stay</span>
              <strong style={{ color: includeMadinah ? '#6ee7b7' : '#9ca3af', fontSize: '0.8rem' }}>
                {includeMadinah ? `${madinahNights} Nights` : '0 Nights'}
              </strong>
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 2: SLIDERS & INTERACTIVE CONTROLS
            ======================================================== */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1rem'
          }}
        >
          {/* Slider 1: Pilgrims / Persons */}
          <div 
            style={{
              padding: '0.95rem',
              backgroundColor: 'rgba(2, 20, 14, 0.8)',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.4rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderRadius: '10px' }}>
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', display: 'block' }}>
                    Number of Pilgrims
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                    {persons === 1 ? 'Solo' : persons === 2 ? 'Couple' : `Family (${persons} Pax)`}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '0.25rem 0.65rem', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace', color: '#fde047' }}>{persons}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fef08a', textTransform: 'uppercase' }}>Pax</span>
              </div>
            </div>

            {/* Range Slider */}
            <div>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={persons}
                onChange={(e) => {
                  setPersons(parseInt(e.target.value, 10));
                  playChime(440 + parseInt(e.target.value, 10) * 20, 'sine', 0.12);
                  triggerPopupModal();
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '10px',
                  accentColor: '#f59e0b',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(110, 231, 183, 0.7)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                <span>1</span>
                <span>3 (Default)</span>
                <span>6 Family</span>
                <span>10+ Group</span>
                <span>15</span>
              </div>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', paddingTop: '0.1rem' }}>
              {[
                { label: 'Solo (1)', val: 1 },
                { label: 'Couple (2)', val: 2 },
                { label: 'Family (3)', val: 3 },
                { label: 'Family (4)', val: 4 },
                { label: 'Large (6)', val: 6 },
                { label: 'Group (10)', val: 10 },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => {
                    setPersons(chip.val);
                    playChime(500, 'sine', 0.15);
                    triggerPopupModal();
                  }}
                  style={{
                    padding: '0.25rem 0.55rem',
                    borderRadius: '7px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: persons === chip.val ? '#f59e0b' : 'rgba(6, 78, 59, 0.5)',
                    color: persons === chip.val ? '#02120b' : '#a7f3d0'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slider 2: Duration / Days */}
          <div 
            style={{
              padding: '0.95rem',
              backgroundColor: 'rgba(2, 20, 14, 0.8)',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.4rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '10px' }}>
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', display: 'block' }}>
                    Trip Duration
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                    {days} Days / {days - 1} Nights
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.25rem 0.65rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace', color: '#6ee7b7' }}>{days}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase' }}>Days</span>
              </div>
            </div>

            {/* Range Slider */}
            <div>
              <input
                type="range"
                min="3"
                max="28"
                step="1"
                value={days}
                onChange={(e) => {
                  setDays(parseInt(e.target.value, 10));
                  playChime(380 + parseInt(e.target.value, 10) * 15, 'sine', 0.12);
                  triggerPopupModal();
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '10px',
                  accentColor: '#10b981',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(110, 231, 183, 0.7)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                <span>3 Days</span>
                <span>5 (Default)</span>
                <span>7</span>
                <span>14 Sunnah</span>
                <span>28</span>
              </div>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', paddingTop: '0.1rem' }}>
              {[
                { label: '3 Days', val: 3 },
                { label: '5 Days (Default)', val: 5 },
                { label: '7 Days', val: 7 },
                { label: '10 Days', val: 10 },
                { label: '14 Days (Sunnah)', val: 14 },
                { label: '21 Days', val: 21 },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => {
                    setDays(chip.val);
                    playChime(520, 'sine', 0.15);
                    triggerPopupModal();
                  }}
                  style={{
                    padding: '0.25rem 0.55rem',
                    borderRadius: '7px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: days === chip.val ? '#10b981' : 'rgba(6, 78, 59, 0.5)',
                    color: days === chip.val ? '#02120b' : '#a7f3d0'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 3: HIGHLIGHTED MADINAH BONUS PERK & HOTEL TIER
            ======================================================== */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1rem'
          }}
        >
          {/* Highlighted Madinah Bonus Catch Card */}
          <div 
            onClick={() => handleToggleMadinah(!includeMadinah)}
            style={{
              padding: '0.95rem',
              backgroundColor: includeMadinah ? 'rgba(6, 78, 59, 0.85)' : 'rgba(2, 20, 14, 0.85)',
              borderRadius: '16px',
              border: includeMadinah ? '2px solid #facc15' : '2px dashed rgba(245, 158, 11, 0.7)',
              boxShadow: includeMadinah ? '0 0 20px rgba(250, 204, 21, 0.35)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div 
                style={{ 
                  fontSize: '1.4rem',
                  backgroundColor: includeMadinah ? 'rgba(250, 204, 21, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                  padding: '0.45rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                🕌
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
                  <span 
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      color: '#02120b',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <Gift className="h-2.5 w-2.5" /> Bonus Perk
                  </span>
                </div>
                <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>
                  Add Madinah Al-Munawwarah
                </strong>
                <span style={{ fontSize: '0.68rem', color: includeMadinah ? '#fef08a' : 'rgba(167, 243, 208, 0.8)' }}>
                  {includeMadinah 
                    ? `✓ Added ${madinahNights}N Madinah + Ziyarat` 
                    : '🎁 Click to add Madinah (Free Roza Mubarak)'}
                </span>
              </div>
            </div>

            {/* Toggle switch */}
            <div 
              style={{
                width: '46px',
                height: '24px',
                borderRadius: '24px',
                backgroundColor: includeMadinah ? '#10b981' : '#374151',
                position: 'relative',
                transition: '0.3s',
                flexShrink: 0
              }}
            >
              <div 
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  position: 'absolute',
                  top: '3px',
                  left: includeMadinah ? '24px' : '3px',
                  transition: '0.3s'
                }} 
              />
            </div>
          </div>

          {/* Hotel Tier Selection */}
          <div 
            style={{
              padding: '0.95rem',
              backgroundColor: 'rgba(2, 20, 14, 0.8)',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.5rem',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Building className="h-4 w-4 text-emerald-400" />
                <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 800 }}>Hotel Standard</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#fcd34d', fontWeight: 800 }}>
                {tier === 'luxury' ? '5★ Haram Front' : tier === 'comfort' ? '4★ Walking Dist' : '3★ Economy'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
              {(['economy', 'comfort', 'luxury'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTier(t);
                    playChime(580, 'sine', 0.15);
                    triggerPopupModal();
                  }}
                  style={{
                    padding: '0.45rem 0.2rem',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: tier === t ? '#f59e0b' : 'rgba(6, 78, 59, 0.5)',
                    color: tier === t ? '#02120b' : '#a7f3d0'
                  }}
                >
                  {t === 'economy' ? '3★ Economy' : t === 'comfort' ? '4★ Comfort' : '5★ Luxury'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 4: ANCHORED PRIZE & REWARD SUMMARY CARD
            ======================================================== */}
        <div 
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '1.25rem',
            background: 'linear-gradient(135deg, #064e3b 0%, #022c22 60%, #064e3b 100%)',
            borderRadius: '20px',
            border: '2px solid #facc15',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45), 0 0 25px rgba(250, 204, 21, 0.25)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ position: 'relative', zIndex: 10, maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <span 
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  color: '#02120b',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Award className="h-3 w-3" /> 🏆 GUARANTEED VIP RATE
              </span>
              <span 
                style={{
                  background: 'rgba(250, 204, 21, 0.2)',
                  color: '#fef08a',
                  border: '1px solid rgba(250, 204, 21, 0.4)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '16px'
                }}
              >
                Save {formattedSavings} {curr.symbol}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.15rem' }}>
              <span 
                style={{ 
                  fontSize: '1.95rem', 
                  fontWeight: 900, 
                  color: '#fef08a', 
                  letterSpacing: '-0.02em', 
                  textShadow: '0 2px 10px rgba(0,0,0,0.6)' 
                }}
              >
                {formattedTotal} {curr.symbol}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#6ee7b7', fontWeight: 700 }}>
                (~{formattedPerPerson} {curr.symbol} / person)
              </span>
            </div>

            <p style={{ fontSize: '0.72rem', color: 'rgba(167, 243, 208, 0.85)', margin: '0.25rem 0 0 0' }}>
              Includes {persons} Visas + {makkahNights}N Makkah {includeMadinah ? `+ ${madinahNights}N Madinah` : ''} + Transfers
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleBookNow}
              style={{
                width: '100%',
                padding: '0.85rem 1.75rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap'
              }}
            >
              Claim &amp; Book Package <ChevronRight className="h-5 w-5" style={{ strokeWidth: 3 }} />
            </button>
          </div>
        </div>

        {/* Feature Badges Footer */}
        <div 
          style={{
            marginTop: '1.25rem',
            paddingTop: '0.9rem',
            borderTop: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.65rem',
            fontSize: '0.72rem',
            color: 'rgba(167, 243, 208, 0.9)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span>Ministry Visas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Building className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <span>Reserved Rooms</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Zap className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <span>Instant Booking</span>
          </div>
        </div>

      </div>

      {/* ========================================================
          INSTANT REWARD PRIZE MODAL (POPUP ON SLIDER ADJUSTMENT)
          ======================================================== */}
      {showPriceModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            boxSizing: 'border-box',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowPriceModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '460px',
              borderRadius: '24px',
              border: '2px solid #facc15',
              background: 'linear-gradient(180deg, #032b1d 0%, #021810 100%)',
              color: '#ffffff',
              padding: '1.75rem 1.5rem',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(250, 204, 21, 0.35)',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
          >
            {/* Close / Edit Button */}
            <button
              type="button"
              onClick={() => setShowPriceModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Close and continue editing sliders"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Prize Ribbon */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#02120b', fontWeight: 900, fontSize: '0.75rem', padding: '0.25rem 0.85rem', borderRadius: '20px', textTransform: 'uppercase', marginBottom: '0.75rem', boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)' }}>
              <Award className="h-4 w-4" />
              🎉 Best Family Rate Unlocked!
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.35rem 0' }}>
              VIP Package For {persons} Pilgrims
            </h3>
            
            <p style={{ fontSize: '0.8rem', color: '#a7f3d0', margin: '0 0 1.25rem 0' }}>
              {makkahNights} Nights Makkah {includeMadinah ? `+ ${madinahNights} Nights Madinah` : ''} &bull; {tier.toUpperCase()} Hotel
            </p>

            {/* Big Prize Amount */}
            <div 
              style={{
                background: 'rgba(6, 78, 59, 0.6)',
                borderRadius: '18px',
                padding: '1.25rem',
                border: '1px solid rgba(250, 204, 21, 0.3)',
                marginBottom: '1.25rem'
              }}
            >
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                Instant Total Package Price
              </span>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fef08a', letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                {formattedTotal} {curr.symbol}
              </div>
              <span style={{ fontSize: '0.88rem', color: '#6ee7b7', fontWeight: 700 }}>
                (~{formattedPerPerson} {curr.symbol} / pilgrim)
              </span>
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.25)', color: '#fef08a', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 800 }}>
                  💰 Instant Saving: {formattedSavings} {curr.symbol}
                </span>
              </div>
            </div>

            {/* CTA Book Button */}
            <button
              type="button"
              onClick={() => {
                setShowPriceModal(false);
                handleBookNow();
              }}
              style={{
                width: '100%',
                padding: '0.95rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 6px 25px rgba(245, 158, 11, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                marginBottom: '0.75rem'
              }}
            >
              Claim &amp; Book Package <ChevronRight className="h-5 w-5" style={{ strokeWidth: 3 }} />
            </button>

            <button
              type="button"
              onClick={() => setShowPriceModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a7f3d0',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Keep Adjusting Sliders (Close)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
