import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  Car, 
  Footprints, 
  MapPin, 
  Sparkles, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  Navigation,
  Compass,
  ArrowRight
} from 'lucide-react';

interface RouteStage {
  id: string;
  stepNum: number;
  mode: 'flight' | 'van' | 'walk' | 'van_mountain' | 'van_train';
  modeLabel: string;
  vehicleType: string;
  title: string;
  fromLocation: string;
  toLocation: string;
  distance: string;
  duration: string;
  tag: string;
  summary: string;
  practicalTipForIndians: string;
  spiritualEtiquette: string;
  mapCoords: { x: number; y: number }; // Percentage on SVG canvas
  accentColor: string;
}

const ROUTE_STAGES: RouteStage[] = [
  {
    id: 'stage-1',
    stepNum: 1,
    mode: 'flight',
    modeLabel: 'Air Flight',
    vehicleType: 'Direct / 1-Stop Commercial Flight (Saudia, Air India, IndiGo, Emirates, Flynas)',
    title: 'Flight from India to Jeddah Airport',
    fromLocation: 'India (Mumbai, Delhi, Calicut, Hyderabad, Bangalore, Cochin)',
    toLocation: 'Jeddah — King Abdulaziz International Airport (JED)',
    distance: '3,450 km across Arabian Sea',
    duration: '4.5 to 5.5 Hours Flight',
    tag: 'Flight from India',
    summary: 'Board your international flight in India. As your aircraft flies across the Arabian Sea, the flight captain will announce the Miqat boundary (Qarn al-Manazil / Yalamlam) approximately 30 minutes before landing.',
    practicalTipForIndians: 'Put on your two-piece white Ihram sheets at your home airport before boarding or in the airplane lavatory 1 hour prior to reaching Miqat. Declare your Umrah Niyyah (intention) as instructed by the captain.',
    spiritualEtiquette: 'Recite the Talbiyah loudly and continuously once entering Ihram: "Labbayka Allahumma Labbayk, Labbayka Laa Shareeka Laka Labbayk..."',
    mapCoords: { x: 78, y: 55 },
    accentColor: '#FFD700'
  },
  {
    id: 'stage-2',
    stepNum: 2,
    mode: 'van',
    modeLabel: 'Private AC Van',
    vehicleType: 'Air-Conditioned Private Van / Toyota HiAce / Hyundai Staria / VIP GMC Yukon',
    title: 'AC Van Transfer: Jeddah Airport to Makkah Hotel',
    fromLocation: 'Jeddah Airport Hajj/Umrah Terminal',
    toLocation: 'Makkah Al-Mukarramah (Haram Hotel)',
    distance: '75 km via Jeddah-Makkah Expressway',
    duration: '60 to 75 Minutes Drive',
    tag: 'Jeddah to Makkah Van',
    summary: 'Upon landing at Jeddah, clear the dedicated electronic Umrah immigration counters. Your private Moulavi chauffeur receives your family right at the arrival terminal with chilled Zamzam and helps load luggage into your private AC van.',
    practicalTipForIndians: 'Drive through the iconic Quran Gate (Bawwabat Makkah) marking the sacred boundary. Check into your hotel, freshen up with wudu, and leave luggage securely before proceeding to the Haram.',
    spiritualEtiquette: 'Maintain your state of Ihram strictly during the drive. Keep reciting Talbiyah together as a family until you gaze upon the Holy Kaaba.',
    mapCoords: { x: 30, y: 58 },
    accentColor: '#F59E0B'
  },
  {
    id: 'stage-3',
    stepNum: 3,
    mode: 'walk',
    modeLabel: 'Walking for Haram',
    vehicleType: 'Reverent Walking in White Ihram through King Abdulaziz / King Fahd Gates',
    title: 'Holy Umrah Rites: Tawaf, Zamzam & Sa\'i',
    fromLocation: 'Makkah Hotel Courtyard',
    toLocation: 'Masjid Al-Haram (The Holy Kaaba)',
    distance: 'Walking distance (100m - 400m from 5★ hotel)',
    duration: '2.5 to 3.5 Hours for Complete Umrah',
    tag: 'Holy Umrah Walking',
    summary: 'Enter Masjid Al-Haram with your right foot making the supplication of entering the mosque. Walk into the Mataf for 7 rounds of Tawaf around the Kaaba, pray 2 rakats behind Maqam Ibrahim, drink cool Zamzam water, complete 7 laps of Sa\'i between Safa and Marwah, and perform Halq/Taqseer (hair trimming).',
    practicalTipForIndians: 'Wheelchairs with official pushers are available on the upper mezzanine floor for elderly parents. Carry a light drawstring bag for your sandals and a small water bottle.',
    spiritualEtiquette: 'Upon first seeing the Holy Kaaba, stop and make heartfelt Dua—prayers are readily answered at this blessed moment. Umrah is now fulfilled with immense rewards!',
    mapCoords: { x: 32, y: 64 },
    accentColor: '#10B981'
  },
  {
    id: 'stage-4',
    stepNum: 4,
    mode: 'van_mountain',
    modeLabel: 'AC Tour Van',
    vehicleType: 'Comfort AC Van with Experienced Multilingual Urdu/Malayalam/Hindi Guide',
    title: 'AC Van for Taif Mountain Trip & Makkah Ziyarat',
    fromLocation: 'Makkah Hotel',
    toLocation: 'Taif Mountain Valley & Makkah Historical Sites',
    distance: '85 km scenic highway to Taif + Local Makkah Ziyarat',
    duration: 'Full Day Excursion (8 AM to 6 PM)',
    tag: 'Taif & Ziyarat Van',
    summary: 'A private full-day tour in a spacious AC Van. Visit Cave of Hira at Jabal Al-Noor, Cave of Thawr, Mina, Arafat, and Muzdalifah. Then take the picturesque Al-Hada mountain road up to the cool highlands of Taif.',
    practicalTipForIndians: 'Visit the historic Masjid Abdullah Ibn Abbas in Taif, fragrant Taif rose water distilleries, and the famous mountain fruit markets. If intending a 2nd Umrah, enter Ihram at Miqat Qarn al-Manazil on the return descent.',
    spiritualEtiquette: 'Reflect upon the Prophet’s ﷺ profound patience and mercy during his historic visit to Taif, sending continuous blessings (Salawat).',
    mapCoords: { x: 42, y: 72 },
    accentColor: '#8B5CF6'
  },
  {
    id: 'stage-5',
    stepNum: 5,
    mode: 'van_train',
    modeLabel: 'AC Van / High-Speed Train',
    vehicleType: 'Private AC Van / 300 km/h Haramain Bullet Train',
    title: 'Journey to Madinah Al-Munawwarah',
    fromLocation: 'Makkah Al-Mukarramah',
    toLocation: 'Madinah — Al-Masjid An-Nabawi (City of the Prophet ﷺ)',
    distance: '420 km via Hijrah Highway (or 2h 10m Bullet Train)',
    duration: '3.5 - 4 Hours by Van / 2 Hours by Bullet Train',
    tag: 'Makkah to Madinah Van',
    summary: 'Travel in relaxed comfort from Makkah to the illuminated city of Madinah. Arrive at your hotel facing the Prophet’s Mosque. Greet the Messenger of Allah ﷺ at the Golden Grill and pray in the Garden of Paradise (Rawdah Ash-Sharifah).',
    practicalTipForIndians: 'Our team assists you with pre-booking your Rawdah Ash-Sharifah permit slots on the official Nusuk app. In Madinah, enjoy local ziyarat to Masjid Quba (reward of full Umrah) and Mount Uhud.',
    spiritualEtiquette: 'Send peace and blessings upon Prophet Muhammad ﷺ and his companions Abu Bakr and Umar (RA) with deep love, modesty, and reverence.',
    mapCoords: { x: 30, y: 28 },
    accentColor: '#D4AF37'
  }
];

interface IndiaToHaramRouteMapProps {
  onPlanTrip?: () => void;
}

export const IndiaToHaramRouteMap: React.FC<IndiaToHaramRouteMapProps> = ({ onPlanTrip }) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const currentStage = ROUTE_STAGES[activeStepIndex];

  // Auto-play timer for smooth narrative tour
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % ROUTE_STAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <section className="india-map-section">
      <div className="india-map-wrapper">
        
        {/* Section Header */}
        <div className="india-map-header">
          <div className="india-map-badge">
            <Compass className="h-3.5 w-3.5 text-amber-300" />
            <span>Interactive Pilgrim Route Map</span>
          </div>

          <h2 className="india-map-title">
            From India to Makkah &amp; Madinah: <span className="gold-shimmer-text">Your Complete Journey</span>
          </h2>

          <p className="india-map-subtitle">
            Follow the visual travel route: Flights from Indian cities, private AC van transfers, walking for Umrah at the Holy Kaaba, Taif mountain ziyarat, and travel to Madinah.
          </p>
        </div>

        {/* Interactive Step Navigation Bar */}
        <div className="india-step-pills-bar">
          {ROUTE_STAGES.map((stage, idx) => {
            const isActive = idx === activeStepIndex;
            return (
              <button
                key={stage.id}
                type="button"
                className={`india-step-pill ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveStepIndex(idx);
                  setIsPlaying(false);
                }}
              >
                <span className="step-pill-num">{stage.stepNum}</span>
                <span className="step-pill-icon">
                  {stage.mode === 'flight' && <Plane className="h-3.5 w-3.5" />}
                  {stage.mode === 'van' && <Car className="h-3.5 w-3.5" />}
                  {stage.mode === 'walk' && <Footprints className="h-3.5 w-3.5" />}
                  {stage.mode === 'van_mountain' && <Car className="h-3.5 w-3.5" />}
                  {stage.mode === 'van_train' && <Navigation className="h-3.5 w-3.5" />}
                </span>
                <span className="step-pill-label">{stage.tag}</span>
              </button>
            );
          })}
        </div>

        {/* 2D Graphical Vector Map Arena */}
        <div className="india-map-canvas-container">
          
          {/* Top Controls: Play/Pause/Reset */}
          <div className="map-canvas-overlay-controls">
            <button 
              type="button"
              className="map-control-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause auto-animation" : "Play animated route"}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5 text-amber-400" />
                  <span>Pause Route</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-amber-400" />
                  <span>Animate Route</span>
                </>
              )}
            </button>

            <button 
              type="button"
              className="map-control-btn"
              onClick={() => {
                setActiveStepIndex(0);
                setIsPlaying(true);
              }}
              title="Restart from India"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-300" />
              <span>Restart</span>
            </button>
          </div>

          {/* SVG Stylized 2D Map Canvas */}
          <svg 
            className="india-route-svg"
            viewBox="0 0 1000 520" 
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="#C59A4E" />
                <stop offset="100%" stopColor="#AA771C" />
              </linearGradient>

              <linearGradient id="flightCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#C59A4E" />
              </linearGradient>

              <linearGradient id="ksaGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0B231A" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#05140F" stopOpacity="0.6" />
              </linearGradient>

              <linearGradient id="indiaGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0F172A" stopOpacity="0.6" />
              </linearGradient>

              {/* Vehicle Glow filter */}
              <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Sea & Waves Grid */}
            <rect width="1000" height="520" fill="#060F18" rx="16" />
            <path d="M 0,130 Q 250,110 500,140 T 1000,120" stroke="rgba(255,255,255,0.03)" strokeWidth="1" fill="none" />
            <path d="M 0,260 Q 250,240 500,270 T 1000,250" stroke="rgba(255,255,255,0.03)" strokeWidth="1" fill="none" />
            <path d="M 0,390 Q 250,370 500,400 T 1000,380" stroke="rgba(255,255,255,0.03)" strokeWidth="1" fill="none" />

            {/* Arabian Sea Label */}
            <text x="560" y="320" fill="rgba(255,215,0,0.12)" fontSize="18" fontWeight="800" letterSpacing="6" fontFamily="sans-serif">
              ARABIAN SEA
            </text>

            {/* Left Landmass: Arabian Peninsula (2D Stylized Solid Silhouette) */}
            <path 
              d="M 120,40 
                 C 180,60 260,80 320,120 
                 C 360,150 400,210 390,280 
                 C 380,340 340,410 260,470 
                 C 190,490 140,460 110,410 
                 C 80,360 70,290 85,210 
                 C 95,140 100,70 120,40 Z"
              fill="url(#ksaGlow)"
              stroke="rgba(197, 154, 78, 0.3)"
              strokeWidth="1.5"
            />
            <text x="170" y="100" fill="rgba(212, 175, 55, 0.4)" fontSize="12" fontWeight="700" letterSpacing="3">
              SAUDI ARABIA (HIJAZ)
            </text>

            {/* Right Landmass: Indian Subcontinent (2D Stylized Solid Silhouette) */}
            <path 
              d="M 780,50 
                 C 850,55 930,80 970,120 
                 C 980,180 960,250 940,310 
                 C 910,380 870,450 830,490 
                 C 810,480 790,430 780,380 
                 C 760,330 730,280 735,220 
                 C 740,160 750,90 780,50 Z"
              fill="url(#indiaGlow)"
              stroke="rgba(148, 163, 184, 0.35)"
              strokeWidth="1.5"
            />
            <text x="820" y="100" fill="rgba(255, 255, 255, 0.45)" fontSize="13" fontWeight="800" letterSpacing="3">
              INDIA
            </text>

            {/* Indian Departure Hub City Dots */}
            <g id="indian-cities">
              {/* Delhi */}
              <circle cx="820" cy="130" r="4" fill="#94A3B8" />
              <text x="830" y="134" fill="#CBD5E1" fontSize="10" fontWeight="600">Delhi (DEL)</text>

              {/* Mumbai */}
              <circle cx="770" cy="240" r="5" fill="#FFD700" />
              <circle cx="770" cy="240" r="10" fill="none" stroke="rgba(255,215,0,0.4)" strokeWidth="1" />
              <text x="705" y="244" fill="#FFD700" fontSize="11" fontWeight="700">Mumbai (BOM)</text>

              {/* Hyderabad */}
              <circle cx="820" cy="280" r="4" fill="#94A3B8" />
              <text x="830" y="284" fill="#CBD5E1" fontSize="10" fontWeight="600">Hyderabad (HYD)</text>

              {/* Bangalore */}
              <circle cx="810" cy="340" r="4" fill="#94A3B8" />
              <text x="820" y="344" fill="#CBD5E1" fontSize="10" fontWeight="600">Bangalore (BLR)</text>

              {/* Calicut / Cochin (Kerala Hub) */}
              <circle cx="790" cy="380" r="5" fill="#10B981" />
              <text x="710" y="385" fill="#34D399" fontSize="11" fontWeight="700">Calicut / Cochin</text>
            </g>

            {/* Key Routes in Saudi Arabia */}

            {/* Route A: Flight Arc from India (Mumbai x:770, y:240) to Jeddah (x:170, y:300) */}
            <path 
              id="flightPathArc"
              d="M 770,240 Q 470,120 170,300"
              fill="none"
              stroke={activeStepIndex === 0 ? "url(#goldGradient)" : "rgba(255, 215, 0, 0.25)"}
              strokeWidth={activeStepIndex === 0 ? "3.5" : "1.8"}
              strokeDasharray={activeStepIndex === 0 ? "8,4" : "4,4"}
            />

            {/* Route B: Jeddah to Makkah Highway (170,300 to 220,340) */}
            <path 
              id="jeddahMakkahHwy"
              d="M 170,300 Q 195,315 220,340"
              fill="none"
              stroke={activeStepIndex === 1 ? "#F59E0B" : "rgba(245, 158, 11, 0.35)"}
              strokeWidth={activeStepIndex === 1 ? "4" : "2"}
            />

            {/* Route C: Walking Umrah inside Haram (Makkah Kaaba focal aura) */}
            <circle 
              cx="220" 
              cy="340" 
              r={activeStepIndex === 2 ? "18" : "12"} 
              fill={activeStepIndex === 2 ? "rgba(16, 185, 129, 0.25)" : "none"}
              stroke="#10B981"
              strokeWidth={activeStepIndex === 2 ? "2.5" : "1.2"}
              strokeDasharray="4,3"
            />

            {/* Route D: Makkah to Taif Mountain Route (220,340 to 280,390) */}
            <path 
              id="makkahTaifHwy"
              d="M 220,340 Q 245,385 280,390"
              fill="none"
              stroke={activeStepIndex === 3 ? "#8B5CF6" : "rgba(139, 92, 246, 0.35)"}
              strokeWidth={activeStepIndex === 3 ? "4" : "2"}
              strokeDasharray="5,3"
            />

            {/* Route E: Makkah to Madinah (220,340 north to 190,160) */}
            <path 
              id="makkahMadinahHwy"
              d="M 220,340 Q 185,250 190,160"
              fill="none"
              stroke={activeStepIndex === 4 ? "#FFD700" : "rgba(255, 215, 0, 0.35)"}
              strokeWidth={activeStepIndex === 4 ? "4" : "2"}
            />

            {/* Destination Landmarks in KSA */}

            {/* Jeddah (JED) */}
            <g id="node-jeddah" transform="translate(170, 300)">
              <circle cx="0" cy="0" r="8" fill="#F59E0B" />
              <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(245, 158, 11, 0.5)" strokeWidth="1" />
              <text x="-15" y="-14" fill="#FDE68A" fontSize="11" fontWeight="800">JEDDAH</text>
              <text x="-25" y="24" fill="#94A3B8" fontSize="9">Airport (JED)</text>
            </g>

            {/* Makkah Al-Mukarramah (Kaaba 🕋) */}
            <g id="node-makkah" transform="translate(220, 340)">
              <circle cx="0" cy="0" r={activeStepIndex === 2 ? "12" : "9"} fill="#10B981" />
              <circle cx="0" cy="0" r={activeStepIndex === 2 ? "22" : "15"} fill="none" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="1.5" />
              {/* Kaaba Symbol Cube */}
              <rect x="-4" y="-4" width="8" height="8" fill="#000000" stroke="#FFD700" strokeWidth="1" />
              <text x="18" y="4" fill="#34D399" fontSize="12" fontWeight="900">MAKKAH</text>
              <text x="18" y="16" fill="#F1F5F9" fontSize="9">Masjid Al-Haram 🕋</text>
            </g>

            {/* Taif 🏔️ */}
            <g id="node-taif" transform="translate(280, 390)">
              <circle cx="0" cy="0" r="7" fill="#8B5CF6" />
              <circle cx="0" cy="0" r="12" fill="none" stroke="rgba(139, 92, 246, 0.5)" strokeWidth="1" />
              <text x="14" y="4" fill="#C4B5FD" fontSize="11" fontWeight="800">TAIF</text>
              <text x="14" y="16" fill="#E2E8F0" fontSize="9">Mountain &amp; Ziyarat 🏔️</text>
            </g>

            {/* Madinah Al-Munawwarah (Prophet's Mosque 🕌) */}
            <g id="node-madinah" transform="translate(190, 160)">
              <circle cx="0" cy="0" r={activeStepIndex === 4 ? "12" : "9"} fill="#FFD700" />
              <circle cx="0" cy="0" r={activeStepIndex === 4 ? "22" : "15"} fill="none" stroke="rgba(255, 215, 0, 0.6)" strokeWidth="1.5" />
              {/* Green Dome representation */}
              <circle cx="0" cy="-2" r="4" fill="#065F46" stroke="#FFD700" strokeWidth="0.8" />
              <text x="-70" y="-12" fill="#FDE047" fontSize="12" fontWeight="900">MADINAH</text>
              <text x="-95" y="3" fill="#F1F5F9" fontSize="9">Prophet’s Mosque 🕌</text>
            </g>

            {/* Active Moving 2D Solid Vehicle Representation */}
            {activeStepIndex === 0 && (
              /* Flight over the Arabian Sea */
              <g transform="translate(480, 190)" filter="url(#glowFilter)">
                <circle cx="0" cy="0" r="22" fill="#FFD700" fillOpacity="0.25" />
                <circle cx="0" cy="0" r="14" fill="#FFD700" />
                {/* Airplane Vector */}
                <path 
                  d="M -6,0 L 0,-6 L 6,0 L 2,2 L 2,6 L -2,6 L -2,2 Z" 
                  fill="#0A1C2A" 
                  transform="rotate(-15)"
                />
                <text x="22" y="5" fill="#FFD700" fontSize="11" fontWeight="800">
                  ✈️ Air Flight (~4.5 hrs)
                </text>
              </g>
            )}

            {activeStepIndex === 1 && (
              /* AC Van: Jeddah to Makkah Highway */
              <g transform="translate(195, 318)" filter="url(#glowFilter)">
                <circle cx="0" cy="0" r="18" fill="#F59E0B" fillOpacity="0.25" />
                <circle cx="0" cy="0" r="12" fill="#F59E0B" />
                {/* Van symbol */}
                <rect x="-5" y="-3" width="10" height="6" rx="2" fill="#0A1C2A" />
                <circle cx="-3" cy="3" r="1.5" fill="#FFD700" />
                <circle cx="3" cy="3" r="1.5" fill="#FFD700" />
                <text x="18" y="4" fill="#F59E0B" fontSize="11" fontWeight="800">
                  🚐 Private AC Van (75 km)
                </text>
              </g>
            )}

            {activeStepIndex === 2 && (
              /* Walking: Haram & Kaaba Tawaf */
              <g transform="translate(220, 368)" filter="url(#glowFilter)">
                <circle cx="0" cy="0" r="16" fill="#10B981" fillOpacity="0.3" />
                <circle cx="0" cy="0" r="10" fill="#10B981" />
                {/* Pilgrim in white Ihram */}
                <circle cx="0" cy="-2" r="2" fill="#FFFFFF" />
                <rect x="-2" y="0" width="4" height="5" rx="1" fill="#FFFFFF" />
                <text x="18" y="4" fill="#34D399" fontSize="11" fontWeight="800">
                  🚶‍♂️ Walking: Umrah Tawaf &amp; Sa&apos;i
                </text>
              </g>
            )}

            {activeStepIndex === 3 && (
              /* Van: Taif Mountain Drive */
              <g transform="translate(250, 365)" filter="url(#glowFilter)">
                <circle cx="0" cy="0" r="18" fill="#8B5CF6" fillOpacity="0.25" />
                <circle cx="0" cy="0" r="12" fill="#8B5CF6" />
                <rect x="-5" y="-3" width="10" height="6" rx="2" fill="#0A1C2A" />
                <text x="18" y="4" fill="#C4B5FD" fontSize="11" fontWeight="800">
                  🚐 AC Van to Taif &amp; Ziyarat
                </text>
              </g>
            )}

            {activeStepIndex === 4 && (
              /* Van / High-Speed Train: Makkah to Madinah */
              <g transform="translate(205, 250)" filter="url(#glowFilter)">
                <circle cx="0" cy="0" r="18" fill="#FFD700" fillOpacity="0.25" />
                <circle cx="0" cy="0" r="12" fill="#FFD700" />
                {/* Train/Van vector */}
                <rect x="-6" y="-3" width="12" height="6" rx="2" fill="#0A1C2A" />
                <text x="20" y="4" fill="#FFD700" fontSize="11" fontWeight="800">
                  🚐 / 🚄 Van to Madinah (420 km)
                </text>
              </g>
            )}

          </svg>

        </div>

        {/* Detailed Stage Spotlight Card (Solid, High-Contrast Luxury Panel) */}
        <div className="india-stage-spotlight-card">
          <div className="spotlight-top-meta">
            <div className="spotlight-mode-badge" style={{ borderColor: currentStage.accentColor, color: currentStage.accentColor }}>
              {currentStage.mode === 'flight' && <Plane className="h-4 w-4" />}
              {currentStage.mode === 'van' && <Car className="h-4 w-4" />}
              {currentStage.mode === 'walk' && <Footprints className="h-4 w-4" />}
              {currentStage.mode === 'van_mountain' && <Car className="h-4 w-4" />}
              {currentStage.mode === 'van_train' && <Navigation className="h-4 w-4" />}
              <span>{currentStage.modeLabel} • Step {currentStage.stepNum} of 5</span>
            </div>

            <div className="spotlight-metrics">
              <span className="spotlight-metric-pill">
                <Clock className="h-3.5 w-3.5 text-amber-300" /> {currentStage.duration}
              </span>
              <span className="spotlight-metric-pill">
                <MapPin className="h-3.5 w-3.5 text-amber-300" /> {currentStage.distance}
              </span>
            </div>
          </div>

          <h3 className="spotlight-title">
            {currentStage.title}
          </h3>

          <div className="spotlight-vehicle-strip">
            <span className="vehicle-strip-label">Transport Vehicle:</span>
            <span className="vehicle-strip-val">{currentStage.vehicleType}</span>
          </div>

          <p className="spotlight-summary">
            {currentStage.summary}
          </p>

          {/* Two-Column Spiritual & Practical Indian Pilgrim Guidance */}
          <div className="spotlight-advice-grid">
            
            {/* Practical Advice */}
            <div className="spotlight-advice-box practical">
              <div className="advice-box-header">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Important Tip for Indian Pilgrims</span>
              </div>
              <p className="advice-box-text">
                {currentStage.practicalTipForIndians}
              </p>
            </div>

            {/* Spiritual Etiquette */}
            <div className="spotlight-advice-box spiritual">
              <div className="advice-box-header">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Spiritual Rites &amp; Etiquette</span>
              </div>
              <p className="advice-box-text">
                {currentStage.spiritualEtiquette}
              </p>
            </div>

          </div>

          {/* Bottom Action Footer */}
          <div className="spotlight-card-footer">
            <div className="spotlight-locations-path">
              <span className="location-origin">{currentStage.fromLocation}</span>
              <span className="location-arrow">→</span>
              <span className="location-dest">{currentStage.toLocation}</span>
            </div>

            <button 
              type="button" 
              className="spotlight-plan-btn"
              onClick={() => {
                if (onPlanTrip) onPlanTrip();
                else {
                  const el = document.getElementById('ready-packages');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <span>View Packages for this Route</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
