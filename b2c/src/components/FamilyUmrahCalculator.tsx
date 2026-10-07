import { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  Building,
  Car,
  ShieldCheck,
  ChevronRight,
  Zap,
  Sparkles,
  Gift,
  Award
} from 'lucide-react';


const CURRENCY_RATES: Record<string, { symbol: string; rate: number; flag: string }> = {
  SAR: { symbol: 'SAR', rate: 1, flag: '🇸🇦' },
  INR: { symbol: '₹', rate: 22.8, flag: '🇮🇳' },
  USD: { symbol: '$', rate: 0.266, flag: '🇺🇸' },
  AED: { symbol: 'AED', rate: 0.98, flag: '🇦🇪' },
  EUR: { symbol: '€', rate: 0.245, flag: '🇪🇺' },
  GBP: { symbol: '£', rate: 0.21, flag: '🇬🇧' },
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
  const [includeMadinah, setIncludeMadinah] = useState<boolean>(false); // Default false as requested
  const [madinahSparkleTrigger, setMadinahSparkleTrigger] = useState<boolean>(false);

  // Accommodation Tier
  const [tier, setTier] = useState<'economy' | 'comfort' | 'luxury'>('comfort');
  const [currency, setCurrency] = useState<string>('SAR');

  // Nights split logic
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
      setTimeout(() => setMadinahSparkleTrigger(false), 2400);
    }
  };

  // Pricing Engine Calculation
  const { totalSAR, perPersonSAR, familySavingsSAR } = useMemo(() => {
    const tierRatePerNight = tier === 'luxury' ? 550 : tier === 'comfort' ? 360 : 220;
    const madinahTierRatePerNight = tier === 'luxury' ? 520 : tier === 'comfort' ? 330 : 200;

    // Room count needed for family (1 room up to 4 persons, 2 rooms for 5-8, etc.)
    const roomCount = Math.max(1, Math.ceil(persons / 4));

    // Stay Cost
    const makkahStay = makkahNights * tierRatePerNight * roomCount;
    const madinahStay = includeMadinah ? madinahNights * madinahTierRatePerNight * roomCount : 0;

    // Visa & Insurance per person
    const visaCost = 450 * persons;

    // Ground Transportation
    const transportBase = persons >= 4 ? 650 : 450;
    const madinahTransfer = includeMadinah ? (persons >= 4 ? 400 : 250) : 0;
    const transportTotal = transportBase + madinahTransfer;

    // Family bundle discount
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
  const tawafDuration = days <= 5 ? '9s' : days <= 10 ? '14s' : '20s';

  // Count of orbiting pilgrim dots around Kaaba
  const pilgrimOrbitCount = Math.min(persons, 12);

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
    <div style={{ width: '100%', maxWidth: '960px', margin: '0 auto', padding: '1rem', boxSizing: 'border-box' }}>
      
      {/* Top Header Bar for Calculator App */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          padding: '0.75rem 1.25rem',
          background: 'rgba(3, 20, 14, 0.75)',
          borderRadius: '16px',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBackToPortal && (
            <button
              type="button"
              onClick={onBackToPortal}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#a7f3d0',
                padding: '0.45rem 0.85rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ← All Packages
            </button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1rem' }}>🕋</span>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
                Family Umrah Package Calculator
              </h1>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'rgba(167, 243, 208, 0.75)' }}>
              Interactive Live Tawaf Simulator & VIP Price Engine
            </span>
          </div>
        </div>

        {/* Currency Switcher */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            backgroundColor: 'rgba(6, 78, 59, 0.5)',
            padding: '0.3rem',
            borderRadius: '14px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}
        >
          {Object.keys(CURRENCY_RATES).map((cKey) => {
            const c = CURRENCY_RATES[cKey];
            const isSelected = currency === cKey;
            return (
              <button
                key={cKey}
                type="button"
                onClick={() => setCurrency(cKey)}
                style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  border: 'none',
                  background: isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'transparent',
                  color: isSelected ? '#02120b' : 'rgba(167, 243, 208, 0.8)',
                  boxShadow: isSelected ? '0 2px 10px rgba(245, 158, 11, 0.4)' : 'none'
                }}
              >
                <span>{c.flag}</span>
                <span>{cKey}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main App Container */}
      <div 
        style={{
          position: 'relative',
          borderRadius: '28px',
          overflow: 'hidden',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.5), 0 0 50px rgba(19, 92, 70, 0.3)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          background: 'linear-gradient(180deg, #02120b 0%, #05261b 45%, #02100a 100%)',
          color: '#ffffff',
          padding: '2rem 1.5rem',
          boxSizing: 'border-box'
        }}
      >
        {/* Ambient Glow Aura */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            height: '350px',
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
            padding: '1rem 0 2rem 0',
            position: 'relative'
          }}
        >
          {/* Sparkle explosion on Madinah toggle */}
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
                  fontSize: '1rem',
                  padding: '0.75rem 1.75rem',
                  borderRadius: '50px',
                  border: '2px solid #facc15',
                  boxShadow: '0 0 35px rgba(250, 204, 21, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}
              >
                <Sparkles className="h-6 w-6 text-amber-300 animate-spin" />
                🕌 Madinah Al-Munawwarah Included! (+{madinahNights} Blessed Nights) ✨
              </div>
            </div>
          )}

          {/* Central Arena Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <span 
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '0.35rem 0.9rem',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Tawaf Visualizer &bull; {persons} Pilgrims Orbiting
            </span>
          </div>

          {/* Central Big Orbital Tawaf Arena */}
          <div 
            style={{
              position: 'relative',
              width: '320px',
              height: '320px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              margin: '0.5rem auto'
            }}
          >
            {/* Outer Celestial Orbit Track */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px dashed rgba(52, 211, 153, 0.35)',
                boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.08)'
              }} 
            />
            
            {/* Middle Tawaf Orbit Track */}
            <div 
              style={{
                position: 'absolute',
                width: '240px',
                height: '240px',
                borderRadius: '50%',
                border: '2px solid rgba(16, 185, 129, 0.3)'
              }} 
            />
            
            {/* Inner Tawaf Track */}
            <div 
              style={{
                position: 'absolute',
                width: '170px',
                height: '170px',
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
                width: '110px',
                height: '110px',
                background: 'linear-gradient(135deg, #09090b 0%, #1c1917 50%, #000000 100%)',
                borderRadius: '22px',
                border: '3px solid rgba(251, 191, 36, 0.9)',
                boxShadow: '0 0 35px rgba(251, 191, 36, 0.4), 0 15px 30px rgba(0,0,0,0.8)',
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
                  height: '12px',
                  background: 'linear-gradient(90deg, #fcd34d 0%, #fef08a 50%, #f59e0b 100%)',
                  position: 'absolute',
                  top: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.6)'
                }} 
              />
              <span style={{ fontSize: '2.4rem', marginTop: '0.85rem' }}>🕋</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#fcd34d', marginTop: '0.15rem' }}>
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
                        top: '-15px',
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
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 100%)',
                          color: '#02120b',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          border: '2px solid rgba(52, 211, 153, 0.9)'
                        }}
                      >
                        👤
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Madinah Green Dome Badge (Active only when selected) */}
            {includeMadinah && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  right: '-8px',
                  zIndex: 20,
                  background: 'linear-gradient(135deg, #065f46 0%, #115e59 100%)',
                  color: '#e6fffa',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '16px',
                  border: '1.5px solid rgba(52, 211, 153, 0.7)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  animation: 'float 3s ease-in-out infinite'
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>🕌</span>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#fef08a', lineHeight: 1.1 }}>
                    Madinah Added!
                  </strong>
                  <span style={{ fontSize: '0.68rem', color: '#a7f3d0' }}>{madinahNights} Blessed Nights</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Nights Breakdown Bar */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              marginTop: '1.25rem',
              backgroundColor: 'rgba(3, 20, 14, 0.6)',
              padding: '0.65rem 1.25rem',
              borderRadius: '20px',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600 }}>Makkah Stay</span>
              <strong style={{ color: '#fcd34d', fontSize: '0.88rem' }}>{makkahNights} Nights (Haram)</strong>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(16, 185, 129, 0.3)' }} />
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600 }}>Madinah Stay</span>
              <strong style={{ color: includeMadinah ? '#6ee7b7' : '#9ca3af', fontSize: '0.88rem' }}>
                {includeMadinah ? `${madinahNights} Nights` : '0 Nights (Not Added)'}
              </strong>
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 2: BOTTOM SLIDERS & INTERACTIVE CONTROLS
            ======================================================== */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.5rem'
          }}
        >
          {/* Slider 1: Pilgrims / Persons */}
          <div 
            style={{
              padding: '1.25rem',
              backgroundColor: 'rgba(2, 20, 14, 0.75)',
              borderRadius: '20px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderRadius: '12px' }}>
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <label style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', display: 'block' }}>
                    Number of Pilgrims
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                    {persons === 1 ? 'Solo Traveler' : persons === 2 ? 'Couple' : `Family of ${persons} Persons`}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '0.35rem 0.85rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'monospace', color: '#fde047' }}>{persons}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fef08a', textTransform: 'uppercase' }}>Pax</span>
              </div>
            </div>

            {/* Slider */}
            <div>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={persons}
                onChange={(e) => setPersons(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  height: '9px',
                  borderRadius: '10px',
                  accentColor: '#f59e0b',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(110, 231, 183, 0.75)', fontFamily: 'monospace', marginTop: '0.3rem' }}>
                <span>1 Person</span>
                <span>3 (Default)</span>
                <span>6 Family</span>
                <span>10+ Group</span>
                <span>15 Max</span>
              </div>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingTop: '0.2rem' }}>
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
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.15s ease',
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
              padding: '1.25rem',
              backgroundColor: 'rgba(2, 20, 14, 0.75)',
              borderRadius: '20px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '12px' }}>
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <label style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', display: 'block' }}>
                    Total Trip Duration
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                    {days} Days / {days - 1} Nights in Saudi
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.35rem 0.85rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'monospace', color: '#6ee7b7' }}>{days}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase' }}>Days</span>
              </div>
            </div>

            {/* Slider */}
            <div>
              <input
                type="range"
                min="3"
                max="28"
                step="1"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  height: '9px',
                  borderRadius: '10px',
                  accentColor: '#10b981',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(110, 231, 183, 0.75)', fontFamily: 'monospace', marginTop: '0.3rem' }}>
                <span>3 Days</span>
                <span>5 (Default)</span>
                <span>7 (Classic)</span>
                <span>14 (Sunnah)</span>
                <span>28 Max</span>
              </div>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingTop: '0.2rem' }}>
              {[
                { label: '3 Days (Quick)', val: 3 },
                { label: '5 Days (Default)', val: 5 },
                { label: '7 Days (Classic)', val: 7 },
                { label: '10 Days (Extended)', val: 10 },
                { label: '14 Days (Sunnah)', val: 14 },
                { label: '21 Days', val: 21 },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => setDays(chip.val)}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.15s ease',
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
            SECTION 3: HIGHLIGHTED MADINAH REWARD CARD & HOTEL TIER
            ======================================================== */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.75rem'
          }}
        >
          {/* Highlighted Madinah Inclusion (Catch / Freebie Perk Style) */}
          <div 
            onClick={() => handleToggleMadinah(!includeMadinah)}
            style={{
              padding: '1.25rem',
              backgroundColor: includeMadinah ? 'rgba(6, 78, 59, 0.8)' : 'rgba(2, 20, 14, 0.8)',
              borderRadius: '20px',
              border: includeMadinah ? '2px solid #facc15' : '2px dashed rgba(245, 158, 11, 0.6)',
              boxShadow: includeMadinah ? '0 0 25px rgba(250, 204, 21, 0.35)' : '0 4px 15px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              cursor: 'pointer',
              transition: 'all 0.25s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div 
                style={{ 
                  fontSize: '1.75rem',
                  backgroundColor: includeMadinah ? 'rgba(250, 204, 21, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                  padding: '0.6rem',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                🕌
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span 
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                      color: '#02120b',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Gift className="h-3 w-3" /> Special Bonus Perk
                  </span>
                </div>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff', display: 'block' }}>
                  Add Madinah Al-Munawwarah Visit
                </strong>
                <span style={{ fontSize: '0.75rem', color: includeMadinah ? '#fef08a' : 'rgba(167, 243, 208, 0.8)' }}>
                  {includeMadinah 
                    ? `✓ Included: ${madinahNights} Nights Stay + Intercity Coach` 
                    : '🎁 Click to include Madinah (Free Ziyarat & Roza Mubarak!)'}
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <div 
              style={{
                width: '52px',
                height: '28px',
                borderRadius: '28px',
                backgroundColor: includeMadinah ? '#10b981' : '#374151',
                position: 'relative',
                transition: '0.3s',
                flexShrink: 0
              }}
            >
              <div 
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  position: 'absolute',
                  top: '3px',
                  left: includeMadinah ? '27px' : '3px',
                  transition: '0.3s',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                }} 
              />
            </div>
          </div>

          {/* Hotel Tier Selection */}
          <div 
            style={{
              padding: '1.25rem',
              backgroundColor: 'rgba(2, 20, 14, 0.75)',
              borderRadius: '20px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.65rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building className="h-4 w-4 text-emerald-400" />
                <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 800 }}>Hotel Tier Category</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#fcd34d', fontWeight: 800 }}>
                {tier === 'luxury' ? '5★ Haram Front' : tier === 'comfort' ? '4★ Walking Distance' : '3★ Economy Saver'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.45rem' }}>
              {(['economy', 'comfort', 'luxury'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  style={{
                    padding: '0.55rem 0.25rem',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.15s ease',
                    backgroundColor: tier === t ? '#f59e0b' : 'rgba(6, 78, 59, 0.5)',
                    color: tier === t ? '#02120b' : '#a7f3d0',
                    boxShadow: tier === t ? '0 2px 10px rgba(245, 158, 11, 0.3)' : 'none'
                  }}
                >
                  {t === 'economy' ? '3★ Economy' : t === 'comfort' ? '4★ Comfort' : '5★ Luxury'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 4: GRAND PRIZE / REWARD STYLE PRICE CARD
            ======================================================== */}
        <div 
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '1.75rem',
            background: 'linear-gradient(135deg, #064e3b 0%, #022c22 60%, #064e3b 100%)',
            borderRadius: '24px',
            border: '2px solid #facc15',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.45), 0 0 30px rgba(250, 204, 21, 0.25)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem'
          }}
        >
          {/* Subtle Golden Shimmer Background Overlay */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '250px',
              height: '250px',
              background: 'radial-gradient(circle, rgba(250, 204, 21, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
          />

          {/* Left Reward & Prize Info */}
          <div style={{ position: 'relative', zIndex: 10, maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span 
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  color: '#02120b',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                }}
              >
                <Award className="h-3.5 w-3.5" />
                🏆 UNLOCKED BEST GUARANTEED RATE
              </span>
              <span 
                style={{
                  background: 'rgba(250, 204, 21, 0.2)',
                  color: '#fef08a',
                  border: '1px solid rgba(250, 204, 21, 0.4)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px'
                }}
              >
                💰 Instant Reward: Save {formattedSavings} {curr.symbol}
              </span>
            </div>

            {/* Total Prize Amount Display */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.25rem' }}>
              <span 
                style={{ 
                  fontSize: '2.4rem', 
                  fontWeight: 900, 
                  color: '#fef08a', 
                  letterSpacing: '-0.03em', 
                  textShadow: '0 2px 15px rgba(0,0,0,0.6)' 
                }}
              >
                {formattedTotal} {curr.symbol}
              </span>
              <span style={{ fontSize: '0.95rem', color: '#6ee7b7', fontWeight: 700 }}>
                (~{formattedPerPerson} {curr.symbol} / person)
              </span>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'rgba(167, 243, 208, 0.9)', margin: '0.4rem 0 0 0', lineHeight: '1.4' }}>
              ⭐ All-Inclusive Package: {persons} Visas & Insurance + {makkahNights}N Makkah {includeMadinah ? `+ ${madinahNights}N Madinah` : ''} + Transfers
            </p>
          </div>

          {/* Right Action CTA Button */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <button
              type="button"
              onClick={handleBookNow}
              style={{
                padding: '1.1rem 2.25rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1.05rem',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 6px 25px rgba(245, 158, 11, 0.55)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              Claim &amp; Book Package <ChevronRight className="h-6 w-6" style={{ strokeWidth: 3 }} />
            </button>
          </div>
        </div>

        {/* Feature Badges Footer */}
        <div 
          style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            fontSize: '0.78rem',
            color: 'rgba(167, 243, 208, 0.9)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>Ministry Verified Visas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span>Reserved Haram Stays</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>Private Family Transfers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span>Instant Confirmation</span>
          </div>
        </div>

      </div>
    </div>
  );
}
