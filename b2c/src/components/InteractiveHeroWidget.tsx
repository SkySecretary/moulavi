import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Sun, 
  Users, 
  ShieldCheck, 
  Zap, 
  ArrowRight
} from 'lucide-react';

interface InteractiveHeroWidgetProps {
  onSelectEstimate: (city: string, pax: number, nights: number) => void;
  onQuickEVisa: () => void;
  formatPrice: (amount: number) => string;
}

export const InteractiveHeroWidget: React.FC<InteractiveHeroWidgetProps> = ({
  onSelectEstimate,
  onQuickEVisa,
  formatPrice
}) => {
  const [activeTab, setActiveTab] = useState<'makkah' | 'madinah' | 'evisa'>('makkah');
  const [departureCity, setDepartureCity] = useState('DEL');
  const [pilgrimCount, setPilgrimCount] = useState(2);
  const [durationNights, setDurationNights] = useState(7);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Keep live KSA Time (UTC+3)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // KSA is UTC+3
      const ksaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
      const hours = ksaTime.getHours();
      const minutes = ksaTime.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      setCurrentTimeStr(`${formattedHours}:${minutes} ${ampm} AST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute realistic live estimated baseline per pilgrim
  const getEstimatedPricePerPerson = () => {
    let base = 1450; // 7-day base
    if (durationNights === 10) base = 2150;
    if (durationNights === 14) base = 2850;
    
    // Slight adjustment for departure corridor
    if (departureCity === 'LHR') base += 500;
    if (departureCity === 'DXB') base -= 150;

    return base;
  };

  const pricePerPerson = getEstimatedPricePerPerson();

  return (
    <div className="hero-interactive-widget">
      {/* Top Tabs */}
      <div className="widget-tab-bar">
        <button
          type="button"
          className={`widget-tab ${activeTab === 'makkah' ? 'active' : ''}`}
          onClick={() => setActiveTab('makkah')}
        >
          <span>🕋 Makkah Sanctuary</span>
        </button>
        <button
          type="button"
          className={`widget-tab ${activeTab === 'madinah' ? 'active' : ''}`}
          onClick={() => setActiveTab('madinah')}
        >
          <span>🕌 Madinah Munawwarah</span>
        </button>
        <button
          type="button"
          className={`widget-tab ${activeTab === 'evisa' ? 'active' : ''}`}
          onClick={() => setActiveTab('evisa')}
        >
          <Zap className="h-3.5 w-3.5 text-amber-300" />
          <span>24hr eVisa</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="widget-body">
        {activeTab !== 'evisa' ? (
          <>
            {/* Atmospheric Live Banner */}
            <div className="widget-atmosphere-header">
              <div className="atmosphere-city-meta">
                <div className="city-pill">
                  <MapPin className="h-3 w-3 text-amber-400" />
                  <span>{activeTab === 'makkah' ? 'Makkah Al-Mukarramah' : 'Madinah Al-Munawwarah'}</span>
                </div>
                <span className="live-clock">{currentTimeStr || '11:45 AM AST'}</span>
              </div>
              <div className="atmosphere-weather-meta">
                <div className="weather-pill">
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>{activeTab === 'makkah' ? '30°C • Clear' : '28°C • Pleasant'}</span>
                </div>
                <span className="next-prayer-pill">
                  {activeTab === 'makkah' ? 'Next: Dhuhr in 1h 20m' : 'Next: Dhuhr in 1h 15m'}
                </span>
              </div>
            </div>

            {/* Quick Pilgrimage Journey Estimator */}
            <div className="widget-form">
              <div className="widget-input-row">
                <div className="widget-field">
                  <label>Departure Corridor</label>
                  <select 
                    value={departureCity} 
                    onChange={(e) => setDepartureCity(e.target.value)}
                    className="widget-select"
                  >
                    <option value="DEL">🇮🇳 Delhi (DEL) - Direct</option>
                    <option value="BOM">🇮🇳 Mumbai (BOM) - Direct</option>
                    <option value="CCJ">🇮🇳 Calicut (CCJ) - Direct</option>
                    <option value="HYD">🇮🇳 Hyderabad (HYD)</option>
                    <option value="BLR">🇮🇳 Bengaluru (BLR)</option>
                    <option value="COK">🇮🇳 Kochi (COK)</option>
                    <option value="DXB">🇦🇪 Dubai (DXB) - Direct</option>
                    <option value="DOH">🇶🇦 Doha (DOH)</option>
                    <option value="KWI">🇰🇼 Kuwait (KWI)</option>
                    <option value="LHR">🇬🇧 London Heathrow (LHR)</option>
                  </select>
                </div>
              </div>

              <div className="widget-input-grid">
                {/* Duration Nights */}
                <div className="widget-field">
                  <label>Duration & Stays</label>
                  <select 
                    value={durationNights} 
                    onChange={(e) => setDurationNights(Number(e.target.value))}
                    className="widget-select"
                  >
                    <option value={7}>7 Nights (4N Makkah • 3N Madinah)</option>
                    <option value={10}>10 Nights (6N Makkah • 4N Madinah)</option>
                    <option value={14}>14 Nights (8N Makkah • 6N Madinah)</option>
                  </select>
                </div>

                {/* Pilgrims Stepper */}
                <div className="widget-field">
                  <label>Pilgrims</label>
                  <div className="widget-stepper">
                    <button 
                      type="button" 
                      onClick={() => setPilgrimCount(Math.max(1, pilgrimCount - 1))}
                      className="stepper-btn"
                    >
                      -
                    </button>
                    <span className="stepper-val">
                      <Users className="h-3.5 w-3.5 text-amber-400 inline mr-1" />
                      {pilgrimCount} {pilgrimCount === 1 ? 'Pax' : 'Pax'}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setPilgrimCount(Math.min(15, pilgrimCount + 1))}
                      className="stepper-btn"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Estimate Preview & Quick Action */}
              <div className="widget-footer">
                <div className="widget-pricing">
                  <span className="widget-price-label">Estimated from</span>
                  <div className="widget-price-val">
                    <strong>{formatPrice(pricePerPerson)}</strong>
                    <span className="price-unit">/ pilgrim</span>
                  </div>
                  <span className="widget-guarantee-tag">
                    <ShieldCheck className="h-3 w-3 text-emerald-400 inline mr-1" />
                    All-Inclusive (Visa + 5★ Haram Stay + Transfers)
                  </span>
                </div>

                <button
                  type="button"
                  className="widget-cta-btn"
                  onClick={() => onSelectEstimate(departureCity, pilgrimCount, durationNights)}
                >
                  <span>View Packages</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* 24-Hour Quick eVisa Tab */
          <div className="widget-evisa-panel">
            <div className="evisa-badge-strip">
              <span className="evisa-pill">
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                Ministry Direct Integration
              </span>
              <span className="evisa-speed">24h Express Processing</span>
            </div>

            <h4 className="evisa-title">Official Saudi Umrah e-Visa</h4>
            <p className="evisa-desc">
              Instant electronic visa with zero embassy visits. Complete direct biometrics OCR &amp; receive official Ministry clearance via WhatsApp &amp; Email.
            </p>

            <ul className="evisa-features-list">
              <li>
                <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>90-Day Stay Validity with Multiple Entry Option</span>
              </li>
              <li>
                <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Official KSA Council of Health Insurance Included</span>
              </li>
              <li>
                <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Instant Rawdah Ash-Sharifah &amp; Umrah Nusuk Permit Sync</span>
              </li>
            </ul>

            <button
              type="button"
              className="widget-cta-btn full-width"
              onClick={onQuickEVisa}
            >
              <Zap className="h-4 w-4 text-amber-300" />
              <span>Apply for Instant 24h eVisa</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
