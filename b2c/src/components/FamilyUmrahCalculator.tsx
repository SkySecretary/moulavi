import { useState, useMemo } from 'react';
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
  Volume2,
  VolumeX,
  ArrowLeft,
  Coins
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

  // Audio synthesizer using Web Audio API
  const playChime = (freq: number = 540, type: OscillatorType = 'sine', duration: number = 0.2) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
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
      playChime(784, 'triangle', 0.4);
      setMadinahSparkleTrigger(true);
      setTimeout(() => setMadinahSparkleTrigger(false), 2400);
    } else {
      playChime(350, 'sine', 0.15);
    }
  };

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
        maxWidth: '760px', 
        margin: '0 auto', 
        padding: '0.75rem 0.5rem 2rem 0.5rem', 
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      {/* Sleek Minimalist Top Navigation */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '0.75rem', 
          marginBottom: '0.85rem',
          padding: '0.5rem 0.85rem',
          background: 'rgba(2, 24, 16, 0.85)',
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
              title="Return to Main Portal"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#a7f3d0',
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '1rem' }}>🕋</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
              Family Umrah Simulator
            </span>
          </div>
        </div>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          style={{
            background: 'rgba(6, 78, 59, 0.6)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: soundEnabled ? '#fbbf24' : '#6b7280',
            padding: '0.35rem 0.55rem',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.72rem',
            fontWeight: 700
          }}
        >
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          <span>{soundEnabled ? 'SFX ON' : 'MUTE'}</span>
        </button>
      </div>

      {/* Main Glass Game Arena with Rich Islamic Watermark Pattern */}
      <div 
        style={{
          position: 'relative',
          borderRadius: '26px',
          overflow: 'hidden',
          boxShadow: '0 30px 80px -15px rgba(0, 0, 0, 0.7), 0 0 50px rgba(19, 92, 70, 0.35)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          backgroundColor: '#02160e',
          backgroundImage: `
            radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.22) 0%, transparent 60%),
            radial-gradient(circle at 10% 80%, rgba(245, 158, 11, 0.12) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' stroke='%23065f46' stroke-width='0.4' opacity='0.25'%3E%3Crect x='8' y='8' width='44' height='44' transform='rotate(45 30 30)'/%3E%3Ccircle cx='30' cy='30' r='14'/%3E%3Cline x1='30' y1='0' x2='30' y2='60'/%3E%3Cline x1='0' y1='30' x2='60' y2='30'/%3E%3C/g%3E%3C/svg%3E")
          `,
          color: '#ffffff',
          padding: '1.25rem 1rem',
          boxSizing: 'border-box'
        }}
      >
        {/* ========================================================
            SECTION 1: BIG CENTRAL KAABA & TAWAF ORBIT VISUALIZER
            ======================================================== */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.25rem 0 1rem 0',
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
                <Sparkles className="h-4 w-4 text-amber-300 animate-spin" />
                🕌 Madinah Added! (+{madinahNights} Nights) ✨
              </div>
            </div>
          )}

          {/* Central Big Orbital Tawaf Arena */}
          <div 
            style={{
              position: 'relative',
              width: 'min(265px, 74vw)',
              height: 'min(265px, 74vw)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              margin: '0.25rem auto'
            }}
          >
            {/* Outer Celestial Orbit Ring */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px dashed rgba(52, 211, 153, 0.4)',
                boxShadow: 'inset 0 0 15px rgba(16, 185, 129, 0.1)'
              }} 
            />
            
            {/* Middle Orbit Ring */}
            <div 
              style={{
                position: 'absolute',
                width: '76%',
                height: '76%',
                borderRadius: '50%',
                border: '2px solid rgba(16, 185, 129, 0.35)'
              }} 
            />
            
            {/* Inner Ring */}
            <div 
              style={{
                position: 'absolute',
                width: '54%',
                height: '54%',
                borderRadius: '50%',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                backgroundColor: 'rgba(6, 78, 59, 0.2)'
              }} 
            />

            {/* BIG SACRED KAABA IN CENTER */}
            <div 
              style={{
                position: 'relative',
                zIndex: 10,
                width: 'min(90px, 25vw)',
                height: 'min(90px, 25vw)',
                background: 'linear-gradient(135deg, #09090b 0%, #1c1917 50%, #000000 100%)',
                borderRadius: '18px',
                border: '2.5px solid rgba(251, 191, 36, 0.95)',
                boxShadow: '0 0 30px rgba(251, 191, 36, 0.45), 0 10px 25px rgba(0,0,0,0.85)',
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
              <span style={{ fontSize: '1.85rem', marginTop: '0.65rem' }}>🕋</span>
              <span style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#fcd34d', marginTop: '0.1rem' }}>
                Holy Kaaba
              </span>
            </div>

            {/* Orbiting Pilgrims Container (Counter-Clockwise Tawaf) */}
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

            {/* Madinah Green Dome Badge (When toggled) */}
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

          {/* Dynamic Live Floating Rate Pill */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '0.6rem', 
              marginTop: '0.85rem',
              backgroundColor: 'rgba(2, 24, 16, 0.85)',
              padding: '0.45rem 1rem',
              borderRadius: '20px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>Live Rate:</span>
              <strong style={{ fontSize: '0.95rem', color: '#fef08a', fontWeight: 900 }}>
                {formattedTotal} {curr.symbol}
              </strong>
            </div>
            <span style={{ color: 'rgba(52, 211, 153, 0.4)' }}>&bull;</span>
            <span style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>
              {makkahNights}N Makkah {includeMadinah ? `+ ${madinahNights}N Madinah` : ''} ({persons} Pax)
            </span>
          </div>
        </div>

        {/* ========================================================
            SECTION 2: BOTTOM SLIDERS & CONTROLS
            ======================================================== */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '0.75rem',
            marginBottom: '0.85rem'
          }}
        >
          {/* Slider 1: Pilgrims */}
          <div 
            style={{
              padding: '0.9rem',
              backgroundColor: 'rgba(2, 20, 14, 0.85)',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ padding: '0.35rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderRadius: '8px' }}>
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', display: 'block' }}>
                    Number of Pilgrims
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                    {persons === 1 ? 'Solo' : persons === 2 ? 'Couple' : `Family of ${persons}`}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace', color: '#fde047' }}>{persons}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#fef08a', textTransform: 'uppercase' }}>Pax</span>
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
                  playChime(440 + parseInt(e.target.value, 10) * 18, 'sine', 0.1);
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '10px',
                  accentColor: '#f59e0b',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'rgba(110, 231, 183, 0.7)', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                <span>1</span>
                <span>3 (Default)</span>
                <span>6 Family</span>
                <span>10+ Group</span>
                <span>15</span>
              </div>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', paddingTop: '0.1rem' }}>
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
                    playChime(500, 'sine', 0.12);
                  }}
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
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
              padding: '0.9rem',
              backgroundColor: 'rgba(2, 20, 14, 0.85)',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ padding: '0.35rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '8px' }}>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace', color: '#6ee7b7' }}>{days}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase' }}>Days</span>
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
                  playChime(380 + parseInt(e.target.value, 10) * 14, 'sine', 0.1);
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '10px',
                  accentColor: '#10b981',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'rgba(110, 231, 183, 0.7)', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                <span>3 Days</span>
                <span>5 (Default)</span>
                <span>7</span>
                <span>14 Sunnah</span>
                <span>28</span>
              </div>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', paddingTop: '0.1rem' }}>
              {[
                { label: '3 Days', val: 3 },
                { label: '5 Days (Default)', val: 5 },
                { label: '7 Days', val: 7 },
                { label: '10 Days', val: 10 },
                { label: '14 Days', val: 14 },
                { label: '21 Days', val: 21 },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => {
                    setDays(chip.val);
                    playChime(520, 'sine', 0.12);
                  }}
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
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
            SECTION 3: MADINAH BONUS PERK & HOTEL TIER
            ======================================================== */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '0.75rem',
            marginBottom: '0.85rem'
          }}
        >
          {/* Highlighted Madinah Bonus Catch Card */}
          <div 
            onClick={() => handleToggleMadinah(!includeMadinah)}
            style={{
              padding: '0.85rem',
              backgroundColor: includeMadinah ? 'rgba(6, 78, 59, 0.9)' : 'rgba(2, 20, 14, 0.85)',
              borderRadius: '16px',
              border: includeMadinah ? '2px solid #facc15' : '2px dashed rgba(245, 158, 11, 0.7)',
              boxShadow: includeMadinah ? '0 0 18px rgba(250, 204, 21, 0.35)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.65rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div 
                style={{ 
                  fontSize: '1.35rem',
                  backgroundColor: includeMadinah ? 'rgba(250, 204, 21, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                  padding: '0.4rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                🕌
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.1rem' }}>
                  <span 
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      color: '#02120b',
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <Gift className="h-2.5 w-2.5" /> Bonus Perk
                  </span>
                </div>
                <strong style={{ fontSize: '0.82rem', color: '#ffffff', display: 'block' }}>
                  Add Madinah Al-Munawwarah
                </strong>
                <span style={{ fontSize: '0.65rem', color: includeMadinah ? '#fef08a' : 'rgba(167, 243, 208, 0.8)' }}>
                  {includeMadinah 
                    ? `✓ Added ${madinahNights}N Madinah + Ziyarat` 
                    : '🎁 Click to add Madinah (Free Roza Mubarak)'}
                </span>
              </div>
            </div>

            {/* Toggle switch */}
            <div 
              style={{
                width: '44px',
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
                  left: includeMadinah ? '22px' : '3px',
                  transition: '0.3s'
                }} 
              />
            </div>
          </div>

          {/* Hotel Tier Selection */}
          <div 
            style={{
              padding: '0.85rem',
              backgroundColor: 'rgba(2, 20, 14, 0.85)',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.45rem',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Building className="h-3.5 w-3.5 text-emerald-400" />
                <span style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: 800 }}>Hotel Standard</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#fcd34d', fontWeight: 800 }}>
                {tier === 'luxury' ? '5★ Haram Front' : tier === 'comfort' ? '4★ Walking Dist' : '3★ Economy'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
              {(['economy', 'comfort', 'luxury'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTier(t);
                    playChime(580, 'sine', 0.12);
                  }}
                  style={{
                    padding: '0.4rem 0.2rem',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
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
            SECTION 4: GRAND PRIZE & REWARD SUMMARY CARD WITH CURRENCY PICKER
            ======================================================== */}
        <div 
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '1.25rem',
            background: 'linear-gradient(135deg, #064e3b 0%, #022c22 60%, #064e3b 100%)',
            borderRadius: '20px',
            border: '2px solid #facc15',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5), 0 0 25px rgba(250, 204, 21, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxSizing: 'border-box'
          }}
        >
          {/* Card Top: Badges & Currency Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span 
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  color: '#02120b',
                  fontSize: '0.65rem',
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
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '16px'
                }}
              >
                Save {formattedSavings} {curr.symbol}
              </span>
            </div>

            {/* Currency Selector (Moved to Bottom Section as requested) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Coins className="h-3.5 w-3.5 text-amber-300" />
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  playChime(620, 'sine', 0.15);
                }}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#02120b',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  outline: 'none'
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

          {/* Card Middle: Big Prize Price & CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 700 }}>
                Instant Total Cost
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
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
                <span style={{ fontSize: '0.82rem', color: '#6ee7b7', fontWeight: 700 }}>
                  (~{formattedPerPerson} {curr.symbol} / pax)
                </span>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'rgba(167, 243, 208, 0.85)', margin: '0.15rem 0 0 0' }}>
                Includes {persons} Visas + {makkahNights}N Makkah {includeMadinah ? `+ ${madinahNights}N Madinah` : ''} + Transfers
              </p>
            </div>

            <button
              type="button"
              onClick={handleBookNow}
              style={{
                padding: '0.85rem 1.65rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.92rem',
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
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.5rem',
            fontSize: '0.7rem',
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
    </div>
  );
}
