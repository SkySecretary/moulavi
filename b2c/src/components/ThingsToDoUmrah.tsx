import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  Star, 
  ChevronRight, 
  Compass, 
  CheckCircle,
  X,
  Calendar,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

interface ExperienceItem {
  id: string;
  category: 'all' | 'makkah' | 'madinah' | 'ziyarat' | 'transit';
  categoryLabel: string;
  title: string;
  city: string;
  location: string;
  duration: string;
  recommendedTime: string;
  rating: string;
  reviewsCount: string;
  description: string;
  spiritualSignificance: string;
  highlightPoints: string[];
  tipsForPilgrims: string;
  image: string;
}

const EXPERIENCES: ExperienceItem[] = [
  {
    id: 'tawaf-sai',
    category: 'makkah',
    categoryLabel: 'Makkah Sanctuary',
    title: 'Circumambulating the Holy Kaaba & Sa’i',
    city: 'Makkah Al-Mukarramah',
    location: 'Al-Masjid Al-Haram Ground Mataf',
    duration: '3 - 4 Hours',
    recommendedTime: 'Late night (after 11 PM) or post-Tahajjud',
    rating: '5.0',
    reviewsCount: '3,840 pilgrims',
    description: 'Perform the core rites of Umrah with spiritual peace. Glide across the cooled Thassos marble of the Mataf, touch the Yemeni Corner, and drink sacred Zamzam water.',
    spiritualSignificance: 'One prayer in Al-Masjid Al-Haram equals 100,000 prayers elsewhere. Walking between Safa and Marwah re-enacts the devotion of Sayyidatuna Hajar.',
    highlightPoints: [
      'Seven circumambulations of Tawaf starting from the Hajar Al-Aswad line',
      'Two Rakats of Tawaf prayer behind Maqam Ibrahim or upper floor',
      'Drinking authentic Zamzam water with sacred supplications',
      'Seven laps of brisk Sa’i between Safa and Marwah'
    ],
    tipsForPilgrims: 'Begin Tawaf on the ground Mataf floor for closeness to the Kaaba, or on the first floor / roof for cooler breezes and elderly wheelchair access.',
    image: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'rawdah-visit',
    category: 'madinah',
    categoryLabel: 'Madinah Munawwarah',
    title: 'Praying in the Noble Garden of Paradise (Rawdah)',
    city: 'Madinah Al-Munawwarah',
    location: 'Al-Masjid An-Nabawi (Gate 37 for Men / Gate 24 for Women)',
    duration: 'Guaranteed Nusuk Slot (45 Mins)',
    recommendedTime: 'Strictly as per assigned Nusuk permit time',
    rating: '5.0',
    reviewsCount: '4,120 pilgrims',
    description: 'Stand and pray on the blessed green floral carpets in the precinct between the Prophet’s noble chamber and his pulpit, declared by the Prophet ﷺ as a garden of Paradise.',
    spiritualSignificance: 'Prophet Muhammad ﷺ said: "Between my house and my pulpit lies a garden from the gardens of Paradise."',
    highlightPoints: [
      'Official Nusuk entry permit slot arranged and synced before departure',
      'Praying two Rakats Tahiyyat al-Masjid on the green carpet',
      'Sending Salam upon the Messenger of Allah ﷺ, Abu Bakr (RA), and Umar (RA)',
      'Dedicated tranquil guidance for both Men and Women prayer time windows'
    ],
    tipsForPilgrims: 'Ensure your smartphone is fully charged and have your Nusuk permit QR barcode ready at the barrier 30 minutes before your slot.',
    image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'jabal-al-noor',
    category: 'ziyarat',
    categoryLabel: 'Historical Ziyarat',
    title: 'Ascending Jabal Al-Noor & Cave of Hira',
    city: 'Makkah Al-Mukarramah',
    location: 'Hira Cultural District, Jabal Al-Noor',
    duration: 'Half Day Excursion (3 - 4 Hours)',
    recommendedTime: 'Early dawn (after Fajr) before sunrise',
    rating: '4.95',
    reviewsCount: '1,920 pilgrims',
    description: 'Visit the legendary Mountain of Light where the Archangel Jibreel brought the first divine revelation (Iqra) to the Prophet Muhammad ﷺ.',
    spiritualSignificance: 'The birthplace of the Qur’anic revelation that transformed human history.',
    highlightPoints: [
      'Paved walking ascent with resting viewpoints and panoramic Makkah vistas',
      'Explore the newly opened Hira Cultural District & Revelation Exhibition',
      'Look into the narrow rocky cleft facing the Kaaba direction',
      'Private air-conditioned chauffeur pickup and return'
    ],
    tipsForPilgrims: 'Wear supportive sneakers with cushioned socks, carry water bottles, and visit the interactive museum at the foot of the mountain.',
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'masjid-quba',
    category: 'madinah',
    categoryLabel: 'Madinah Munawwarah',
    title: 'Masjid Quba & The Martyrs of Mount Uhud',
    city: 'Madinah Al-Munawwarah',
    location: 'Southern & Northern Oasis Corridors, Madinah',
    duration: 'Half Day Ziyarat (3 Hours)',
    recommendedTime: 'Saturday morning or post-Fajr',
    rating: '4.98',
    reviewsCount: '2,650 pilgrims',
    description: 'Pray two Rakats in the first mosque of Islam to earn the spiritual reward equal to a full Umrah pilgrimage, followed by paying respects to the martyrs of the Battle of Uhud.',
    spiritualSignificance: 'Prophet Muhammad ﷺ regularly walked or rode to Masjid Quba every Saturday to offer two Rakats.',
    highlightPoints: [
      'Two Rakats prayer inside the historic white domes of Masjid Quba',
      'Walk along the shaded Quba pedestrian boulevard lined with date palm cafes',
      'Climb Archers’ Hill (Jabal Al-Rumat) overlooking the Battlefield of Uhud',
      'Recite Dua at the cemetery of Sayyidush Shuhada Hamza ibn Abdul-Muttalib (RA)'
    ],
    tipsForPilgrims: 'Perform ritual Wudu (ablution) at your hotel before setting out to attain the full prophetic Sunnah reward.',
    image: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'haramain-rail',
    category: 'transit',
    categoryLabel: 'High-Speed Transit',
    title: 'Haramain 300 km/h High-Speed Bullet Transit',
    city: 'Makkah ⇄ Madinah Corridor',
    location: 'Haramain Train Station, Makkah Rusaifah & Madinah Knowledge City',
    duration: '2 Hours Flight-Like Speed',
    recommendedTime: 'Morning departures (8:00 AM or 10:00 AM)',
    rating: '4.99',
    reviewsCount: '3,210 pilgrims',
    description: 'Glide effortlessly between Makkah and Madinah in 120 minutes aboard the electrified high-speed bullet train, replacing a 6-hour highway drive.',
    spiritualSignificance: 'Follow the historic Hijrah path of the Prophet ﷺ across the dramatic Hijaz desert at 300 km/h in air-conditioned luxury.',
    highlightPoints: [
      'First-Class Executive coach reservations with priority lounge boarding',
      'Ergonomic leather reclining seating with individual power sockets',
      'Floor-to-ceiling panoramic windows showcasing desert canyons',
      'Door-to-door luggage handling and VIP private station transfers'
    ],
    tipsForPilgrims: 'Arrive at the station 45 minutes prior to departure; baggage security closes 20 minutes before train departure.',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'taif-mountains',
    category: 'ziyarat',
    categoryLabel: 'Historical Ziyarat',
    title: 'Taif Mountain Retreat & Fragrant Rose Gardens',
    city: 'Taif (High Hijaz Escarpment)',
    location: 'Al-Hada Mountain Crest, 1,800m Altitude',
    duration: 'Full Day Daytrip (6 - 7 Hours)',
    recommendedTime: 'Morning departure with sunset mountain descent',
    rating: '4.92',
    reviewsCount: '1,430 pilgrims',
    description: 'Escape to the cool misty heights of Taif where the Prophet ﷺ preached with steadfast patience. Visit Masjid Addas, historic rose distilleries, and scenic cable car crests.',
    spiritualSignificance: 'Site of the historic test of patience and compassion of the Prophet ﷺ, where the angel of mountains was sent and the servant Addas embraced faith.',
    highlightPoints: [
      'Scenic ascent through the hairpin Al-Hada mountain road with Baboons viewpoint',
      'Visit Masjid Addas and the orchard where the Prophet ﷺ took shelter',
      'Explore traditional Taif rose oil distilleries and artisanal date shops',
      'Stop at the Miqat of Qarn Al-Manazil (Al-Sail Al-Kabir) for Umrah return'
    ],
    tipsForPilgrims: 'Bring a light sweater as Taif temperatures are 10-15°C cooler than Makkah year-round.',
    image: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80'
  }
];

export const ThingsToDoUmrah: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'makkah' | 'madinah' | 'ziyarat' | 'transit'>('all');
  const [selectedExperience, setSelectedExperience] = useState<ExperienceItem | null>(null);

  const filtered = activeTab === 'all' 
    ? EXPERIENCES 
    : EXPERIENCES.filter(exp => exp.category === activeTab);

  return (
    <section className="things-todo-section">
      <div className="things-todo-container">
        
        {/* Section Header (Visit Abu Dhabi Style) */}
        <div className="things-todo-header">
          <div className="todo-badge">
            <Compass className="h-3.5 w-3.5 text-amber-600" />
            <span>Plan Your Time in Makkah &amp; Madinah</span>
          </div>

          <h2 className="todo-title">
            Best Places to Visit &amp; <span className="gold-shimmer-text">Sacred Highlights</span>
          </h2>

          <p className="todo-subtitle">
            Curated spiritual milestones, holy Ziyarat landmarks, and high-speed transit itineraries tailored for Indian pilgrims.
          </p>

          {/* Interactive Category Filter Bar */}
          <div className="todo-filter-tabs">
            {[
              { id: 'all', label: 'All Highlights', count: EXPERIENCES.length },
              { id: 'makkah', label: '🕋 Makkah Sanctuary', count: 2 },
              { id: 'madinah', label: '🕌 Madinah Munawwarah', count: 2 },
              { id: 'ziyarat', label: '⛰️ Historical Ziyarat', count: 2 },
              { id: 'transit', label: '⚡ High-Speed Bullet Transit', count: 1 }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`filter-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                <span>{tab.label}</span>
                <span className="filter-count">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Curated Experience Cards Showcase Grid */}
        <div className="vad-plan-grid">
          {filtered.map((item) => (
            <div 
              key={item.id} 
              className="vad-plan-card"
              onClick={() => setSelectedExperience(item)}
            >
              {/* Card Image Banner with Badges */}
              <div className="vad-card-media-box">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="vad-card-img"
                  loading="lazy"
                />
                <div className="vad-card-gradient" />
                
                <div className="vad-card-top-tags">
                  <span className="vad-category-pill">{item.categoryLabel}</span>
                  <span className="vad-duration-pill">
                    <Clock className="h-3.5 w-3.5 text-amber-300" />
                    <span>{item.duration}</span>
                  </span>
                </div>

                <div className="vad-card-bottom-bar">
                  <div className="vad-location-tag">
                    <MapPin className="h-3.5 w-3.5 text-amber-300" />
                    <span>{item.city}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="vad-card-body">
                <h3 className="vad-card-title">{item.title}</h3>
                <p className="vad-card-desc">{item.description}</p>

                {/* Highlights List */}
                <div className="vad-highlights-preview">
                  {item.highlightPoints.slice(0, 2).map((pt, idx) => (
                    <div key={idx} className="vad-highlight-line">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>

                {/* Card Action Footer */}
                <div className="vad-card-footer">
                  <div className="vad-rating-box">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <strong>{item.rating}</strong>
                    <span>({item.reviewsCount})</span>
                  </div>

                  <button type="button" className="vad-details-btn">
                    <span>Explore Guide</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Suggestion Banner: Itinerary Planning Assistant */}
        <div className="vad-itinerary-banner">
          <div className="itinerary-banner-icon">
            <Calendar className="h-7 w-7 text-amber-600" />
          </div>
          <div className="itinerary-banner-content">
            <h4 className="itinerary-banner-title">Need a Custom Day-by-Day Pilgrim Schedule?</h4>
            <p className="itinerary-banner-desc">
              Our seasoned pilgrimage experts build custom itineraries including private Mutawwif scholar guidance, senior wheelchair support, and Ziyarat bookings.
            </p>
          </div>
          <button
            type="button"
            className="itinerary-banner-btn"
            onClick={() => {
              const el = document.getElementById('ready-packages');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span>Explore Ready Packages</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Experience Details Modal Dialog */}
      {selectedExperience && (
        <div className="todo-modal-backdrop" onClick={() => setSelectedExperience(null)}>
          <div className="todo-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="todo-modal-close"
              onClick={() => setSelectedExperience(null)}
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="modal-media-header">
              <img src={selectedExperience.image} alt={selectedExperience.title} />
              <div className="modal-media-gradient" />
              <div className="modal-header-text">
                <span className="modal-tag">{selectedExperience.categoryLabel}</span>
                <h3 className="modal-title">{selectedExperience.title}</h3>
                <div className="modal-meta-pills">
                  <span><MapPin className="h-3.5 w-3.5 text-amber-300 inline mr-1" />{selectedExperience.location}</span>
                  <span><Clock className="h-3.5 w-3.5 text-amber-300 inline mr-1" />{selectedExperience.duration}</span>
                  <span><Star className="h-3.5 w-3.5 text-amber-300 inline mr-1 fill-amber-300" />{selectedExperience.rating} ({selectedExperience.reviewsCount})</span>
                </div>
              </div>
            </div>

            <div className="modal-body-scroll">
              <h5 className="modal-body-heading">Experience Overview</h5>
              <p className="modal-desc-text">{selectedExperience.description}</p>

              <div className="modal-significance-box">
                <div className="significance-header">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <strong>Spiritual Significance</strong>
                </div>
                <p className="significance-text">{selectedExperience.spiritualSignificance}</p>
              </div>

              <h5 className="modal-body-heading mt-4">Key Highlights Included</h5>
              <ul className="modal-highlights-list">
                {selectedExperience.highlightPoints.map((point, idx) => (
                  <li key={idx}>
                    <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="modal-tips-box">
                <div className="tips-header">
                  <Info className="h-4 w-4 text-blue-600" />
                  <strong>Pro-Tip for Pilgrims:</strong>
                </div>
                <p className="tips-text">{selectedExperience.tipsForPilgrims}</p>
              </div>

              <div className="modal-footer-cta">
                <button
                  type="button"
                  className="modal-cta-btn"
                  onClick={() => {
                    setSelectedExperience(null);
                    const el = document.getElementById('ready-packages');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <span>Explore Packages Featuring This</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
