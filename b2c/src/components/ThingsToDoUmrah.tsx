import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  Star, 
  ChevronRight, 
  Compass, 
  CheckCircle,
  X
} from 'lucide-react';

interface ExperienceItem {
  id: string;
  category: 'spiritual' | 'ziyarat' | 'transit' | 'souq';
  categoryLabel: string;
  title: string;
  location: string;
  duration: string;
  rating: string;
  reviewsCount: string;
  description: string;
  highlightPoints: string[];
  image: string;
}

const EXPERIENCES: ExperienceItem[] = [
  {
    id: 'tawaf-sai',
    category: 'spiritual',
    categoryLabel: 'Spiritual Rites',
    title: 'Circumambulating the Holy Kaaba & Sa’i',
    location: 'Al-Masjid Al-Haram, Makkah',
    duration: '3 - 4 Hours',
    rating: '4.99',
    reviewsCount: '1,420',
    description: 'Perform the core foundational rites of Umrah with certified multilingual Mutawwif scholars providing heartfelt supplications and crowd navigation.',
    highlightPoints: [
      'Seven circumambulations of Tawaf starting from the Hajar Al-Aswad line',
      'Two Rakats of Tawaf prayer behind Maqam Ibrahim',
      'Drinking authentic refreshing Zamzam water with sacred supplications',
      'Seven laps of brisk Sa’i between the historic hills of Safa and Marwah'
    ],
    image: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'rawdah-visit',
    category: 'spiritual',
    categoryLabel: 'Spiritual Rites',
    title: 'Praying in the Garden of Paradise (Rawdah)',
    location: 'Al-Masjid An-Nabawi, Madinah',
    duration: 'Guaranteed Permit Slot',
    rating: '5.00',
    reviewsCount: '2,850',
    description: 'Experience pure divine peace in the sacred precinct between the Prophet’s chamber and his pulpit, verified and guaranteed through direct Nusuk app reservation.',
    highlightPoints: [
      'Official Nusuk entry permit slot arranged and synced before departure',
      'Direct prayer on the floral green carpets of Riyad al-Jannah',
      'Reciting Salam upon the Messenger of Allah ﷺ, Abu Bakr (RA), and Umar (RA)',
      'Dedicated guidance for both Men and Women prayer time windows'
    ],
    image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'cave-hira',
    category: 'ziyarat',
    categoryLabel: 'Historical Ziyarat',
    title: 'Ascending Jabal Al-Noor & The Cave of Hira',
    location: 'Jabal Al-Noor, Makkah',
    duration: 'Half Day Excursion',
    rating: '4.94',
    reviewsCount: '910',
    description: 'Visit the legendary Mountain of Light where the Archangel Jibreel brought the first verses of Surah Al-Alaq (Iqra) to the Prophet Muhammad ﷺ.',
    highlightPoints: [
      'Guided early-morning ascent with panoramic dawn views of Makkah',
      'Visit the newly built Hira Cultural District and Revelation Exhibition',
      'Step directly into the narrow rocky cleft where early contemplation took place',
      'Comfortable air-conditioned private coach pickup and drop-off'
    ],
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'mount-uhud',
    category: 'ziyarat',
    categoryLabel: 'Historical Ziyarat',
    title: 'Mount Uhud & Masjid Quba Pilgrimage Tour',
    location: 'Historical Valley, Madinah',
    duration: '3 - 4 Hours',
    rating: '4.93',
    reviewsCount: '840',
    description: 'Pray two rakats in the first mosque of Islam (earning the reward of an Umrah) and honor the martyrs of the Battle of Uhud including Hamza ibn Abdul-Muttalib (RA).',
    highlightPoints: [
      'Two Rakats prayer in Masjid Quba following the Sunnah of the Prophet ﷺ',
      'Visit Archers’ Hill (Jabal Al-Rumat) and the Martyrs’ Cemetery of Uhud',
      'Visit Masjid Al-Qiblatayn (The Mosque of the Two Qiblas)',
      'Insightful commentary by experienced Islamic history scholars'
    ],
    image: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'haramain-train',
    category: 'transit',
    categoryLabel: 'High-Speed Travel',
    title: 'Haramain 300 km/h High-Speed Bullet Transit',
    location: 'Makkah ⇄ Madinah Corridor',
    duration: '2 Hours Flight-Like Speed',
    rating: '4.98',
    reviewsCount: '1,630',
    description: 'Travel between the Two Holy Cities in ultra-modern comfort aboard the electrified high-speed train, reducing a 6-hour desert highway drive to just 120 minutes.',
    highlightPoints: [
      'First-Class Executive coach reservations with priority boarding',
      'Spacious ergonomic reclining seats with individual charging & reading lights',
      'Panoramic floor-to-ceiling windows showing dramatic Hijaz landscapes',
      'Seamless station luggage handling and private terminal transfers'
    ],
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'ajwa-dates',
    category: 'souq',
    categoryLabel: 'Sacred Souqs & Dates',
    title: 'Madinah Ajwa Date Souq & Taif Rose Oils',
    location: 'Central Date Market, Madinah',
    duration: 'Leisure Activity',
    rating: '4.89',
    reviewsCount: '780',
    description: 'Explore the vibrant heritage markets of Madinah for authentic Ajwa Al-Aliyah dates, aromatic Arabic coffees, Taif rosewater, and pure Cambodian agarwood oud.',
    highlightPoints: [
      'Sample over 20 authentic Saudi date varieties including Ajwa, Safawi & Mabroom',
      'Verified harvest provenance directly from the blessed Madinah date groves',
      'Certified air-travel sealed gift boxes prepared for easy cabin carrying',
      'Hand-crafted prayer beads (Tasbih) and traditional Madani prayer rugs'
    ],
    image: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80'
  }
];

export const ThingsToDoUmrah: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeModalItem, setActiveModalItem] = useState<ExperienceItem | null>(null);

  const filteredExperiences = activeCategory === 'all' 
    ? EXPERIENCES 
    : EXPERIENCES.filter(item => item.category === activeCategory);

  return (
    <section className="things-todo-section">
      <div className="things-todo-container">
        {/* Section Header */}
        <div className="things-todo-header">
          <span className="todo-badge">
            <Compass className="h-3.5 w-3.5 text-amber-500" /> Sacred Places &amp; Ziyarat
          </span>
          <h2 className="todo-title">
            Best Places to Visit in <span className="gold-shimmer-text">Makkah &amp; Madinah</span>
          </h2>
          <p className="todo-subtitle">
            Essential spiritual milestones and historical Ziyarat places for Indian pilgrims, from the Holy Kaaba to Cave of Hira, Taif mountains, and the Prophet's Mosque ﷺ.
          </p>

          {/* Filter Tabs */}
          <div className="todo-filter-tabs">
            <button
              type="button"
              className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All Experiences ({EXPERIENCES.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${activeCategory === 'spiritual' ? 'active' : ''}`}
              onClick={() => setActiveCategory('spiritual')}
            >
              Spiritual Rites
            </button>
            <button
              type="button"
              className={`filter-btn ${activeCategory === 'ziyarat' ? 'active' : ''}`}
              onClick={() => setActiveCategory('ziyarat')}
            >
              Historical Ziyarat
            </button>
            <button
              type="button"
              className={`filter-btn ${activeCategory === 'transit' ? 'active' : ''}`}
              onClick={() => setActiveCategory('transit')}
            >
              High-Speed Travel
            </button>
            <button
              type="button"
              className={`filter-btn ${activeCategory === 'souq' ? 'active' : ''}`}
              onClick={() => setActiveCategory('souq')}
            >
              Sacred Souqs &amp; Dates
            </button>
          </div>
        </div>

        {/* Experience Cards Grid */}
        <div className="todo-grid">
          {filteredExperiences.map((item) => (
            <div 
              key={item.id} 
              className="todo-card"
              onClick={() => setActiveModalItem(item)}
            >
              <div className="todo-card-media">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="todo-img"
                  loading="lazy"
                />
                <div className="todo-media-overlay" />
                <span className="todo-category-badge">{item.categoryLabel}</span>
                <span className="todo-duration-pill">
                  <Clock className="h-3 w-3 text-amber-300" /> {item.duration}
                </span>
              </div>

              <div className="todo-card-body">
                <div className="todo-location-bar">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" />
                  <span>{item.location}</span>
                </div>

                <h3 className="todo-card-title">{item.title}</h3>
                <p className="todo-card-desc">{item.description}</p>

                <div className="todo-card-footer">
                  <div className="todo-rating">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <strong>{item.rating}</strong>
                    <span>({item.reviewsCount})</span>
                  </div>

                  <span className="todo-action-link">
                    View Details <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Experience Details Modal Dialog */}
      {activeModalItem && (
        <div className="todo-modal-backdrop" onClick={() => setActiveModalItem(null)}>
          <div className="todo-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="todo-modal-close"
              onClick={() => setActiveModalItem(null)}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="modal-media-header">
              <img src={activeModalItem.image} alt={activeModalItem.title} />
              <div className="modal-media-gradient" />
              <div className="modal-header-text">
                <span className="modal-tag">{activeModalItem.categoryLabel}</span>
                <h3 className="modal-title">{activeModalItem.title}</h3>
                <div className="modal-meta-pills">
                  <span><MapPin className="h-3.5 w-3.5 text-amber-300 inline mr-1" />{activeModalItem.location}</span>
                  <span><Clock className="h-3.5 w-3.5 text-amber-300 inline mr-1" />{activeModalItem.duration}</span>
                  <span><Star className="h-3.5 w-3.5 text-amber-300 inline mr-1 fill-amber-300" />{activeModalItem.rating} Rating</span>
                </div>
              </div>
            </div>

            <div className="modal-body-scroll">
              <h5 className="modal-body-heading">Experience Overview</h5>
              <p className="modal-desc-text">{activeModalItem.description}</p>

              <h5 className="modal-body-heading mt-4">Key Highlights Included</h5>
              <ul className="modal-highlights-list">
                {activeModalItem.highlightPoints.map((point, idx) => (
                  <li key={idx}>
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="modal-footer-cta">
                <button
                  type="button"
                  className="modal-cta-btn"
                  onClick={() => {
                    setActiveModalItem(null);
                    const el = document.getElementById('ready-packages');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <span>Explore Packages Featuring This Experience</span>
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
