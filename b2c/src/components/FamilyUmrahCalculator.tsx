import { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  Building,
  Car,
  ShieldCheck,
  ChevronRight,
  Zap,
  Compass
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
}

export function FamilyUmrahCalculator({ onProceedToBooking }: FamilyUmrahCalculatorProps) {
  // Primary Sliders
  const [persons, setPersons] = useState<number>(3); // Default 3
  const [days, setDays] = useState<number>(5); // Default 5
  const [includeMadinah, setIncludeMadinah] = useState<boolean>(true); // Default true
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
      setTimeout(() => setMadinahSparkleTrigger(false), 2200);
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

    // Ground Transportation
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

  // Dynamic Tawaf speed based on days
  const tawafDuration = days <= 5 ? '8s' : days <= 10 ? '14s' : '20s';

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
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '0 1rem' }}>
      {/* Interactive Main Calculator Card */}
      <div 
        style={{
          position: 'relative',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 40px rgba(19, 92, 70, 0.25)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'linear-gradient(180deg, #03140e 0%, #062b1e 50%, #02120b 100%)',
          color: '#ffffff',
          padding: '1.75rem',
          boxSizing: 'border-box'
        }}
      >
        {/* Background Decorative Glow */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '380px',
            height: '380px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
            transform: 'translate(30%, -30%)'
          }}
        />
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '380px',
            height: '380px',
            background: 'radial-gradient(circle, rgba(217, 119, 6, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
            transform: 'translate(-30%, 30%)'
          }}
        />

        {/* Header Ribbon & Currency Switcher */}
        <div 
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
            paddingBottom: '1.25rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span 
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  color: '#02120b',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                }}
              >
                ✨ Interactive Simulator
              </span>
              <span 
                style={{
                  background: 'rgba(6, 78, 59, 0.6)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px'
                }}
              >
                🕋 Direct B2C Umrah Portal
              </span>
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
              Family Umrah Package Calculator
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(167, 243, 208, 0.8)', margin: '0.25rem 0 0 0' }}>
              Slide pilgrims, adjust days, and watch the live Tawaf visualizer calculate your instant VIP package.
            </p>
          </div>

          {/* Currency Switcher */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(6, 78, 59, 0.6)',
              padding: '0.35rem',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              backdropFilter: 'blur(8px)'
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
                    padding: '0.3rem 0.65rem',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.2s ease',
                    border: 'none',
                    background: isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'transparent',
                    color: isSelected ? '#02120b' : 'rgba(167, 243, 208, 0.8)',
                    boxShadow: isSelected ? '0 2px 10px rgba(245, 158, 11, 0.4)' : 'none',
                    transform: isSelected ? 'scale(1.04)' : 'scale(1)'
                  }}
                >
                  <span>{c.flag}</span>
                  <span>{cKey}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Game-Like Dual Arena (Left: Visual Tawaf Orbit, Right: Live Cost & Sliders) */}
        <div 
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.75rem',
            paddingTop: '1.5rem',
            alignItems: 'center'
          }}
        >
          {/* LEFT: 3D-Styled Tawaf Orbit Visualizer */}
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              backgroundColor: 'rgba(2, 20, 14, 0.7)',
              borderRadius: '20px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Sparkle explosion on Madinah toggle */}
            {madinahSparkleTrigger && (
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'sparkleBurst 1.8s ease-out forwards'
                }}
              >
                <div 
                  style={{
                    backgroundColor: 'rgba(3, 18, 12, 0.95)',
                    color: '#fef08a',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '50px',
                    border: '1px solid #facc15',
                    boxShadow: '0 0 25px rgba(250, 204, 21, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  ✨ Madinah Al-Munawwarah Added! 🕌
                </div>
              </div>
            )}

            {/* Visualizer Status Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
              <span style={{ color: '#6ee7b7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Compass className="h-4 w-4 text-amber-400" style={{ animation: 'spin 18s linear infinite' }} />
                Tawaf Simulation
              </span>
              <span 
                style={{
                  fontSize: '0.7rem',
                  color: '#fcd34d',
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(251, 191, 36, 0.15)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(251, 191, 36, 0.3)'
                }}
              >
                {persons} Pilgrims in Tawaf
              </span>
            </div>

            {/* Central Orbital Arena */}
            <div 
              style={{
                position: 'relative',
                width: '260px',
                height: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0.5rem 0',
                userSelect: 'none'
              }}
            >
              {/* Outer Day Orbit Track */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '1px dashed rgba(52, 211, 153, 0.35)',
                  opacity: 0.7
                }} 
              />
              
              {/* Middle Tawaf Orbit Track */}
              <div 
                style={{
                  position: 'absolute',
                  width: '190px',
                  height: '190px',
                  borderRadius: '50%',
                  border: '2px solid rgba(16, 185, 129, 0.25)'
                }} 
              />
              
              {/* Inner Tawaf Track */}
              <div 
                style={{
                  position: 'absolute',
                  width: '135px',
                  height: '135px',
                  borderRadius: '50%',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  backgroundColor: 'rgba(6, 78, 59, 0.2)'
                }} 
              />

              {/* Central Sacred Kaaba Emblem */}
              <div 
                style={{
                  position: 'relative',
                  zIndex: 10,
                  width: '84px',
                  height: '84px',
                  background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #000000 100%)',
                  borderRadius: '16px',
                  border: '2px solid rgba(251, 191, 36, 0.85)',
                  boxShadow: '0 0 25px rgba(251, 191, 36, 0.3), 0 10px 20px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  animation: 'pulseGlow 3s ease-in-out infinite'
                }}
              >
                {/* Gold Kiswah Band */}
                <div 
                  style={{
                    width: '100%',
                    height: '9px',
                    background: 'linear-gradient(90deg, #fcd34d 0%, #fef08a 50%, #f59e0b 100%)',
                    position: 'absolute',
                    top: '9px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                  }} 
                />
                <span style={{ fontSize: '1.75rem', marginTop: '0.65rem' }}>🕋</span>
                <span style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#fcd34d', marginTop: '0.1rem' }}>
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
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                            border: '1.5px solid rgba(52, 211, 153, 0.8)'
                          }}
                        >
                          👤
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Madinah Green Dome Indicator (When toggled) */}
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
                    border: '1px solid rgba(52, 211, 153, 0.6)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.72rem',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>🕌</span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#fef08a', lineHeight: 1.1 }}>Madinah Included</strong>
                    <span style={{ fontSize: '0.62rem', color: '#a7f3d0' }}>{madinahNights} Blessed Nights</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Live Snapshot Badge */}
            <div style={{ width: '100%', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(16, 185, 129, 0.2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
              <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.4)', padding: '0.5rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 600 }}>Stay in Makkah</span>
                <strong style={{ color: '#fcd34d', fontSize: '0.78rem' }}>{makkahNights} Nights (Haram)</strong>
              </div>
              <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.4)', padding: '0.5rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 600 }}>Stay in Madinah</span>
                <strong style={{ color: '#6ee7b7', fontSize: '0.78rem' }}>
                  {includeMadinah ? `${madinahNights} Nights` : '0 Nights'}
                </strong>
              </div>
            </div>
          </div>

          {/* RIGHT: Dynamic Sliders & Real-Time Price Deck */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            
            {/* Control 1: Persons Slider (Default 3) */}
            <div 
              style={{
                padding: '1.1rem',
                backgroundColor: 'rgba(2, 20, 14, 0.7)',
                borderRadius: '16px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ padding: '0.45rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderRadius: '10px' }}>
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', display: 'block' }}>
                      Number of Pilgrims (Family Members)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                      {persons === 1 ? 'Individual Solo Traveler' : persons === 2 ? 'Couple Pilgrimage' : `Family Group of ${persons} Persons`}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '0.3rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#fde047' }}>{persons}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fef08a', textTransform: 'uppercase' }}>Pax</span>
                </div>
              </div>

              {/* Slider Track */}
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
                    height: '8px',
                    borderRadius: '8px',
                    accentColor: '#f59e0b',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(110, 231, 183, 0.7)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                  <span>1 Person</span>
                  <span>3 (Default)</span>
                  <span>6 Family</span>
                  <span>10+ Group</span>
                  <span>15 Max</span>
                </div>
              </div>

              {/* Quick Chip Presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingTop: '0.2rem' }}>
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
                    onClick={() => setPersons(chip.val)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
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

            {/* Control 2: Days Slider (Default 5) */}
            <div 
              style={{
                padding: '1.1rem',
                backgroundColor: 'rgba(2, 20, 14, 0.7)',
                borderRadius: '16px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ padding: '0.45rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '10px' }}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', display: 'block' }}>
                      Total Duration (Days of Stay)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                      {days} Days / {days - 1} Nights in Holy Cities
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.3rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#6ee7b7' }}>{days}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase' }}>Days</span>
                </div>
              </div>

              {/* Slider Track */}
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
                    height: '8px',
                    borderRadius: '8px',
                    accentColor: '#10b981',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(110, 231, 183, 0.7)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                  <span>3 Days</span>
                  <span>5 (Express)</span>
                  <span>7 (Classic)</span>
                  <span>14 (Sunnah)</span>
                  <span>28 Max</span>
                </div>
              </div>

              {/* Quick Chip Presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingTop: '0.2rem' }}>
                {[
                  { label: '3 Days', val: 3 },
                  { label: '5 Days (Express)', val: 5 },
                  { label: '7 Days (Classic)', val: 7 },
                  { label: '10 Days', val: 10 },
                  { label: '14 Days (Sunnah)', val: 14 },
                  { label: '21 Days', val: 21 },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => setDays(chip.val)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
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

            {/* Control 3: Madinah Visit Toggle & Hotel Tier */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.85rem'
              }}
            >
              {/* Madinah Selector Switch */}
              <div 
                style={{
                  padding: '0.9rem',
                  backgroundColor: 'rgba(2, 20, 14, 0.7)',
                  borderRadius: '16px',
                  border: includeMadinah ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: '1.25rem' }}>🕌</div>
                  <div>
                    <strong style={{ fontSize: '0.82rem', color: '#ffffff', display: 'block' }}>Visit Madinah</strong>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(167, 243, 208, 0.8)' }}>
                      {includeMadinah ? `${madinahNights} Nights included` : 'Makkah Only'}
                    </span>
                  </div>
                </div>

                <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={includeMadinah} 
                    onChange={(e) => handleToggleMadinah(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span 
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: includeMadinah ? '#10b981' : '#374151',
                      transition: '0.3s',
                      borderRadius: '24px'
                    }}
                  >
                    <span 
                      style={{
                        position: 'absolute',
                        content: '""',
                        height: '18px',
                        width: '18px',
                        left: includeMadinah ? '24px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '0.3s',
                        borderRadius: '50%'
                      }}
                    />
                  </span>
                </label>
              </div>

              {/* Hotel Tier Selection */}
              <div 
                style={{
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'rgba(2, 20, 14, 0.7)',
                  borderRadius: '16px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Hotel Standard</span>
                  <span style={{ fontSize: '0.72rem', color: '#fcd34d', fontWeight: 700 }}>
                    {tier === 'luxury' ? '5★ Haram View' : tier === 'comfort' ? '4★ Walking Dist' : '3★ Economy'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
                  {(['economy', 'comfort', 'luxury'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTier(t)}
                      style={{
                        padding: '0.35rem 0.2rem',
                        borderRadius: '8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        border: 'none',
                        transition: 'all 0.15s ease',
                        backgroundColor: tier === t ? '#f59e0b' : 'rgba(6, 78, 59, 0.5)',
                        color: tier === t ? '#02120b' : '#a7f3d0'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* LIVE TOTAL COST & PROCEED TO BOOK CTA */}
            <div 
              style={{
                marginTop: '0.35rem',
                padding: '1.25rem',
                background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.9) 0%, rgba(4, 47, 36, 0.95) 100%)',
                borderRadius: '18px',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Total Package</span>
                  <span 
                    style={{
                      fontSize: '0.65rem',
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#fef08a',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px',
                      fontWeight: 700
                    }}
                  >
                    Save {formattedSavings} {curr.symbol}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.85rem', fontWeight: 900, color: '#fef08a', letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                    {formattedTotal} {curr.symbol}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>
                    (~{formattedPerPerson} {curr.symbol} / person)
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'rgba(167, 243, 208, 0.75)' }}>
                  Includes Visas + {makkahNights}N Makkah {includeMadinah ? `+ ${madinahNights}N Madinah` : ''} + Transfers
                </span>
              </div>

              <button
                type="button"
                onClick={handleBookNow}
                style={{
                  padding: '0.85rem 1.65rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase'
                }}
              >
                Book Package <ChevronRight className="h-5 w-5" style={{ strokeWidth: 3 }} />
              </button>
            </div>

          </div>
        </div>

        {/* Feature Highlights Footer Badges */}
        <div 
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.75rem',
            color: 'rgba(167, 243, 208, 0.9)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>Ministry Verified Visas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Building className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span>Reserved Haram Stays</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Car className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>Private Family Transfers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Zap className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span>Instant Confirmation</span>
          </div>
        </div>

      </div>
    </div>
  );
}
