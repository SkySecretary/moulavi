import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  ArrowLeft,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface SacredFact {
  id: string;
  number: string;
  city: 'makkah' | 'madinah';
  cityLabel: string;
  highlightMetric: string;
  title: string;
  fact: string;
  historicalContext: string;
  sourceReference: string;
  image: string;
}

const SACRED_FACTS: SacredFact[] = [
  {
    id: 'fact-kiswah',
    number: '01',
    city: 'makkah',
    cityLabel: 'Makkah Al-Mukarramah',
    highlightMetric: '120 kg Pure 24K Gold & Silver',
    title: 'The Annual Draping of the Sacred Kiswah',
    fact: 'Over 200 specialized Saudi master-craftsmen weave 670 kg of raw Italian silk with 120 kg of pure 24-karat gold and silver threads to embroider the majestic Qur’anic verses covering the Holy Kaaba.',
    historicalContext: 'Hand-sewn continuously at the King Abdulaziz Complex for Holy Kaaba Kiswah in Umm Al-Joud, Makkah, preserving centuries-old Islamic textile heritage.',
    sourceReference: 'General Authority for the Care of the Two Holy Mosques',
    image: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'fact-zamzam',
    number: '02',
    city: 'makkah',
    cityLabel: 'Makkah Al-Mukarramah',
    highlightMetric: '4,000+ Years Continuous Gushing',
    title: 'The Miraculous Spring That Never Dries',
    fact: 'Flowing uninterrupted since the era of Sayyidatuna Hajar and Prophet Ismail (AS), the sacred Zamzam well pumps up to 18.5 liters per second without ever producing algae, biological growth, or microbial contamination.',
    historicalContext: 'Laboratory analyses confirm rich mineral content of calcium, magnesium, and fluorides, naturally refreshing millions of pilgrims annually.',
    sourceReference: 'Saudi Geological Survey & King Abdullah Zamzam Water Project',
    image: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'fact-umbrellas',
    number: '03',
    city: 'madinah',
    cityLabel: 'Madinah Al-Munawwarah',
    highlightMetric: '250 Automated Convertible Umbrellas',
    title: 'World’s Largest Architectural Canopy System',
    fact: 'The outdoor marble courtyards of Al-Masjid An-Nabawi are shaded by 250 massive automated convertible umbrellas engineered in Germany. They open silently in 3 minutes, equipped with fine water-mist fans cooling 143,000 square meters.',
    historicalContext: 'Shelters over 250,000 worshipping pilgrims simultaneously, lowering open-air ground temperature by up to 10°C.',
    sourceReference: 'Agency for the Prophet’s Mosque Affairs',
    image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'fact-train',
    number: '04',
    city: 'makkah',
    cityLabel: 'Makkah ⇄ Madinah Corridor',
    highlightMetric: '300 km/h Bullet Train Corridor',
    title: 'High-Speed Electrified Desert Transit',
    fact: 'The Haramain High-Speed Railway is one of the fastest passenger train systems in the Middle East, gliding 450 km across the Hijaz desert at 300 km/h and cutting travel between Makkah and Madinah from 6 hours to just 120 minutes.',
    historicalContext: 'State-of-the-art Spanish Talgo 350 trains equipped with specialized desert sand filters and dual air-conditioning.',
    sourceReference: 'Saudi Arabia Railways (SAR)',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'fact-quba',
    number: '05',
    city: 'madinah',
    cityLabel: 'Madinah Al-Munawwarah',
    highlightMetric: 'Reward Equal to a Full Umrah',
    title: 'The Divine Spiritual Multiplier of Masjid Quba',
    fact: 'Prophet Muhammad ﷺ declared that whoever purifies themselves in their house, then visits Masjid Quba and offers prayer in it, receives a spiritual reward equal to performing an entire accepted Umrah pilgrimage.',
    historicalContext: 'The first mosque ever established in Islamic history, founded by the Prophet ﷺ upon his blessed migration (Hijrah) to Madinah in 622 CE.',
    sourceReference: 'Hadith: Sunan Ibn Majah (1412), Sahih Al-Tirmidhi',
    image: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'fact-hajar',
    number: '06',
    city: 'makkah',
    cityLabel: 'Makkah Al-Mukarramah',
    highlightMetric: 'Originated in Paradise (Jannah)',
    title: 'Hajar Al-Aswad: The Cornerstone of Tawaf',
    fact: 'Enshrined in a pure silver casing at the eastern corner of the Holy Kaaba, the Black Stone marks the exact starting and ending line of all seven Tawaf circuits. It descended from Jannah pure white and is scented daily with pure Cambodian oud.',
    historicalContext: 'Pilgrims kiss or point toward the stone (Istilam) following the direct practice and Sunnah of Prophet Muhammad ﷺ.',
    sourceReference: 'Hadith: Jami` at-Tirmidhi (877)',
    image: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80'
  }
];

export const DidYouKnowUmrah: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeFact = SACRED_FACTS[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? SACRED_FACTS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === SACRED_FACTS.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="vad-dyk-section">
      <div className="vad-dyk-container">
        
        {/* Section Header */}
        <div className="vad-dyk-header">
          <div className="vad-dyk-badge">
            <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Did You Know?</span>
          </div>

          <h2 className="vad-dyk-title">
            Wonders &amp; Sacred Heritage of <span className="gold-shimmer-text">Makkah &amp; Madinah</span>
          </h2>

          <p className="vad-dyk-subtitle">
            Remarkable architectural achievements, miraculous natural springs, and divine blessings of the Two Holy Mosques.
          </p>
        </div>

        {/* Editorial Spotlight Card (Visit Abu Dhabi Magazine Style) */}
        <div className="vad-dyk-showcase-card">
          
          {/* Left Column: Visual with Badges */}
          <div className="vad-dyk-visual-col">
            <img 
              src={activeFact.image} 
              alt={activeFact.title} 
              className="vad-dyk-hero-img"
              key={activeFact.id}
            />
            <div className="vad-dyk-img-gradient" />

            <div className="vad-dyk-top-chips">
              <span className="vad-dyk-index-chip">
                Fact {activeFact.number} of 0{SACRED_FACTS.length}
              </span>
              <span className={`vad-dyk-city-chip ${activeFact.city}`}>
                {activeFact.cityLabel}
              </span>
            </div>

            <div className="vad-dyk-stat-callout">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>{activeFact.highlightMetric}</span>
            </div>
          </div>

          {/* Right Column: Editorial Quote & Context */}
          <div className="vad-dyk-content-col">
            <div className="vad-dyk-quote-mark">“</div>

            <span className="vad-dyk-section-tag">Historical &amp; Spiritual Blessing</span>

            <h3 className="vad-dyk-fact-heading">
              {activeFact.title}
            </h3>

            <blockquote className="vad-dyk-fact-quote">
              {activeFact.fact}
            </blockquote>

            <div className="vad-dyk-context-box">
              <span className="context-label">Context &amp; Provenance:</span>
              <p className="context-text">{activeFact.historicalContext}</p>
            </div>

            <div className="vad-dyk-source-row">
              <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span className="source-text">Verified Reference: {activeFact.sourceReference}</span>
            </div>

            {/* Navigation Controls Bar */}
            <div className="vad-dyk-controls-bar">
              <div className="vad-dyk-progress-indicators">
                {SACRED_FACTS.map((f, idx) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`dyk-dot ${idx === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Jump to fact ${f.number}`}
                  />
                ))}
              </div>

              <div className="vad-dyk-nav-btns">
                <button 
                  type="button" 
                  className="dyk-arrow-btn"
                  onClick={handlePrev}
                  aria-label="Previous fact"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="dyk-page-count">
                  {activeFact.number} / 0{SACRED_FACTS.length}
                </span>
                <button 
                  type="button" 
                  className="dyk-arrow-btn"
                  onClick={handleNext}
                  aria-label="Next fact"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Fact Selector Pills Bar */}
        <div className="vad-dyk-pills-bar">
          {SACRED_FACTS.map((f, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={f.id}
                type="button"
                className={`vad-dyk-selector-pill ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
              >
                <span className="selector-num">{f.number}</span>
                <span className="selector-label">{f.title.split(':')[0]}</span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
