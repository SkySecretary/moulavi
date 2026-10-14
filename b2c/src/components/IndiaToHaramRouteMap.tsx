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
    fromLocation: 'India (Mumbai, Delhi, Calicut, Cochin, Hyderabad, Bangalore)',
    toLocation: 'Jeddah — King Abdulaziz International Airport (JED)',
    distance: '3,450 km across Arabian Sea',
    duration: '4.5 to 5.5 Hours Flight',
    tag: 'Flight from India',
    summary: 'Board your flight in India. As your aircraft flies across the Arabian Sea, the flight captain announces the Miqat boundary (Qarn al-Manazil / Yalamlam) approximately 30 minutes before descent into Jeddah.',
    practicalTipForIndians: 'Put on your two-piece white Ihram sheets at your home airport before boarding or 1 hour prior to reaching Miqat on the flight. Declare your Umrah Niyyah (intention) as announced by the captain.',
    spiritualEtiquette: 'Recite the Talbiyah loudly and continuously once entering Ihram: "Labbayka Allahumma Labbayk, Labbayka Laa Shareeka Laka Labbayk..."',
    accentColor: '#B88933'
  },
  {
    id: 'stage-2',
    stepNum: 2,
    mode: 'van',
    modeLabel: 'Private AC Van',
    vehicleType: 'Air-Conditioned Private Van (Toyota HiAce / Hyundai Staria / VIP GMC Yukon)',
    title: 'AC Van Transfer: Jeddah Airport to Makkah Hotel',
    fromLocation: 'Jeddah Airport Hajj & Umrah Terminal',
    toLocation: 'Makkah Al-Mukarramah (Haram Hotel)',
    distance: '75 km via Jeddah-Makkah Expressway',
    duration: '60 to 75 Minutes Drive',
    tag: 'Jeddah to Makkah Van',
    summary: 'Clear dedicated electronic Umrah immigration counters at Jeddah. Your private Moulavi chauffeur receives your family right at arrival with chilled Zamzam and loads luggage into your private AC van.',
    practicalTipForIndians: 'Drive through the monumental Quran Gate (Bawwabat Makkah) marking the holy boundary. Check into your hotel, freshen up with wudu, and leave luggage before proceeding to the Haram.',
    spiritualEtiquette: 'Maintain your state of Ihram strictly during the drive. Keep reciting Talbiyah together as a family until you gaze upon the Holy Kaaba.',
    accentColor: '#D97706'
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
    distance: 'Walkable distance (100m - 400m from 5★ hotel)',
    duration: '2.5 to 3.5 Hours for Complete Umrah',
    tag: 'Holy Umrah Walking',
    summary: 'Enter Masjid Al-Haram with supplications. Walk into the Mataf for 7 rounds of Tawaf around the Holy Kaaba, pray 2 rakats behind Maqam Ibrahim, drink cool Zamzam water, complete 7 laps of Sa\'i between Safa and Marwah, and perform Halq/Taqseer.',
    practicalTipForIndians: 'Wheelchairs with official pushers are available on the upper mezzanine floor for elderly parents. Carry a light shoe bag and a small water bottle.',
    spiritualEtiquette: 'Upon first seeing the Holy Kaaba, stop and make heartfelt Dua—supplications are readily accepted at this blessed moment. Your Umrah is now complete!',
    accentColor: '#059669'
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
    summary: 'A private full-day tour in a spacious AC Van. Visit Cave of Hira at Jabal Al-Noor, Cave of Thawr, Mina, Arafat, and Muzdalifah. Then ascend the picturesque Al-Hada mountain road up to the cool highlands of Taif.',
    practicalTipForIndians: 'Visit the historic Masjid Abdullah Ibn Abbas in Taif, fragrant Taif rose water distilleries, and the mountain fruit markets. If intending a 2nd Umrah, enter Ihram at Miqat Qarn al-Manazil on the return descent.',
    spiritualEtiquette: 'Reflect upon the Prophet’s ﷺ profound patience and mercy during his historic visit to Taif, sending continuous blessings (Salawat).',
    accentColor: '#7C3AED'
  },
  {
    id: 'stage-5',
    stepNum: 5,
    mode: 'van_train',
    modeLabel: 'AC Van / High-Speed Train',
    vehicleType: 'Private AC Van / 300 km/h Haramain High-Speed Bullet Train',
    title: 'Journey to Madinah Al-Munawwarah',
    fromLocation: 'Makkah Al-Mukarramah',
    toLocation: 'Madinah — Al-Masjid An-Nabawi (City of the Prophet ﷺ)',
    distance: '420 km via Hijrah Highway (or 2h 10m Bullet Train)',
    duration: '3.5 - 4 Hours by Van / 2 Hours by Bullet Train',
    tag: 'Makkah to Madinah Van',
    summary: 'Travel in relaxed comfort from Makkah to the illuminated city of Madinah. Arrive at your hotel facing the Prophet’s Mosque. Greet the Messenger of Allah ﷺ at the Golden Grill and pray in the Garden of Paradise (Rawdah Ash-Sharifah).',
    practicalTipForIndians: 'Our team assists you with pre-booking your Rawdah Ash-Sharifah permit slots on the official Nusuk app. In Madinah, enjoy local ziyarat to Masjid Quba (reward of full Umrah) and Mount Uhud.',
    spiritualEtiquette: 'Send peace and blessings upon Prophet Muhammad ﷺ and his companions Abu Bakr and Umar (RA) with deep love, modesty, and reverence.',
    accentColor: '#C59A4E'
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
    }, 5500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <section className="india-map-section">
      <div className="india-map-wrapper">
        
        {/* Section Header */}
        <div className="india-map-header">
          <div className="india-map-badge">
            <Compass className="h-3.5 w-3.5 text-amber-700" />
            <span>Interactive Pilgrim Route Map</span>
          </div>

          <h2 className="india-map-title">
            From India to Makkah &amp; Madinah: <span className="gold-shimmer-text">Your Complete Journey</span>
          </h2>

          <p className="india-map-subtitle">
            Experience your full pilgrimage itinerary: Direct flights from Indian embarkation airports, private AC van transfers via the Quran Gate, walking for Umrah at the Holy Kaaba, Taif mountain ziyarat, and journey to the Prophet&apos;s Mosque ﷺ in Madinah.
          </p>
        </div>

        {/* Interactive Step Navigation Bar (5 Steps) */}
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
                  {stage.mode === 'flight' && <Plane className="h-4 w-4" />}
                  {stage.mode === 'van' && <Car className="h-4 w-4" />}
                  {stage.mode === 'walk' && <Footprints className="h-4 w-4" />}
                  {stage.mode === 'van_mountain' && <Car className="h-4 w-4" />}
                  {stage.mode === 'van_train' && <Navigation className="h-4 w-4" />}
                </span>
                <div className="step-pill-text">
                  <span className="step-pill-title">{stage.tag}</span>
                  <span className="step-pill-sub">{stage.modeLabel}</span>
                </div>
                {isActive && <span className="active-stage-indicator" />}
              </button>
            );
          })}
        </div>

        {/* 2D Graphical Vector Map Arena (Zoomed In Light Cartographic Canvas) */}
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
                  <Pause className="h-3.5 w-3.5 text-amber-700" />
                  <span>Pause Route</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-amber-700" />
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
              <RotateCcw className="h-3.5 w-3.5 text-slate-600" />
              <span>Restart</span>
            </button>
          </div>

          {/* SVG Stylized 2D Zoomed-in Map Canvas */}
          <svg 
            className="india-route-svg"
            viewBox="0 0 1000 520" 
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F1F6FA" />
                <stop offset="50%" stopColor="#EBF2F8" />
                <stop offset="100%" stopColor="#DFEAF3" />
              </linearGradient>

              <linearGradient id="ksaLandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDFBF7" />
                <stop offset="100%" stopColor="#F5EFE3" />
              </linearGradient>

              <linearGradient id="indiaLandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FCFBF7" />
                <stop offset="100%" stopColor="#F3EDE0" />
              </linearGradient>

              <linearGradient id="flightGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C59A4E" />
                <stop offset="50%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>

              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Ocean: Serene Cartographic Blue */}
            <rect width="1000" height="520" fill="url(#oceanGrad)" rx="20" />

            {/* Subtle Nautical Wave Pattern Lines */}
            <path d="M 50,140 Q 300,120 550,150 T 950,130" stroke="rgba(186, 210, 230, 0.45)" strokeWidth="1.2" fill="none" />
            <path d="M 50,260 Q 320,240 580,270 T 950,250" stroke="rgba(186, 210, 230, 0.45)" strokeWidth="1.2" fill="none" />
            <path d="M 50,380 Q 340,360 620,390 T 950,370" stroke="rgba(186, 210, 230, 0.45)" strokeWidth="1.2" fill="none" />

            {/* Central Water Label: Arabian Sea Corridor */}
            <g transform="translate(540, 290)">
              <text x="0" y="0" textAnchor="middle" fill="#64748B" fontSize="13" fontWeight="800" letterSpacing="4" opacity="0.65">
                ARABIAN SEA CORRIDOR
              </text>
              <text x="0" y="16" textAnchor="middle" fill="#94A3B8" fontSize="9" fontWeight="600" letterSpacing="1.5">
                Direct Pilgrim Air Route (3,450 km)
              </text>
            </g>

            {/* Miqat Boundary Announcement Line */}
            <g id="miqat-line">
              <line 
                x1="365" y1="160" x2="335" y2="440" 
                stroke="#10B981" 
                strokeWidth="2" 
                strokeDasharray="6,4" 
                opacity="0.8"
              />
              <rect x="290" y="275" width="130" height="22" rx="11" fill="#ECFDF5" stroke="#10B981" strokeWidth="1" />
              <text x="355" y="290" textAnchor="middle" fill="#047857" fontSize="9" fontWeight="800">
                MIQAT BOUNDARY
              </text>
            </g>

            {/* ========================================================
               LEFT REGION: ZOOMED-IN WESTERN SAUDI ARABIA (HIJAZ)
               ======================================================== */}
            {/* Red Sea waters label on far left */}
            <text x="45" y="280" fill="#94A3B8" fontSize="10" fontWeight="700" letterSpacing="2" transform="rotate(-90 45 280)">
              RED SEA
            </text>

            {/* Western Saudi Arabia (Hijaz landmass - Zoomed In) */}
            <path 
              d="M 120,20 
                 C 160,35 240,40 320,60 
                 C 380,85 410,130 400,200 
                 C 395,270 410,340 390,410 
                 C 370,470 300,500 240,510 
                 C 180,510 145,460 135,420 
                 C 115,360 100,290 110,210 
                 C 120,150 105,70 120,20 Z"
              fill="url(#ksaLandGrad)"
              stroke="#C59A4E"
              strokeWidth="2.2"
              filter="drop-shadow(0 4px 12px rgba(197, 154, 78, 0.15))"
            />

            {/* Land Region Title */}
            <text x="210" y="65" fill="#8C6B28" fontSize="13" fontWeight="900" letterSpacing="2">
              SAUDI ARABIA (HIJAZ)
            </text>

            {/* ========================================================
               RIGHT REGION: ZOOMED-IN PENINSULAR INDIA (WEST COAST)
               ======================================================== */}
            <path 
              d="M 750,30 
                 C 820,35 910,45 960,80 
                 C 980,130 965,200 950,270 
                 C 930,340 890,420 840,490 
                 C 815,485 795,430 780,380 
                 C 760,320 735,270 740,210 
                 C 745,150 720,80 750,30 Z"
              fill="url(#indiaLandGrad)"
              stroke="#C59A4E"
              strokeWidth="2.2"
              filter="drop-shadow(0 4px 12px rgba(197, 154, 78, 0.15))"
            />

            <text x="830" y="65" fill="#8C6B28" fontSize="14" fontWeight="900" letterSpacing="3">
              INDIA
            </text>

            {/* Indian Embarkation Hubs & City Nodes */}
            <g id="indian-departure-nodes">
              {/* Delhi [DEL] */}
              <circle cx="835" cy="110" r="4.5" fill="#0F172A" />
              <text x="846" y="114" fill="#1E293B" fontSize="10.5" fontWeight="700">Delhi (DEL)</text>

              {/* Mumbai [BOM] (Primary Western Embarkation Hub) */}
              <circle cx="765" cy="225" r="7" fill="#D97706" />
              <circle cx="765" cy="225" r="13" fill="none" stroke="rgba(217, 119, 6, 0.45)" strokeWidth="1.5" />
              <text x="690" y="230" fill="#92400E" fontSize="12" fontWeight="900">Mumbai (BOM)</text>

              {/* Hyderabad [HYD] */}
              <circle cx="830" cy="265" r="4.5" fill="#0F172A" />
              <text x="842" y="270" fill="#1E293B" fontSize="10.5" fontWeight="700">Hyderabad (HYD)</text>

              {/* Bangalore [BLR] */}
              <circle cx="820" cy="330" r="4.5" fill="#0F172A" />
              <text x="832" y="335" fill="#1E293B" fontSize="10.5" fontWeight="700">Bangalore (BLR)</text>

              {/* Calicut / Cochin [Kerala Hub] */}
              <circle cx="795" cy="390" r="6" fill="#059669" />
              <circle cx="795" cy="390" r="11" fill="none" stroke="rgba(5, 150, 105, 0.45)" strokeWidth="1.5" />
              <text x="700" y="395" fill="#065F46" fontSize="11" fontWeight="800">Calicut / Cochin</text>
            </g>

            {/* ========================================================
               TRANSIT HIGHWAYS & RAILWAYS IN KSA
               ======================================================== */}

            {/* Highway Route 1: Jeddah Airport to Makkah (160,310 -> 215,340 -> 255,365) */}
            <path 
              id="hwyJeddahMakkah"
              d="M 160,310 Q 200,325 255,365"
              fill="none"
              stroke={activeStepIndex === 1 ? "#D97706" : "rgba(217, 119, 6, 0.35)"}
              strokeWidth={activeStepIndex === 1 ? "4.5" : "2.5"}
            />

            {/* Quran Gate Marker (Bawwabat Makkah on the highway) */}
            <g id="node-quran-gate" transform="translate(205, 335)">
              <rect x="-6" y="-4" width="12" height="8" rx="2" fill="#D4AF37" stroke="#78350F" strokeWidth="1" />
              <text x="-4" y="16" fill="#78350F" fontSize="8" fontWeight="800">Quran Gate</text>
            </g>

            {/* Highway Route 2: Makkah to Taif Mountain Route (255,365 to 330,425) */}
            <path 
              id="hwyMakkahTaif"
              d="M 255,365 Q 290,410 330,425"
              fill="none"
              stroke={activeStepIndex === 3 ? "#7C3AED" : "rgba(124, 58, 237, 0.3)"}
              strokeWidth={activeStepIndex === 3 ? "4.5" : "2.2"}
              strokeDasharray="6,3"
            />

            {/* Highway & Railway Route 3: Makkah to Madinah (255,365 north to 200,120) */}
            <path 
              id="hwyMakkahMadinah"
              d="M 255,365 Q 185,240 200,120"
              fill="none"
              stroke={activeStepIndex === 4 ? "#C59A4E" : "rgba(197, 154, 78, 0.35)"}
              strokeWidth={activeStepIndex === 4 ? "4.5" : "2.5"}
            />

            {/* ========================================================
               KEY CITIES & HOLY SANCTUARIES IN KSA
               ======================================================== */}

            {/* 1. Jeddah (JED) */}
            <g id="node-jeddah" transform="translate(160, 310)">
              <circle cx="0" cy="0" r="8" fill="#D97706" />
              <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(217, 119, 6, 0.4)" strokeWidth="1.5" />
              <text x="-20" y="-12" fill="#92400E" fontSize="12" fontWeight="900">JEDDAH</text>
              <text x="-35" y="24" fill="#64748B" fontSize="9" fontWeight="700">King Abdulaziz Airport (JED)</text>
            </g>

            {/* 2. Makkah Al-Mukarramah (Holy Kaaba 🕋) */}
            <g id="node-makkah" transform="translate(255, 365)">
              <circle cx="0" cy="0" r={activeStepIndex === 2 ? "14" : "10"} fill="#059669" />
              <circle cx="0" cy="0" r={activeStepIndex === 2 ? "24" : "17"} fill="none" stroke="rgba(5, 150, 105, 0.45)" strokeWidth="2" />
              {/* Kaaba Symbol Cube */}
              <rect x="-5" y="-5" width="10" height="10" fill="#000000" stroke="#FFD700" strokeWidth="1.2" rx="1" />
              <text x="20" y="3" fill="#065F46" fontSize="13" fontWeight="900">MAKKAH</text>
              <text x="20" y="16" fill="#1E293B" fontSize="9.5" fontWeight="700">Al-Masjid Al-Haram 🕋</text>
            </g>

            {/* 3. Taif Mountains (Al-Hada & Ziyarat 🏔️) */}
            <g id="node-taif" transform="translate(330, 425)">
              <circle cx="0" cy="0" r="7.5" fill="#7C3AED" />
              <circle cx="0" cy="0" r="13" fill="none" stroke="rgba(124, 58, 237, 0.4)" strokeWidth="1.2" />
              <text x="16" y="3" fill="#5B21B6" fontSize="11.5" fontWeight="900">TAIF</text>
              <text x="16" y="15" fill="#475569" fontSize="9" fontWeight="700">Mountains &amp; Ziyarat 🏔️</text>
            </g>

            {/* 4. Madinah Al-Munawwarah (Prophet's Mosque ﷺ 🕌) */}
            <g id="node-madinah" transform="translate(200, 120)">
              <circle cx="0" cy="0" r={activeStepIndex === 4 ? "14" : "10"} fill="#C59A4E" />
              <circle cx="0" cy="0" r={activeStepIndex === 4 ? "24" : "17"} fill="none" stroke="rgba(197, 154, 78, 0.45)" strokeWidth="2" />
              {/* Green Dome representation */}
              <circle cx="0" cy="-2" r="5" fill="#047857" stroke="#FFD700" strokeWidth="1" />
              <text x="-70" y="-14" fill="#854D0E" fontSize="13" fontWeight="900">MADINAH</text>
              <text x="-95" y="3" fill="#1E293B" fontSize="9.5" fontWeight="700">Al-Masjid An-Nabawi 🕌</text>
            </g>

            {/* ========================================================
               FLIGHT PATH ARC: FROM MUMBAI (765, 225) TO JEDDAH (160, 310)
               ======================================================== */}
            <path 
              id="flightPathArc"
              d="M 765,225 Q 460,100 160,310"
              fill="none"
              stroke={activeStepIndex === 0 ? "url(#flightGoldGrad)" : "rgba(217, 119, 6, 0.3)"}
              strokeWidth={activeStepIndex === 0 ? "4" : "2"}
              strokeDasharray={activeStepIndex === 0 ? "9,4" : "4,4"}
            />

            {/* ========================================================
               ACTIVE ANIMATED 2D SOLID VEHICLE & MOVEMENT OVERLAYS
               ======================================================== */}

            {/* Step 1: Flight across Arabian Sea */}
            {activeStepIndex === 0 && (
              <g transform="translate(470, 160)" filter="url(#softGlow)">
                <circle cx="0" cy="0" r="22" fill="#D97706" fillOpacity="0.2" />
                <circle cx="0" cy="0" r="14" fill="#D97706" />
                {/* 2D Solid Airplane Vector */}
                <path 
                  d="M -7,0 L 0,-8 L 7,0 L 2,3 L 2,7 L -2,7 L -2,3 Z" 
                  fill="#FFFFFF" 
                  transform="rotate(-15)"
                />
                <rect x="22" y="-12" width="135" height="24" rx="12" fill="#FFFFFF" stroke="#D97706" strokeWidth="1.2" />
                <text x="32" y="4" fill="#92400E" fontSize="10.5" fontWeight="800">
                  ✈️ Air Flight (~4.5 hrs)
                </text>
              </g>
            )}

            {/* Step 2: AC Van from Jeddah to Makkah */}
            {activeStepIndex === 1 && (
              <g transform="translate(195, 330)" filter="url(#softGlow)">
                <circle cx="0" cy="0" r="18" fill="#D97706" fillOpacity="0.2" />
                <circle cx="0" cy="0" r="12" fill="#D97706" />
                {/* 2D Solid Van Vector */}
                <rect x="-6" y="-4" width="12" height="7" rx="2" fill="#FFFFFF" />
                <circle cx="-3" cy="3" r="1.5" fill="#78350F" />
                <circle cx="3" cy="3" r="1.5" fill="#78350F" />
                <rect x="18" y="-12" width="150" height="24" rx="12" fill="#FFFFFF" stroke="#D97706" strokeWidth="1.2" />
                <text x="26" y="4" fill="#92400E" fontSize="10.5" fontWeight="800">
                  🚐 Private AC Van (75 km)
                </text>
              </g>
            )}

            {/* Step 3: Walking into Masjid Al-Haram for Umrah */}
            {activeStepIndex === 2 && (
              <g transform="translate(255, 395)" filter="url(#softGlow)">
                <circle cx="0" cy="0" r="18" fill="#059669" fillOpacity="0.25" />
                <circle cx="0" cy="0" r="11" fill="#059669" />
                {/* Pilgrim in Ihram */}
                <circle cx="0" cy="-3" r="2.5" fill="#FFFFFF" />
                <rect x="-3" y="0" width="6" height="6" rx="1.5" fill="#FFFFFF" />
                <rect x="18" y="-12" width="165" height="24" rx="12" fill="#FFFFFF" stroke="#059669" strokeWidth="1.2" />
                <text x="26" y="4" fill="#065F46" fontSize="10.5" fontWeight="800">
                  🚶‍♂️ Walking: Umrah Tawaf &amp; Sa&apos;i
                </text>
              </g>
            )}

            {/* Step 4: Tour Van to Taif & Ziyarat */}
            {activeStepIndex === 3 && (
              <g transform="translate(290, 395)" filter="url(#softGlow)">
                <circle cx="0" cy="0" r="18" fill="#7C3AED" fillOpacity="0.2" />
                <circle cx="0" cy="0" r="12" fill="#7C3AED" />
                <rect x="-6" y="-4" width="12" height="7" rx="2" fill="#FFFFFF" />
                <rect x="18" y="-12" width="160" height="24" rx="12" fill="#FFFFFF" stroke="#7C3AED" strokeWidth="1.2" />
                <text x="26" y="4" fill="#5B21B6" fontSize="10.5" fontWeight="800">
                  🚐 AC Van to Taif &amp; Ziyarat
                </text>
              </g>
            )}

            {/* Step 5: Van / High-Speed Train to Madinah */}
            {activeStepIndex === 4 && (
              <g transform="translate(225, 235)" filter="url(#softGlow)">
                <circle cx="0" cy="0" r="18" fill="#C59A4E" fillOpacity="0.2" />
                <circle cx="0" cy="0" r="12" fill="#C59A4E" />
                {/* Train/Van vector */}
                <rect x="-7" y="-4" width="14" height="7" rx="2" fill="#FFFFFF" />
                <rect x="20" y="-12" width="165" height="24" rx="12" fill="#FFFFFF" stroke="#C59A4E" strokeWidth="1.2" />
                <text x="28" y="4" fill="#854D0E" fontSize="10.5" fontWeight="800">
                  🚐 / 🚄 Van to Madinah (420 km)
                </text>
              </g>
            )}

          </svg>

        </div>

        {/* Detailed Stage Spotlight Card (Clean Light Luxury Card) */}
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
                <Clock className="h-3.5 w-3.5 text-amber-700" /> {currentStage.duration}
              </span>
              <span className="spotlight-metric-pill">
                <MapPin className="h-3.5 w-3.5 text-amber-700" /> {currentStage.distance}
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

          {/* Two-Column Guidance: Practical Indian Pilgrim Tips & Spiritual Etiquette */}
          <div className="spotlight-advice-grid">
            
            {/* Practical Advice */}
            <div className="spotlight-advice-box practical">
              <div className="advice-box-header">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>Important Tip for Indian Pilgrims</span>
              </div>
              <p className="advice-box-text">
                {currentStage.practicalTipForIndians}
              </p>
            </div>

            {/* Spiritual Etiquette */}
            <div className="spotlight-advice-box spiritual">
              <div className="advice-box-header">
                <Sparkles className="h-4 w-4 text-amber-700" />
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
              <span>Explore Packages for this Route</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
