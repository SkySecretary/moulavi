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
  roomType: 'double' | 'triple' | 'quad' | 'sharing' | 'single';
  makkahNights: number;
  madinahNights: number;
  includeMadinah: boolean;
  tier: 'economy' | 'comfort' | 'luxury';
  totalSAR: number;
  perPersonSAR: number;
  currency: string;
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
  defaultRoomType: string;
  doubleRoomRateSAR: number;
  tripleRoomRateSAR: number;
  quadRoomRateSAR: number;
  sharingRoomRateSAR: number;
  singleRoomRateSAR: number;
  visaFeeSAR: number;
  insuranceFeeSAR: number;
  ziyaratCostSAR: number;
  foodPerDaySAR: number;
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
  defaultRoomType: 'double',
  doubleRoomRateSAR: 220,
  tripleRoomRateSAR: 280,
  quadRoomRateSAR: 340,
  sharingRoomRateSAR: 180,
  singleRoomRateSAR: 380,
  visaFeeSAR: 450,
  insuranceFeeSAR: 50,
  ziyaratCostSAR: 150,
  foodPerDaySAR: 60,
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
  const [roomType, setRoomType] = useState<'double' | 'triple' | 'quad' | 'sharing' | 'single'>('double');
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
            defaultRoomType: d.defaultRoomType || 'double',
            doubleRoomRateSAR: Number(d.doubleRoomRateSAR ?? 220),
            tripleRoomRateSAR: Number(d.tripleRoomRateSAR ?? 280),
            quadRoomRateSAR: Number(d.quadRoomRateSAR ?? 340),
            sharingRoomRateSAR: Number(d.sharingRoomRateSAR ?? 180),
            singleRoomRateSAR: Number(d.singleRoomRateSAR ?? 380),
            visaFeeSAR: Number(d.visaFeeSAR ?? 450),
            insuranceFeeSAR: Number(d.insuranceFeeSAR ?? 50),
            ziyaratCostSAR: Number(d.ziyaratCostSAR ?? 150),
            foodPerDaySAR: Number(d.foodPerDaySAR ?? 60),
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
          if (d.defaultRoomType) {
            setRoomType(d.defaultRoomType);
          }
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

    const roomTypeDailyRate = 
      roomType === 'triple' ? masterConfig.tripleRoomRateSAR :
      roomType === 'quad' ? masterConfig.quadRoomRateSAR :
      roomType === 'sharing' ? masterConfig.sharingRoomRateSAR :
      roomType === 'single' ? masterConfig.singleRoomRateSAR :
      masterConfig.doubleRoomRateSAR;

    const roomTypeMultiplier = (roomTypeDailyRate || 220) / (masterConfig.doubleRoomRateSAR || 220);
    const roomCount = Math.max(1, rooms);
    const makkahStay = Math.round(makkahNights * tierRatePerNight * roomTypeMultiplier * roomCount);
    const madinahStay = includeMadinah ? Math.round(madinahNights * madinahTierRatePerNight * roomTypeMultiplier * roomCount) : 0;

    const visaCost = (masterConfig.visaFeeSAR + masterConfig.insuranceFeeSAR) * persons;
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
  }, [persons, days, rooms, roomType, includeMadinah, makkahNights, madinahNights, tier, masterConfig]);

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
        roomType,
        makkahNights,
        madinahNights,
        includeMadinah,
        tier,
        totalSAR,
        perPersonSAR,
        currency
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
          {/* Embedded Sanctuary Keyframes for Guaranteed Silky 3D Animation */}
          <style>{`
            @keyframes kaabaSmooth3D {
              0% {
                transform: perspective(600px) rotateY(0deg) rotateX(10deg);
              }
              50% {
                transform: perspective(600px) rotateY(180deg) rotateX(14deg);
              }
              100% {
                transform: perspective(600px) rotateY(360deg) rotateX(10deg);
              }
            }
            @keyframes spinCounterClockwise {
              from { transform: rotate(0deg); }
              to { transform: rotate(-360deg); }
            }
            @keyframes spinClockwise {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes pulseGoldGlow {
              0%, 100% {
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.9), 0 0 25px rgba(212, 175, 55, 0.45);
              }
              50% {
                box-shadow: 0 12px 42px rgba(0, 0, 0, 0.95), 0 0 50px rgba(250, 204, 21, 0.8), 0 0 25px rgba(16, 185, 129, 0.5);
              }
            }
            @keyframes bounceSoft {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-4px); }
            }
            @keyframes pulseHighlight {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.15); }
            }
          `}</style>

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
              width: '270px',
              height: '270px',
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

            {/* Central Holy Kaaba Object (Noble Isometric 3D Kaaba with Gold Aura & Sacred Kiswah Details) */}
            <div 
              style={{
                position: 'relative',
                zIndex: 20,
                width: '84px',
                height: '84px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                animation: 'pulseGoldGlow 3s ease-in-out infinite',
                transition: 'transform 0.25s ease'
              }}
              onClick={() => playChime(880, 'triangle', 0.4)}
              title="The Holy Kaaba, Makkah Al-Mukarramah (Click for Sacred Chime)"
            >
              <svg 
                viewBox="0 0 100 100" 
                width="84" 
                height="84" 
                style={{ 
                  filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 15px rgba(245, 158, 11, 0.45))'
                }}
              >
                <defs>
                  {/* Top Roof Gradient */}
                  <linearGradient id="kaabaRoof" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2a2a2a" />
                    <stop offset="100%" stopColor="#141414" />
                  </linearGradient>

                  {/* Left Facade Gradient */}
                  <linearGradient id="kaabaLeftFace" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e1e1e" />
                    <stop offset="100%" stopColor="#0a0a0a" />
                  </linearGradient>

                  {/* Right Facade (Front) Gradient */}
                  <linearGradient id="kaabaRightFace" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#121212" />
                    <stop offset="100%" stopColor="#050505" />
                  </linearGradient>

                  {/* Gold Kiswah Belt Gradient */}
                  <linearGradient id="goldHizam" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#b45309" />
                    <stop offset="35%" stopColor="#fef08a" />
                    <stop offset="65%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>

                  {/* Gold Bab Al-Kaaba (Door) Gradient */}
                  <linearGradient id="goldDoor" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>

                  {/* Marble Shadharwan Base */}
                  <linearGradient id="marbleBase" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#cbd5e1" />
                    <stop offset="50%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                </defs>

                {/* Shadharwan Marble Base Platform */}
                <polygon points="50,91 87,73 87,77 50,95" fill="#94a3b8" />
                <polygon points="50,91 13,73 13,77 50,95" fill="#64748b" />
                <polygon points="50,88 87,70 50,52 13,70" fill="url(#marbleBase)" />

                {/* 3D Isometric Cube: Left Facade */}
                <polygon points="15,40 50,57 50,88 15,71" fill="url(#kaabaLeftFace)" stroke="#1a1a1a" strokeWidth="0.5" />

                {/* 3D Isometric Cube: Right (Front) Facade */}
                <polygon points="50,57 85,40 85,71 50,88" fill="url(#kaabaRightFace)" stroke="#0d0d0d" strokeWidth="0.5" />

                {/* 3D Isometric Cube: Roof Top Face */}
                <polygon points="50,23 85,40 50,57 15,40" fill="url(#kaabaRoof)" stroke="#333333" strokeWidth="0.5" />

                {/* Gold Kiswah Belt (Hizam) - Left Facade */}
                <polygon points="15,45 50,62 50,66 15,49" fill="url(#goldHizam)" />
                <line x1="15" y1="45" x2="50" y2="62" stroke="#fef08a" strokeWidth="0.75" />
                <line x1="15" y1="49" x2="50" y2="66" stroke="#b45309" strokeWidth="0.75" />

                {/* Gold Kiswah Belt (Hizam) - Right Facade */}
                <polygon points="50,62 85,45 85,49 50,66" fill="url(#goldHizam)" />
                <line x1="50" y1="62" x2="85" y2="45" stroke="#fef08a" strokeWidth="0.75" />
                <line x1="50" y1="66" x2="85" y2="49" stroke="#b45309" strokeWidth="0.75" />

                {/* Gold Inscriptions / Motifs along Belt */}
                <circle cx="32" cy="55.5" r="0.9" fill="#78350f" />
                <circle cx="41" cy="60" r="0.9" fill="#78350f" />
                <circle cx="59" cy="60" r="0.9" fill="#78350f" />
                <circle cx="68" cy="55.5" r="0.9" fill="#78350f" />

                {/* Bab Al-Kaaba (The Sacred Gold Door on Right/Front Facade) */}
                <polygon points="57,64 69,58 69,76 57,82" fill="url(#goldDoor)" stroke="#fef08a" strokeWidth="0.5" />
                {/* Door Frame Inner Carving & Lock (Dabbah) */}
                <line x1="63" y1="61" x2="63" y2="79" stroke="#92400e" strokeWidth="0.5" />
                <circle cx="63" cy="71" r="0.8" fill="#fef08a" />

                {/* Mizab Ar-Rahmah (Golden Rain Water Spout on Roof Top) */}
                <line x1="42" y1="36" x2="38" y2="38" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />

                {/* Hajar Al-Aswad (Black Stone in Silver Casing) at Corner */}
                <ellipse cx="50" cy="85.5" rx="1.8" ry="2.2" fill="#e2e8f0" stroke="#475569" strokeWidth="0.5" />
                <circle cx="50" cy="85.5" r="1" fill="#09090b" />
              </svg>
            </div>

            {/* Dynamic Orbiting Pilgrims Container (Counter-Clockwise Tawaf) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                animation: `spinCounterClockwise ${tawafDuration} linear infinite`,
                pointerEvents: 'none'
              }}
            >
              {Array.from({ length: pilgrimOrbitCount }).map((_, i) => {
                const angle = (i / pilgrimOrbitCount) * (2 * Math.PI);
                const radius = 104;
                const center = 135;
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${x}px`,
                      top: `${y}px`,
                      width: '24px',
                      height: '24px',
                      marginLeft: '-12px',
                      marginTop: '-12px',
                      zIndex: 25
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        border: '2px solid #10b981',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 10px rgba(16, 185, 129, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: '#02120b',
                        fontWeight: 900,
                        animation: `spinClockwise ${tawafDuration} linear infinite`
                      }}
                      title={`Pilgrim #${i + 1}`}
                    >
                      👤
                    </div>
                  </div>
                );
              })}
            </div>

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

            {/* ROOM TYPE BEDDING SELECTION */}
            <div style={{ marginTop: '0.35rem', paddingTop: '0.45rem', borderTop: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#a7f3d0', fontWeight: 700, textTransform: 'uppercase' }}>
                  Room Bedding Type:
                </span>
                <span style={{ fontSize: '0.72rem', color: '#fef08a', fontWeight: 800 }}>
                  {roomType === 'double' ? 'Double (2-Sharing)' :
                   roomType === 'triple' ? 'Triple (3-Sharing)' :
                   roomType === 'quad' ? 'Quad (4-Sharing • Family)' :
                   roomType === 'sharing' ? 'Sharing (5-Sharing • Budget)' :
                   'Single VIP (Private)'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '0.35rem' }}>
                {[
                  { key: 'double', label: 'Double', beds: '2 Beds' },
                  { key: 'triple', label: 'Triple', beds: '3 Beds' },
                  { key: 'quad', label: 'Quad', beds: '4 Beds' },
                  { key: 'sharing', label: 'Sharing', beds: '5 Beds' },
                  { key: 'single', label: 'Single', beds: '1 Bed' },
                ].map((rt) => (
                  <button
                    key={rt.key}
                    type="button"
                    onClick={() => {
                      setRoomType(rt.key as any);
                      playChime(520, 'sine', 0.12);
                    }}
                    style={{
                      padding: '0.35rem 0.4rem',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: roomType === rt.key ? '1.5px solid #facc15' : '1px solid rgba(16, 185, 129, 0.3)',
                      backgroundColor: roomType === rt.key ? 'rgba(245, 158, 11, 0.25)' : 'rgba(6, 78, 59, 0.45)',
                      color: roomType === rt.key ? '#fef08a' : '#a7f3d0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.1rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{rt.label}</span>
                    <span style={{ fontSize: '0.6rem', color: roomType === rt.key ? '#6ee7b7' : 'rgba(167, 243, 208, 0.7)', fontWeight: 600 }}>
                      {rt.beds}
                    </span>
                  </button>
                ))}
              </div>
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
                {tier === 'luxury' 
                  ? '4/5★ Haram-facing' 
                  : tier === 'comfort' 
                  ? '2–4★ Walkable to Haram' 
                  : '1–3★ ~2km + Free Shuttle'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
              {(['economy', 'comfort', 'luxury'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTier(t);
                    playChime(580, 'sine', 0.12);
                  }}
                  style={{
                    padding: '0.45rem 0.25rem',
                    borderRadius: '8px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    backgroundColor: tier === t ? '#f59e0b' : 'rgba(6, 78, 59, 0.5)',
                    color: tier === t ? '#02120b' : '#a7f3d0'
                  }}
                >
                  <span style={{ fontWeight: 900 }}>
                    {t === 'economy' ? 'Economy (1–3★)' : t === 'comfort' ? 'Comfort (2–4★)' : 'Luxury (4/5★)'}
                  </span>
                  <span style={{ fontSize: '0.58rem', opacity: 0.88, fontWeight: 600 }}>
                    {t === 'economy' ? '~2km Shuttle' : t === 'comfort' ? 'Walk to Haram' : 'Haram Facing'}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.64rem', color: '#a7f3d0', opacity: 0.9, lineHeight: 1.25, textAlign: 'center', marginTop: '0.1rem' }}>
              {tier === 'economy' && 'Economy: 1–3 star hotel, ~2km away from Haram with free 24/7 shuttle bus service.'}
              {tier === 'comfort' && 'Comfort: 2–4 star hotel within walkable distance to the Holy Haram.'}
              {tier === 'luxury' && 'Luxury: 4/5 star hotel, premium Haram-facing with front-row access.'}
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
                Includes {persons} Visa{persons > 1 ? 's' : ''} + {rooms} {rooms > 1 ? 'Rooms' : 'Room'} ({roomType.toUpperCase()} Bedding • {makkahNights}N Makkah{includeMadinah ? ` + ${madinahNights}N Madinah` : ''}) + Ground Transfers
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
