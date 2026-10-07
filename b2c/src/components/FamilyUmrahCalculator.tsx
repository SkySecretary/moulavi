import { useState, useMemo, useEffect } from 'react';
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
  Coins,
  BedDouble
} from 'lucide-react';

export interface CalculatorPackageParams {
  persons: number;
  days: number;
  rooms: number;
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

interface MasterConfig {
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
}

const DEFAULT_MASTER: MasterConfig = {
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
};

export function FamilyUmrahCalculator({ onProceedToBooking, onBackToPortal }: FamilyUmrahCalculatorProps) {
  // Master Config from API
  const [masterConfig, setMasterConfig] = useState<MasterConfig>(DEFAULT_MASTER);

  // Primary Sliders - 1 Person, 1 Day, 1 Room as default
  const [persons, setPersons] = useState<number>(1);
  const [days, setDays] = useState<number>(1);
  const [rooms, setRooms] = useState<number>(1);
  const [includeMadinah, setIncludeMadinah] = useState<boolean>(false);
  const [madinahSparkleTrigger, setMadinahSparkleTrigger] = useState<boolean>(false);

  // Accommodation Tier & Currency - Default INR
  const [tier, setTier] = useState<'economy' | 'comfort' | 'luxury'>('comfort');
  const [currency, setCurrency] = useState<string>('INR');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Guarantee seamless dark emerald background on full page
  useEffect(() => {
    const prevBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#021a12';
    return () => {
      document.body.style.backgroundColor = prevBg;
    };
  }, []);

  // Fetch Master Settings from backend
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const res = await fetch('/api/calculator-master');
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setMasterConfig({
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
          });
        }
      } catch (e) {
        // Fallback to default
      }
    };
    fetchMaster();
  }, []);

  // Dynamic currency rates dictionary with master exchange factors
  const currencyRates: Record<string, { symbol: string; rate: number; label: string }> = useMemo(() => ({
    INR: { symbol: '₹', rate: masterConfig.sarToInrRate, label: '🇮🇳 INR (Indian Rupee)' },
    SAR: { symbol: 'SAR', rate: 1, label: '🇸🇦 SAR (Saudi Riyal)' },
    USD: { symbol: '$', rate: masterConfig.sarToUsdRate, label: '🇺🇸 USD (US Dollar)' },
    AED: { symbol: 'AED', rate: masterConfig.sarToAedRate, label: '🇦🇪 AED (UAE Dirham)' },
    EUR: { symbol: '€', rate: masterConfig.sarToEurRate, label: '🇪🇺 EUR (Euro)' },
    GBP: { symbol: '£', rate: masterConfig.sarToGbpRate, label: '🇬🇧 GBP (British Pound)' },
  }), [masterConfig]);

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
    if (days <= 2) {
      return { makkahNights: 1, madinahNights: 1 };
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
    const tierRatePerNight =
      tier === 'luxury'
        ? masterConfig.luxuryMakkahRateSAR
        : tier === 'comfort'
        ? masterConfig.comfortMakkahRateSAR
        : masterConfig.economyMakkahRateSAR;

    const madinahTierRatePerNight =
      tier === 'luxury'
        ? masterConfig.luxuryMadinahRateSAR
        : tier === 'comfort'
        ? masterConfig.comfortMadinahRateSAR
        : masterConfig.economyMadinahRateSAR;

    const roomCount = Math.max(1, rooms);
    const makkahStay = makkahNights * tierRatePerNight * roomCount;
    const madinahStay = includeMadinah ? madinahNights * madinahTierRatePerNight * roomCount : 0;

    const visaCost = masterConfig.visaFeeSAR * persons;
    const transportBase = persons >= 4 ? masterConfig.transportGroupSAR : masterConfig.transportBaseSAR;
    const madinahTransfer = includeMadinah ? (persons >= 4 ? masterConfig.madinahTransferGroupSAR : masterConfig.madinahTransferSAR) : 0;
    const transportTotal = transportBase + madinahTransfer;

    let discount = 0;
    if (persons >= 3 && days >= 5) {
      discount = Math.round((makkahStay + madinahStay) * (masterConfig.discountPercentage / 100) + persons * 60);
    } else {
      discount = Math.round(persons * 40);
    }

    const subtotal = makkahStay + madinahStay + visaCost + transportTotal - discount;
    const total = Math.max(250, subtotal);
    const perPerson = Math.round(total / persons);

    return {
      totalSAR: total,
      perPersonSAR: perPerson,
      familySavingsSAR: discount > 0 ? discount : 250,
    };
  }, [persons, days, rooms, includeMadinah, makkahNights, madinahNights, tier, masterConfig]);

  // Format currency
  const curr = currencyRates[currency] || currencyRates['INR'];
  const formattedTotal = Math.round(totalSAR * curr.rate).toLocaleString();
  const formattedPerPerson = Math.round(perPersonSAR * curr.rate).toLocaleString();
  const formattedSavings = Math.round(familySavingsSAR * curr.rate).toLocaleString();

  // Dynamic Tawaf speed based on days
  const tawafDuration = days <= 3 ? '6s' : days <= 7 ? '10s' : days <= 14 ? '14s' : '18s';
  const pilgrimOrbitCount = Math.min(persons, 10);

  const handleBookNow = () => {
    if (onProceedToBooking) {
      onProceedToBooking({
        persons,
        days,
        rooms,
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
        padding: '0.75rem 0.5rem 2.5rem 0.5rem', 
        boxSizing: 'border-box',
        overflowX: 'hidden',
        color: '#ffffff',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
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

      {/* Main Interactive Arena Card */}
      <div 
        style={{
          position: 'relative',
          borderRadius: '24px',
          border: '1.5px solid rgba(16, 185, 129, 0.35)',
          background: 'linear-gradient(180deg, #032b1d 0%, #01170f 60%, #01120c 100%)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), inset 0 0 80px rgba(16, 185, 129, 0.08)',
          padding: '1.25rem 1rem',
          boxSizing: 'border-box'
        }}
      >
        {/* Spiritual Islamic Star Watermark Geometry */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(rgba(16, 185, 129, 0.12) 1px, transparent 1px), radial-gradient(rgba(245, 158, 11, 0.08) 1px, transparent 1px)`,
            backgroundSize: '24px 24px, 48px 48px',
            backgroundPosition: '0 0, 12px 12px',
            opacity: 0.85,
            pointerEvents: 'none',
            borderRadius: '24px'
          }} 
        />

        {/* ========================================================
            SECTION 1: THE INTERACTIVE KAABA TAWAF SANCTUARY
            ======================================================== */}
        <div 
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem 0.5rem 1.5rem 0.5rem',
            marginBottom: '1rem',
            background: 'radial-gradient(circle at center, rgba(6, 78, 59, 0.45) 0%, rgba(2, 20, 14, 0.95) 75%)',
            borderRadius: '20px',
            border: '1px solid rgba(250, 204, 21, 0.25)',
            boxSizing: 'border-box'
          }}
        >
          {/* Header Title */}
          <div style={{ textAlign: 'center', marginBottom: '0.75rem', position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#fef08a', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Interactive Customizer</span>
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', margin: '0.3rem 0 0 0', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
              Configure Pilgrims, Duration &amp; Rooms
            </h2>
          </div>

          {/* Tawaf Arena Container */}
          <div 
            style={{
              position: 'relative',
              width: 'min(270px, 76vw)',
              height: 'min(270px, 76vw)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Ambient Sanctuary Glow */}
            <div 
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: includeMadinah
                  ? 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(245, 158, 11, 0.2) 50%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 65%)',
                filter: 'blur(10px)',
                transition: 'all 0.5s ease'
              }}
            />

            {/* Concentric Mataf Circles */}
            <div 
              style={{
                position: 'absolute',
                width: '92%',
                height: '92%',
                borderRadius: '50%',
                border: '1.5px dashed rgba(250, 204, 21, 0.35)',
                animation: `spinCounterClockwise ${tawafDuration} linear infinite`
              }}
            />
            <div 
              style={{
                position: 'absolute',
                width: '74%',
                height: '74%',
                borderRadius: '50%',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                animation: `spinCounterClockwise ${tawafDuration} linear infinite reverse`
              }}
            />

            {/* Central Holy Kaaba Object */}
            <div 
              style={{
                position: 'relative',
                zIndex: 20,
                width: '68px',
                height: '74px',
                backgroundColor: '#0a0a0a',
                borderRadius: '10px',
                border: '2px solid #d4af37',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.9), 0 0 25px rgba(212, 175, 55, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}
            >
              {/* Gold Kiswah Belt */}
              <div 
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: 0,
                  right: 0,
                  height: '8px',
                  background: 'linear-gradient(90deg, #b45309 0%, #facc15 50%, #b45309 100%)',
                  boxShadow: '0 0 6px rgba(250, 204, 21, 0.8)'
                }}
              />
              <span style={{ fontSize: '0.52rem', fontWeight: 900, color: '#facc15', letterSpacing: '0.8px', marginTop: '16px', fontFamily: 'monospace' }}>
                KAABA
              </span>
              <span style={{ fontSize: '0.48rem', color: '#6ee7b7', fontWeight: 700 }}>
                MAKKAH
              </span>
            </div>

            {/* Dynamic Orbiting Pilgrims */}
            {Array.from({ length: pilgrimOrbitCount }).map((_, i) => {
              const angle = (i / pilgrimOrbitCount) * 360;
              const radius = 102;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '24px',
                    height: '24px',
                    marginLeft: '-12px',
                    marginTop: '-12px',
                    transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)`,
                    animation: `tawafOrbit ${tawafDuration} linear infinite`,
                    transformOrigin: '0 0',
                    zIndex: 25
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      border: '2px solid #10b981',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 10px rgba(16, 185, 129, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      color: '#02120b',
                      fontWeight: 900
                    }}
                    title={`Pilgrim #${i + 1}`}
                  >
                    👤
                  </div>
                </div>
              );
            })}

            {/* Madinah Roza Mubarak Sparkle Orb (When Enabled) */}
            {includeMadinah && (
              <div 
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  zIndex: 30,
                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '20px',
                  border: '1.5px solid #facc15',
                  boxShadow: '0 0 20px rgba(250, 204, 21, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  animation: madinahSparkleTrigger ? 'pulseHighlight 0.6s ease 3' : 'bounceSoft 3s ease-in-out infinite'
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>🕌</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#fef08a' }}>
                  +{madinahNights}N Madinah
                </span>
              </div>
            )}
          </div>

          {/* Real-time Interactive Floating Live Rate Pill */}
          <div
            style={{
              marginTop: '0.85rem',
              background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.9) 0%, rgba(2, 44, 34, 0.95) 100%)',
              border: '1.5px solid #facc15',
              padding: '0.35rem 0.95rem',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5), 0 0 15px rgba(250, 204, 21, 0.25)',
              zIndex: 30
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff' }}>
              Live Rate: <span style={{ color: '#fef08a', fontWeight: 900, fontSize: '0.88rem' }}>{formattedTotal} {curr.symbol}</span>
            </span>
            <span style={{ fontSize: '0.68rem', color: '#a7f3d0', fontWeight: 700 }}>
              ({persons} Pax • {days}D • {rooms} {rooms > 1 ? 'Rooms' : 'Room'})
            </span>
          </div>

        </div>

        {/* ========================================================
            SECTION 2: SLIDERS (PILGRIMS, DURATION & ROOMS)
            ======================================================== */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '0.75rem',
            marginBottom: '0.85rem'
          }}
        >
          {/* SLIDER 1: NUMBER OF PILGRIMS */}
          <div 
            style={{
              padding: '0.85rem',
              backgroundColor: 'rgba(2, 20, 14, 0.85)',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.35rem', borderRadius: '8px', display: 'flex' }}>
                  <Users className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', display: 'block' }}>
                    Number of Pilgrims
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                    {persons === 1 ? 'Solo Pilgrim' : persons === 2 ? 'Couple' : persons <= 4 ? 'Family Group' : 'Large Group'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace', color: '#6ee7b7' }}>{persons}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase' }}>Pax</span>
              </div>
            </div>

            {/* Range Slider */}
            <div>
              <input
                type="range"
                min={masterConfig.minPersons}
                max={Math.min(20, masterConfig.maxPersons)}
                step="1"
                value={persons}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setPersons(val);
                  playChime(320 + val * 25, 'sine', 0.1);
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
                <span>1 Solo</span>
                <span>2 Couple</span>
                <span>3 Family</span>
                <span>5</span>
                <span>10 Group</span>
                <span>20</span>
              </div>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', paddingTop: '0.1rem' }}>
              {[
                { label: '1 Solo (Default)', val: 1 },
                { label: '2 Couple', val: 2 },
                { label: '3 Family', val: 3 },
                { label: '4 Family', val: 4 },
                { label: '5 Group', val: 5 },
                { label: '8 Group', val: 8 },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => {
                    setPersons(chip.val);
                    playChime(440, 'sine', 0.12);
                  }}
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: persons === chip.val ? '#10b981' : 'rgba(6, 78, 59, 0.5)',
                    color: persons === chip.val ? '#02120b' : '#a7f3d0'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* SLIDER 2: TRIP DURATION (DAYS / NIGHTS) */}
          <div 
            style={{
              padding: '0.85rem',
              backgroundColor: 'rgba(2, 20, 14, 0.85)',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.35rem', borderRadius: '8px', display: 'flex' }}>
                  <Calendar className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', display: 'block' }}>
                    Trip Duration
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                    {days} {days === 1 ? 'Day' : 'Days'} ({makkahNights}N Makkah{includeMadinah ? ` + ${madinahNights}N Madinah` : ''})
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
                min={masterConfig.minDays}
                max={Math.min(28, masterConfig.maxDays)}
                step="1"
                value={days}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setDays(val);
                  playChime(380 + val * 14, 'sine', 0.1);
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
                <span>1 Day</span>
                <span>3 Days</span>
                <span>5 Days</span>
                <span>7 Days</span>
                <span>14 Sunnah</span>
                <span>28 Days</span>
              </div>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', paddingTop: '0.1rem' }}>
              {[
                { label: '1 Day (Default)', val: 1 },
                { label: '3 Days', val: 3 },
                { label: '5 Days', val: 5 },
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

          {/* SLIDER 3: NUMBER OF ROOMS */}
          <div 
            style={{
              padding: '0.85rem',
              backgroundColor: 'rgba(2, 20, 14, 0.85)',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.35rem', borderRadius: '8px', display: 'flex' }}>
                  <BedDouble className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', display: 'block' }}>
                    Number of Hotel Rooms
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                    {rooms === 1 ? '1 Room (Double/Triple)' : `${rooms} Rooms Allocated`}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace', color: '#6ee7b7' }}>{rooms}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase' }}>Rooms</span>
              </div>
            </div>

            {/* Range Slider */}
            <div>
              <input
                type="range"
                min={masterConfig.minRooms}
                max={Math.min(10, masterConfig.maxRooms)}
                step="1"
                value={rooms}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setRooms(val);
                  playChime(350 + val * 35, 'sine', 0.1);
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
                <span>1 Room</span>
                <span>2 Rooms</span>
                <span>3 Rooms</span>
                <span>5 Rooms</span>
                <span>10 Rooms</span>
              </div>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', paddingTop: '0.1rem' }}>
              {[
                { label: '1 Room (Default)', val: 1 },
                { label: '2 Rooms', val: 2 },
                { label: '3 Rooms', val: 3 },
                { label: '4 Rooms', val: 4 },
                { label: '5 Rooms', val: 5 },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => {
                    setRooms(chip.val);
                    playChime(480, 'sine', 0.12);
                  }}
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: rooms === chip.val ? '#10b981' : 'rgba(6, 78, 59, 0.5)',
                    color: rooms === chip.val ? '#02120b' : '#a7f3d0'
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
                    ? `✓ Added ${madinahNights}N Madinah + Transfers` 
                    : '🎁 Click to add Madinah (Roza Mubarak)'}
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
            SECTION 4: GRAND PRIZE & REWARD SUMMARY CARD WITH INR DEFAULT CURRENCY PICKER
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
                <Award className="h-3 w-3" /> 🏆 GUARANTEED BEST RATE
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

            {/* Currency Selector (Default: INR) */}
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
                {Object.keys(currencyRates).map((cKey) => (
                  <option key={cKey} value={cKey} style={{ color: '#000000', background: '#ffffff' }}>
                    {currencyRates[cKey].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card Middle: Big Prize Price & CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 700 }}>
                Instant Package Price
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
                  (~{formattedPerPerson} {curr.symbol} / pilgrim)
                </span>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'rgba(167, 243, 208, 0.85)', margin: '0.15rem 0 0 0' }}>
                Includes {persons} Visa{persons > 1 ? 's' : ''} + {rooms} {rooms > 1 ? 'Rooms' : 'Room'} ({makkahNights}N Makkah{includeMadinah ? ` + ${madinahNights}N Madinah` : ''}) + Transfers
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
            <span>{rooms} {rooms > 1 ? 'Rooms' : 'Room'} Reserved</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Zap className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <span>Instant Confirmation</span>
          </div>
        </div>

      </div>
    </div>
  );
}
