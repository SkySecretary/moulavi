import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  Info,
  ArrowRight
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
    historicalContext: 'Hand-sewn continuously at the King Abdulaziz Complex for Holy Kaaba Kiswah in Umm Al-Joud, Makkah.',
    sourceReference: 'Official General Authority for the Care of the Two Holy Mosques',
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
    cityLabel: 'Makkah ⇄ Madinah',
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
  const [activeFactId, setActiveFactId] = useState<string>(SACRED_FACTS[0].id);
  const activeFact = SACRED_FACTS.find(f => f.id === activeFactId) || SACRED_FACTS[0];

  return (
    <section className="did-you-know-section">
      <div className="did-you-know-container">
        {/* Section Header */}
        <div className="did-you-know-header">
          <span className="dyk-badge">
            <HelpCircle className="h-3.5 w-3.5 text-amber-500" /> Sacred Heritage &amp; Wonders
          </span>
          <h2 className="dyk-title">
            Wonders of the Two Holy Mosques: Did You Know?
          </h2>
          <p className="dyk-subtitle">
            Explore authentic historical marvels, spiritual multiplications, and engineering wonders that make Makkah Al-Mukarramah and Madinah Al-Munawwarah unlike any other place on Earth.
          </p>
        </div>

        {/* 6-Card Interactive Grid */}
        <div className="dyk-cards-grid">
          {SACRED_FACTS.map((fact) => {
            const isSelected = fact.id === activeFact.id;
            return (
              <div 
                key={fact.id}
                className={`dyk-fact-card ${isSelected ? 'active' : ''}`}
                onClick={() => setActiveFactId(fact.id)}
              >
                <div className="dyk-card-header">
                  <span className="dyk-number">#{fact.number}</span>
                  <span className={`dyk-city-tag ${fact.city}`}>{fact.cityLabel}</span>
                </div>

                <div className="dyk-metric-strip">
                  <Sparkles className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <strong>{fact.highlightMetric}</strong>
                </div>

                <h3 className="dyk-card-title">{fact.title}</h3>
                <p className="dyk-card-text">{fact.fact}</p>

                <div className="dyk-card-footer">
                  <span className="dyk-context-text">
                    <Info className="h-3 w-3 inline mr-1 text-amber-500" />
                    {fact.historicalContext}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Highlight Banner */}
        <div className="dyk-spotlight-banner">
          <div className="dyk-spotlight-img-box">
            <img src={activeFact.image} alt={activeFact.title} />
            <div className="dyk-spotlight-overlay" />
            <span className="dyk-spotlight-tag">Sacred Wonder #{activeFact.number}</span>
          </div>

          <div className="dyk-spotlight-content">
            <div className="dyk-spotlight-meta">
              <span className="dyk-spotlight-metric">{activeFact.highlightMetric}</span>
              <span className="dyk-spotlight-source">{activeFact.sourceReference}</span>
            </div>

            <h3 className="dyk-spotlight-heading">{activeFact.title}</h3>
            <p className="dyk-spotlight-p">{activeFact.fact}</p>
            <p className="dyk-spotlight-context">"{activeFact.historicalContext}"</p>

            <button
              type="button"
              className="dyk-spotlight-btn"
              onClick={() => {
                const el = document.getElementById('ready-packages');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>Experience This on Your Pilgrimage</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
