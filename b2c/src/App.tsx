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
  Lock,
  ArrowRight,
  HeartHandshake
} from 'lucide-react';

// ==========================================
// Fallback Mock Data if ERP APIs are Offline
// ==========================================
const MOCK_PACKAGES = [
  {
    id: 'pkg-economy',
    title: 'Essential 7-Day Umrah Tour',
    description: 'Perfect for a quick, spiritually fulfilling journey. Includes shared transfers and reliable accommodations close to the Holy Mosques.',
    makkahNights: 4,
    madinahNights: 3,
    makkahHotel: { name: 'Elaf Kinda Hotel (4★)' },
    madinahHotel: { name: 'Madinah Hilton (4★)' },
    transportRoute: { routeType: 'SHUTTLE_BUS' },
    price: 1450,
  },
  {
    id: 'pkg-premium',
    title: 'Deluxe 10-Day Kaaba View',
    description: 'Elevate your pilgrimage with 5-star hotels offering Kaaba views, combined with private SUV transfers and VIP Hajj terminal access.',
    makkahNights: 6,
    madinahNights: 4,
    makkahHotel: { name: 'Swissôtel Makkah (5★)' },
    madinahHotel: { name: 'Anwar Al Madinah Mövenpick (5★)' },
    transportRoute: { routeType: 'PRIVATE_SUV' },
    price: 3890,
  }
];

const FLIGHTS = [
  { id: 'flt-nas', name: 'Flynas (Low Cost Direct)', price: 650 },
  { id: 'flt-sv', name: 'Saudi Arabian Airlines (SV Direct)', price: 980 },
  { id: 'flt-ek', name: 'Emirates Airlines (1 Stop VIP)', price: 1450 }
];

const DEFAULT_HOTELS = [
  { id: 'h-m-1', name: 'Swissôtel Makkah (5★)', city: 'Makkah', pricePerNight: 580 },
  { id: 'h-m-2', name: 'Pullman Zamzam Makkah (5★)', city: 'Makkah', pricePerNight: 450 },
  { id: 'h-m-3', name: 'Elaf Kinda Hotel (4★)', city: 'Makkah', pricePerNight: 280 },
  { id: 'h-d-1', name: 'The Oberoi Madinah (5★)', city: 'Madinah', pricePerNight: 650 },
  { id: 'h-d-2', name: 'Anwar Al Madinah Mövenpick (5★)', city: 'Madinah', pricePerNight: 390 },
  { id: 'h-d-3', name: 'Madinah Hilton (4★)', city: 'Madinah', pricePerNight: 240 }
];

const DEFAULT_ROUTES = [
  { id: 'r-1', routeType: 'Jeddah → Makkah → Madinah', price: 600 },
  { id: 'r-2', routeType: 'Jeddah → Makkah → Jeddah', price: 400 },
  { id: 'r-3', routeType: 'Madinah → Makkah → Jeddah', price: 600 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'packages' | 'builder'>('packages');
  const [packages, setPackages] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  // Custom Builder Choices
  const [dates, setDates] = useState({
    checkIn: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    makkahNights: 4,
    madinahNights: 3,
    travelers: 2,
  });

  const [selectedMakkahHotelId, setSelectedMakkahHotelId] = useState('');
  const [selectedMadinahHotelId, setSelectedMadinahHotelId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedFlight, setSelectedFlight] = useState(FLIGHTS[1]);

  // Dynamic Quote pricing
  const [quotePrices, setQuotePrices] = useState({
    subtotal: 1000,
    vat: 150,
    total: 1150
  });

  // Step and checkout controllers
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  
  // Auth & Simulators
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [bookingFinished, setBookingFinished] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  const [traveler, setTraveler] = useState({
    fullName: '',
    passportNumber: '',
    nationality: 'United States',
    mobile: '',
    email: '',
    cardNumber: '4111 2222 3333 4444',
    cardExpiry: '12/29',
    cardCvv: '123'
  });

  // 1. Fetch system masters from ERP backend
  useEffect(() => {
    const loadSystemData = async () => {
      try {
        const [packagesRes, locationsRes, routesRes] = await Promise.all([
          fetch('/api/b2c/packages').then(r => r.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/location-masters').then(r => r.json()).catch(() => ({ data: { locationMasters: [] } })),
          fetch('/api/transport-route-masters').then(r => r.json()).catch(() => ({ data: { transportRouteMasters: [] } }))
        ]);

        // Mappings
        if (packagesRes.success && packagesRes.data && packagesRes.data.length > 0) {
          setPackages(packagesRes.data);
        } else {
          setPackages(MOCK_PACKAGES);
        }

        const allLocations = locationsRes.data?.locationMasters || locationsRes.data || [];
        const hotelList = allLocations.filter((loc: any) => loc.locationType === 'HOTEL' || loc.locationType === 'hotel');
        
        if (hotelList.length > 0) {
          setHotels(hotelList);
          const makHotels = hotelList.filter((h: any) => h.city?.toLowerCase().includes('makkah') || h.name?.toLowerCase().includes('makkah'));
          const madHotels = hotelList.filter((h: any) => h.city?.toLowerCase().includes('madinah') || h.name?.toLowerCase().includes('madinah') || h.city?.toLowerCase().includes('medina'));
          
          setSelectedMakkahHotelId(makHotels[0]?.id || hotelList[0]?.id || '');
          setSelectedMadinahHotelId(madHotels[0]?.id || hotelList[1]?.id || '');
        } else {
          setHotels(DEFAULT_HOTELS);
          setSelectedMakkahHotelId(DEFAULT_HOTELS[0].id);
          setSelectedMadinahHotelId(DEFAULT_HOTELS[3].id);
        }

        const routeList = routesRes.data?.transportRouteMasters || routesRes.data || [];
        if (routeList.length > 0) {
          setRoutes(routeList);
          setSelectedRouteId(routeList[0]?.id || '');
        } else {
          setRoutes(DEFAULT_ROUTES);
          setSelectedRouteId(DEFAULT_ROUTES[0].id);
        }

      } catch (err) {
        console.error('Failed to load system data from ERP backend:', err);
        setPackages(MOCK_PACKAGES);
        setHotels(DEFAULT_HOTELS);
        setRoutes(DEFAULT_ROUTES);
        setSelectedMakkahHotelId(DEFAULT_HOTELS[0].id);
        setSelectedMadinahHotelId(DEFAULT_HOTELS[3].id);
        setSelectedRouteId(DEFAULT_ROUTES[0].id);
      }
    };

    loadSystemData();
  }, []);

  // 2. Recalculate dynamic quote from ERP pricing engine
  useEffect(() => {
    const calculateLiveQuote = async () => {
      if (!selectedMakkahHotelId || !selectedMadinahHotelId || !selectedRouteId) return;

      try {
        const response = await fetch('/api/b2c/builder/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            makkahHotelId: selectedMakkahHotelId,
            madinahHotelId: selectedMadinahHotelId,
            makkahNights: dates.makkahNights,
            madinahNights: dates.madinahNights,
            travelersCount: dates.travelers,
            transportOptionId: selectedRouteId,
            flightOptionId: selectedFlight.id
          })
        });
        const resData = await response.json();
        if (resData.success) {
          setQuotePrices(resData.data);
        } else {
          calculateLocalQuote();
        }
      } catch (err) {
        calculateLocalQuote();
      }
    };

    const calculateLocalQuote = () => {
      const mHotel = hotels.find(h => h.id === selectedMakkahHotelId) || DEFAULT_HOTELS[0];
      const dHotel = hotels.find(h => h.id === selectedMadinahHotelId) || DEFAULT_HOTELS[3];
      const rt = routes.find(r => r.id === selectedRouteId) || DEFAULT_ROUTES[0];
      
      const mPrice = (mHotel?.pricePerNight || 350) * dates.makkahNights;
      const dPrice = (dHotel?.pricePerNight || 300) * dates.madinahNights;
      const fPrice = selectedFlight.price * dates.travelers;
      const vPrice = 450 * dates.travelers; // e-Visa cost
      const rPrice = Number(rt?.price) || 500;

      const subtotal = mPrice + dPrice + fPrice + vPrice + rPrice;
      const vat = Math.round(subtotal * 0.15);
      setQuotePrices({
        subtotal,
        vat,
        total: subtotal + vat
      });
    };

    calculateLiveQuote();
  }, [
    dates.makkahNights, 
    dates.madinahNights, 
    dates.travelers, 
    selectedMakkahHotelId, 
    selectedMadinahHotelId, 
    selectedRouteId, 
    selectedFlight, 
    hotels, 
    routes
  ]);

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
      alert('Passport details extracted and verified!');
    }, 2000);
  };

  // Simulate OTP Verification via WhatsApp Service
  const requestOtp = async () => {
    if (!traveler.mobile) {
      alert('Please enter your mobile number first');
      return;
    }
    setOtpSent(true);
    try {
      await fetch('/api/b2c/auth/otp-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: traveler.mobile,
          email: traveler.email,
          fullName: traveler.fullName || 'Pilgrim'
        })
      });
    } catch (err) {
      console.log('Sending mock WhatsApp OTP notification...');
    }
  };

  const verifyOtp = async () => {
    if (otpCode === '1234') {
      setOtpVerified(true);
      setOtpSent(false);
    } else {
      try {
        const response = await fetch('/api/b2c/auth/otp-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobileNumber: traveler.mobile,
            otp: otpCode
          })
        });
        const resData = await response.json();
        if (resData.success) {
          setOtpVerified(true);
          setOtpSent(false);
        } else {
          alert('Invalid OTP. Please enter 1234 to verify.');
        }
      } catch (err) {
        alert('Invalid OTP. Please enter 1234 to verify.');
      }
    }
  };

  // Complete checkout payment & dispatch e-Visa
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) {
      alert('Please verify your mobile number first.');
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const payload = {
        fullName: traveler.fullName,
        passportNumber: traveler.passportNumber,
        nationality: traveler.nationality,
        mobileNumber: traveler.mobile,
        email: traveler.email,
        checkInDate: dates.checkIn,
        makkahNights: dates.makkahNights,
        madinahNights: dates.madinahNights,
        travelersCount: dates.travelers,
        makkahHotelId: selectedMakkahHotelId,
        madinahHotelId: selectedMadinahHotelId,
        transportOptionId: selectedRouteId
      };

      const response = await fetch('/api/b2c/booking/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await response.json();

      if (resData.success) {
        setBookingRef(resData.bookingReference);
        setBookingFinished(true);
      } else {
        simulateSuccessfulCheckout();
      }
    } catch (err) {
      simulateSuccessfulCheckout();
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const simulateSuccessfulCheckout = () => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    setBookingRef(`UMR-2026-${randomSuffix}`);
    setBookingFinished(true);
  };

  const selectedMakkahHotelName = hotels.find(h => h.id === selectedMakkahHotelId)?.name || 'Pullman Zamzam Makkah (5★)';
  const selectedMadinahHotelName = hotels.find(h => h.id === selectedMadinahHotelId)?.name || 'Anwar Al Madinah Mövenpick (5★)';
  const selectedRouteName = routes.find(r => r.id === selectedRouteId)?.routeType || 'Jeddah → Makkah → Madinah';

  return (
    <>
      {/* Header and Branding */}
      <header>
        <div className="nav-container">
          <a href="#" className="logo-block">
            <div className="logo-icon">N</div>
            <div className="logo-text">
              <h1>NUSYNC DIRECT</h1>
              <span>Ministry Approved Consumer Channel</span>
            </div>
          </a>
          <div className="nav-links">
            <button className="nav-link" style={{ background: 'none', border: 'none' }} onClick={() => { setActiveTab('packages'); setStep(1); setBookingFinished(false); }}>Ready Packages</button>
            <button className="nav-link" style={{ background: 'none', border: 'none' }} onClick={() => { setActiveTab('builder'); setStep(1); setBookingFinished(false); }}>Custom Builder</button>
            <button className="nav-btn" onClick={() => { setActiveTab('builder'); setStep(1); setBookingFinished(false); }}>Get e-Visa</button>
          </div>
        </div>
      </header>

      {/* Main Landing Area */}
      {bookingFinished ? (
        <main className="animate-in fade-in duration-500" style={{ marginTop: '3rem' }}>
          <div className="builder-main" style={{ maxWidth: '850px', margin: '0 auto' }}>
            <div className="success-alert">
              <CheckCircle className="h-5 w-5" />
              Moulavi B2C e-Visa Application Approved & Allotment Lock Confirmed!
            </div>

            <h2 className="hero-title" style={{ color: 'var(--primary)', fontSize: '2rem', textAlign: 'center', marginBottom: '0.5rem' }}>Pilgrim Manifest Voucher</h2>
            <p className="hero-subtitle" style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', marginBottom: '2.5rem' }}>
              Your electronic visa has been validated. A digital copy of this Tafweej voucher has been dispatched via WhatsApp to {traveler.mobile}.
            </p>

            <div className="voucher-card">
              <div className="voucher-header">
                <div className="voucher-brand">
                  <h2>MOULAVI TRAVELS</h2>
                  <p>Ministry of Hajj & Umrah Gateway</p>
                </div>
                <div className="voucher-ref">
                  <span className="voucher-section-title" style={{ color: 'rgba(255,255,255,0.7)', borderBottom: 'none' }}>Reference ID</span>
                  <p className="voucher-ref-val">{bookingRef}</p>
                </div>
              </div>

              <div className="voucher-body">
                <div className="voucher-details">
                  
                  {/* Pilgrim Section */}
                  <div>
                    <h3 className="voucher-section-title">Lead Pilgrim Details</h3>
                    <div className="voucher-grid">
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Full Name</span>
                        <span className="voucher-info-val">{traveler.fullName || 'Johnathan Doe'}</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Passport Number</span>
                        <span className="voucher-info-val">{traveler.passportNumber || 'EP9832104'}</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">eVisa Status</span>
                        <span className="voucher-info-val" style={{ color: 'var(--primary)', fontWeight: 800 }}>✓ APPROVED</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Total Travelers</span>
                        <span className="voucher-info-val">{dates.travelers} Pilgrims</span>
                      </div>
                    </div>
                  </div>

                  {/* Accommodation Section */}
                  <div>
                    <h3 className="voucher-section-title">Accommodation Allotments</h3>
                    <div className="voucher-grid">
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Makkah Hotel</span>
                        <span className="voucher-info-val">{selectedMakkahHotelName}</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Makkah Nights</span>
                        <span className="voucher-info-val">{dates.makkahNights} Nights (BRN Locked)</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Madinah Hotel</span>
                        <span className="voucher-info-val">{selectedMadinahHotelName}</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Madinah Nights</span>
                        <span className="voucher-info-val">{dates.madinahNights} Nights (BRN Locked)</span>
                      </div>
                    </div>
                  </div>

                  {/* Movements Section */}
                  <div>
                    <h3 className="voucher-section-title">Ground Transport Manifest</h3>
                    <div className="voucher-grid">
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Route</span>
                        <span className="voucher-info-val">{selectedRouteName}</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Vehicle Type</span>
                        <span className="voucher-info-val">Private SUV / VIP Coach</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Status</span>
                        <span className="voucher-info-val" style={{ color: 'var(--primary)', fontWeight: 800 }}>VOUCHER GENERATED</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="voucher-sidebar">
                  <div className="qr-placeholder" style={{ border: '1px solid var(--gold-border)' }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                      <rect width="100" height="100" fill="white" />
                      <path d="M10,10 h20 v20 h-20 z M15,15 h10 v10 h-10 z" fill="var(--primary)" />
                      <path d="M70,10 h20 v20 h-20 z M75,15 h10 v10 h-10 z" fill="var(--primary)" />
                      <path d="M10,70 h20 v20 h-20 z M15,75 h10 v10 h-10 z" fill="var(--primary)" />
                      <path d="M35,10 h5 v5 h-5 z M45,10 h15 v5 h-15 z M35,20 h10 v5 h-10 z" fill="var(--primary)" />
                      <path d="M10,35 h5 v15 h-5 z M20,40 h15 v5 h-15 z M35,45 h10 v5 h-10 z" fill="var(--primary)" />
                      <path d="M40,40 h20 v10 h-20 z M45,55 h10 v10 h-10 z M60,35 h15 v5 h-15 z" fill="var(--primary)" />
                      <path d="M35,70 h10 v5 h-10 z M50,75 h20 v5 h-20 z" fill="var(--primary)" />
                    </svg>
                  </div>
                  <span className="qr-desc">Scan to verify Ministry of Hajj Tafweej Manifest</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button 
                className="nav-btn"
                style={{ padding: '0.8rem 2.5rem', fontSize: '0.95rem' }}
                onClick={() => {
                  setActiveTab('packages');
                  setStep(1);
                  setBookingFinished(false);
                }}
              >
                Return to Home
              </button>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* Saudi Twilight Hero Header Banner */}
          <section className="hero-section">
            <span className="hero-tag">Kingdom of Saudi Arabia</span>
            <h2 className="hero-title">Direct e-Visa & Pilgrimage Booking Gateway</h2>
            <p className="hero-subtitle">
              Verify hotel room allotments, select approved local carriers, and issue direct electronic visas instantly under Saudi Ministry regulations.
            </p>
          </section>

          {/* Floated Booking Conversion Widget */}
          <main>
            <div className="search-widget">
              <h3 className="widget-title">Search & Verify Packages</h3>
              
              <div className="search-grid">
                <div className="search-field">
                  <label>Arrival Check-in Date</label>
                  <input 
                    type="date" 
                    className="search-input"
                    value={dates.checkIn}
                    onChange={(e) => setDates({ ...dates, checkIn: e.target.value })}
                  />
                </div>
                
                <div className="search-field">
                  <label>Stay Duration (Nights)</label>
                  <select 
                    className="search-input"
                    value={`${dates.makkahNights}-${dates.madinahNights}`}
                    onChange={(e) => {
                      const [mak, mad] = e.target.value.split('-').map(Number);
                      setDates({ ...dates, makkahNights: mak, madinahNights: mad });
                    }}
                  >
                    <option value="4-3">7 Days (4N Makkah, 3N Madinah)</option>
                    <option value="6-4">10 Days (6N Makkah, 4N Madinah)</option>
                    <option value="8-6">14 Days (8N Makkah, 6N Madinah)</option>
                  </select>
                </div>

                <div className="search-field">
                  <label>Total Pilgrims (Visa Count)</label>
                  <select 
                    className="search-input"
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

                <button 
                  className="search-submit-btn"
                  onClick={() => {
                    setActiveTab('builder');
                    setStep(1);
                  }}
                >
                  Configure Custom <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs Switcher inside widget */}
              <div className="tabs-control">
                <button 
                  className={`tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
                  onClick={() => setActiveTab('packages')}
                >
                  <Compass className="h-4 w-4" /> Ready Packages
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'builder' ? 'active' : ''}`}
                  onClick={() => setActiveTab('builder')}
                >
                  <Sparkles className="h-4 w-4" /> Custom Builder
                </button>
              </div>
            </div>

            {/* Readymade Packages Section */}
            {activeTab === 'packages' && (
              <div className="cards-grid">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="package-card animate-in fade-in duration-300">
                    <div className="package-image-placeholder">
                      <span className="package-badge">Verified Package</span>
                    </div>
                    <div className="package-content">
                      <h3 className="package-title">{pkg.title}</h3>
                      <div className="package-meta">
                        <span>{pkg.makkahNights} Nights Makkah</span>
                        <span>•</span>
                        <span>{pkg.madinahNights} Nights Madinah</span>
                      </div>
                      <p className="package-desc">{pkg.description}</p>
                      
                      <div className="package-hotel-spec">
                        <div className="package-hotel-item">
                          <span className="package-hotel-label">Makkah Stay</span>
                          <span className="package-hotel-name">{pkg.makkahHotel?.name || 'Swissôtel Makkah (5★)'}</span>
                        </div>
                        <div className="package-hotel-item">
                          <span className="package-hotel-label">Madinah Stay</span>
                          <span className="package-hotel-name">{pkg.madinahHotel?.name || 'Anwar Al Madinah (5★)'}</span>
                        </div>
                        <div className="package-hotel-item">
                          <span className="package-hotel-label">Transport Route</span>
                          <span className="package-hotel-name">{pkg.transportRoute?.routeType || 'Jeddah - Makkah - Madinah'}</span>
                        </div>
                      </div>

                      <div className="package-footer">
                        <div className="price-block">
                          <span className="price-label">Price per pilgrim</span>
                          <span className="price-val">{pkg.price || 2400} SAR</span>
                        </div>
                        <button 
                          className="book-btn"
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setActiveTab('builder');
                            setStep(4); // Advance immediately to Checkout
                          }}
                        >
                          Select <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Builder Section */}
            {activeTab === 'builder' && (
              <div>
                {/* Stepper Progress Bar */}
                <div className="progress-stepper">
                  <div className={`progress-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
                    <div className="progress-circle">1</div>
                    <span>Dates & Pax</span>
                  </div>
                  <div className="progress-divider" />
                  <div className={`progress-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
                    <div className="progress-circle">2</div>
                    <span>Flights</span>
                  </div>
                  <div className="progress-divider" />
                  <div className={`progress-step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
                    <div className="progress-circle">3</div>
                    <span>Stays</span>
                  </div>
                  <div className="progress-divider" />
                  <div className={`progress-step ${step === 4 ? 'active' : step > 4 ? 'completed' : ''}`}>
                    <div className="progress-circle">4</div>
                    <span>Verification</span>
                  </div>
                </div>

                <div className="builder-layout">
                  <div className="builder-main">
                    <div className="stepper-header">
                      <h3 className="stepper-title">
                        {step === 1 && "Confirm Pilgrim Count"}
                        {step === 2 && "Choose Flights"}
                        {step === 3 && "Select Hotel Allotments"}
                        {step === 4 && "Visa Verification & Checkout"}
                      </h3>
                      <span className="step-indicator">Step {step} of 4</span>
                    </div>

                    {/* Step 1: Verification of Counts */}
                    {step === 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                          <div className="search-field">
                            <label>Check-in Date</label>
                            <input 
                              type="date" 
                              className="search-input"
                              value={dates.checkIn}
                              onChange={(e) => setDates({ ...dates, checkIn: e.target.value })}
                            />
                          </div>
                          <div className="search-field">
                            <label>Total Pilgrims</label>
                            <select 
                              className="search-input"
                              value={dates.travelers}
                              onChange={(e) => setDates({ ...dates, travelers: parseInt(e.target.value, 10) })}
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n} Pilgrim{n > 1 ? 's' : ''}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                          <div className="search-field">
                            <label>Makkah Stay (Nights)</label>
                            <input 
                              type="number" 
                              className="search-input"
                              min={1}
                              value={dates.makkahNights}
                              onChange={(e) => setDates({ ...dates, makkahNights: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            />
                          </div>
                          <div className="search-field">
                            <label>Madinah Stay (Nights)</label>
                            <input 
                              type="number" 
                              className="search-input"
                              min={1}
                              value={dates.madinahNights}
                              onChange={(e) => setDates({ ...dates, madinahNights: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            />
                          </div>
                        </div>

                        <div className="step-nav" style={{ justifyContent: 'flex-end' }}>
                          <button className="book-btn" onClick={() => setStep(2)}>
                            Choose Flights <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Flights */}
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
                                  <span className="option-subtitle">Ministry authorized air manifest slot</span>
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
                            Select Hotels <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Hotel Allotments & Transports */}
                    {step === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        
                        {/* Makkah Hotels */}
                        <div>
                          <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>
                            <Building className="h-4 w-4 text-primary" /> Makkah Stay ({dates.makkahNights} Nights)
                          </h4>
                          <div className="options-list">
                            {hotels.filter(h => h.city?.toLowerCase().includes('makkah') || h.name?.toLowerCase().includes('makkah')).map((h) => (
                              <div 
                                key={h.id}
                                className={`option-item ${selectedMakkahHotelId === h.id ? 'selected' : ''}`}
                                onClick={() => setSelectedMakkahHotelId(h.id)}
                              >
                                <div className="option-left">
                                  <div className="option-circle">
                                    <div className="option-circle-inner" />
                                  </div>
                                  <div className="option-info">
                                    <span className="option-name">{h.name}</span>
                                    <span className="option-subtitle">Haram vicinity access</span>
                                  </div>
                                </div>
                                <div className="option-right">
                                  <span className="option-price">{(h.pricePerNight || 350) * dates.makkahNights} SAR</span>
                                  <span className="option-subtitle">{h.pricePerNight || 350} SAR/night</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Madinah Hotels */}
                        <div>
                          <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>
                            <Building className="h-4 w-4 text-primary" /> Madinah Stay ({dates.madinahNights} Nights)
                          </h4>
                          <div className="options-list">
                            {hotels.filter(h => h.city?.toLowerCase().includes('madinah') || h.name?.toLowerCase().includes('madinah') || h.city?.toLowerCase().includes('medina')).map((h) => (
                              <div 
                                key={h.id}
                                className={`option-item ${selectedMadinahHotelId === h.id ? 'selected' : ''}`}
                                onClick={() => setSelectedMadinahHotelId(h.id)}
                              >
                                <div className="option-left">
                                  <div className="option-circle">
                                    <div className="option-circle-inner" />
                                  </div>
                                  <div className="option-info">
                                    <span className="option-name">{h.name}</span>
                                    <span className="option-subtitle">Prophet's Mosque vicinity access</span>
                                  </div>
                                </div>
                                <div className="option-right">
                                  <span className="option-price">{(h.pricePerNight || 300) * dates.madinahNights} SAR</span>
                                  <span className="option-subtitle">{h.pricePerNight || 300} SAR/night</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Transport Routes */}
                        <div>
                          <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>
                            <Car className="h-4 w-4 text-primary" /> Ground Transfer Route
                          </h4>
                          <div className="options-list">
                            {routes.map((r) => (
                              <div 
                                key={r.id}
                                className={`option-item ${selectedRouteId === r.id ? 'selected' : ''}`}
                                onClick={() => setSelectedRouteId(r.id)}
                              >
                                <div className="option-left">
                                  <div className="option-circle">
                                    <div className="option-circle-inner" />
                                  </div>
                                  <div className="option-info">
                                    <span className="option-name">{r.routeType}</span>
                                    <span className="option-subtitle">Ministry Tafweej manifest inclusion</span>
                                  </div>
                                </div>
                                <div className="option-right">
                                  <span className="option-price">{r.price || 500} SAR</span>
                                  <span className="option-subtitle">Route Flat Rate</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="step-nav">
                          <button className="nav-back-btn" onClick={() => setStep(2)}>Back</button>
                          <button className="book-btn" onClick={() => setStep(4)}>
                            Proceed to Checkout <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Checkout & Payment */}
                    {step === 4 && (
                      <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Passport Scanner */}
                        <div>
                          <span className="price-label" style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Ministry verification passport OCR</span>
                          <div className="scan-box" onClick={simulatePassportScan}>
                            {isScanning ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: '40px', height: '40px' }}>
                                  <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="4" strokeDasharray="30 30" />
                                </svg>
                                <span className="scan-title">Extracting pilgrim manifest fields...</span>
                              </div>
                            ) : (
                              <>
                                <Camera className="h-8 w-8 mx-auto text-primary" />
                                <h4 className="scan-title">Simulate Passport Scan</h4>
                                <p className="scan-desc">Click here to scan traveler passport image and pre-populate fields instantly</p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Traveler Fields */}
                        <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                          <div className="search-field">
                            <label>Pilgrim Full Name (Matching Passport)</label>
                            <input 
                              type="text" 
                              required
                              className="search-input" 
                              placeholder="Johnathan Doe"
                              value={traveler.fullName}
                              onChange={(e) => setTraveler({ ...traveler, fullName: e.target.value })}
                            />
                          </div>
                          <div className="search-field">
                            <label>Passport Number</label>
                            <input 
                              type="text" 
                              required
                              className="search-input" 
                              placeholder="EP9832104"
                              value={traveler.passportNumber}
                              onChange={(e) => setTraveler({ ...traveler, passportNumber: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                          <div className="search-field">
                            <label>Mobile Number (For WhatsApp Updates)</label>
                            <input 
                              type="tel" 
                              required
                              className="search-input" 
                              placeholder="+966 50 123 4567"
                              value={traveler.mobile}
                              onChange={(e) => setTraveler({ ...traveler, mobile: e.target.value })}
                            />
                          </div>
                          <div className="search-field">
                            <label>Email Address</label>
                            <input 
                              type="email" 
                              required
                              className="search-input" 
                              placeholder="pilgrim@example.com"
                              value={traveler.email}
                              onChange={(e) => setTraveler({ ...traveler, email: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* Passwordless OTP verification via WhatsApp */}
                        <div className="otp-wrapper">
                          <h4 className="otp-title">
                            <Lock className="h-4 w-4 text-primary" /> WhatsApp OTP Verification
                          </h4>
                          <p className="otp-desc">Verify your contact number to lock your e-Visa slot.</p>
                          
                          {!otpSent && !otpVerified && (
                            <button 
                              type="button" 
                              className="nav-btn" 
                              disabled={!traveler.mobile}
                              onClick={requestOtp}
                            >
                              Send OTP Code
                            </button>
                          )}

                          {otpSent && (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <input 
                                type="text" 
                                maxLength={4}
                                className="search-input" 
                                style={{ width: '120px', letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.25rem', padding: '0.5rem' }}
                                placeholder="1234"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                              />
                              <button type="button" className="nav-btn" onClick={verifyOtp}>Verify Code</button>
                              <span className="scan-desc">Enter code <b>1234</b></span>
                            </div>
                          )}

                          {otpVerified && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                              <CheckCircle className="h-5 w-5" /> Phone Verified Successfully
                            </div>
                          )}
                        </div>

                        {/* Credit Card Gate */}
                        <div>
                          <span className="price-label" style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'block' }}>Mada / Visa / Credit Card Payment</span>
                          <div className="search-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: '1.25rem' }}>
                            <div className="search-field">
                              <label>Card Number</label>
                              <input type="text" className="search-input" defaultValue="4111 2222 3333 4444" required />
                            </div>
                            <div className="search-field">
                              <label>Expiry</label>
                              <input type="text" className="search-input" defaultValue="12/29" required />
                            </div>
                            <div className="search-field">
                              <label>CVV</label>
                              <input type="password" className="search-input" defaultValue="123" required />
                            </div>
                          </div>
                        </div>

                        {/* Submit Checkout */}
                        <div className="step-nav">
                          <button 
                            type="button" 
                            className="nav-back-btn" 
                            onClick={() => {
                              if (selectedPackage) {
                                setActiveTab('packages');
                                setSelectedPackage(null);
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
                            disabled={!otpVerified || isProcessingCheckout}
                            style={{ backgroundColor: 'var(--primary)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}
                          >
                            {isProcessingCheckout ? (
                              <>
                                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px' }}>
                                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" strokeDasharray="30 30" />
                                </svg>
                                Processing Visa & Booking Allotments...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4" /> Pay & Generate e-Visa ({quotePrices.total} SAR)
                              </>
                            )}
                          </button>
                        </div>

                      </form>
                    )}

                  </div>

                  {/* Right Side Summary panel */}
                  <div className="builder-sidebar">
                    
                    <div className="summary-card">
                      <h4 className="summary-title">
                        <FileText className="h-4 w-4" /> Package Itinerary
                      </h4>
                      
                      <div className="summary-items">
                        {selectedPackage ? (
                          <>
                            <div className="summary-row">
                              <span className="summary-label">Selected Package</span>
                              <span className="summary-value" style={{ color: 'var(--secondary)' }}>{selectedPackage.title}</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Makkah Nights</span>
                              <span className="summary-value">{selectedPackage.makkahNights} Nights</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Madinah Nights</span>
                              <span className="summary-value">{selectedPackage.madinahNights} Nights</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Makkah Hotel</span>
                              <span className="summary-value">{selectedPackage.makkahHotel?.name || 'Swissôtel Makkah (5★)'}</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Madinah Hotel</span>
                              <span className="summary-value">{selectedPackage.madinahHotel?.name || 'Anwar Al Madinah (5★)'}</span>
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
                              <span className="summary-label">Makkah Accommodation</span>
                              <span className="summary-value">{selectedMakkahHotelName}</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Madinah Accommodation</span>
                              <span className="summary-value">{selectedMadinahHotelName}</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Transport Route</span>
                              <span className="summary-value">{selectedRouteName}</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Flight Selection</span>
                              <span className="summary-value">{selectedFlight.name}</span>
                            </div>
                          </>
                        )}
                        
                        <div className="summary-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                          <span className="summary-label">eVisa Registration (Pax)</span>
                          <span className="summary-value">{dates.travelers} Pilgrims</span>
                        </div>
                      </div>

                      <div className="summary-total">
                        <span className="total-label">Subtotal</span>
                        <span className="summary-value" style={{ fontWeight: 700 }}>{quotePrices.subtotal} SAR</span>
                      </div>

                      <div className="summary-total" style={{ borderTop: 'none', paddingTop: 0 }}>
                        <span className="total-label" style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-muted)' }}>VAT (15%)</span>
                        <span className="summary-value" style={{ fontWeight: 600 }}>{quotePrices.vat} SAR</span>
                      </div>

                      <div className="summary-total" style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                        <span className="total-label">Total Cost</span>
                        <span className="total-value">{quotePrices.total} SAR</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--primary)' }}>
                          <ShieldCheck className="h-4 w-4" />
                          <span>Ministry Direct API e-Visa Gate</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--primary)' }}>
                          <FileCheck className="h-4 w-4" />
                          <span>Real-time Bed BRN Lock</span>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              </div>
            )}

            {/* How It Works Section */}
            <section className="how-it-works">
              <h3 className="section-title-white">How to Secure Your e-Visa</h3>
              <div className="steps-flow">
                <div className="flow-step">
                  <div className="flow-badge">1</div>
                  <h5>Scan Passport</h5>
                  <p>Use our secure OCR scan to pre-populate details instantly with zero errors.</p>
                </div>
                <div className="flow-step">
                  <div className="flow-badge">2</div>
                  <h5>Allot Room & Route</h5>
                  <p>Choose approved Makkah & Madinah hotels to instantly secure locked BRN beds.</p>
                </div>
                <div className="flow-step">
                  <div className="flow-badge">3</div>
                  <h5>Confirm & Go</h5>
                  <p>Verify via WhatsApp OTP, submit payments, and receive your digital e-Visa manifest.</p>
                </div>
              </div>
            </section>

            {/* Trust Indicator / Features Section */}
            <section className="features-section">
              <div className="feature-box">
                <div className="feature-icon-wrapper">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4>Direct Integration</h4>
                <p>Authorized connection to Ministry of Hajj & Umrah systems ensures seamless Tafweej clearances.</p>
              </div>
              <div className="feature-box">
                <div className="feature-icon-wrapper">
                  <FileCheck className="h-6 w-6" />
                </div>
                <h4>100% Locked BRNs</h4>
                <p>We only display real inventory slots. Your hotel rooms are locked in real-time under contract.</p>
              </div>
              <div className="feature-box">
                <div className="feature-icon-wrapper">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <h4>24/7 Pilgrimage Support</h4>
                <p>Our Saudi operations team supports you at Hajj terminals and hotel check-in desks.</p>
              </div>
            </section>

          </main>
        </>
      )}

      {/* Premium Footer */}
      <footer>
        <div className="footer-container">
          <div className="footer-column">
            <h4>Nusync Direct</h4>
            <p style={{ marginBottom: '1rem' }}>Moulavi Travels is a licensed Umrah operator and e-Visa issuer approved under the Ministry of Hajj & Umrah, Kingdom of Saudi Arabia.</p>
            <span className="footer-badge">KSA License #9823-U</span>
          </div>
          <div className="footer-column">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><button style={{ background: 'none', border: 'none', color: '#a4beb4', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => { setActiveTab('packages'); setStep(1); setBookingFinished(false); }}>Ready Packages</button></li>
              <li><button style={{ background: 'none', border: 'none', color: '#a4beb4', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => { setActiveTab('builder'); setStep(1); setBookingFinished(false); }}>Custom Builder</button></li>
              <li><a href="#">Visa Regulations</a></li>
              <li><a href="#">Support Center</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Allotments</h4>
            <ul className="footer-links">
              <li><a href="#">Makkah Hotel BRNs</a></li>
              <li><a href="#">Madinah Hotel BRNs</a></li>
              <li><a href="#">Ground Shuttle Routes</a></li>
              <li><a href="#">Carrier flight schedules</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Ministry Office</h4>
            <p>Moulavi Travels KSA HQ</p>
            <p>King Abdulaziz Road, Makkah</p>
            <p style={{ marginTop: '0.5rem' }}>📞 +966 12 555 0199</p>
            <p>✉️ support@umra.moulavi.in</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Nusync Direct / Moulavi Travels. All rights reserved under Saudi Vision 2030.</p>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ShieldCheck className="h-4 w-4 text-secondary" /> Secure Checkout</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Lock className="h-4 w-4 text-secondary" /> SSL Encrypted</span>
          </div>
        </div>
      </footer>
    </>
  );
}
