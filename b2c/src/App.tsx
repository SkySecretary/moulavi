import { useState, useEffect } from 'react';
import { 
  Compass, 
  Sparkles, 
  Building, 
  Car, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  ChevronRight, 
  ShieldCheck, 
  FileCheck, 
  Camera, 
  Lock
} from 'lucide-react';

// ==========================================
// Mock Master Data for B2C Interactive Portal
// ==========================================
const READYMADE_PACKAGES = [
  {
    id: 'pkg-economy',
    title: 'Essential 7-Day Umrah',
    badge: 'Best Value',
    description: 'Perfect for a quick, spiritually fulfilling journey. Includes shared transport and reliable 4-star accommodations close to the Holy Mosques.',
    makkahNights: 4,
    madinahNights: 3,
    makkahHotel: 'Elaf Kinda Hotel (4★)',
    madinahHotel: 'Madinah Hilton (4★)',
    transport: 'Coaster Shuttle Bus (Group)',
    flight: 'Flynas (Direct)',
    pricePerPerson: 1450,
  },
  {
    id: 'pkg-premium',
    title: 'Deluxe 10-Day Kaaba View',
    badge: 'Premium Choice',
    description: 'Elevate your pilgrimage with 5-star hotels offering panoramic Kaaba and Prophet\'s Mosque views, combined with private SUV transport.',
    makkahNights: 6,
    madinahNights: 4,
    makkahHotel: 'Swissôtel Makkah (5★)',
    madinahHotel: 'Anwar Al Madinah Mövenpick (5★)',
    transport: 'Private GMC SUV Yukon',
    flight: 'Saudi Arabian Airlines (Direct)',
    pricePerPerson: 3890,
  },
  {
    id: 'pkg-elite',
    title: 'Elite 14-Day Full Spiritual Journey',
    badge: 'Comprehensive',
    description: 'Immerse yourself fully without worry. Extended stay with elite accommodations, private transfers, and historical Ziyarath tours included.',
    makkahNights: 8,
    madinahNights: 6,
    makkahHotel: 'Pullman Zamzam Makkah (5★)',
    madinahHotel: 'The Oberoi Madinah (5★)',
    transport: 'Haramain VIP Train + Private Yukon',
    flight: 'Emirates Airlines (1 Stop)',
    pricePerPerson: 5200,
  }
];

const FLIGHTS = [
  { id: 'flt-nas', name: 'Flynas (Low Cost)', desc: 'Direct flight, economy baggage limits', price: 650 },
  { id: 'flt-sv', name: 'Saudi Arabian Airlines', desc: 'Direct flight, full service meals, premium cabin', price: 980 },
  { id: 'flt-ek', name: 'Emirates Airlines', desc: 'Comfortable connection via Dubai, top-tier entertainment', price: 1450 }
];

const MAKKAH_HOTELS = [
  { id: 'h-m-1', name: 'Elaf Kinda Hotel (4★)', desc: '150m from Haram courtyard, comfortable rooms', pricePerNight: 280, rating: '4.5/5' },
  { id: 'h-m-2', name: 'Pullman Zamzam Makkah (5★)', desc: 'Located inside Abraj Al Bait, direct elevator access', pricePerNight: 450, rating: '4.8/5' },
  { id: 'h-m-3', name: 'Swissôtel Makkah (5★)', desc: 'Grand lobby, signature views over the Kaaba grid', pricePerNight: 580, rating: '4.9/5' }
];

const MADINAH_HOTELS = [
  { id: 'h-d-1', name: 'Madinah Hilton (4★)', desc: 'North Central Area, short walk to ladies gate', pricePerNight: 240, rating: '4.4/5' },
  { id: 'h-d-2', name: 'Anwar Al Madinah Mövenpick (5★)', desc: 'Direct mall attachment, close to Haram gate 15', pricePerNight: 390, rating: '4.7/5' },
  { id: 'h-d-3', name: 'The Oberoi Madinah (5★)', desc: 'Ultra-luxurious royal suites, exquisite customer care', pricePerNight: 650, rating: '5.0/5' }
];

const TRANSPORT_OPTIONS = [
  { id: 'tr-bus', name: 'Coaster Shuttle Bus (Group)', desc: 'Economical shared shuttle schedule', price: 120 },
  { id: 'tr-train', name: 'Haramain High-Speed Train (VIP)', desc: 'First class bullet train from Jeddah to Makkah/Madinah', price: 320 },
  { id: 'tr-gmc', name: 'Private GMC SUV Yukon', desc: 'Dedicated professional driver, direct hotel luggage drops', price: 750 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'packages' | 'builder'>('packages');
  
  // Custom Builder States
  const [step, setStep] = useState(1);
  const [dates, setDates] = useState({
    checkIn: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    makkahNights: 4,
    madinahNights: 3,
    travelers: 2,
  });
  
  const [selectedFlight, setSelectedFlight] = useState(FLIGHTS[1]);
  const [selectedMakkahHotel, setSelectedMakkahHotel] = useState(MAKKAH_HOTELS[1]);
  const [selectedMadinahHotel, setSelectedMadinahHotel] = useState(MADINAH_HOTELS[1]);
  const [selectedTransport, setSelectedTransport] = useState(TRANSPORT_OPTIONS[2]);
  
  // Checkout & Auth States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  const [bookingFinished, setBookingFinished] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  
  // Traveler Info State
  const [traveler, setTraveler] = useState({
    fullName: '',
    passportNumber: '',
    nationality: 'United States',
    mobile: '',
    email: '',
    cardName: '',
    cardNumber: '4111 2222 3333 4444',
    cardExpiry: '12/29',
    cardCvv: '123'
  });

  // Calculate pricing
  const visaPrice = 450; // Dynamic Ministry visa fee per pax
  const makkahHotelTotal = selectedMakkahHotel.pricePerNight * dates.makkahNights;
  const madinahHotelTotal = selectedMadinahHotel.pricePerNight * dates.madinahNights;
  const flightsTotal = selectedFlight.price * dates.travelers;
  const visaTotal = visaPrice * dates.travelers;
  
  const builderSubtotal = makkahHotelTotal + madinahHotelTotal + flightsTotal + selectedTransport.price + visaTotal;
  const builderVat = Math.round(builderSubtotal * 0.15); // 15% VAT
  const builderTotal = builderSubtotal + builderVat;

  // Set Package for Checkout directly
  const [checkoutPackage, setCheckoutPackage] = useState<any>(null);

  // Generate a random Reference ID
  useEffect(() => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    setBookingRef(`UMR-2026-${randomSuffix}`);
  }, [bookingFinished]);

  // Simulate Passport OCR Scan
  const simulatePassportScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setTraveler(prev => ({
        ...prev,
        fullName: 'Johnathan Doe',
        passportNumber: 'EP9832104',
        nationality: 'United States',
      }));
      setIsScanning(false);
    }, 2000);
  };

  // Simulate OTP Verification
  const requestOtp = () => {
    if (!traveler.mobile) return;
    setOtpSent(true);
    setOtpCode('');
  };

  const verifyOtp = () => {
    if (otpCode === '1234') {
      setOtpVerified(true);
      setOtpSent(false);
    } else {
      alert('Invalid code! Enter 1234 to verify.');
    }
  };

  // Complete Payment & Process e-Visa
  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) {
      alert('Please verify your mobile number via OTP first.');
      return;
    }
    setIsProcessingBooking(true);
    setTimeout(() => {
      setIsProcessingBooking(false);
      setBookingFinished(true);
    }, 3500);
  };

  const getCheckoutTotal = () => {
    if (checkoutPackage) {
      const sub = checkoutPackage.pricePerPerson * dates.travelers;
      const vat = Math.round(sub * 0.15);
      return { subtotal: sub, vat, total: sub + vat };
    }
    return { subtotal: builderSubtotal, vat: builderVat, total: builderTotal };
  };

  const totals = getCheckoutTotal();

  return (
    <>
      {/* Navigation Header */}
      <header>
        <div className="nav-container">
          <a href="#" className="logo-block">
            <div className="logo-icon">M</div>
            <div className="logo-text">
              <h1>Moulavi B2C</h1>
              <span>Ministry Approved Channel</span>
            </div>
          </a>
          <div className="nav-links">
            <a href="#" className="nav-link" onClick={() => { setActiveTab('packages'); setStep(1); setCheckoutPackage(null); setBookingFinished(false); }}>Packages</a>
            <a href="#" className="nav-link" onClick={() => { setActiveTab('builder'); setStep(1); setCheckoutPackage(null); setBookingFinished(false); }}>Custom Builder</a>
            <button className="nav-btn" onClick={() => { setActiveTab('builder'); setStep(1); setCheckoutPackage(null); setBookingFinished(false); }}>Start Booking</button>
          </div>
        </div>
      </header>

      <main>
        {/* Success Manifest View */}
        {bookingFinished ? (
          <div className="builder-main" style={{ maxWidth: '850px', margin: '0 auto' }}>
            <div className="success-alert">
              <CheckCircle className="h-5 w-5" />
              Your B2C Pilgrimage eVisa and Hotel BRNs are successfully locked!
            </div>
            
            <h2 className="hero-title" style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '0.5rem' }}>Your Pilgrimage Manifest</h2>
            <p className="hero-subtitle" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              Your electronic visa has been processed. A copy of this voucher has been dispatched via WhatsApp to {traveler.mobile}.
            </p>

            {/* Voucher Card Design */}
            <div className="voucher-card">
              <div className="voucher-header">
                <div className="voucher-brand">
                  <h2>MOULAVI TRAVELS</h2>
                  <p>Ministry of Hajj & Umrah Direct B2C Voucher</p>
                </div>
                <div className="voucher-ref">
                  <p className="voucher-ref-label">BOOKING REFERENCE</p>
                  <p className="voucher-ref-val">{bookingRef}</p>
                </div>
              </div>
              
              <div className="voucher-body">
                <div className="voucher-details">
                  
                  {/* Lead Pilgrim */}
                  <div>
                    <h3 className="voucher-section-title">Lead Pilgrim Info</h3>
                    <div className="voucher-grid">
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Full Name</span>
                        <span className="voucher-info-val">{traveler.fullName}</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Passport Number</span>
                        <span className="voucher-info-val">{traveler.passportNumber}</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Nationality</span>
                        <span className="voucher-info-val">{traveler.nationality}</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">eVisa Status</span>
                        <span className="voucher-info-val" style={{ color: 'var(--success)', fontWeight: 700 }}>✓ APPROVED</span>
                      </div>
                    </div>
                  </div>

                  {/* Accommodation Allotments */}
                  <div>
                    <h3 className="voucher-section-title">Accommodation Allotments</h3>
                    <div className="voucher-grid">
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Makkah Hotel</span>
                        <span className="voucher-info-val">
                          {checkoutPackage ? checkoutPackage.makkahHotel : selectedMakkahHotel.name}
                        </span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Makkah Stay</span>
                        <span className="voucher-info-val">{dates.makkahNights} Nights</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Madinah Hotel</span>
                        <span className="voucher-info-val">
                          {checkoutPackage ? checkoutPackage.madinahHotel : selectedMadinahHotel.name}
                        </span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Madinah Stay</span>
                        <span className="voucher-info-val">{dates.madinahNights} Nights</span>
                      </div>
                    </div>
                  </div>

                  {/* Transport & Manifest */}
                  <div>
                    <h3 className="voucher-section-title">Transport & Tafweej Manifest</h3>
                    <div className="voucher-grid">
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Service Type</span>
                        <span className="voucher-info-val">
                          {checkoutPackage ? checkoutPackage.transport : selectedTransport.name}
                        </span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Assigned Vehicle</span>
                        <span className="voucher-info-val">Yukon / GMC (Model 2025)</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Driver Contact</span>
                        <span className="voucher-info-val">+966 50 123 4567 (Saeed A.)</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Total Pax</span>
                        <span className="voucher-info-val">{dates.travelers} Adults</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="voucher-sidebar">
                  <div className="qr-placeholder">
                    {/* SVG QR Code generator */}
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                      <rect width="100" height="100" fill="white" />
                      {/* Quiet Zone */}
                      <path d="M10,10 h20 v20 h-20 z M15,15 h10 v10 h-10 z" fill="var(--secondary)" />
                      <path d="M70,10 h20 v20 h-20 z M75,15 h10 v10 h-10 z" fill="var(--secondary)" />
                      <path d="M10,70 h20 v20 h-20 z M15,75 h10 v10 h-10 z" fill="var(--secondary)" />
                      {/* Random QR grids */}
                      <path d="M35,10 h5 v5 h-5 z M45,10 h15 v5 h-15 z M35,20 h10 v5 h-10 z M50,20 h5 v10 h-5 z" fill="var(--secondary)" />
                      <path d="M10,35 h5 v15 h-5 z M20,40 h15 v5 h-15 z M35,45 h10 v5 h-10 z M15,55 h10 v5 h-10 z" fill="var(--secondary)" />
                      <path d="M40,40 h20 v10 h-20 z M45,55 h10 v10 h-10 z M60,35 h15 v5 h-15 z M70,45 h15 v10 h-15 z" fill="var(--secondary)" />
                      <path d="M35,70 h10 v5 h-10 z M50,75 h20 v5 h-20 z M35,85 h15 v5 h-15 z M60,85 h20 v5 h-20 z" fill="var(--secondary)" />
                    </svg>
                  </div>
                  <span className="qr-desc">Scan to verify Ministry of Hajj Pilgrimage Manifest</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button 
                className="nav-btn" 
                style={{ padding: '0.8rem 2rem', fontSize: '0.95rem' }}
                onClick={() => {
                  setActiveTab('packages');
                  setStep(1);
                  setCheckoutPackage(null);
                  setBookingFinished(false);
                }}
              >
                Return to Packages
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Landing Hero */}
            <section className="hero-section">
              <span className="hero-tag">Direct Consumer Channel</span>
              <h2 className="hero-title">Your Umrah Journey, Simplified.</h2>
              <p className="hero-subtitle">
                Compare verified local Maqam accommodation, customize flights, and schedule private transport manifests instantly. Authorized, safe, and direct.
              </p>

              {/* Tabs Controller */}
              <div className="tabs-control">
                <button 
                  className={`tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('packages'); setStep(1); }}
                >
                  <Compass className="h-4 w-4" /> Ready Packages
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'builder' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('builder'); setStep(1); }}
                >
                  <Sparkles className="h-4 w-4" /> Custom Builder
                </button>
              </div>
            </section>

            {/* Readymade Packages Catalog */}
            {activeTab === 'packages' && (
              <div className="cards-grid">
                {READYMADE_PACKAGES.map((pkg) => (
                  <div key={pkg.id} className="package-card">
                    <div className="package-image-placeholder">
                      <Compass className="h-10 w-10 opacity-30" />
                      <span className="package-badge">{pkg.badge}</span>
                    </div>
                    <div className="package-content">
                      <h3 className="package-title">{pkg.title}</h3>
                      <div className="package-meta">
                        <span>{pkg.makkahNights}N Makkah</span>
                        <span>•</span>
                        <span>{pkg.madinahNights}N Madinah</span>
                      </div>
                      <p className="package-desc">{pkg.description}</p>
                      
                      <div className="package-hotel-spec">
                        <div className="package-hotel-item">
                          <span className="package-hotel-label">Makkah Hotel</span>
                          <span className="package-hotel-name">{pkg.makkahHotel}</span>
                        </div>
                        <div className="package-hotel-item">
                          <span className="package-hotel-label">Madinah Hotel</span>
                          <span className="package-hotel-name">{pkg.madinahHotel}</span>
                        </div>
                        <div className="package-hotel-item">
                          <span className="package-hotel-label">Transport</span>
                          <span className="package-hotel-name">{pkg.transport}</span>
                        </div>
                      </div>

                      <div className="package-footer">
                        <div className="price-block">
                          <span className="price-label">Price per person</span>
                          <span className="price-val">{pkg.pricePerPerson} SAR</span>
                        </div>
                        <button 
                          className="book-btn"
                          onClick={() => {
                            setCheckoutPackage(pkg);
                            setActiveTab('builder');
                            setStep(4); // Advance directly to travelers info & payment step
                          }}
                        >
                          Book Now <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Builder Wizard */}
            {activeTab === 'builder' && (
              <div className="builder-layout">
                
                {/* Steps Section */}
                <div className="builder-main">
                  
                  {/* Stepper Header */}
                  <div className="stepper-header">
                    <h3 className="stepper-title">
                      {step === 1 && "Select Dates & Travelers"}
                      {step === 2 && "Choose Flight Options"}
                      {step === 3 && "Select Accommodation Allotments"}
                      {step === 4 && "Fulfillment & Payment Gate"}
                    </h3>
                    <span className="step-indicator">Step {step} of 4</span>
                  </div>

                  {/* STEP 1: Search criteria */}
                  {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Check-in Date</label>
                          <input 
                            type="date" 
                            className="form-input" 
                            value={dates.checkIn}
                            onChange={(e) => setDates({ ...dates, checkIn: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Total Pilgrims</label>
                          <select 
                            className="form-input"
                            value={dates.travelers}
                            onChange={(e) => setDates({ ...dates, travelers: parseInt(e.target.value, 10) })}
                          >
                            <option value={1}>1 Pilgrim</option>
                            <option value={2}>2 Pilgrims</option>
                            <option value={3}>3 Pilgrims</option>
                            <option value={4}>4 Pilgrims</option>
                            <option value={5}>5 Pilgrims</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-grid">
                        <div className="form-group">
                          <label>Makkah Stay Duration (Nights)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            min={1} 
                            max={30}
                            value={dates.makkahNights}
                            onChange={(e) => setDates({ ...dates, makkahNights: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Madinah Stay Duration (Nights)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            min={1} 
                            max={30}
                            value={dates.madinahNights}
                            onChange={(e) => setDates({ ...dates, madinahNights: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          />
                        </div>
                      </div>

                      <div className="step-nav" style={{ justifyContent: 'flex-end' }}>
                        <button className="book-btn" onClick={() => setStep(2)}>
                          Continue to Flights <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Flights */}
                  {step === 2 && (
                    <div>
                      <div className="options-list">
                        {FLIGHTS.map((f) => (
                          <div 
                            key={f.id} 
                            className={`option-item ${selectedFlight.id === f.id ? 'selected' : ''}`}
                            onClick={() => setSelectedFlight(f)}
                          >
                            <div className="option-left">
                              <div className="option-circle">
                                <div className="option-circle-inner" />
                              </div>
                              <div className="option-info">
                                <span className="option-name">{f.name}</span>
                                <span className="option-subtitle">{f.desc}</span>
                              </div>
                            </div>
                            <div className="option-right">
                              <span className="option-price">{f.price * dates.travelers} SAR</span>
                              <span className="option-subtitle">{f.price} SAR/pax</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="step-nav">
                        <button className="nav-back-btn" onClick={() => setStep(1)}>Back</button>
                        <button className="book-btn" onClick={() => setStep(3)}>
                          Continue to Hotels <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Accommodation Allotments */}
                  {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      
                      {/* Makkah Accommodation */}
                      <div>
                        <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>
                          <Building className="h-4 w-4" /> 1. Makkah Allotments ({dates.makkahNights} Nights)
                        </h4>
                        <div className="options-list">
                          {MAKKAH_HOTELS.map((h) => (
                            <div 
                              key={h.id} 
                              className={`option-item ${selectedMakkahHotel.id === h.id ? 'selected' : ''}`}
                              onClick={() => setSelectedMakkahHotel(h)}
                            >
                              <div className="option-left">
                                <div className="option-circle">
                                  <div className="option-circle-inner" />
                                </div>
                                <div className="option-info">
                                  <span className="option-name">{h.name}</span>
                                  <span className="option-subtitle">{h.desc}</span>
                                </div>
                              </div>
                              <div className="option-right">
                                <span className="option-price">{h.pricePerNight * dates.makkahNights} SAR</span>
                                <span className="option-subtitle">{h.pricePerNight} SAR/night</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Madinah Accommodation */}
                      <div>
                        <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>
                          <Building className="h-4 w-4" /> 2. Madinah Allotments ({dates.madinahNights} Nights)
                        </h4>
                        <div className="options-list">
                          {MADINAH_HOTELS.map((h) => (
                            <div 
                              key={h.id} 
                              className={`option-item ${selectedMadinahHotel.id === h.id ? 'selected' : ''}`}
                              onClick={() => setSelectedMadinahHotel(h)}
                            >
                              <div className="option-left">
                                <div className="option-circle">
                                  <div className="option-circle-inner" />
                                </div>
                                <div className="option-info">
                                  <span className="option-name">{h.name}</span>
                                  <span className="option-subtitle">{h.desc}</span>
                                </div>
                              </div>
                              <div className="option-right">
                                <span className="option-price">{h.pricePerNight * dates.madinahNights} SAR</span>
                                <span className="option-subtitle">{h.pricePerNight} SAR/night</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Transport options */}
                      <div>
                        <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>
                          <Car className="h-4 w-4" /> 3. Ground Transfers (Jeddah - Makkah - Madinah Route)
                        </h4>
                        <div className="options-list">
                          {TRANSPORT_OPTIONS.map((t) => (
                            <div 
                              key={t.id} 
                              className={`option-item ${selectedTransport.id === t.id ? 'selected' : ''}`}
                              onClick={() => setSelectedTransport(t)}
                            >
                              <div className="option-left">
                                <div className="option-circle">
                                  <div className="option-circle-inner" />
                                </div>
                                <div className="option-info">
                                  <span className="option-name">{t.name}</span>
                                  <span className="option-subtitle">{t.desc}</span>
                                </div>
                              </div>
                              <div className="option-right">
                                <span className="option-price">{t.price} SAR</span>
                                <span className="option-badge">All Inclusive</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="step-nav">
                        <button className="nav-back-btn" onClick={() => setStep(2)}>Back</button>
                        <button className="book-btn" onClick={() => setStep(4)}>
                          Proceed to Payment <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Checkout & Payment */}
                  {step === 4 && (
                    <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      
                      {/* Passport Scanner */}
                      <div>
                        <span className="price-label" style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Ministry Verification Passport OCR</span>
                        <div className="scan-box" onClick={simulatePassportScan}>
                          {isScanning ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                              <div className="qr-placeholder" style={{ border: 'none', width: '60px', height: '60px' }}>
                                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: '40px', height: '40px' }}>
                                  <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="4" strokeDasharray="30 30" />
                                </svg>
                              </div>
                              <span className="scan-title">Extracting pilgrim manifest fields...</span>
                            </div>
                          ) : (
                            <>
                              <Camera className="h-8 w-8 mx-auto text-primary" />
                              <h4 className="scan-title">Simulate Passport Scan</h4>
                              <p className="scan-desc">Scan or drag lead traveler passport image to pre-populate required fields automatically</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Traveler Fields */}
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Pilgrim Full Name (Matching Passport)</label>
                          <input 
                            type="text" 
                            required
                            className="form-input" 
                            placeholder="Johnathan Doe"
                            value={traveler.fullName}
                            onChange={(e) => setTraveler({ ...traveler, fullName: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Passport Number</label>
                          <input 
                            type="text" 
                            required
                            className="form-input" 
                            placeholder="EP9832104"
                            value={traveler.passportNumber}
                            onChange={(e) => setTraveler({ ...traveler, passportNumber: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="form-grid">
                        <div className="form-group">
                          <label>Contact Phone Number (For WhatsApp Voucher)</label>
                          <input 
                            type="tel" 
                            required
                            className="form-input" 
                            placeholder="+1 555 123 4567"
                            value={traveler.mobile}
                            onChange={(e) => setTraveler({ ...traveler, mobile: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Email Address</label>
                          <input 
                            type="email" 
                            required
                            className="form-input" 
                            placeholder="pilgrim@example.com"
                            value={traveler.email}
                            onChange={(e) => setTraveler({ ...traveler, email: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Passwordless OTP verification */}
                      <div className="otp-wrapper">
                        <h4 className="otp-title">
                          <Lock className="h-4 w-4 text-primary" /> Passwordless OTP Verification
                        </h4>
                        <p className="otp-desc">To secure your e-Visa allocation, request an OTP code to verify your mobile number.</p>
                        
                        {!otpSent && !otpVerified && (
                          <button 
                            type="button" 
                            className="nav-btn" 
                            disabled={!traveler.mobile}
                            onClick={requestOtp}
                          >
                            Send Verification Code
                          </button>
                        )}

                        {otpSent && (
                          <div className="otp-row">
                            <input 
                              type="text" 
                              maxLength={4}
                              className="form-input" 
                              style={{ width: '120px', letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.25rem', padding: '0.5rem' }}
                              placeholder="1234"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                            />
                            <button type="button" className="nav-btn" onClick={verifyOtp}>Verify Code</button>
                            <span className="scan-desc" style={{ marginLeft: '1rem' }}>Enter code <b>1234</b></span>
                          </div>
                        )}

                        {otpVerified && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.9rem' }}>
                            <CheckCircle className="h-5 w-5" /> Phone Number Verified
                          </div>
                        )}
                      </div>

                      {/* Credit Card Gate */}
                      <div>
                        <span className="price-label" style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'block' }}>Mada / Visa / Credit Card Details</span>
                        <div className="form-grid">
                          <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Card Number</label>
                            <input 
                              type="text" 
                              required
                              className="form-input" 
                              value={traveler.cardNumber}
                              onChange={(e) => setTraveler({ ...traveler, cardNumber: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="form-grid" style={{ marginTop: '1rem' }}>
                          <div className="form-group">
                            <label>Expiration Date</label>
                            <input 
                              type="text" 
                              required
                              className="form-input" 
                              value={traveler.cardExpiry}
                              onChange={(e) => setTraveler({ ...traveler, cardExpiry: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>CVV / CVC Code</label>
                            <input 
                              type="password" 
                              maxLength={3}
                              required
                              className="form-input" 
                              value={traveler.cardCvv}
                              onChange={(e) => setTraveler({ ...traveler, cardCvv: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Payment submit */}
                      <div className="step-nav">
                        <button 
                          type="button" 
                          className="nav-back-btn" 
                          onClick={() => {
                            if (checkoutPackage) {
                              setActiveTab('packages');
                              setCheckoutPackage(null);
                            } else {
                              setStep(3);
                            }
                          }}
                        >
                          Back
                        </button>
                        <button 
                          type="submit" 
                          className="book-btn" 
                          disabled={!otpVerified || isProcessingBooking}
                          style={{ backgroundColor: 'var(--success)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}
                        >
                          {isProcessingBooking ? (
                            <>
                              <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px' }}>
                                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" strokeDasharray="30 30" />
                              </svg>
                              Processing Visa & Booking Allotments...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4" /> Secure Payment & Lock BRNs ({totals.total} SAR)
                            </>
                          )}
                        </button>
                      </div>

                    </form>
                  )}

                </div>

                {/* Right Summary Panel */}
                <div className="builder-sidebar">
                  
                  <div className="summary-card">
                    <h4 className="summary-title">
                      <FileText className="h-4 w-4" /> Package Itinerary
                    </h4>
                    
                    <div className="summary-items">
                      {checkoutPackage ? (
                        <>
                          <div className="summary-row">
                            <span className="summary-label">Selected Package</span>
                            <span className="summary-value" style={{ fontWeight: 700, color: 'var(--primary)' }}>{checkoutPackage.title}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Makkah Hotel</span>
                            <span className="summary-value">{checkoutPackage.makkahHotel}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Madinah Hotel</span>
                            <span className="summary-value">{checkoutPackage.madinahHotel}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Transport Route</span>
                            <span className="summary-value">{checkoutPackage.transport}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Flight Route</span>
                            <span className="summary-value">{checkoutPackage.flight}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="summary-row">
                            <span className="summary-label">Makkah Nights</span>
                            <span className="summary-value">{dates.makkahNights} Nights</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Madinah Nights</span>
                            <span className="summary-value">{dates.madinahNights} Nights</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Selected Flight</span>
                            <span className="summary-value">{selectedFlight.name}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Makkah Accommodation</span>
                            <span className="summary-value">{selectedMakkahHotel.name}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Madinah Accommodation</span>
                            <span className="summary-value">{selectedMadinahHotel.name}</span>
                          </div>
                          <div className="summary-row">
                            <span className="summary-label">Transport Mode</span>
                            <span className="summary-value">{selectedTransport.name}</span>
                          </div>
                        </>
                      )}
                      
                      <div className="summary-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        <span className="summary-label">Visa Processing (Pax)</span>
                        <span className="summary-value">{dates.travelers} Travelers</span>
                      </div>
                    </div>

                    <div className="summary-total">
                      <span className="total-label">Subtotal</span>
                      <span className="summary-value" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{totals.subtotal} SAR</span>
                    </div>

                    <div className="summary-total" style={{ borderTop: 'none', paddingTop: 0 }}>
                      <span className="total-label" style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-muted)' }}>VAT (15%)</span>
                      <span className="summary-value" style={{ fontSize: '1rem', fontWeight: 600 }}>{totals.vat} SAR</span>
                    </div>

                    <div className="summary-total" style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                      <span className="total-label">Total Cost</span>
                      <span className="total-value">{totals.total} SAR</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span>Ministry Direct API Payment Gate</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <FileCheck className="h-4 w-4 text-primary" />
                        <span>Instant Allotment & BRN Locking</span>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
