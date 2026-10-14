import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  PlaneTakeoff, 
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface InteractiveHeroWidgetProps {
  onPlanTrip: (data: { pilgrims: number; durationNights: number; travelDate: string; departureCity: string }) => void;
  formatPrice: (amount: number) => string;
}

export const InteractiveHeroWidget: React.FC<InteractiveHeroWidgetProps> = ({
  onPlanTrip,
  formatPrice
}) => {
  // Default to 14 days ahead
  const defaultDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  }, []);

  const [travelDate, setTravelDate] = useState<string>(defaultDate);
  const [durationNights, setDurationNights] = useState<number>(10);
  const [pilgrims, setPilgrims] = useState<number>(2);
  const [departureCity, setDepartureCity] = useState<string>('DEL');

  // Realistic per-person baseline estimate in SAR/selected currency
  const getEstimatedPrice = () => {
    let base = 1450;
    if (durationNights === 10) base = 2150;
    else if (durationNights === 14) base = 2850;
    else if (durationNights === 21) base = 3950;

    if (departureCity === 'BOM' || departureCity === 'DEL') base -= 100;
    return base;
  };

  const estimatedPrice = getEstimatedPrice();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPlanTrip({
      pilgrims,
      durationNights,
      travelDate,
      departureCity
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="hero-booking-widget-card">
      <div className="widget-header-badge">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <span>Instant Umrah Booking &amp; e-Visa Clearance</span>
      </div>

      <h3 className="widget-main-heading">
        Plan Your Umrah Journey
      </h3>
      <p className="widget-sub-heading">
        Select travel date, duration and pilgrims to customize your booking
      </p>

      <form onSubmit={handleSubmit} className="widget-booking-form">
        
        {/* Travel Date */}
        <div className="widget-form-group">
          <label className="widget-label">
            <Calendar className="h-4 w-4 text-amber-600" />
            <span>Travel Date</span>
          </label>
          <div className="widget-input-wrapper">
            <input 
              type="date"
              min={todayStr}
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="widget-input"
              required
            />
          </div>
        </div>

        {/* Duration Selection */}
        <div className="widget-form-group">
          <label className="widget-label">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Duration (Nights)</span>
          </label>
          <div className="widget-duration-pills">
            {[
              { nights: 7, label: '7 Nights', split: '4N Makkah • 3N Madinah' },
              { nights: 10, label: '10 Nights', split: '6N Makkah • 4N Madinah' },
              { nights: 14, label: '14 Nights', split: '8N Makkah • 6N Madinah' },
              { nights: 21, label: '21 Nights', split: '12N Makkah • 9N Madinah' }
            ].map(item => (
              <button
                key={item.nights}
                type="button"
                className={`duration-pill-btn ${durationNights === item.nights ? 'active' : ''}`}
                onClick={() => setDurationNights(item.nights)}
              >
                <span className="pill-duration-title">{item.label}</span>
                <span className="pill-duration-split">{item.split}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pilgrims & Departure Hub (Grid) */}
        <div className="widget-two-col-grid">
          {/* Number of Pilgrims */}
          <div className="widget-form-group">
            <label className="widget-label">
              <Users className="h-4 w-4 text-amber-600" />
              <span>Pilgrims</span>
            </label>
            <div className="widget-stepper-box">
              <button 
                type="button" 
                className="stepper-btn"
                onClick={() => setPilgrims(Math.max(1, pilgrims - 1))}
                aria-label="Decrease pilgrims"
              >
                −
              </button>
              <div className="stepper-center">
                <span className="stepper-number">{pilgrims}</span>
                <span className="stepper-label">{pilgrims === 1 ? 'Pilgrim' : 'Pilgrims'}</span>
              </div>
              <button 
                type="button" 
                className="stepper-btn"
                onClick={() => setPilgrims(Math.min(20, pilgrims + 1))}
                aria-label="Increase pilgrims"
              >
                +
              </button>
            </div>
          </div>

          {/* Departure Airport */}
          <div className="widget-form-group">
            <label className="widget-label">
              <PlaneTakeoff className="h-4 w-4 text-amber-600" />
              <span>Departure City</span>
            </label>
            <div className="widget-input-wrapper">
              <select 
                value={departureCity} 
                onChange={(e) => setDepartureCity(e.target.value)}
                className="widget-select"
              >
                <option value="DEL">🇮🇳 Delhi (DEL)</option>
                <option value="BOM">🇮🇳 Mumbai (BOM)</option>
                <option value="CCJ">🇮🇳 Calicut (CCJ)</option>
                <option value="COK">🇮🇳 Kochi (COK)</option>
                <option value="HYD">🇮🇳 Hyderabad (HYD)</option>
                <option value="BLR">🇮🇳 Bengaluru (BLR)</option>
                <option value="MAA">🇮🇳 Chennai (MAA)</option>
                <option value="DXB">🇦🇪 Dubai (DXB)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Estimate Footer & CTA */}
        <div className="widget-action-footer">
          <div className="widget-estimate-box">
            <span className="estimate-caption">Estimated from</span>
            <div className="estimate-price-row">
              <strong className="estimate-amount">{formatPrice(estimatedPrice)}</strong>
              <span className="estimate-unit">/ pilgrim</span>
            </div>
            <span className="estimate-guarantee">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 inline mr-1" />
              5★ Hotels + Chauffeur + 24h e-Visa
            </span>
          </div>

          <button type="submit" className="widget-submit-btn">
            <span>Continue to Booking</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
