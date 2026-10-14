import React, { useState } from 'react';
import { 
  Sparkles, 
  Clock, 
  ChevronRight, 
  Compass
} from 'lucide-react';

interface JourneyRoutePlannerProps {
  onSelectRoute: (routeType: string) => void;
}

interface RouteNode {
  id: string;
  stepNumber: string;
  title: string;
  subtitle: string;
  duration: string;
  description: string;
  spiritualTip: string;
  image: string;
  badge: string;
}

export const JourneyRoutePlanner: React.FC<JourneyRoutePlannerProps> = ({ onSelectRoute }) => {
  const [selectedRoute, setSelectedRoute] = useState<'makkah_first' | 'madinah_first' | 'haramain_express'>('makkah_first');
  const [activeNodeId, setActiveNodeId] = useState<string>('node-1');

  // Makkah First Sequence
  const makkahFirstNodes: RouteNode[] = [
    {
      id: 'node-1',
      stepNumber: '01',
      title: 'Departure: India & International',
      subtitle: 'Delhi / Mumbai / Calicut / GCC',
      duration: '4.5 - 5 Hours Direct Flight',
      description: 'Begin your journey from your local international departure airport. Our team coordinates online check-in and Ihram pre-departure preparation.',
      spiritualTip: 'Enter state of Ihram before reaching the Miqat boundary over the Arabian Sea. Recite Talbiyah continuously.',
      image: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1200&q=80',
      badge: 'Departure Hub'
    },
    {
      id: 'node-2',
      stepNumber: '02',
      title: 'Jeddah Gateway & Miqat Clearance',
      subtitle: 'King Abdulaziz Intl (JED) Terminal 1',
      duration: '1 Hour Clearance & Transfer',
      description: 'Touchdown at Jeddah airport. Fast-track biometric clearance at the Umrah concourse, greeted by your private chauffeur with cold Zamzam water.',
      spiritualTip: 'Declare intentions at Miqat. Direct air-conditioned private GMC transfer begins to Makkah along the dedicated Pilgrim Highway.',
      image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
      badge: 'Miqat & Arrival'
    },
    {
      id: 'node-3',
      stepNumber: '03',
      title: 'Makkah Al-Mukarramah & Umrah Rites',
      subtitle: 'Al-Masjid Al-Haram & Holy Kaaba',
      duration: '4 - 6 Nights Stay',
      description: 'Check into your 5★ hotel facing the Holy Kaaba. Perform Tawaf, drink Zamzam, complete Sa’i between Safa and Marwah, and perform Halq/Taqseer.',
      spiritualTip: 'Every single prayer in Al-Masjid Al-Haram carries the reward of 100,000 prayers. Take advantage of serene late-night Tawaf.',
      image: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=1200&q=80',
      badge: 'The Sacred Rites'
    },
    {
      id: 'node-4',
      stepNumber: '04',
      title: 'Haramain High-Speed Train Corridor',
      subtitle: 'Makkah Station → Madinah Station',
      duration: '2 Hours • 300 km/h Bullet Train',
      description: 'Experience first-class luxury aboard the Haramain high-speed electrified railway, cutting travel time from 6 hours to 120 minutes with panoramic desert vistas.',
      spiritualTip: 'Relax in executive reclining seats with onboard dining and high-speed Wi-Fi while preparing supplications for the Prophet’s city.',
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      badge: 'VIP High-Speed Transit'
    },
    {
      id: 'node-5',
      stepNumber: '05',
      title: 'Madinah Al-Munawwarah & Rawdah Visit',
      subtitle: 'Al-Masjid An-Nabawi Courtyards',
      duration: '3 - 4 Nights Stay',
      description: 'Bask in tranquility at the Prophet’s Mosque. Guaranteed Rawdah Ash-Sharifah permit reservation through Nusuk, with visits to Mount Uhud and Masjid Quba.',
      spiritualTip: 'Send salutations upon Prophet Muhammad ﷺ at the Golden Grill. Two rakats in Masjid Quba equal the reward of a complete Umrah.',
      image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80',
      badge: 'City of Light'
    },
    {
      id: 'node-6',
      stepNumber: '06',
      title: 'Blessed Return & 5L Zamzam Package',
      subtitle: 'Madinah Airport (MED) or Jeddah (JED)',
      duration: 'Departure Flight Home',
      description: 'Smooth departure coordination. Receive your official 5-liter boxed Zamzam water at the airport terminal and board your return flight blessed and rejuvenated.',
      spiritualTip: 'Drink your final sips of Zamzam making heartfelt prayers for acceptance and a return to the Holy Lands.',
      image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
      badge: 'Sacred Completion'
    }
  ];

  // Madinah First Sequence
  const madinahFirstNodes: RouteNode[] = [
    {
      id: 'node-m1',
      stepNumber: '01',
      title: 'Departure: Direct to Madinah (MED)',
      subtitle: 'International Departure Hubs',
      duration: '5 Hours Direct Flight',
      description: 'Fly directly into Prince Mohammad Bin Abdulaziz International Airport in Madinah without the immediate need for Ihram at departure.',
      spiritualTip: 'A peaceful, unhurried beginning allowing you to acclimatize and greet the Prophet ﷺ before entering the rites of Umrah.',
      image: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?auto=format&fit=crop&w=1200&q=80',
      badge: 'Direct Madinah Arrival'
    },
    {
      id: 'node-m2',
      stepNumber: '02',
      title: 'Madinah Stay & Rawdah Ash-Sharifah',
      subtitle: 'Al-Masjid An-Nabawi',
      duration: '3 - 4 Nights Stay',
      description: 'Stay footsteps from the Green Dome. Perform your Rawdah prayers, explore historic battlefields at Uhud, and pray in Masjid Quba.',
      spiritualTip: 'Reflect and prepare mentally and spiritually for the sacred state of Ihram.',
      image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80',
      badge: 'Prophet’s Sanctuary'
    },
    {
      id: 'node-m3',
      stepNumber: '03',
      title: 'Miqat Dhu al-Hulayfah (Masjid Shajarah)',
      subtitle: 'The Outskirts of Madinah',
      duration: 'Ihram Intention & 2 Rakats',
      description: 'Put on your Ihram garments in your hotel, travel to the historic Miqat of the Prophet ﷺ (Masjid ash-Shajarah), and declare your Umrah Niyyah.',
      spiritualTip: 'Board the Haramain High-Speed train in full Ihram, chanting the Talbiyah along the journey to Makkah.',
      image: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80',
      badge: 'Historic Miqat'
    },
    {
      id: 'node-m4',
      stepNumber: '04',
      title: 'Haramain Train to Makkah',
      subtitle: 'Direct Bullet Rail',
      duration: '2 Hours Speed Transit',
      description: 'Glide effortlessly into Makkah Haramain Station. Transferred via private VIP shuttle straight to your Haram-view hotel lobby.',
      spiritualTip: 'Keep your gaze lowered until you step onto the marble courtyards of the Grand Mosque.',
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      badge: 'Scenic High-Speed'
    },
    {
      id: 'node-m5',
      stepNumber: '05',
      title: 'Performing Umrah at Kaaba',
      subtitle: 'Tawaf, Sa’i & Tahallul',
      duration: '5 - 6 Nights Stay',
      description: 'Perform your Umrah circumambulation around the Holy Kaaba with spiritual guidance, followed by Sa’i and hair trimming to complete rites.',
      spiritualTip: 'Drink your fill of Zamzam water, which carries the intention with which it is drunk.',
      image: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=1200&q=80',
      badge: 'The Grand Pinnacle'
    },
    {
      id: 'node-m6',
      stepNumber: '06',
      title: 'Departure via Jeddah International (JED)',
      subtitle: 'King Abdulaziz Intl Airport',
      duration: 'Direct Flight Return',
      description: 'Private transfer from your Makkah hotel directly to Jeddah airport. Receive sealed 5L Zamzam bottle box and complete exit clearance.',
      spiritualTip: 'Offer a final Tawaf al-Wada (Farewell Tawaf) before departing the holy city of Makkah.',
      image: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1200&q=80',
      badge: 'Return with Blessings'
    }
  ];

  const currentNodes = selectedRoute === 'madinah_first' ? madinahFirstNodes : makkahFirstNodes;
  const activeNode = currentNodes.find(n => n.id === activeNodeId) || currentNodes[0];

  return (
    <section className="journey-route-section">
      <div className="journey-route-container">
        {/* Section Header */}
        <div className="journey-route-header">
          <span className="route-badge">
            <Compass className="h-3.5 w-3.5 text-amber-500" /> Sacred Corridor Visualizer
          </span>
          <h2 className="route-title">
            Plan Your Sacred Pilgrimage Journey
          </h2>
          <p className="route-subtitle">
            Follow the blessed path from India &amp; international hubs across the Arabian Sea directly into the sanctuary of the Two Holy Mosques.
          </p>

          {/* Interactive Route Switcher Tabs */}
          <div className="route-switcher-tabs">
            <button
              type="button"
              className={`route-tab ${selectedRoute === 'makkah_first' ? 'active' : ''}`}
              onClick={() => {
                setSelectedRoute('makkah_first');
                setActiveNodeId('node-1');
              }}
            >
              <span className="tab-dot" />
              <span>Route 1: Makkah First (via Jeddah JED)</span>
              <span className="tab-pill">Most Popular</span>
            </button>
            <button
              type="button"
              className={`route-tab ${selectedRoute === 'madinah_first' ? 'active' : ''}`}
              onClick={() => {
                setSelectedRoute('madinah_first');
                setActiveNodeId('node-m1');
              }}
            >
              <span className="tab-dot" />
              <span>Route 2: Madinah First (via Madinah MED)</span>
              <span className="tab-pill">Serene Start</span>
            </button>
          </div>
        </div>

        {/* Interactive Map & Stepper Grid */}
        <div className="route-interactive-grid">
          {/* Left Column: Interactive Checkpoints Stepper */}
          <div className="route-checkpoints-list">
            <div className="stepper-track-line" />
            
            {currentNodes.map((node) => {
              const isActive = node.id === activeNode.id;
              return (
                <div
                  key={node.id}
                  className={`checkpoint-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveNodeId(node.id)}
                >
                  <div className="checkpoint-indicator">
                    <span className="checkpoint-number">{node.stepNumber}</span>
                  </div>
                  <div className="checkpoint-content">
                    <div className="checkpoint-meta">
                      <span className="checkpoint-badge">{node.badge}</span>
                      <span className="checkpoint-duration">
                        <Clock className="h-3 w-3 text-amber-500 inline mr-1" />
                        {node.duration}
                      </span>
                    </div>
                    <h4 className="checkpoint-title">{node.title}</h4>
                    <p className="checkpoint-subtitle">{node.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Checkpoint Spotlight Interactive Showcase Card */}
          <div className="checkpoint-spotlight-card">
            <div className="spotlight-media-container">
              <img 
                src={activeNode.image} 
                alt={activeNode.title} 
                className="spotlight-img"
              />
              <div className="spotlight-media-overlay" />
              
              <div className="spotlight-top-badge">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Stage {activeNode.stepNumber} of 06</span>
              </div>

              <div className="spotlight-header-content">
                <span className="spotlight-stage-tag">{activeNode.badge}</span>
                <h3 className="spotlight-title">{activeNode.title}</h3>
                <span className="spotlight-duration-pill">
                  <Clock className="h-3.5 w-3.5 text-amber-300 inline mr-1" />
                  {activeNode.duration}
                </span>
              </div>
            </div>

            <div className="spotlight-body">
              <div className="spotlight-desc-block">
                <h5 className="spotlight-section-heading">Operational Details &amp; Logistics</h5>
                <p className="spotlight-desc">{activeNode.description}</p>
              </div>

              {/* Spiritual Wisdom Tip Box */}
              <div className="spotlight-spiritual-tip">
                <div className="tip-icon-box">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <h6 className="tip-title">Pilgrim Spiritual Insight</h6>
                  <p className="tip-text">{activeNode.spiritualTip}</p>
                </div>
              </div>

              <div className="spotlight-actions">
                <button
                  type="button"
                  className="spotlight-cta-btn"
                  onClick={() => onSelectRoute(selectedRoute)}
                >
                  <span>Build Package with This Itinerary</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
