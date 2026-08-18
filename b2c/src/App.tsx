import { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  Sparkles, 
  Building, 
  Car, 
  FileText, 
  CheckCircle, 
  ChevronRight, 
  ChevronDown, 
  ShieldCheck, 
  FileCheck, 
  Camera, 
  Lock,
  HeartHandshake,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  UserCheck,
  Info,
  Zap
} from 'lucide-react';

// ==========================================
// Fallback Mock Data if ERP APIs are Offline
// ==========================================
const MOCK_PACKAGES = [
  {
    id: 'pkg-economy',
    title: 'Essential 7-Day Umrah Tour (Land Only)',
    description: 'Perfect for a quick, spiritually fulfilling journey. Includes visa processing, shared transfers, and reliable accommodations close to the Holy Mosques. Flights not included.',
    makkahNights: 4,
    madinahNights: 3,
    makkahHotel: { name: 'Elaf Kinda Hotel (4★)' },
    madinahHotel: { name: 'Madinah Hilton (4★)' },
    transportRoute: { routeType: 'SHUTTLE_BUS' },
    price: 1450,
  },
  {
    id: 'pkg-premium',
    title: 'Deluxe 10-Day Kaaba View (Land Only)',
    description: 'Elevate your pilgrimage with 5-star hotels offering Kaaba views, combined with private SUV transfers and VIP Hajj terminal access. Flights not included.',
    makkahNights: 6,
    madinahNights: 4,
    makkahHotel: { name: 'Swissôtel Makkah (5★)' },
    madinahHotel: { name: 'Anwar Al Madinah Mövenpick (5★)' },
    transportRoute: { routeType: 'PRIVATE_SUV' },
    price: 3890,
  }
];

const AIRPORTS = [
  // Saudi Arabia
  { id: 'apt-jed', name: 'Jeddah - King Abdulaziz Intl (JED)', city: 'Jeddah' },
  { id: 'apt-med', name: 'Madinah - Prince Mohammad Bin Abdulaziz (MED)', city: 'Madinah' },
  { id: 'apt-ruh', name: 'Riyadh - King Khalid Intl (RUH)', city: 'Riyadh' },
  { id: 'apt-dmm', name: 'Dammam - King Fahd Intl (DMM)', city: 'Dammam' },
  { id: 'apt-ahb', name: 'Abha Intl Airport (AHB)', city: 'Abha' },
  { id: 'apt-tuf', name: 'Taif Intl Airport (TUF)', city: 'Taif' },
  { id: 'apt-gzi', name: 'Gizan Regional Airport (GZI)', city: 'Gizan' },
  
  // GCC & Middle East
  { id: 'apt-dxb', name: 'Dubai Intl Airport (DXB)', city: 'Dubai' },
  { id: 'apt-auh', name: 'Abu Dhabi Intl (AUH)', city: 'Abu Dhabi' },
  { id: 'apt-shj', name: 'Sharjah Intl (SHJ)', city: 'Sharjah' },
  { id: 'apt-doh', name: 'Doha - Hamad Intl (DOH)', city: 'Doha' },
  { id: 'apt-mct', name: 'Muscat Intl (MCT)', city: 'Muscat' },
  { id: 'apt-kuw', name: 'Kuwait Intl (KWI)', city: 'Kuwait' },
  { id: 'apt-bah', name: 'Bahrain Intl (BAH)', city: 'Bahrain' },
  { id: 'apt-cai', name: 'Cairo Intl (CAI)', city: 'Cairo' },
  { id: 'apt-hbe', name: 'Alexandria - Borg El Arab (HBE)', city: 'Alexandria' },
  { id: 'apt-amm', name: 'Amman - Queen Alia Intl (AMM)', city: 'Amman' },
  { id: 'apt-bey', name: 'Beirut - Rafic Hariri Intl (BEY)', city: 'Beirut' },
  { id: 'apt-ist', name: 'Istanbul Airport (IST)', city: 'Istanbul' },
  { id: 'apt-saw', name: 'Istanbul - Sabiha Gokcen (SAW)', city: 'Istanbul' },
  { id: 'apt-esb', name: 'Ankara Esenboga (ESB)', city: 'Ankara' },
  
  // United Kingdom & Ireland
  { id: 'apt-lhr', name: 'London Heathrow (LHR)', city: 'London' },
  { id: 'apt-lgw', name: 'London Gatwick (LGW)', city: 'London' },
  { id: 'apt-stn', name: 'London Stansted (STN)', city: 'London' },
  { id: 'apt-man', name: 'Manchester Airport (MAN)', city: 'Manchester' },
  { id: 'apt-bhx', name: 'Birmingham Airport (BHX)', city: 'Birmingham' },
  { id: 'apt-gla', name: 'Glasgow Airport (GLA)', city: 'Glasgow' },
  { id: 'apt-dub', name: 'Dublin Airport (DUB)', city: 'Dublin' },

  // Europe
  { id: 'apt-cdg', name: 'Paris Charles de Gaulle (CDG)', city: 'Paris' },
  { id: 'apt-ory', name: 'Paris Orly (ORY)', city: 'Paris' },
  { id: 'apt-fra', name: 'Frankfurt Airport (FRA)', city: 'Frankfurt' },
  { id: 'apt-muc', name: 'Munich Airport (MUC)', city: 'Munich' },
  { id: 'apt-ams', name: 'Amsterdam - Schiphol (AMS)', city: 'Amsterdam' },
  { id: 'apt-bru', name: 'Brussels Airport (BRU)', city: 'Brussels' },
  { id: 'apt-zrh', name: 'Zurich Airport (ZRH)', city: 'Zurich' },
  { id: 'apt-fco', name: 'Rome - Fiumicino (FCO)', city: 'Rome' },
  { id: 'apt-mxp', name: 'Milan - Malpensa (MXP)', city: 'Milan' },
  { id: 'apt-mad', name: 'Madrid - Barajas (MAD)', city: 'Madrid' },
  { id: 'apt-bcn', name: 'Barcelona - El Prat (BCN)', city: 'Barcelona' },
  { id: 'apt-vie', name: 'Vienna Intl (VIE)', city: 'Vienna' },
  { id: 'apt-ath', name: 'Athens Intl (ATH)', city: 'Athens' },
  { id: 'apt-cph', name: 'Copenhagen Airport (CPH)', city: 'Copenhagen' },
  { id: 'apt-arn', name: 'Stockholm - Arlanda (ARN)', city: 'Stockholm' },
  { id: 'apt-osl', name: 'Oslo - Gardermoen (OSL)', city: 'Oslo' },
  { id: 'apt-hel', name: 'Helsinki Vantaa (HEL)', city: 'Helsinki' },

  // Indian Subcontinent (Huge Umrah volumes)
  { id: 'apt-del', name: 'Delhi - Indira Gandhi Intl (DEL)', city: 'Delhi' },
  { id: 'apt-bom', name: 'Mumbai - Chhatrapati Shivaji (BOM)', city: 'Mumbai' },
  { id: 'apt-blr', name: 'Bengaluru - Kempegowda (BLR)', city: 'Bengaluru' },
  { id: 'apt-maa', name: 'Chennai Intl (MAA)', city: 'Chennai' },
  { id: 'apt-hyd', name: 'Hyderabad - Rajiv Gandhi (HYD)', city: 'Hyderabad' },
  { id: 'apt-ccu', name: 'Kolkata - Netaji Subhas (CCU)', city: 'Kolkata' },
  { id: 'apt-cok', name: 'Kochi - Cochin Intl (COK)', city: 'Kochi' },
  { id: 'apt-ccj', name: 'Kozhikode - Calicut Intl (CCJ)', city: 'Kozhikode' },
  { id: 'apt-trv', name: 'Trivandrum Intl (TRV)', city: 'Trivandrum' },
  { id: 'apt-khi', name: 'Karachi - Jinnah Intl (KHI)', city: 'Karachi' },
  { id: 'apt-lhe', name: 'Lahore - Allama Iqbal Intl (LHE)', city: 'Lahore' },
  { id: 'apt-isb', name: 'Islamabad Intl (ISB)', city: 'Islamabad' },
  { id: 'apt-pew', name: 'Peshawar - Bacha Khan (PEW)', city: 'Peshawar' },
  { id: 'apt-mux', name: 'Multan Intl (MUX)', city: 'Multan' },
  { id: 'apt-dac', name: 'Dhaka - Hazrat Shahjalal (DAC)', city: 'Dhaka' },
  { id: 'apt-cgp', name: 'Chittagong - Shah Amanat (CGP)', city: 'Chittagong' },
  { id: 'apt-cmb', name: 'Colombo - Bandaranaike (CMB)', city: 'Colombo' },

  // Southeast Asia (Huge Umrah volumes)
  { id: 'apt-cgk', name: 'Jakarta - Soekarno-Hatta (CGK)', city: 'Jakarta' },
  { id: 'apt-sub', name: 'Surabaya - Juanda Intl (SUB)', city: 'Surabaya' },
  { id: 'apt-kno', name: 'Medan - Kualanamu Intl (KNO)', city: 'Medan' },
  { id: 'apt-kul', name: 'Kuala Lumpur Intl (KUL)', city: 'Kuala Lumpur' },
  { id: 'apt-sin', name: 'Singapore Changi (SIN)', city: 'Singapore' },
  { id: 'apt-bkk', name: 'Bangkok - Suvarnabhumi (BKK)', city: 'Bangkok' },
  { id: 'apt-mnl', name: 'Manila - Ninoy Aquino (MNL)', city: 'Manila' },

  // Central Asia
  { id: 'apt-tas', name: 'Tashkent - Islam Karimov (TAS)', city: 'Tashkent' },
  { id: 'apt-ala', name: 'Almaty Intl Airport (ALA)', city: 'Almaty' },

  // North America
  { id: 'apt-jfk', name: 'New York - John F. Kennedy (JFK)', city: 'New York' },
  { id: 'apt-ewr', name: 'Newark Liberty Intl (EWR)', city: 'Newark' },
  { id: 'apt-iad', name: 'Washington Dulles Intl (IAD)', city: 'Washington' },
  { id: 'apt-ord', name: 'Chicago O\'Hare (ORD)', city: 'Chicago' },
  { id: 'apt-lax', name: 'Los Angeles Intl (LAX)', city: 'Los Angeles' },
  { id: 'apt-sfo', name: 'San Francisco Intl (SFO)', city: 'San Francisco' },
  { id: 'apt-iah', name: 'Houston - George Bush Intl (IAH)', city: 'Houston' },
  { id: 'apt-dfw', name: 'Dallas/Fort Worth Intl (DFW)', city: 'Dallas' },
  { id: 'apt-mia', name: 'Miami Intl Airport (MIA)', city: 'Miami' },
  { id: 'apt-yyz', name: 'Toronto Pearson (YYZ)', city: 'Toronto' },
  { id: 'apt-yvr', name: 'Vancouver Intl (YVR)', city: 'Vancouver' },
  { id: 'apt-yul', name: 'Montreal - Pierre Elliott Trudeau (YUL)', city: 'Montreal' },

  // Africa
  { id: 'apt-jnb', name: 'Johannesburg - OR Tambo (JNB)', city: 'Johannesburg' },
  { id: 'apt-cpt', name: 'Cape Town Intl (CPT)', city: 'Cape Town' },
  { id: 'apt-los', name: 'Lagos - Murtala Muhammed (LOS)', city: 'Lagos' },
  { id: 'apt-abv', name: 'Abuja - Nnamdi Azikiwe (ABV)', city: 'Abuja' },
  { id: 'apt-cas', name: 'Casablanca - Mohammed V (CMN)', city: 'Casablanca' },
  { id: 'apt-tun', name: 'Tunis - Carthage Intl (TUN)', city: 'Tunis' },
  { id: 'apt-alg', name: 'Algiers - Houari Boumediene (ALG)', city: 'Algiers' },
  { id: 'apt-add', name: 'Addis Ababa - Bole Intl (ADD)', city: 'Addis Ababa' },
  { id: 'apt-nbo', name: 'Nairobi - Jomo Kenyatta (NBO)', city: 'Nairobi' },
  { id: 'apt-dkr', name: 'Dakar - Blaise Diagne (DSS)', city: 'Dakar' },

  // East Asia & Oceania
  { id: 'apt-hnd', name: 'Tokyo - Haneda (HND)', city: 'Tokyo' },
  { id: 'apt-nrt', name: 'Tokyo - Narita (NRT)', city: 'Tokyo' },
  { id: 'apt-icn', name: 'Seoul - Incheon Intl (ICN)', city: 'Seoul' },
  { id: 'apt-pvk', name: 'Beijing Capital Intl (PEK)', city: 'Beijing' },
  { id: 'apt-pvg', name: 'Shanghai Pudong (PVG)', city: 'Shanghai' },
  { id: 'apt-hkg', name: 'Hong Kong Intl (HKG)', city: 'Hong Kong' },
  { id: 'apt-syd', name: 'Sydney - Kingsford Smith (SYD)', city: 'Sydney' },
  { id: 'apt-mel', name: 'Melbourne Airport (MEL)', city: 'Melbourne' },
  { id: 'apt-akl', name: 'Auckland Airport (AKL)', city: 'Auckland' }
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

interface SearchableSelectOption {
  id: string;
  name: string;
  city?: string;
}

function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder,
  apiSearchUrl
}: { 
  options: SearchableSelectOption[]; 
  value: string; 
  onChange: (val: string) => void; 
  placeholder: string;
  apiSearchUrl?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dynamicOptions, setDynamicOptions] = useState<SearchableSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!apiSearchUrl || !search || search.trim().length < 2) {
      setDynamicOptions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiSearchUrl}?search=${encodeURIComponent(search)}`);
        const result = await res.json();
        if (result.success && result.data) {
          setDynamicOptions(result.data);
        }
      } catch (err) {
        console.error('Error fetching live search options:', err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search, apiSearchUrl]);

  const allMergedOptions = [...options];
  const selectedOpt = allMergedOptions.find(o => o.id === value) || dynamicOptions.find(o => o.id === value);
  
  dynamicOptions.forEach(opt => {
    if (!allMergedOptions.some(o => o.id === opt.id)) {
      allMergedOptions.push(opt);
    }
  });

  const localFiltered = allMergedOptions.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    (o.city && o.city.toLowerCase().includes(search.toLowerCase()))
  );

  const filtered = [...localFiltered];
  dynamicOptions.forEach(opt => {
    if (!filtered.some(o => o.id === opt.id)) {
      filtered.push(opt);
    }
  });

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        style={{
          padding: '0.65rem 1rem',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          backgroundColor: 'white',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          minHeight: '42px'
        }}
      >
        <span style={{ color: selectedOpt ? 'var(--text-dark)' : 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {selectedOpt ? selectedOpt.name : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-secondary flex-shrink-0" />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '105%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 9999,
          maxHeight: '260px',
          overflowY: 'auto',
          padding: '0.5rem'
        }}>
          <input 
            type="text"
            placeholder={apiSearchUrl ? "Type city/IATA (e.g. LHR) to search live..." : "Type city or airport name to search..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              marginBottom: '0.5rem',
              fontSize: '0.8rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          {isLoading && (
            <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
              Searching live database...
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filtered.length > 0 ? (
              filtered.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    backgroundColor: opt.id === value ? 'var(--primary-light)' : 'transparent',
                    color: opt.id === value ? 'var(--primary)' : 'var(--text-dark)',
                    fontWeight: opt.id === value ? 'bold' : 'normal',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (opt.id !== value) e.currentTarget.style.backgroundColor = '#f5f7f6';
                  }}
                  onMouseLeave={(e) => {
                    if (opt.id !== value) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {opt.name}
                </div>
              ))
            ) : (
              <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No matching records found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'packages' | 'builder'>('packages');
  const [packages, setPackages] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [airports, setAirports] = useState<any[]>(AIRPORTS);

  // Custom Builder Choices
  const [dates, setDates] = useState({
    checkIn: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    makkahNights: 4,
    madinahNights: 3,
    travelers: 2,
    accommodationType: 'hotel', // 'hotel' or 'iqama'
  });

  // Iqama Sponsor Details
  const [iqamaDetails, setIqamaDetails] = useState({
    iqamaNumber: '',
    iqamaSponserName: '',
    sponserDob: '',
    sponserMobileNumber: ''
  });

  const [flightInfo, setFlightInfo] = useState({
    isWithoutTicket: false,
    onwardFromPortId: 'apt-jed',
    onwardToPortId: 'apt-jed',
    onwardFlightNumber: 'SV-300',
    onwardDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    onwardTime: '08:00',
    returnFromPortId: 'apt-jed',
    returnToPortId: 'apt-jed',
    returnFlightNumber: 'SV-301',
    returnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    returnTime: '22:00',
  });

  const [selectedMakkahHotelId, setSelectedMakkahHotelId] = useState('');
  const [selectedMadinahHotelId, setSelectedMadinahHotelId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('SUV');
  const [makkahSearch, setMakkahSearch] = useState('');
  const [madinahSearch, setMadinahSearch] = useState('');

  // Custom Interactive Itinerary Builder (Movements)
  const [movements, setMovements] = useState<any[]>([
    { id: 'm-1', type: 'transfer', name: 'Airport Arrival Transfer', from: 'Airport', to: 'Makkah Hotel', time: '09:30' },
    { id: 'm-2', type: 'stay', name: 'Makkah Stay Allotment', from: 'Makkah', to: 'Locked Bed Room', time: '14:00' },
    { id: 'm-3', type: 'transfer', name: 'Inter-City Transfer', from: 'Makkah Hotel', to: 'Madinah Hotel', time: '10:00' },
    { id: 'm-4', type: 'stay', name: 'Madinah Stay Allotment', from: 'Madinah', to: 'Locked Bed Room', time: '14:00' },
    { id: 'm-5', type: 'transfer', name: 'Departure Airport Transfer', from: 'Madinah Hotel', to: 'Airport', time: '18:00' }
  ]);

  // Dynamic Quote pricing
  const [quotePrices, setQuotePrices] = useState({
    subtotal: 1000,
    vat: 150,
    total: 1150
  });

  // Step and checkout controllers
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isQuickEVisa, setIsQuickEVisa] = useState(false);

  const resetToHome = () => {
    setSelectedPackage(null);
    setIsQuickEVisa(false);
    setStep(1);
    setBookingFinished(false);
    setActiveTab('packages');
  };
  
  // Auth & Simulators
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [bookingFinished, setBookingFinished] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  // Auto-sync flight return date with stay duration
  useEffect(() => {
    try {
      const checkInDateObj = new Date(dates.checkIn);
      if (!isNaN(checkInDateObj.getTime())) {
        const totalNights = dates.makkahNights + dates.madinahNights;
        const returnDateObj = new Date(checkInDateObj.getTime() + (totalNights || 7) * 86400000);
        setFlightInfo(prev => ({
          ...prev,
          onwardDate: dates.checkIn,
          returnDate: returnDateObj.toISOString().split('T')[0]
        }));
      }
    } catch (e) {}
  }, [dates.checkIn, dates.makkahNights, dates.madinahNights]);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [liveArrivalFlights, setLiveArrivalFlights] = useState<any[]>([]);
  const [liveDepartureFlights, setLiveDepartureFlights] = useState<any[]>([]);
  const [isSearchingArrival, setIsSearchingArrival] = useState(false);
  const [isSearchingDeparture, setIsSearchingDeparture] = useState(false);
  const [flightBookingMode, setFlightBookingMode] = useState<'book' | 'own'>('book');
  const [selectedArrivalFlight, setSelectedArrivalFlight] = useState<any>(null);
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<any>(null);
  const [skipOwnFlightDetails, setSkipOwnFlightDetails] = useState(false);

  const [traveler, setTraveler] = useState({
    fullName: '',
    passportNumber: '',
    nationality: 'United States',
    mobile: '',
    email: ''
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
        const airportList = allLocations.filter((loc: any) => loc.locationType === 'AIRPORT' || loc.locationType === 'airport');

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

        const mergedAirports = [...AIRPORTS];
        airportList.forEach((apt: any) => {
          if (!mergedAirports.some(a => a.id === apt.id || a.name.toLowerCase().includes(apt.name.toLowerCase()) || apt.name.toLowerCase().includes(a.name.toLowerCase()))) {
            mergedAirports.push({ id: apt.id, name: apt.name, city: apt.city || '' });
          }
        });
        setAirports(mergedAirports);

        const ksaAirports = mergedAirports.filter((a: any) => a.city?.toLowerCase().includes('jeddah') || a.name?.toLowerCase().includes('jeddah') || a.city?.toLowerCase().includes('madinah') || a.name?.toLowerCase().includes('madinah'));
        const fallbackKsaApt = ksaAirports[0]?.id || mergedAirports[0].id;
        const fallbackHomeApt = mergedAirports.find((a: any) => !ksaAirports.includes(a))?.id || mergedAirports[0].id;

        setFlightInfo(prev => ({
          ...prev,
          onwardFromPortId: fallbackHomeApt,
          onwardToPortId: fallbackKsaApt,
          returnFromPortId: fallbackKsaApt,
          returnToPortId: fallbackHomeApt
        }));

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
        setAirports(AIRPORTS);
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
        const arrivalCost = selectedArrivalFlight?.price || 0;
        const departureCost = selectedDepartureFlight?.price || 0;
        const totalFlightCost = arrivalCost + departureCost;

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
            flightOptionId: flightBookingMode === 'own' ? 'none' : 'flight-live',
            flightPrice: totalFlightCost,
            accommodationType: dates.accommodationType
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
      const fPrice = flightBookingMode === 'own' ? 0 : ((selectedArrivalFlight?.price || 0) + (selectedDepartureFlight?.price || 0)) * dates.travelers;
      const vPrice = dates.accommodationType === 'iqama' ? 0 : 450 * dates.travelers;
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
    dates.accommodationType,
    selectedMakkahHotelId, 
    selectedMadinahHotelId, 
    selectedRouteId, 
    flightBookingMode,
    selectedArrivalFlight,
    selectedDepartureFlight,
    hotels,
    routes
  ]);

  const getIataCode = (id: string) => {
    const name = airports.find(a => a.id === id)?.name || '';
    const match = name.match(/\(([A-Z]{3})\)/);
    return match ? match[1] : id.replace('apt-', '').toUpperCase();
  };

  // Handle Passport Upload
  const handlePassportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPassportFile(file);
      alert(`Passport file "${file.name}" uploaded successfully. Please fill out your details manually below.`);
    }
  };

  const triggerFlightSearch = async () => {
    setIsSearchingArrival(true);
    setIsSearchingDeparture(true);
    try {
      const onwardOrigin = getIataCode(flightInfo.onwardFromPortId);
      const onwardDest = getIataCode(flightInfo.onwardToPortId);
      const returnOrigin = getIataCode(flightInfo.returnFromPortId);
      const returnDest = getIataCode(flightInfo.returnToPortId);

      // Onward Flight Search
      const resIn = await fetch(`/api/b2c/flights/search?origin=${onwardOrigin}&destination=${onwardDest}&date=${flightInfo.onwardDate}`);
      const dataIn = await resIn.json();
      if (dataIn.success && dataIn.data) {
        setLiveArrivalFlights(dataIn.data);
      } else {
        setLiveArrivalFlights([]);
      }

      // Return Flight Search
      const resOut = await fetch(`/api/b2c/flights/search?origin=${returnOrigin}&destination=${returnDest}&date=${flightInfo.returnDate}`);
      const dataOut = await resOut.json();
      if (dataOut.success && dataOut.data) {
        setLiveDepartureFlights(dataOut.data);
      } else {
        setLiveDepartureFlights([]);
      }
    } catch (err) {
      alert('Error fetching live carrier schedules.');
    } finally {
      setIsSearchingArrival(false);
      setIsSearchingDeparture(false);
    }
  };

  // OTP Verification via WhatsApp Service
  const requestOtp = async () => {
    if (!traveler.mobile) {
      alert('Please enter your mobile number first');
      return;
    }
    setOtpSent(true);
    try {
      const response = await fetch('/api/b2c/auth/otp-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: traveler.mobile,
          email: traveler.email,
          fullName: traveler.fullName || 'Pilgrim'
        })
      });
      const resData = await response.json();
      if (!response.ok || !resData.success) {
        alert(resData.error || 'Failed to dispatch verification code. Please check your number.');
      } else {
        alert('Verification code sent to your WhatsApp!');
      }
    } catch (err) {
      alert('Failed to connect to the WhatsApp OTP gateway.');
    }
  };

  const verifyOtp = async () => {
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
        alert(resData.error || 'Invalid OTP code. Please enter the correct code sent to your WhatsApp.');
      }
    } catch (err) {
      alert('OTP verification failed. Please try again.');
    }
  };

  // Complete checkout and lock allotments
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) {
      alert('Please verify your mobile number first.');
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const isWithoutTkt = flightBookingMode === 'own' && skipOwnFlightDetails;
      
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
        transportOptionId: selectedRouteId,
        accommodationType: dates.accommodationType,
        isWithoutTicket: isWithoutTkt,
        arrivalFlightNumber: isWithoutTkt ? 'NT-0000' : (flightBookingMode === 'own' ? flightInfo.onwardFlightNumber : (selectedArrivalFlight?.flightNumber || 'SV-300')),
        arrivalDateTime: isWithoutTkt ? `${dates.checkIn}T12:00:00.000Z` : (flightBookingMode === 'own' ? `${flightInfo.onwardDate}T${flightInfo.onwardTime}:00.000Z` : `${flightInfo.onwardDate}T${selectedArrivalFlight?.departureTime || '08:00'}:00.000Z`),
        arrivalAirportId: flightBookingMode === 'own' ? flightInfo.onwardToPortId : (airports.find(a => a.id === flightInfo.onwardToPortId)?.id || 'apt-jed'),
        departureFlightNumber: isWithoutTkt ? 'NT-0000' : (flightBookingMode === 'own' ? flightInfo.returnFlightNumber : (selectedDepartureFlight?.flightNumber || 'SV-301')),
        departureDateTime: isWithoutTkt ? `${dates.checkIn}T12:00:00.000Z` : (flightBookingMode === 'own' ? `${flightInfo.returnDate}T${flightInfo.returnTime}:00.000Z` : `${flightInfo.returnDate}T${selectedDepartureFlight?.arrivalTime || '22:00'}:00.000Z`),
        departureAirportId: flightBookingMode === 'own' ? flightInfo.returnFromPortId : (airports.find(a => a.id === flightInfo.returnFromPortId)?.id || 'apt-jed'),
        iqamaNumber: iqamaDetails.iqamaNumber,
        iqamaSponserName: iqamaDetails.iqamaSponserName,
        sponserDob: iqamaDetails.sponserDob ? new Date(iqamaDetails.sponserDob).toISOString() : null,
        sponserMobileNumber: iqamaDetails.sponserMobileNumber,
        movements: movements.map(m => ({
          date: dates.checkIn,
          time: m.time,
          fromLocationId: selectedMakkahHotelId,
          toLocationId: selectedMadinahHotelId
        }))
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
        alert(resData.error || 'Failed to complete booking. Please verify hotel allotments.');
      }
    } catch (err) {
      alert('Checkout failed due to network error.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Itinerary Builder Actions
  const addMovement = (type: 'transfer' | 'ziyarat') => {
    const newItem = {
      id: `m-custom-${Date.now()}`,
      type,
      name: type === 'transfer' ? 'Custom Airport Transfer' : 'Makkah Historical Tour (Ziyarat)',
      from: type === 'transfer' ? 'Airport' : 'Makkah Hotel',
      to: type === 'transfer' ? 'Makkah Hotel' : 'Historical Sites',
      time: '10:00'
    };
    setMovements([...movements, newItem]);
  };

  const removeMovement = (id: string) => {
    setMovements(movements.filter(m => m.id !== id));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= movements.length) return;
    const newMovements = [...movements];
    const temp = newMovements[index];
    newMovements[index] = newMovements[nextIndex];
    newMovements[nextIndex] = temp;
    setMovements(newMovements);
  };

  const updateTime = (index: number, time: string) => {
    const newMovements = [...movements];
    newMovements[index] = { ...newMovements[index], time };
    setMovements(newMovements);
  };

  const isIqama = isQuickEVisa || dates.accommodationType === 'iqama';
  const isIqamaValid = !isIqama || (
    iqamaDetails.iqamaNumber.trim().length === 10 && 
    iqamaDetails.iqamaSponserName.trim().length > 0 &&
    iqamaDetails.sponserDob.trim().length > 0 &&
    iqamaDetails.sponserMobileNumber.trim().length > 0
  );

  const selectedMakkahHotelName = hotels.find(h => h.id === selectedMakkahHotelId)?.name || 'Pullman Zamzam Makkah (5★)';
  const selectedMadinahHotelName = hotels.find(h => h.id === selectedMadinahHotelId)?.name || 'Anwar Al Madinah Mövenpick (5★)';
  const selectedRouteName = routes.find(r => r.id === selectedRouteId)?.routeType || 'Jeddah → Makkah → Madinah';

  return (
    <>
      {/* Header and Branding */}
      <header>
        <div className="nav-container">
          <a href="#" className="logo-block" onClick={(e) => { e.preventDefault(); resetToHome(); }}>
            <div className="logo-icon">N</div>
            <div className="logo-text">
              <h1>NUSYNC DIRECT</h1>
              <span>Verified B2C Consumer Channel</span>
            </div>
          </a>
          <div className="nav-links">
            <button 
              className="nav-btn" 
              style={{ backgroundColor: 'var(--secondary)', color: 'white', fontWeight: 700, borderRadius: '8px', border: 'none', padding: '0.6rem 1.2rem', cursor: 'pointer' }}
              onClick={() => {
                setIsQuickEVisa(true);
                setDates(prev => ({
                  ...prev,
                  accommodationType: 'iqama',
                  makkahNights: 0,
                  madinahNights: 0
                }));
                setSelectedPackage(null);
                setActiveTab('builder');
                setStep(1);
                setBookingFinished(false);
              }}
            >
              Quick eVisa (24hr Umra visa)
            </button>
          </div>
        </div>
      </header>

      {/* Main Landing Area */}
      {bookingFinished ? (
        <main className="animate-in fade-in duration-500" style={{ marginTop: '3rem' }}>
          <div className="builder-main" style={{ maxWidth: '850px', margin: '0 auto' }}>
            <div className="success-alert">
              <CheckCircle className="h-5 w-5" />
              Moulavi B2C e-Visa Application & Allotment Lock Confirmed!
            </div>

            <h2 className="hero-title" style={{ color: 'var(--primary)', fontSize: '2rem', textAlign: 'center', marginBottom: '0.5rem' }}>Pilgrim Manifest Voucher</h2>
            <p className="hero-subtitle" style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', marginBottom: '2.5rem' }}>
              Your electronic visa application has been validated. A digital copy of this Tafweej voucher has been dispatched via WhatsApp to {traveler.mobile}.
            </p>

            <div className="voucher-card">
              <div className="voucher-header">
                <div className="voucher-brand">
                  <h2>MOULAVI TRAVELS</h2>
                  <p>Official e-Visa Gateway</p>
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
                        <span className="voucher-info-val" style={{ color: 'var(--primary)', fontWeight: 800 }}>✓ CONFIRMED</span>
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
                        <span className="voucher-info-label">Accommodation Type</span>
                        <span className="voucher-info-val" style={{ textTransform: 'uppercase' }}>{dates.accommodationType} Booking</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Makkah Hotel</span>
                        <span className="voucher-info-val">{selectedMakkahHotelName} ({dates.makkahNights} Nights)</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Madinah Hotel</span>
                        <span className="voucher-info-val">{selectedMadinahHotelName} ({dates.madinahNights} Nights)</span>
                      </div>
                    </div>
                  </div>

                  {/* Flights Section */}
                  <div>
                    <h3 className="voucher-section-title">Flight Details</h3>
                    <div className="voucher-grid">
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Onward Ticket</span>
                        <span className="voucher-info-val" style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          {flightBookingMode === 'own' && skipOwnFlightDetails ? (
                            <span>Without Ticket</span>
                          ) : (
                            <>
                              <span style={{ fontWeight: 700 }}>
                                {flightBookingMode === 'own' ? flightInfo.onwardFlightNumber : (selectedArrivalFlight?.flightNumber || 'SV-300')} 
                                &nbsp;({getIataCode(flightInfo.onwardFromPortId)} → {getIataCode(flightInfo.onwardToPortId)})
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Date: {flightInfo.onwardDate} @ {flightBookingMode === 'own' ? flightInfo.onwardTime : (selectedArrivalFlight?.departureTime || '08:00')}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Return Ticket</span>
                        <span className="voucher-info-val" style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          {flightBookingMode === 'own' && skipOwnFlightDetails ? (
                            <span>Without Ticket</span>
                          ) : (
                            <>
                              <span style={{ fontWeight: 700 }}>
                                {flightBookingMode === 'own' ? flightInfo.returnFlightNumber : (selectedDepartureFlight?.flightNumber || 'SV-301')} 
                                &nbsp;({getIataCode(flightInfo.returnFromPortId)} → {getIataCode(flightInfo.returnToPortId)})
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Date: {flightInfo.returnDate} @ {flightBookingMode === 'own' ? flightInfo.returnTime : (selectedDepartureFlight?.arrivalTime || '22:00')}
                              </span>
                            </>
                          )}
                        </span>
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
                        <span className="voucher-info-val">{selectedVehicleType}</span>
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
                  <span className="qr-desc">Scan to verify Tafweej manifest clearances</span>
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
              Verify hotel room allotments, select onward and return flight carriers, and issue direct electronic visas instantly.
            </p>
          </section>

          {/* Floated Booking Conversion Cards */}
          <main>
            <div className="cta-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1000px', margin: '-3rem auto 3rem auto', position: 'relative', zIndex: 10, padding: '0 1.5rem', boxSizing: 'border-box' }}>
              
              {/* Card 1: Quick eVisa */}
              <div className="cta-card" style={{ backgroundColor: 'var(--bg-white)', borderRadius: 'var(--border-radius)', padding: '2rem', border: '1px solid var(--gold-border)', boxShadow: 'var(--box-shadow)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'var(--transition)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ backgroundColor: 'var(--secondary-light)', padding: '0.75rem', borderRadius: '12px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap className="h-6 w-6" />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Quick eVisa (24hr Umra visa)</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.5rem', margin: '0 0 1.5rem 0' }}>
                    Apply for your official Umrah visa with 24-hour processing. This flow defaults accommodation booking to Iqama sponsor allotments, skips hotel bookings, and goes directly to checkout.
                  </p>
                </div>
                <button 
                  className="book-btn" 
                  style={{ width: '100%', padding: '0.9rem', justifyContent: 'center', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => {
                    setIsQuickEVisa(true);
                    setDates(prev => ({
                      ...prev,
                      accommodationType: 'iqama',
                      makkahNights: 0,
                      madinahNights: 0
                    }));
                    setSelectedPackage(null);
                    setActiveTab('builder');
                    setStep(1); // Goes to step 1 (sponsor details and check-in date)
                    setBookingFinished(false);
                  }}
                >
                  Apply Quick eVisa <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Card 2: Customised Umra Package */}
              <div className="cta-card" style={{ backgroundColor: 'var(--bg-white)', borderRadius: 'var(--border-radius)', padding: '2rem', border: '1px solid var(--border-color)', boxShadow: 'var(--box-shadow)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'var(--transition)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ backgroundColor: 'var(--primary-light)', padding: '0.75rem', borderRadius: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Customised Umra Package</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.5rem', margin: '0 0 1.5rem 0' }}>
                    Plan and customize every aspect of your pilgrimage. Choose your accommodation type, lock premium hotel allotments in Makkah & Madinah, book ground transport, and select flights.
                  </p>
                </div>
                <button 
                  className="book-btn" 
                  style={{ width: '100%', padding: '0.9rem', justifyContent: 'center', fontWeight: 700, backgroundColor: 'var(--primary)', cursor: 'pointer' }}
                  onClick={() => {
                    setIsQuickEVisa(false);
                    setDates(prev => ({
                      ...prev,
                      accommodationType: 'hotel',
                      makkahNights: 4,
                      madinahNights: 3
                    }));
                    setSelectedPackage(null);
                    setActiveTab('builder');
                    setStep(1); // Starts at step 1
                    setBookingFinished(false);
                  }}
                >
                  Build Customised Package <ChevronRight className="h-4 w-4" />
                </button>
              </div>

            </div>

            {/* Readymade Packages Section */}
            {activeTab === 'packages' && (
              <div style={{ maxWidth: '1000px', margin: '0 auto 4rem auto', padding: '0 1.5rem', boxSizing: 'border-box' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '0' }}>
                  Select from Premium Ready Packages
                </h2>
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
                        <div className="package-hotel-item" style={{ borderBottom: 'none' }}>
                          <span className="package-hotel-label" style={{ color: 'var(--secondary)' }}>Flights Status</span>
                          <span className="package-hotel-name" style={{ color: 'var(--secondary)' }}>Excluded (Land Only)</span>
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
                            setSelectedMakkahHotelId(pkg.makkahHotelId || DEFAULT_HOTELS[0].id);
                            setSelectedMadinahHotelId(pkg.madinahHotelId || DEFAULT_HOTELS[3].id);
                            setSelectedRouteId(pkg.transportRouteId || DEFAULT_ROUTES[0].id);
                            const checkInDateObj = new Date(dates.checkIn);
                            const returnDateObj = new Date(checkInDateObj.getTime() + (pkg.makkahNights + pkg.madinahNights) * 86400000);
                            setDates(prev => ({ ...prev, makkahNights: pkg.makkahNights, madinahNights: pkg.madinahNights }));
                            setFlightInfo(prev => ({
                              ...prev,
                              onwardDate: dates.checkIn,
                              returnDate: returnDateObj.toISOString().split('T')[0]
                            }));
                            setActiveTab('builder');
                            setStep(2); // Go to Flights step
                          }}
                        >
                          Select <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

            {/* Custom Builder Section */}
            {activeTab === 'builder' && (
              <div>
                {/* Stepper Progress Bar */}
                {/* Stepper Progress Bar */}
                {isQuickEVisa ? (
                  <div className="progress-stepper">
                    <div className={`progress-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
                      <div className="progress-circle">1</div>
                      <span>Sponsor Details</span>
                    </div>
                    <div className="progress-divider" />
                    <div className={`progress-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
                      <div className="progress-circle">2</div>
                      <span>Flights</span>
                    </div>
                    <div className="progress-divider" />
                    <div className={`progress-step ${step === 6 ? 'active' : step > 6 ? 'completed' : ''}`}>
                      <div className="progress-circle">3</div>
                      <span>Checkout</span>
                    </div>
                  </div>
                ) : (
                  <div className="progress-stepper">
                    <div className={`progress-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
                      <div className="progress-circle">1</div>
                      <span>Accommodation Type</span>
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
                      <span>Transports</span>
                    </div>
                    <div className="progress-divider" />
                    <div className={`progress-step ${step === 5 ? 'active' : step > 5 ? 'completed' : ''}`}>
                      <div className="progress-circle">5</div>
                      <span>Itinerary</span>
                    </div>
                    <div className="progress-divider" />
                    <div className={`progress-step ${step === 6 ? 'active' : step > 6 ? 'completed' : ''}`}>
                      <div className="progress-circle">6</div>
                      <span>Checkout</span>
                    </div>
                  </div>
                )}

                <div className="builder-layout">
                  <div className="builder-main">
                    <div className="stepper-header">
                      <h3 className="stepper-title">
                        {step === 1 && (isQuickEVisa ? "Provide Sponsor Details" : "Select Accommodation Type")}
                        {step === 2 && "Configure Flight Ticket Details"}
                        {step === 3 && "Configure Hotel Stay (Min 3 Days)"}
                        {step === 4 && "Configure Ground transfers"}
                        {step === 5 && "Customize Itinerary Movements"}
                        {step === 6 && "eVisa Registration & Checkout"}
                      </h3>
                      <span className="step-indicator">Step {isQuickEVisa ? (step === 1 ? 1 : step === 2 ? 2 : 3) : step} of {isQuickEVisa ? 3 : 6}</span>
                    </div>

                    {/* Step 1: Accommodation Type & Basic Info */}
                    {step === 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                          <div className="search-field">
                            <label>Accommodation Booking Type</label>
                            {isQuickEVisa ? (
                              <input 
                                type="text" 
                                className="search-input" 
                                value="Iqama Sponsor Allotments (Quick eVisa)" 
                                disabled 
                                style={{ backgroundColor: 'var(--bg-light)', color: 'var(--text-muted)' }} 
                              />
                            ) : (
                              <select 
                                className="search-input"
                                value={dates.accommodationType}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'iqama') {
                                    setDates({
                                      ...dates,
                                      accommodationType: val,
                                      makkahNights: 3,
                                      madinahNights: 0
                                    });
                                  } else {
                                    setDates({
                                      ...dates,
                                      accommodationType: val,
                                      makkahNights: 4,
                                      madinahNights: 3
                                    });
                                  }
                                }}
                              >
                                <option value="hotel">Hotel Accommodation Only</option>
                                <option value="iqama">Iqama Sponsor Allotments</option>
                              </select>
                            )}
                          </div>
                          
                          <div className="search-field">
                            <label>Pilgrims Count</label>
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

                        {/* Iqama Fields if active */}
                        {isIqama && (
                          <div style={{ padding: '1.5rem', backgroundColor: 'var(--primary-light)', borderRadius: '12px', border: '1px solid var(--gold-border)', marginTop: '0.5rem' }}>
                            <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '1rem' }}>
                              <UserCheck className="h-4 w-4 text-primary" /> Sponsor Iqama Details
                            </h4>
                            <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                              <div className="search-field">
                                <label>Sponsor Iqama Number (10 digits)</label>
                                <input 
                                  type="text" 
                                  className="search-input" 
                                  placeholder="1000000000" 
                                  maxLength={10}
                                  value={iqamaDetails.iqamaNumber}
                                  onChange={(e) => setIqamaDetails({ ...iqamaDetails, iqamaNumber: e.target.value.replace(/\D/g, '') })}
                                />
                              </div>
                              <div className="search-field">
                                <label>Sponsor Full Name (Absher Matching)</label>
                                <input 
                                  type="text" 
                                  className="search-input" 
                                  placeholder="Sponsor Name" 
                                  value={iqamaDetails.iqamaSponserName}
                                  onChange={(e) => setIqamaDetails({ ...iqamaDetails, iqamaSponserName: e.target.value })}
                                />
                              </div>
                              <div className="search-field">
                                <label>Sponsor Date of Birth</label>
                                <input 
                                  type="date" 
                                  className="search-input" 
                                  value={iqamaDetails.sponserDob}
                                  onChange={(e) => setIqamaDetails({ ...iqamaDetails, sponserDob: e.target.value })}
                                />
                              </div>
                              <div className="search-field">
                                <label>Sponsor Mobile Number</label>
                                <input 
                                  type="text" 
                                  className="search-input" 
                                  placeholder="+966 50 123 4567" 
                                  value={iqamaDetails.sponserMobileNumber}
                                  onChange={(e) => setIqamaDetails({ ...iqamaDetails, sponserMobileNumber: e.target.value })}
                                />
                              </div>
                            </div>
                            <p className="scan-desc" style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>
                              * Sponsor approvals must still be cleared in Absher via the Qabul services portal.
                            </p>
                          </div>
                        )}

                        <div className="search-field">
                          <label>Check-in Date</label>
                          <input 
                            type="date" 
                            className="search-input"
                            value={dates.checkIn}
                            onChange={(e) => setDates({ ...dates, checkIn: e.target.value })}
                          />
                        </div>

                        <div className="step-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            {isIqama && !isIqamaValid && (
                              <span style={{ color: 'var(--error)', fontSize: '0.8rem', fontWeight: 700 }}>
                                ⚠️ Please fill all required sponsor fields (Iqama must be 10 digits).
                              </span>
                            )}
                          </div>
                          <button 
                            className="book-btn" 
                            disabled={isIqama && !isIqamaValid}
                            onClick={() => {
                              const checkInDateObj = new Date(dates.checkIn);
                              const totalNights = dates.makkahNights + dates.madinahNights;
                              const returnDateObj = new Date(checkInDateObj.getTime() + (totalNights || 7) * 86400000);
                              setFlightInfo(prev => ({
                                ...prev,
                                onwardDate: dates.checkIn,
                                returnDate: returnDateObj.toISOString().split('T')[0]
                              }));
                              setStep(2);
                            }}
                          >
                            Flight Details <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Flight Details */}
                    {step === 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Selector for flight search mode vs own ticket */}
                        <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                          <div 
                            className={`option-item ${flightBookingMode === 'book' ? 'selected' : ''}`}
                            onClick={() => {
                              setFlightBookingMode('book');
                              setSkipOwnFlightDetails(false);
                            }}
                            style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                          >
                            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Book Flights with Package</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Search and select live schedules</span>
                          </div>
                          
                          <div 
                            className={`option-item ${flightBookingMode === 'own' ? 'selected' : ''}`}
                            onClick={() => {
                              setFlightBookingMode('own');
                              setSelectedArrivalFlight(null);
                              setSelectedDepartureFlight(null);
                            }}
                            style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                          >
                            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>I Have My Own Ticket</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provide ticket details or skip</span>
                          </div>
                        </div>

                        {/* MODE A: LIVE FLIGHT SEARCH & BOOKING */}
                        {flightBookingMode === 'book' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: 'var(--bg-light)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                              
                              {/* Onward Flight Ports */}
                              <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>Onward Flight Route (Home → KSA)</span>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                  <div className="search-field">
                                    <label>From Port</label>
                                    <SearchableSelect 
                                      options={airports}
                                      value={flightInfo.onwardFromPortId}
                                      onChange={(val) => setFlightInfo({ ...flightInfo, onwardFromPortId: val })}
                                      placeholder="Search departure airport..."
                                      apiSearchUrl="/api/b2c/flights/airports"
                                    />
                                  </div>
                                  <div className="search-field">
                                    <label>To Port (Saudi Airport)</label>
                                    <SearchableSelect 
                                      options={airports}
                                      value={flightInfo.onwardToPortId}
                                      onChange={(val) => setFlightInfo({ ...flightInfo, onwardToPortId: val })}
                                      placeholder="Search destination airport..."
                                      apiSearchUrl="/api/b2c/flights/airports"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Return Flight Ports */}
                              <div style={{ gridColumn: 'span 2', paddingBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>Return Flight Route (KSA → Home)</span>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                  <div className="search-field">
                                    <label>From Port (Saudi Airport)</label>
                                    <SearchableSelect 
                                      options={airports}
                                      value={flightInfo.returnFromPortId}
                                      onChange={(val) => setFlightInfo({ ...flightInfo, returnFromPortId: val })}
                                      placeholder="Search departure airport..."
                                      apiSearchUrl="/api/b2c/flights/airports"
                                    />
                                  </div>
                                  <div className="search-field">
                                    <label>To Port</label>
                                    <SearchableSelect 
                                      options={airports}
                                      value={flightInfo.returnToPortId}
                                      onChange={(val) => setFlightInfo({ ...flightInfo, returnToPortId: val })}
                                      placeholder="Search destination airport..."
                                      apiSearchUrl="/api/b2c/flights/airports"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Date Selection */}
                              <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="search-field">
                                  <label>Onward Flight Date</label>
                                  <input 
                                    type="date" 
                                    className="search-input" 
                                    value={flightInfo.onwardDate}
                                    onChange={(e) => setFlightInfo({ ...flightInfo, onwardDate: e.target.value })}
                                  />
                                </div>
                                <div className="search-field">
                                  <label>Return Flight Date</label>
                                  <input 
                                    type="date" 
                                    className="search-input" 
                                    value={flightInfo.returnDate}
                                    onChange={(e) => setFlightInfo({ ...flightInfo, returnDate: e.target.value })}
                                  />
                                </div>
                              </div>

                              <button 
                                type="button" 
                                className="search-submit-btn" 
                                style={{ gridColumn: 'span 2', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }}
                                onClick={triggerFlightSearch}
                                disabled={isSearchingArrival || isSearchingDeparture}
                              >
                                {isSearchingArrival || isSearchingDeparture ? (
                                  <>
                                    <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px' }}>
                                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" strokeDasharray="30 30" />
                                    </svg>
                                    Searching Live API...
                                  </>
                                ) : (
                                  <>
                                    <Compass className="h-4 w-4" /> Search Live Onward & Return Flights
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Live Flight Selection Results */}
                            <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                              
                              {/* Onward Flight Block */}
                              <div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>1. Select Onward Flight (Home → KSA)</span>
                                {liveArrivalFlights.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {liveArrivalFlights.map((lf, idx) => (
                                      <div 
                                        key={idx} 
                                        style={{ 
                                          display: 'flex', 
                                          flexDirection: 'column',
                                          gap: '0.5rem',
                                          padding: '1rem', 
                                          border: selectedArrivalFlight && selectedArrivalFlight.flightNumber === lf.flightNumber && selectedArrivalFlight.departureTime === lf.departureTime && selectedArrivalFlight.carrier === lf.carrier ? '2px solid var(--primary)' : '1px solid var(--border-color)', 
                                          borderRadius: '12px', 
                                          cursor: 'pointer', 
                                          backgroundColor: selectedArrivalFlight && selectedArrivalFlight.flightNumber === lf.flightNumber && selectedArrivalFlight.departureTime === lf.departureTime && selectedArrivalFlight.carrier === lf.carrier ? 'var(--primary-light)' : 'white',
                                          boxShadow: selectedArrivalFlight && selectedArrivalFlight.flightNumber === lf.flightNumber && selectedArrivalFlight.departureTime === lf.departureTime && selectedArrivalFlight.carrier === lf.carrier ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                          transition: 'all 0.2s ease',
                                          boxSizing: 'border-box'
                                        }}
                                        onClick={() => setSelectedArrivalFlight(lf)}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-dark)' }}>{lf.carrier}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{lf.flightNumber}</span>
                                          </div>
                                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--secondary)' }}>{lf.price} SAR</span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fbfb', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #f0f4f3', boxSizing: 'border-box' }}>
                                          <div style={{ textAlign: 'left' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', display: 'block' }}>{lf.departureTime}</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)' }}>{getIataCode(flightInfo.onwardFromPortId)}</span>
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexGrow: 1, textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{flightInfo.onwardDate}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px', margin: '0 auto' }}>
                                              <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-color)', position: 'relative' }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--secondary)', position: 'absolute', right: 0, top: '-1.5px' }} />
                                              </div>
                                            </div>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Direct</span>
                                          </div>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', display: 'block' }}>{lf.arrivalTime}</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)' }}>{getIataCode(flightInfo.onwardToPortId)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ padding: '1.5rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    No onward flights fetched. Click Search above.
                                  </div>
                                )}
                              </div>

                              {/* Return Flight Block */}
                              <div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>2. Select Return Flight (KSA → Home)</span>
                                {liveDepartureFlights.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {liveDepartureFlights.map((lf, idx) => (
                                      <div 
                                        key={idx} 
                                        style={{ 
                                          display: 'flex', 
                                          flexDirection: 'column',
                                          gap: '0.5rem',
                                          padding: '1rem', 
                                          border: selectedDepartureFlight && selectedDepartureFlight.flightNumber === lf.flightNumber && selectedDepartureFlight.departureTime === lf.departureTime && selectedDepartureFlight.carrier === lf.carrier ? '2px solid var(--primary)' : '1px solid var(--border-color)', 
                                          borderRadius: '12px', 
                                          cursor: 'pointer', 
                                          backgroundColor: selectedDepartureFlight && selectedDepartureFlight.flightNumber === lf.flightNumber && selectedDepartureFlight.departureTime === lf.departureTime && selectedDepartureFlight.carrier === lf.carrier ? 'var(--primary-light)' : 'white',
                                          boxShadow: selectedDepartureFlight && selectedDepartureFlight.flightNumber === lf.flightNumber && selectedDepartureFlight.departureTime === lf.departureTime && selectedDepartureFlight.carrier === lf.carrier ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                          transition: 'all 0.2s ease',
                                          boxSizing: 'border-box'
                                        }}
                                        onClick={() => setSelectedDepartureFlight(lf)}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-dark)' }}>{lf.carrier}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{lf.flightNumber}</span>
                                          </div>
                                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--secondary)' }}>{lf.price} SAR</span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fbfb', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #f0f4f3', boxSizing: 'border-box' }}>
                                          <div style={{ textAlign: 'left' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', display: 'block' }}>{lf.departureTime}</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)' }}>{getIataCode(flightInfo.returnFromPortId)}</span>
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexGrow: 1, textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{flightInfo.returnDate}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px', margin: '0 auto' }}>
                                              <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-color)', position: 'relative' }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--secondary)', position: 'absolute', right: 0, top: '-1.5px' }} />
                                              </div>
                                            </div>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Direct</span>
                                          </div>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', display: 'block' }}>{lf.arrivalTime}</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)' }}>{getIataCode(flightInfo.returnToPortId)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ padding: '1.5rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    No return flights fetched. Click Search above.
                                  </div>
                                )}
                              </div>

                            </div>

                            {selectedArrivalFlight && selectedDepartureFlight && (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: '8px', border: '1px solid var(--gold-border)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                                <CheckCircle className="h-5 w-5" /> Selected Onward: {selectedArrivalFlight.flightNumber} | Return: {selectedDepartureFlight.flightNumber} - {((selectedArrivalFlight.price + selectedDepartureFlight.price) * dates.travelers)} SAR total cost included.
                              </div>
                            )}

                            {/* Warning Banner */}
                            <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', backgroundColor: 'var(--secondary-light)', border: '1px solid var(--gold-border)', borderRadius: '8px', color: 'var(--text-dark)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                              <Info className="h-5 w-5 text-secondary flex-shrink-0" style={{ marginTop: '2px' }} />
                              <div>
                                <b>Important Booking Notice:</b> The flight schedules selected are subject to real-time seat availability. Your chosen flights will be officially confirmed only after payment is finalized (which will be processed following a verification call from our booking desk). If your selected flight becomes unavailable, our desk will secure a similar option for you at no extra charge.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* MODE B: OWN TICKETS (MANUAL FORM OR SKIP) */}
                        {flightBookingMode === 'own' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--primary-light)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <input 
                                type="checkbox" 
                                id="skipOwnFlightDetails" 
                                checked={skipOwnFlightDetails}
                                onChange={(e) => setSkipOwnFlightDetails(e.target.checked)}
                              />
                              <label htmlFor="skipOwnFlightDetails" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
                                Skip flight details entry completely (I will supply them later)
                              </label>
                            </div>

                            {!skipOwnFlightDetails ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>
                                
                                {/* Arrival flights */}
                                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                                  <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>Onward Flight Details</h4>
                                  <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="search-field">
                                      <label>Carrier / Flight Number</label>
                                      <input 
                                        type="text" 
                                        className="search-input" 
                                        value={flightInfo.onwardFlightNumber}
                                        onChange={(e) => setFlightInfo({ ...flightInfo, onwardFlightNumber: e.target.value })}
                                      />
                                    </div>
                                    <div className="search-field">
                                      <label>Departure Port</label>
                                      <SearchableSelect 
                                        options={airports}
                                        value={flightInfo.onwardFromPortId}
                                        onChange={(val) => setFlightInfo({ ...flightInfo, onwardFromPortId: val })}
                                        placeholder="Search departure port..."
                                        apiSearchUrl="/api/b2c/flights/airports"
                                      />
                                    </div>
                                    <div className="search-field">
                                      <label>Onward Date</label>
                                      <input 
                                        type="date" 
                                        className="search-input" 
                                        value={flightInfo.onwardDate}
                                        onChange={(e) => setFlightInfo({ ...flightInfo, onwardDate: e.target.value })}
                                      />
                                    </div>
                                    <div className="search-field">
                                      <label>Onward Time</label>
                                      <input 
                                        type="time" 
                                        className="search-input" 
                                        value={flightInfo.onwardTime}
                                        onChange={(e) => setFlightInfo({ ...flightInfo, onwardTime: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Departure flights */}
                                <div>
                                  <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>Return Flight Details</h4>
                                  <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="search-field">
                                      <label>Carrier / Flight Number</label>
                                      <input 
                                        type="text" 
                                        className="search-input" 
                                        value={flightInfo.returnFlightNumber}
                                        onChange={(e) => setFlightInfo({ ...flightInfo, returnFlightNumber: e.target.value })}
                                      />
                                    </div>
                                    <div className="search-field">
                                      <label>Arrival Port</label>
                                      <SearchableSelect 
                                        options={airports}
                                        value={flightInfo.returnToPortId}
                                        onChange={(val) => setFlightInfo({ ...flightInfo, returnToPortId: val })}
                                        placeholder="Search arrival port..."
                                        apiSearchUrl="/api/b2c/flights/airports"
                                      />
                                    </div>
                                    <div className="search-field">
                                      <label>Return Date</label>
                                      <input 
                                        type="date" 
                                        className="search-input" 
                                        value={flightInfo.returnDate}
                                        onChange={(e) => setFlightInfo({ ...flightInfo, returnDate: e.target.value })}
                                      />
                                    </div>
                                    <div className="search-field">
                                      <label>Return Time</label>
                                      <input 
                                        type="time" 
                                        className="search-input" 
                                        value={flightInfo.returnTime}
                                        onChange={(e) => setFlightInfo({ ...flightInfo, returnTime: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                </div>

                              </div>
                            ) : (
                              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Info className="h-8 w-8 mx-auto mb-2 text-secondary" />
                                <p>You have selected to <b>Skip</b> entering flight details. We will request them from you closer to departure.</p>
                              </div>
                            )}

                          </div>
                        )}

                        <div className="step-nav">
                          <button className="nav-back-btn" onClick={() => setStep(1)}>Back</button>
                          <button 
                            className="book-btn" 
                            disabled={flightBookingMode === 'book' && (!selectedArrivalFlight || !selectedDepartureFlight)}
                            onClick={() => {
                              if (isQuickEVisa) {
                                setStep(6);
                              } else {
                                setStep(3);
                              }
                            }}
                          >
                            {isQuickEVisa ? "eVisa & Checkout" : "Configure Stays"} <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Hotel Stays */}
                    {step === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Minimum stay warning */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--secondary-light)', border: '1px solid var(--gold-border)', borderRadius: '8px', color: 'var(--text-dark)', fontSize: '0.85rem', fontWeight: 600 }}>
                          <Info className="h-4 w-4 text-secondary" />
                          <span>* Direct e-Visas require a minimum hotel stay allotment of at least 3 days.</span>
                        </div>

                        <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                          <div className="search-field">
                            <label>Makkah Nights</label>
                            <input 
                              type="number" 
                              className="search-input" 
                              min={1} 
                              value={dates.makkahNights}
                              onChange={(e) => setDates({ ...dates, makkahNights: Math.max(1, parseInt(e.target.value) || 1) })}
                            />
                          </div>
                          <div className="search-field">
                            <label>Madinah Nights</label>
                            <input 
                              type="number" 
                              className="search-input" 
                              min={0} 
                              value={dates.madinahNights}
                              onChange={(e) => setDates({ ...dates, madinahNights: Math.max(0, parseInt(e.target.value) || 0) })}
                            />
                          </div>
                        </div>

                        {/* Stays limit check */}
                        {dates.makkahNights + dates.madinahNights < 3 && (
                          <span style={{ color: 'var(--error)', fontSize: '0.8rem', fontWeight: 700 }}>
                            ⚠️ Total nights (Makkah + Madinah) must be at least 3 nights!
                          </span>
                        )}

                        {/* Makkah Hotels */}
                        <div>
                          <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>
                            <Building className="h-4 w-4 text-primary" /> Makkah Hotel Allotments
                          </h4>
                          <input 
                            type="text" 
                            placeholder="Search Makkah hotels..." 
                            className="search-input" 
                            style={{ marginBottom: '1rem', width: '100%', boxSizing: 'border-box' }} 
                            value={makkahSearch} 
                            onChange={(e) => setMakkahSearch(e.target.value)} 
                          />
                          <div className="options-list" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {hotels
                              .filter(h => h.city?.toLowerCase().includes('makkah') || h.name?.toLowerCase().includes('makkah'))
                              .filter(h => h.name.toLowerCase().includes(makkahSearch.toLowerCase()))
                              .map((h) => (
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
                                      <span className="option-subtitle">Direct bed allotment lock</span>
                                    </div>
                                  </div>
                                  <div className="option-right">
                                    <span className="option-price">{(h.pricePerNight || 350) * dates.makkahNights} SAR</span>
                                    <span className="option-subtitle">{h.pricePerNight || 350} SAR/night</span>
                                  </div>
                                </div>
                              ))}
                            {hotels.filter(h => h.city?.toLowerCase().includes('makkah') || h.name?.toLowerCase().includes('makkah')).filter(h => h.name.toLowerCase().includes(makkahSearch.toLowerCase())).length === 0 && (
                              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No Makkah hotels match "{makkahSearch}"
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Madinah Hotels */}
                        {dates.madinahNights > 0 && (
                          <div>
                            <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>
                              <Building className="h-4 w-4 text-primary" /> Madinah Hotel Allotments
                            </h4>
                            <input 
                              type="text" 
                              placeholder="Search Madinah hotels..." 
                              className="search-input" 
                              style={{ marginBottom: '1rem', width: '100%', boxSizing: 'border-box' }} 
                              value={madinahSearch} 
                              onChange={(e) => setMadinahSearch(e.target.value)} 
                            />
                            <div className="options-list" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                              {hotels
                                .filter(h => h.city?.toLowerCase().includes('madinah') || h.name?.toLowerCase().includes('madinah') || h.city?.toLowerCase().includes('medina'))
                                .filter(h => h.name.toLowerCase().includes(madinahSearch.toLowerCase()))
                                .map((h) => (
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
                                        <span className="option-name">
                                          {h.name}
                                          {selectedPackage && selectedPackage.madinahHotelId === h.id && (
                                            <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--secondary)', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', fontWeight: 700 }}>
                                              Package Default
                                            </span>
                                          )}
                                        </span>
                                        <span className="option-subtitle">Direct bed allotment lock</span>
                                      </div>
                                    </div>
                                    <div className="option-right">
                                      <span className="option-price">{(h.pricePerNight || 300) * dates.madinahNights} SAR</span>
                                      <span className="option-subtitle">{h.pricePerNight || 300} SAR/night</span>
                                    </div>
                                  </div>
                                ))}
                              {hotels.filter(h => h.city?.toLowerCase().includes('madinah') || h.name?.toLowerCase().includes('madinah') || h.city?.toLowerCase().includes('medina')).filter(h => h.name.toLowerCase().includes(madinahSearch.toLowerCase())).length === 0 && (
                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                  No Madinah hotels match "{madinahSearch}"
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="step-nav">
                          <button className="nav-back-btn" onClick={() => setStep(2)}>Back</button>
                          <button 
                            className="book-btn" 
                            disabled={dates.makkahNights + dates.madinahNights < 3}
                            onClick={() => setStep(4)}
                          >
                            Ground Transport <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Ground Transfers */}
                    {step === 4 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Vehicle Type Selection */}
                        <div>
                          <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>Select Vehicle Type</h4>
                          <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            {['SUV', 'Sedan', 'VIP Coach'].map(vt => (
                              <div 
                                key={vt} 
                                className={`option-item ${selectedVehicleType === vt ? 'selected' : ''}`}
                                onClick={() => setSelectedVehicleType(vt)}
                                style={{ padding: '1rem', justifyContent: 'center' }}
                              >
                                <span className="option-name">{vt}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Transport Routes */}
                        <div>
                          <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '0.75rem' }}>Select Corridor Route</h4>
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
                                    <span className="option-subtitle">Official Tafweej corridors</span>
                                  </div>
                                </div>
                                <div className="option-right">
                                  <span className="option-price">{r.price || 500} SAR</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="step-nav">
                          <button className="nav-back-btn" onClick={() => setStep(3)}>Back</button>
                          <button className="book-btn" onClick={() => setStep(5)}>
                            Configure Itinerary <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Interactive Movement Builder */}
                    {step === 5 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 className="summary-title" style={{ fontSize: '1.1rem', borderBottom: 'none', marginBottom: 0 }}>Custom Movement Manifest</h4>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              type="button" 
                              className="tab-btn" 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                              onClick={() => addMovement('transfer')}
                            >
                              <Plus className="h-3 w-3" /> Add Transfer
                            </button>
                            <button 
                              type="button" 
                              className="tab-btn" 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                              onClick={() => addMovement('ziyarat')}
                            >
                              <Plus className="h-3 w-3" /> Add Ziyarat
                            </button>
                          </div>
                        </div>

                        {/* Draggable/Interactive list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {movements.map((m, index) => (
                            <div 
                              key={m.id}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '1rem', 
                                backgroundColor: 'var(--bg-light)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '12px',
                                transition: 'var(--transition)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {/* Reordering buttons */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: index === 0 ? 0.3 : 1 }} disabled={index === 0} onClick={() => moveItem(index, 'up')}><ArrowUp className="h-3.5 w-3.5" /></button>
                                  <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: index === movements.length - 1 ? 0.3 : 1 }} disabled={index === movements.length - 1} onClick={() => moveItem(index, 'down')}><ArrowDown className="h-3.5 w-3.5" /></button>
                                </div>

                                <div className="feature-icon-wrapper" style={{ width: '36px', height: '36px', borderRadius: '8px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {m.type === 'transfer' ? <Car className="h-4 w-4" /> : m.type === 'stay' ? <Building className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>{m.name}</span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.from} → {m.to}</span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="search-field" style={{ width: '90px' }}>
                                  <input 
                                    type="time" 
                                    className="search-input" 
                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }} 
                                    value={m.time}
                                    onChange={(e) => updateTime(index, e.target.value)}
                                  />
                                </div>
                                {m.type !== 'stay' && (
                                  <button 
                                    type="button" 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
                                    onClick={() => removeMovement(m.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>

                            </div>
                          ))}
                        </div>

                        <div className="step-nav">
                          <button className="nav-back-btn" onClick={() => setStep(4)}>Back</button>
                          <button className="book-btn" onClick={() => setStep(6)}>
                            Checkout & Verify <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 6: Checkout & e-Visa */}
                    {step === 6 && (
                      <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Passport Upload */}
                        <div>
                          <span className="price-label" style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Passport verification copy upload</span>
                          <div className="scan-box" onClick={() => document.getElementById('passport-file-input')?.click()}>
                            <input 
                              type="file" 
                              id="passport-file-input" 
                              style={{ display: 'none' }} 
                              accept="image/*,application/pdf"
                              onChange={handlePassportUpload}
                            />
                            <Camera className="h-8 w-8 mx-auto text-primary" />
                            <h4 className="scan-title">
                              {passportFile ? `Uploaded: ${passportFile.name}` : 'Upload Passport Copy'}
                            </h4>
                            <p className="scan-desc">Click here to upload your passport image or PDF for e-Visa records</p>
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
                            </div>
                          )}

                          {otpVerified && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                              <CheckCircle className="h-5 w-5" /> Phone Verified Successfully
                            </div>
                          )}
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
                              } else if (isQuickEVisa) {
                                setStep(2);
                              } else {
                                setStep(5);
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
                                Confirming Allotments & Generating eVisa...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" /> Confirm Booking & Generate eVisa ({quotePrices.total} SAR)
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
                        <div className="summary-row">
                          <span className="summary-label">Accommodation Type</span>
                          <span className="summary-value" style={{ textTransform: 'uppercase' }}>{dates.accommodationType}</span>
                        </div>
                        
                        {selectedPackage ? (
                          <>
                            <div className="summary-row">
                              <span className="summary-label">Selected Package</span>
                              <span className="summary-value" style={{ color: 'var(--secondary)' }}>{selectedPackage.title}</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Makkah Nights</span>
                              <span className="summary-value">{dates.makkahNights} Nights</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Madinah Nights</span>
                              <span className="summary-value">{dates.madinahNights} Nights</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Makkah Hotel</span>
                              <span className="summary-value">
                                {selectedMakkahHotelName}
                                {selectedMakkahHotelId !== selectedPackage.makkahHotelId && ' (Customized)'}
                              </span>
                            </div>
                            {dates.madinahNights > 0 && (
                              <div className="summary-row">
                                <span className="summary-label">Madinah Hotel</span>
                                <span className="summary-value">
                                  {selectedMadinahHotelName}
                                  {selectedMadinahHotelId !== selectedPackage.madinahHotelId && ' (Customized)'}
                                </span>
                              </div>
                            )}
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
                            {dates.madinahNights > 0 && (
                              <div className="summary-row">
                                <span className="summary-label">Madinah Accommodation</span>
                                <span className="summary-value">{selectedMadinahHotelName}</span>
                              </div>
                            )}
                            <div className="summary-row">
                              <span className="summary-label">Transport Route</span>
                              <span className="summary-value">{selectedRouteName} ({selectedVehicleType})</span>
                            </div>
                            <div className="summary-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem' }}>
                              <span className="summary-label">Flight Route & Schedule</span>
                              <div className="summary-value" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--secondary)', boxSizing: 'border-box' }}>
                                {flightBookingMode === 'own' && skipOwnFlightDetails ? (
                                  <span>Without Ticket (Own arrangements)</span>
                                ) : (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem' }}>
                                      <span>Onward: <b>{flightBookingMode === 'own' ? flightInfo.onwardFlightNumber : (selectedArrivalFlight?.flightNumber || 'SV-300')}</b> ({getIataCode(flightInfo.onwardFromPortId)} → {getIataCode(flightInfo.onwardToPortId)})</span>
                                      <span style={{ color: 'var(--text-muted)' }}>{flightInfo.onwardDate} @ {flightBookingMode === 'own' ? flightInfo.onwardTime : (selectedArrivalFlight?.departureTime || '08:00')}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem' }}>
                                      <span>Return: <b>{flightBookingMode === 'own' ? flightInfo.returnFlightNumber : (selectedDepartureFlight?.flightNumber || 'SV-301')}</b> ({getIataCode(flightInfo.returnFromPortId)} → {getIataCode(flightInfo.returnToPortId)})</span>
                                      <span style={{ color: 'var(--text-muted)' }}>{flightInfo.returnDate} @ {flightBookingMode === 'own' ? flightInfo.returnTime : (selectedDepartureFlight?.arrivalTime || '22:00')}</span>
                                    </div>
                                  </>
                                )}
                              </div>
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
                          <span>Direct API e-Visa Gate</span>
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
                  <p>Choose premium Makkah & Madinah hotels to instantly secure locked beds.</p>
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
                <p>Direct integration ensures seamless clearances and instant visa validation.</p>
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
                <p>Our Saudi operations team supports you at airport terminals and hotel check-in desks.</p>
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
            <p style={{ marginBottom: '1rem' }}>Moulavi Travels is a licensed and verified operator offering direct electronic visas and custom pilgrimage packages.</p>
            <span className="footer-badge">KSA License #9823-U</span>
          </div>
          <div className="footer-column">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><button style={{ background: 'none', border: 'none', color: '#a4beb4', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => resetToHome()}>Home Portal</button></li>
              <li><button style={{ background: 'none', border: 'none', color: '#a4beb4', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => { setIsQuickEVisa(false); setActiveTab('builder'); setStep(1); setBookingFinished(false); }}>Customised Umra Package</button></li>
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
            <h4>Head Office</h4>
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
