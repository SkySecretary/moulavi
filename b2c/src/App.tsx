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
  Zap,
  Mail,
  Search,
  MapPin,
  Truck,
  Users
} from 'lucide-react';
import { FamilyUmrahCalculator, type CalculatorPackageParams } from './components/FamilyUmrahCalculator';
import moulaviLogo from './assets/moulavi-logo.png';

declare global {
  interface Window {
    Cashfree?: any;
  }
}

export const formatRouteName = (r: any): string => {
  if (!r) return 'Official Corridor Route';
  const cities = [r.city1?.name, r.city2?.name, r.city3?.name, r.city4?.name].filter(Boolean);
  if (cities.length > 0) return cities.join(' → ');
  if (r.routeType) {
    const formatted = r.routeType
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
    return formatted;
  }
  return 'Official Corridor Route';
};


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
  { id: 'h-m-1', name: 'Swissôtel Makkah (5★ Luxury)', city: 'Makkah', pricePerNight: 580, category: 'luxury' },
  { id: 'h-m-2', name: 'Pullman Zamzam Makkah (4★ Comfort)', city: 'Makkah', pricePerNight: 450, category: 'comfort' },
  { id: 'h-m-3', name: 'Elaf Kinda Hotel (3★ Economy)', city: 'Makkah', pricePerNight: 280, category: 'economy' },
  { id: 'h-d-1', name: 'The Oberoi Madinah (5★ Luxury)', city: 'Madinah', pricePerNight: 650, category: 'luxury' },
  { id: 'h-d-2', name: 'Anwar Al Madinah Mövenpick (4★ Comfort)', city: 'Madinah', pricePerNight: 390, category: 'comfort' },
  { id: 'h-d-3', name: 'Madinah Hilton (3★ Economy)', city: 'Madinah', pricePerNight: 240, category: 'economy' }
];

export const HOTEL_CATEGORIES = [
  {
    id: 'economy',
    title: 'Economy',
    stars: '1–3 Star',
    badge: '1–3★ Economy',
    distance: '~2 km away from Haram',
    shuttle: 'Free 24/7 Shuttle Bus Service',
    description: '1–3 Star hotel, located around 2km away from the Holy Haram with complimentary round-the-clock shuttle bus service.',
    defaultMakkahPrice: 220,
    defaultMadinahPrice: 200,
    color: '#3b82f6',
  },
  {
    id: 'comfort',
    title: 'Comfort',
    stars: '2–4 Star',
    badge: '2–4★ Comfort',
    distance: 'Walkable distance to Haram',
    shuttle: 'Direct Courtyard Walk (3-7 mins)',
    description: '2–4 Star hotel within convenient walkable distance to the Holy Haram courtyards.',
    defaultMakkahPrice: 360,
    defaultMadinahPrice: 330,
    color: '#10b981',
  },
  {
    id: 'luxury',
    title: 'Luxury',
    stars: '4–5 Star',
    badge: '4/5★ Luxury',
    distance: 'Direct Haram Facing',
    shuttle: 'Direct Haram Access & VIP Entrance',
    description: '4/5 Star luxury hotel directly facing the Holy Haram with panoramic views and VIP amenities.',
    defaultMakkahPrice: 550,
    defaultMadinahPrice: 520,
    color: '#f59e0b',
  }
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
  const [activeTab, setActiveTab] = useState<'packages' | 'builder' | 'calculator'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('calculator') || hash.includes('calculator')) {
        return 'calculator';
      }
      if (path.includes('/book') || path.includes('/builder') || hash.includes('book') || hash.includes('builder')) {
        return 'builder';
      }
    }
    return 'packages';
  });

  // Listen to popstate / hashchange for direct route linking (/b2c/calculator, /b2c/book, /b2c)
  useEffect(() => {
    const handleUrlCheck = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('calculator') || hash.includes('calculator')) {
        setActiveTab('calculator');
      } else if (path.includes('/book') || path.includes('/builder') || hash.includes('book') || hash.includes('builder')) {
        setActiveTab('builder');
      } else {
        setActiveTab('packages');
      }
    };
    window.addEventListener('popstate', handleUrlCheck);
    window.addEventListener('hashchange', handleUrlCheck);
    return () => {
      window.removeEventListener('popstate', handleUrlCheck);
      window.removeEventListener('hashchange', handleUrlCheck);
    };
  }, []);

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

  const [selectedHotelCategory, setSelectedHotelCategory] = useState<'economy' | 'comfort' | 'luxury'>('comfort');
  const [selectedMakkahHotelId, setSelectedMakkahHotelId] = useState('');
  const [selectedMadinahHotelId, setSelectedMadinahHotelId] = useState('');
  const [selectedRouteType, setSelectedRouteType] = useState<string>('fulltrip');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('SUV');
  const [erpTransports, setErpTransports] = useState<any[]>([]);
  const [selectedTransportMasterId, setSelectedTransportMasterId] = useState<string>('');

  // Custom Interactive Itinerary Builder (Movements)
  const [movements, setMovements] = useState<any[]>([
    { id: 'm-1', type: 'transfer', name: 'Airport Arrival Transfer', from: 'Airport', to: 'Makkah Hotel', time: '09:30' },
    { id: 'm-2', type: 'stay', name: 'Makkah Stay Allotment', from: 'Makkah', to: 'Reserved Room', time: '14:00' },
    { id: 'm-3', type: 'transfer', name: 'Inter-City Transfer', from: 'Makkah Hotel', to: 'Madinah Hotel', time: '10:00' },
    { id: 'm-4', type: 'stay', name: 'Madinah Stay Allotment', from: 'Madinah', to: 'Reserved Room', time: '14:00' },
    { id: 'm-5', type: 'transfer', name: 'Departure Airport Transfer', from: 'Madinah Hotel', to: 'Airport', time: '18:00' }
  ]);

  // Dynamic Quote pricing (1.5% processing fee)
  const [quotePrices, setQuotePrices] = useState({
    subtotal: 1000,
    processingFee: 15,
    vat: 15,
    total: 1015
  });

  // Step and checkout controllers
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [configuredPackage, setConfiguredPackage] = useState<CalculatorPackageParams | null>(null);
  const [isQuickEVisa, setIsQuickEVisa] = useState(false);

  const navigateToBuilder = (targetStep = 1) => {
    setActiveTab('builder');
    setStep(targetStep);
    setBookingFinished(false);
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', '/b2c/book');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetToHome = () => {
    setSelectedPackage(null);
    setConfiguredPackage(null);
    setIsQuickEVisa(false);
    setStep(1);
    setBookingFinished(false);
    setActiveTab('packages');
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', '/b2c');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculator Booking Handler - Pre-configures persons, rooms, stays, passes to Flights (Step 2)
  const handleCalculatorBooking = (params: CalculatorPackageParams) => {
    setIsQuickEVisa(false);
    setConfiguredPackage(params);
    if (params.currency && CURRENCIES[params.currency as keyof typeof CURRENCIES]) {
      setSelectedCurrency(params.currency);
    }
    const checkInDateObj = new Date(dates.checkIn);
    const totalNights = params.makkahNights + params.madinahNights;
    const returnDateObj = new Date(checkInDateObj.getTime() + totalNights * 86400000);
    
    setDates(prev => ({
      ...prev,
      accommodationType: 'hotel',
      makkahNights: params.makkahNights,
      madinahNights: params.madinahNights,
      travelers: params.persons
    }));

    setFlightInfo(prev => ({
      ...prev,
      onwardDate: dates.checkIn,
      returnDate: returnDateObj.toISOString().split('T')[0]
    }));

    // Pre-populate passengers array with required count
    const newPassengers = Array.from({ length: params.persons }).map((_, idx) => ({
      fullName: idx === 0 && traveler.fullName ? traveler.fullName : '',
      passportNumber: idx === 0 && traveler.passportNumber ? traveler.passportNumber : '',
      nationality: idx === 0 && traveler.nationality ? traveler.nationality : 'United States',
      gender: 'MALE'
    }));
    setPassengers(newPassengers);

    // Select default hotel IDs based on tier
    setSelectedHotelCategory(params.tier);
    if (params.tier === 'luxury') {
      setSelectedMakkahHotelId(hotels.find(h => h.name?.toLowerCase().includes('swiss') || h.city === 'Makkah')?.id || DEFAULT_HOTELS[0].id);
      setSelectedMadinahHotelId(hotels.find(h => h.name?.toLowerCase().includes('oberoi') || h.city === 'Madinah')?.id || DEFAULT_HOTELS[3].id);
    } else if (params.tier === 'comfort') {
      setSelectedMakkahHotelId(hotels.find(h => h.name?.toLowerCase().includes('zamzam') || h.city === 'Makkah')?.id || DEFAULT_HOTELS[1].id);
      setSelectedMadinahHotelId(hotels.find(h => h.name?.toLowerCase().includes('anwar') || h.city === 'Madinah')?.id || DEFAULT_HOTELS[4].id);
    } else {
      setSelectedMakkahHotelId(hotels.find(h => h.name?.toLowerCase().includes('kinda') || h.city === 'Makkah')?.id || DEFAULT_HOTELS[2].id);
      setSelectedMadinahHotelId(hotels.find(h => h.name?.toLowerCase().includes('hilton') || h.city === 'Madinah')?.id || DEFAULT_HOTELS[5].id);
    }

    setSelectedRouteId(params.includeMadinah ? (routes[0]?.id || DEFAULT_ROUTES[0].id) : (routes[1]?.id || DEFAULT_ROUTES[1].id));
    setSelectedPackage(null);
    navigateToBuilder(2);
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

  const [passengers, setPassengers] = useState<Array<{
    fullName: string;
    passportNumber: string;
    nationality: string;
    gender: string;
  }>>([
    { fullName: '', passportNumber: '', nationality: 'United States', gender: 'MALE' }
  ]);

  useEffect(() => {
    const count = dates.travelers || 1;
    setPassengers(prev => {
      const copy = [...prev];
      if (copy.length < count) {
        for (let i = copy.length; i < count; i++) {
          copy.push({ fullName: '', passportNumber: '', nationality: 'United States', gender: 'MALE' });
        }
      } else if (copy.length > count) {
        copy.splice(count);
      }
      return copy;
    });
  }, [dates.travelers]);

  const CURRENCIES = {
    SAR: { symbol: 'SAR', rate: 1.0 },
    INR: { symbol: '₹', rate: 22.2 },
    AED: { symbol: 'AED', rate: 0.98 },
    QAR: { symbol: 'QR', rate: 0.97 },
    BDT: { symbol: 'BDT', rate: 31.8 },
    KWD: { symbol: 'KD', rate: 0.082 }
  };

  const [selectedCurrency, setSelectedCurrency] = useState('INR');

  const formatPrice = (sarValue: number | string) => {
    const amount = Number(sarValue) || 0;
    const curr = CURRENCIES[selectedCurrency as keyof typeof CURRENCIES] || CURRENCIES.SAR;
    const converted = Math.round(amount * curr.rate);
    return `${converted.toLocaleString()} ${curr.symbol}`;
  };

  // Payment Gateway & Bank Transfer States
  const [paymentMethod, setPaymentMethod] = useState<'cashfree' | 'bank_transfer'>('cashfree');
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [paymentRefNumber, setPaymentRefNumber] = useState('');
  const [cashfreeSessionId, setCashfreeSessionId] = useState('');
  const [cashfreeOrderId, setCashfreeOrderId] = useState('');
  const [isCashfreeLoading, setIsCashfreeLoading] = useState(false);
  const [paymentVerificationStatus, setPaymentVerificationStatus] = useState<'IDLE' | 'PAID' | 'FAILED'>('IDLE');

  // Load Cashfree JS SDK v3
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Cashfree) {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch Bank Details
  useEffect(() => {
    fetch('/api/b2c/payment/bank-details')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setBankDetails(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // 1. Fetch system masters from ERP backend
  useEffect(() => {
    const loadSystemData = async () => {
      try {
        const [packagesRes, mastersRes, transportsRes] = await Promise.all([
          fetch('/api/b2c/packages').then(r => r.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/b2c/masters').then(r => r.json()).catch(() => ({ success: false, data: null })),
          fetch('/api/b2c/transports').then(r => r.json()).catch(() => ({ success: false, data: [] }))
        ]);

        // Mappings
        if (packagesRes.success && packagesRes.data && packagesRes.data.length > 0) {
          setPackages(packagesRes.data);
        } else {
          setPackages(MOCK_PACKAGES);
        }

        const mastersData = mastersRes?.data;
        const hotelList = mastersData?.hotels || [];
        const airportList = mastersData?.airports || [];

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

        // Load public routes with 4 cities from masters
        const routeList = mastersData?.transportRoutes || [];
        let defaultRouteId = '';
        if (routeList.length > 0) {
          setRoutes(routeList);
          // Default route: Jeddah → Makkah → Madinah → Jeddah (Fulltrip)
          const jedMakMedJed = routeList.find((r: any) => 
            (r.id === '8ebb9a91-398f-4d87-ab58-4e6c73116e8d') ||
            (r.routeType === 'fulltrip' && 
             r.city1?.name?.toLowerCase().includes('jeddah') && 
             r.city2?.name?.toLowerCase().includes('makkah') && 
             r.city3?.name?.toLowerCase().includes('madinah') && 
             r.city4?.name?.toLowerCase().includes('jeddah'))
          );
          const fulltripDefault = jedMakMedJed || routeList.find((r: any) => r.routeType === 'fulltrip') || routeList[0];
          defaultRouteId = fulltripDefault?.id || routeList[0].id;
          setSelectedRouteType(fulltripDefault?.routeType || 'fulltrip');
          setSelectedRouteId(defaultRouteId);
        } else {
          setRoutes(DEFAULT_ROUTES);
          defaultRouteId = DEFAULT_ROUTES[0].id;
          setSelectedRouteType('fulltrip');
          setSelectedRouteId(defaultRouteId);
        }

        if (transportsRes.success && transportsRes.data && transportsRes.data.length > 0) {
          setErpTransports(transportsRes.data);
          const matching = transportsRes.data.filter((t: any) => t.routeId === defaultRouteId);
          if (matching.length > 0) {
            setSelectedTransportMasterId(matching[0].id);
            setSelectedVehicleType(matching[0].vehicleType?.vehicleName || 'Sedan');
          } else {
            setSelectedTransportMasterId(transportsRes.data[0].id);
            setSelectedVehicleType(transportsRes.data[0].vehicleType?.vehicleName || 'Sedan');
          }
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
      if (!selectedMakkahHotelId || !selectedMadinahHotelId) return;

      try {
        const arrivalCost = selectedArrivalFlight?.price || 0;
        const departureCost = selectedDepartureFlight?.price || 0;
        const totalFlightCost = arrivalCost + departureCost;

        // If package was pre-configured from Family Calculator, use locked land subtotal + flights
        if (configuredPackage) {
          const flightCostTotal = flightBookingMode === 'own' ? 0 : totalFlightCost * dates.travelers;
          const subtotal = configuredPackage.totalSAR + flightCostTotal;
          const processingFee = Math.round(subtotal * 0.015);
          setQuotePrices({
            subtotal,
            processingFee,
            vat: processingFee,
            total: subtotal + processingFee
          });
          return;
        }

        const response = await fetch('/api/b2c/builder/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            makkahHotelId: selectedMakkahHotelId,
            madinahHotelId: selectedMadinahHotelId,
            makkahNights: dates.makkahNights,
            madinahNights: dates.madinahNights,
            travelersCount: dates.travelers,
            hotelCategory: selectedHotelCategory,
            transportOptionId: selectedRouteId,
            transportMasterId: selectedTransportMasterId || undefined,
            flightOptionId: flightBookingMode === 'own' ? 'none' : 'flight-live',
            flightPrice: totalFlightCost,
            accommodationType: dates.accommodationType
          })
        });
        const resData = await response.json();
        if (resData.success) {
          const qData = resData.data;
          const processingFee = qData.processingFee !== undefined ? qData.processingFee : Math.round(qData.subtotal * 0.015);
          setQuotePrices({
            subtotal: qData.subtotal,
            processingFee,
            vat: processingFee,
            total: qData.subtotal + processingFee
          });
        } else {
          calculateLocalQuote();
        }
      } catch (err) {
        calculateLocalQuote();
      }
    };

    const calculateLocalQuote = () => {
      if (configuredPackage) {
        const flightCostTotal = flightBookingMode === 'own' ? 0 : ((selectedArrivalFlight?.price || 0) + (selectedDepartureFlight?.price || 0)) * dates.travelers;
        const subtotal = configuredPackage.totalSAR + flightCostTotal;
        const processingFee = Math.round(subtotal * 0.015);
        setQuotePrices({
          subtotal,
          processingFee,
          vat: processingFee,
          total: subtotal + processingFee
        });
        return;
      }

      const rt = routes.find(r => r.id === selectedRouteId) || DEFAULT_ROUTES[0];
      const tm = erpTransports.find(t => t.id === selectedTransportMasterId);
      
      const mPrice = (selectedHotelCategory === 'luxury' ? 550 : selectedHotelCategory === 'comfort' ? 360 : 220) * dates.makkahNights;
      const dPrice = (selectedHotelCategory === 'luxury' ? 520 : selectedHotelCategory === 'comfort' ? 330 : 200) * dates.madinahNights;
      const fPrice = flightBookingMode === 'own' ? 0 : ((selectedArrivalFlight?.price || 0) + (selectedDepartureFlight?.price || 0)) * dates.travelers;
      const vPrice = dates.accommodationType === 'iqama' ? 0 : 450 * dates.travelers;
      const rPrice = tm ? Number(tm.price) || 0 : (Number(rt?.price) || 500);

      const subtotal = mPrice + dPrice + fPrice + vPrice + rPrice;
      const processingFee = Math.round(subtotal * 0.015);
      setQuotePrices({
        subtotal,
        processingFee,
        vat: processingFee,
        total: subtotal + processingFee
      });
    };

    calculateLiveQuote();
  }, [
    dates.makkahNights, 
    dates.madinahNights, 
    dates.travelers, 
    dates.accommodationType,
    selectedHotelCategory,
    selectedMakkahHotelId, 
    selectedMadinahHotelId, 
    selectedRouteId, 
    selectedTransportMasterId,
    flightBookingMode,
    selectedArrivalFlight,
    selectedDepartureFlight,
    hotels,
    routes,
    erpTransports,
    configuredPackage
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
        passengers: passengers.map(p => ({
          fullName: p.fullName,
          passportNumber: p.passportNumber,
          nationality: p.nationality,
          gender: p.gender || 'MALE'
        })),
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
        movements: movements
          .filter(m => m.type === 'transfer')
          .map(m => {
            let fromLocId = '';
            let toLocId = '';
            if (m.id === 'm-1') {
              fromLocId = flightInfo.onwardToPortId || 'apt-jed';
              toLocId = selectedMakkahHotelId;
            } else if (m.id === 'm-3') {
              fromLocId = selectedMakkahHotelId;
              toLocId = selectedMadinahHotelId;
            } else if (m.id === 'm-5') {
              fromLocId = dates.madinahNights > 0 ? selectedMadinahHotelId : selectedMakkahHotelId;
              toLocId = flightInfo.returnFromPortId || 'apt-jed';
            } else {
              fromLocId = selectedMakkahHotelId;
              toLocId = selectedMakkahHotelId;
            }
            return {
              date: getMovementDate(m.id),
              time: m.time,
              fromLocationId: fromLocId,
              toLocationId: toLocId
            };
          })
      };

      const response = await fetch('/api/b2c/booking/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await response.json();

      if (!resData.success) {
        alert(resData.error || 'Failed to complete booking. Please verify hotel allotments.');
        setIsProcessingCheckout(false);
        return;
      }

      const generatedBookingRef = resData.bookingReference;
      setBookingRef(generatedBookingRef);

      // Handle Cashfree PG checkout
      if (paymentMethod === 'cashfree') {
        const orderAmount = quotePrices.total > 0 ? quotePrices.total : 1;
        setIsCashfreeLoading(true);

        const cfRes = await fetch('/api/b2c/payment/cashfree-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: orderAmount,
            currency: 'INR',
            guestName: traveler.fullName || 'Pilgrim',
            guestMobile: traveler.mobile,
            guestEmail: traveler.email,
            bookingRef: generatedBookingRef,
            returnUrl: `${window.location.origin}/b2c/book?order_id={order_id}&cf_return=1&ref=${generatedBookingRef}`
          })
        });

        const cfData = await cfRes.json();
        if (cfData.success && cfData.data?.paymentSessionId) {
          setCashfreeSessionId(cfData.data.paymentSessionId);
          setCashfreeOrderId(cfData.data.orderId);

          let cashfreeInstance: any = null;
          if (window.Cashfree) {
            cashfreeInstance = window.Cashfree({ mode: 'production' });
          } else {
            await new Promise((r) => setTimeout(r, 600));
            if (window.Cashfree) {
              cashfreeInstance = window.Cashfree({ mode: 'production' });
            }
          }

          if (cashfreeInstance) {
            cashfreeInstance.checkout({
              paymentSessionId: cfData.data.paymentSessionId,
              redirectTarget: '_modal'
            }).then((result: any) => {
              if (result.error) {
                alert(`Payment was not completed: ${result.error.message || 'Cancelled'}`);
                setBookingFinished(true);
              }
              if (result.paymentDetails) {
                setPaymentVerificationStatus('PAID');
                setBookingFinished(true);
              }
            });
            return;
          } else {
            // SDK not available, finish booking and show reference
            setBookingFinished(true);
          }
        } else {
          // Cashfree order error fallback
          console.warn('Cashfree session creation warning:', cfData.error);
          setBookingFinished(true);
        }
      } else {
        // Direct Bank Transfer selected
        setBookingFinished(true);
      }
    } catch (err) {
      alert('Checkout failed due to network error.');
    } finally {
      setIsProcessingCheckout(false);
      setIsCashfreeLoading(false);
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

  const isPassengersValid = passengers.every(p => p.fullName.trim() !== '' && p.passportNumber.trim() !== '' && p.nationality.trim() !== '');

  const selectedMakkahHotelName = hotels.find(h => h.id === selectedMakkahHotelId)?.name || 'Pullman Zamzam Makkah (5★)';
  const selectedMadinahHotelName = hotels.find(h => h.id === selectedMadinahHotelId)?.name || 'Anwar Al Madinah Mövenpick (5★)';
  const selectedTransportRecord = erpTransports.find(t => t.id === selectedTransportMasterId);
  const selectedRouteObj = selectedTransportRecord?.route || routes.find(r => r.id === selectedRouteId);
  const selectedRouteName = selectedRouteObj ? formatRouteName(selectedRouteObj) : 'Jeddah → Makkah → Madinah → Jeddah';

  const makkahHotelPrice = hotels.find(h => h.id === selectedMakkahHotelId)?.pricePerNight || (selectedHotelCategory === 'luxury' ? 580 : selectedHotelCategory === 'comfort' ? 450 : 280);
  const madinahHotelPrice = hotels.find(h => h.id === selectedMadinahHotelId)?.pricePerNight || (selectedHotelCategory === 'luxury' ? 650 : selectedHotelCategory === 'comfort' ? 390 : 240);
  const onwardFlightUnitPrice = selectedArrivalFlight?.price || 0;
  const returnFlightUnitPrice = selectedDepartureFlight?.price || 0;
  const makkahTotalCost = makkahHotelPrice * dates.makkahNights;
  const madinahTotalCost = madinahHotelPrice * dates.madinahNights;
  const onwardFlightTotalCost = flightBookingMode === 'own' ? 0 : onwardFlightUnitPrice * dates.travelers;
  const returnFlightTotalCost = flightBookingMode === 'own' ? 0 : returnFlightUnitPrice * dates.travelers;
  const routePrice = selectedTransportRecord ? Number(selectedTransportRecord.price) || 0 : (Number(routes.find(r => r.id === selectedRouteId)?.price) || 500);
  const visaPriceTotal = dates.accommodationType === 'iqama' ? 0 : 450 * dates.travelers;

  const getMovementDate = (movementId: string) => {
    if (!dates.checkIn) return '';
    try {
      const checkInDateObj = new Date(dates.checkIn);
      if (movementId === 'm-1' || movementId === 'm-2') {
        return dates.checkIn;
      }
      if (movementId === 'm-3' || movementId === 'm-4') {
        const makkahNightsMs = dates.makkahNights * 86400000;
        const intercityDateObj = new Date(checkInDateObj.getTime() + makkahNightsMs);
        return intercityDateObj.toISOString().split('T')[0];
      }
      if (movementId === 'm-5') {
        const totalNightsMs = (dates.makkahNights + dates.madinahNights) * 86400000;
        const departureDateObj = new Date(checkInDateObj.getTime() + totalNightsMs);
        return departureDateObj.toISOString().split('T')[0];
      }
    } catch (e) {
      // Fallback
    }
    return dates.checkIn;
  };

  return (
    <>
      {/* Header and Branding (Hidden on dedicated Calculator game app) */}
      {activeTab !== 'calculator' && (
        <header>
          <div className="nav-container">
            <a href="#" className="logo-block" onClick={(e) => { e.preventDefault(); resetToHome(); }} title="Moulavi Travels">
              <img 
                src={moulaviLogo} 
                alt="Moulavi Travels" 
                className="logo-img"
              />
            </a>

            <div className="nav-links" style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className="nav-link"
                style={{ background: 'none', border: 'none', fontWeight: activeTab === 'packages' ? 800 : 600, color: activeTab === 'packages' ? 'var(--text-dark)' : 'var(--text-muted)' }}
                onClick={() => {
                  resetToHome();
                }}
              >
                Ready Packages
              </button>

              <button 
                type="button"
                className="nav-link"
                style={{ background: 'none', border: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#ff8b00' }}
                onClick={() => {
                  setActiveTab('calculator');
                  setBookingFinished(false);
                  if (typeof window !== 'undefined' && window.history.pushState) {
                    window.history.pushState({}, '', '/b2c/calculator');
                  }
                }}
              >
                <Sparkles className="h-4 w-4" />
                Calculator
              </button>

              <select
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text-dark)',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
              >
                <option value="SAR">🇸🇦 SAR</option>
                <option value="INR">🇮🇳 INR</option>
                <option value="AED">🇦🇪 AED</option>
                <option value="QAR">🇶🇦 QAR</option>
                <option value="BDT">🇧🇩 BDT</option>
                <option value="KWD">🇰🇼 KWD</option>
              </select>

              <button 
                type="button"
                className="nav-btn nav-btn-highlight" 
                onClick={() => {
                  setIsQuickEVisa(true);
                  setDates(prev => ({
                    ...prev,
                    accommodationType: 'iqama',
                    makkahNights: 0,
                    madinahNights: 0
                  }));
                  setSelectedPackage(null);
                  navigateToBuilder(1);
                }}
              >
                <span>Apply eVisa</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>
      )}


      {/* Main Landing Area */}
      {bookingFinished ? (
        <main className="animate-in fade-in duration-500" style={{ marginTop: '3rem' }}>
          <div className="builder-main" style={{ maxWidth: '850px', margin: '0 auto' }}>
            <div className="success-alert">
              <CheckCircle className="h-5 w-5" />
              Moulavi B2C e-Visa Application & Reserved Room Confirmed!
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
                    <h3 className="voucher-section-title">Pilgrim Manifest Details</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      {passengers.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                          <span><b>{idx + 1}. {p.fullName || 'Pilgrim'}</b> ({p.nationality || 'US'})</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>Passport: {p.passportNumber || 'EP9832104'}</span>
                        </div>
                      ))}
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
                        <span className="voucher-info-label">Payment Status</span>
                        <span className="voucher-info-val" style={{ fontWeight: 800, color: paymentVerificationStatus === 'PAID' ? '#15803d' : 'var(--primary)' }}>
                          {paymentMethod === 'cashfree'
                            ? (paymentVerificationStatus === 'PAID' ? 'PAID & VERIFIED (Cashfree PG)' : 'INITIALIZED (Cashfree PG)')
                            : 'SUBMITTED (Pending Bank Settlement)'}
                        </span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Payment Details</span>
                        <span className="voucher-info-val" style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                          {paymentMethod === 'cashfree' 
                            ? `Cashfree Order: ${cashfreeOrderId || 'CF_PENDING'} (Session: ${cashfreeSessionId ? cashfreeSessionId.slice(0, 16) + '...' : 'Direct'})` 
                            : `Federal Bank Transfer${paymentRefNumber ? ` • Ref: ${paymentRefNumber}` : ''}`}
                        </span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Payment Amount</span>
                        <span className="voucher-info-val" style={{ fontWeight: 800 }}>
                          {formatPrice(quotePrices.total)} ({formatPrice(Math.round(quotePrices.total / (dates.travelers || 1)))} / person)
                        </span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Makkah Hotel</span>
                        <span className="voucher-info-val">{selectedMakkahHotelName} ({dates.makkahNights} Nights)</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Madinah Hotel</span>
                        <span className="voucher-info-val">{selectedMadinahHotelName} ({dates.madinahNights} Nights)</span>
                      </div>
                      <div className="voucher-info-group">
                        <span className="voucher-info-label">Corridor Route</span>
                        <span className="voucher-info-val">{selectedRouteName} ({selectedVehicleType})</span>
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
                    <h3 className="voucher-section-title">Ground & Stay Itinerary Manifest</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                      {movements.map((m) => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px dashed var(--border-color)', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{m.name}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{m.from} → {m.to}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-dark)' }}>{getMovementDate(m.id)}</span>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Time: {m.time}</span>
                          </div>
                        </div>
                      ))}
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
      ) : activeTab === 'calculator' ? (
        /* Dedicated Full Standalone Calculator App View with Seamless Dark Theme */
        <main style={{ minHeight: '100vh', width: '100%', backgroundColor: '#021a12', padding: '1rem 0.5rem 3rem 0.5rem', display: 'flex', justifyContent: 'center', boxSizing: 'border-box' }}>
          <FamilyUmrahCalculator 
            onProceedToBooking={handleCalculatorBooking} 
            onBackToPortal={() => {
              setActiveTab('packages');
              if (typeof window !== 'undefined' && window.history.pushState) {
                window.history.pushState({}, '', '/b2c');
              }
            }}
          />
        </main>
      ) : activeTab === 'packages' ? (
        <>
          {/* Atlys-Grade Clean White Minimalist Hero */}
          <section className="atlys-hero">
            <div className="hero-mesh-grid" />
            <div className="atlys-badge">
              <span className="atlys-badge-pulse" />
              <span>Direct Ministry of Hajj &amp; Umrah Integration • 99.7% Instant Clearance</span>
            </div>
            
            <h2 className="atlys-hero-title">
              Pilgrimage &amp; Visas on Time. <span>Guaranteed.</span>
            </h2>
            
            <p className="atlys-hero-subtitle">
              Issue verified Saudi electronic visas in 24 hours, reserve contracted Makkah &amp; Madinah hotels, and customize flights seamlessly.
            </p>

            {/* Atlys Ultra-Clean Floating Search Bar */}
            <div className="atlys-search-bar">
              <div className="atlys-search-input-group">
                <Search className="h-5 w-5 atlys-search-icon" />
                <input 
                  type="text" 
                  className="atlys-search-input"
                  placeholder="Search package, hotel in Makkah/Madinah, or apply for direct 24hr eVisa..."
                  readOnly
                  onClick={() => {
                    navigateToBuilder(1);
                  }}
                />
              </div>
              <button 
                type="button" 
                className="atlys-search-btn"
                onClick={() => {
                  navigateToBuilder(1);
                }}
              >
                <span>Get Started</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* High-Trust Metrics Strip */}
            <div className="atlys-metrics-strip">
              <div className="atlys-metric-item">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span><strong>99.7%</strong> on-time visa delivery</span>
              </div>
              <div className="atlys-metric-item">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span><strong>100%</strong> contract-backed hotel BRNs</span>
              </div>
              <div className="atlys-metric-item">
                <Zap className="h-4 w-4 text-amber-500" />
                <span><strong>Zero-paperwork</strong> automated OCR</span>
              </div>
            </div>

            {/* Unified 3-Card Pathways */}
            <div className="unified-pathway-bar" style={{ textAlign: 'left', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              
              {/* Card 1: Family Calculator (Featured) */}
              <div className="pathway-card featured">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="pathway-card-icon" style={{ backgroundColor: '#fff0b3', color: '#ff8b00' }}>
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="pathway-tag" style={{ color: '#ff8b00' }}>Interactive Simulator</span>
                      <h3 className="pathway-title">Family Umrah Calculator</h3>
                    </div>
                  </div>
                  <p className="pathway-desc">
                    Interactive 3D Tawaf visualizer, sliding persons & days, and instant live VIP family package costing with live currency conversions.
                  </p>
                </div>
                <button 
                  type="button"
                  className="pathway-btn pathway-btn-amber"
                  onClick={() => {
                    setActiveTab('calculator');
                    setBookingFinished(false);
                    if (typeof window !== 'undefined' && window.history.pushState) {
                      window.history.pushState({}, '', '/b2c/calculator');
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Launch Family Calculator <ChevronRight className="h-4 w-4" style={{ strokeWidth: 3 }} />
                </button>
              </div>

              {/* Card 2: Quick eVisa */}
              <div className="pathway-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="pathway-card-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="pathway-tag" style={{ color: 'var(--primary)' }}>24-Hour Direct Processing</span>
                      <h3 className="pathway-title">Quick eVisa (24hr Umra)</h3>
                    </div>
                  </div>
                  <p className="pathway-desc">
                    Fast 24-hour electronic visa issuance. Skips hotel stay selection and goes straight to passenger details and checkout.
                  </p>
                </div>
                <button 
                  type="button"
                  className="pathway-btn pathway-btn-primary" 
                  onClick={() => {
                    setIsQuickEVisa(true);
                    setDates(prev => ({
                      ...prev,
                      accommodationType: 'iqama',
                      makkahNights: 0,
                      madinahNights: 0
                    }));
                    setSelectedPackage(null);
                    navigateToBuilder(1);
                  }}
                >
                  Apply Quick eVisa <ChevronRight className="h-4 w-4" style={{ strokeWidth: 2.5 }} />
                </button>
              </div>

              {/* Card 3: Customised Umra Package */}
              <div className="pathway-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="pathway-card-icon" style={{ backgroundColor: '#f4f5f7', color: '#42526e' }}>
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="pathway-tag" style={{ color: '#626f86' }}>Custom Itinerary</span>
                      <h3 className="pathway-title">Customised Package</h3>
                    </div>
                  </div>
                  <p className="pathway-desc">
                    End-to-end package builder. Customise flight tickets, 4★ & 5★ hotel stays, and private VIP ground transport step-by-step.
                  </p>
                </div>
                <button 
                  type="button"
                  className="pathway-btn pathway-btn-outline" 
                  onClick={() => {
                    setIsQuickEVisa(false);
                    setDates(prev => ({
                      ...prev,
                      accommodationType: 'hotel',
                      makkahNights: 4,
                      madinahNights: 3
                    }));
                    setSelectedPackage(null);
                    navigateToBuilder(1);
                  }}
                >
                  Build Custom Package <ChevronRight className="h-4 w-4" style={{ strokeWidth: 2.5 }} />
                </button>
              </div>

            </div>
          </section>

          {/* Main Landing Content */}
          <main>
            {/* Ready Packages Listing */}
            <div style={{ maxWidth: '1140px', margin: '2rem auto 4rem auto', padding: '0', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                    Curated All-Inclusive Itineraries
                  </span>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-dark)', margin: 0, letterSpacing: '-0.02em' }}>
                    Explore Ready Pilgrimage Packages
                  </h2>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Showing {packages.length} confirmed departure allotments
                </span>
              </div>

              <div className="cards-grid">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="package-card animate-in fade-in duration-300">
                    <div className="package-card-header">
                      <span className="package-badge">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified Package
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {pkg.makkahNights + pkg.madinahNights} Nights Total
                      </span>
                    </div>
                    <div className="package-content" style={{ paddingTop: '0.5rem' }}>
                      <h3 className="package-title">{pkg.title}</h3>
                      <div className="package-meta">
                        <span>{pkg.makkahNights}N Makkah</span>
                        <span>•</span>
                        <span>{pkg.madinahNights}N Madinah</span>
                        <span>•</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 800 }}>Direct e-Visa</span>
                      </div>
                      <p className="package-desc">{pkg.description}</p>
                      
                      <div className="package-hotel-spec">
                        <div className="package-hotel-item">
                          <span className="package-hotel-label">Makkah Hotel</span>
                          <span className="package-hotel-name">{pkg.makkahHotel?.name || 'Swissôtel Makkah (5★)'}</span>
                        </div>
                        <div className="package-hotel-item">
                          <span className="package-hotel-label">Madinah Hotel</span>
                          <span className="package-hotel-name">{pkg.madinahHotel?.name || 'Anwar Al Madinah (5★)'}</span>
                        </div>
                        <div className="package-hotel-item">
                          <span className="package-hotel-label">Route</span>
                          <span className="package-hotel-name">{pkg.transportRoute?.routeType || 'Jeddah - Makkah - Madinah'}</span>
                        </div>
                        <div className="package-hotel-item" style={{ borderBottom: 'none' }}>
                          <span className="package-hotel-label" style={{ color: '#d97706' }}>Flights Action</span>
                          <span className="package-hotel-name" style={{ color: '#d97706' }}>Pending Selection</span>
                        </div>
                      </div>

                      <div className="package-footer">
                        <div className="price-block">
                          <span className="price-label">Price per pilgrim</span>
                          <span className="price-val">{formatPrice(pkg.price || 2400)}</span>
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
                            navigateToBuilder(2); // Go to Flights step
                          }}
                        >
                          Select Package <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Atlys How It Works Section (Only on Landing Page) */}
            <section className="atlys-how-it-works">
              <div className="atlys-section-header">
                <span className="atlys-section-badge">Fast &amp; Transparent</span>
                <h3 className="atlys-section-title">How Moulavi Direct Works</h3>
                <p className="atlys-section-subtitle">
                  We eliminated complex paperwork and waiting queues. Your pilgrimage visa and stay are secured in three automated steps.
                </p>
              </div>

              <div className="atlys-steps-grid">
                <div className="atlys-step-card">
                  <div className="atlys-step-num">1</div>
                  <h5>AI Passport Scan</h5>
                  <p>Upload a photo of your passport. Our automated OCR accurately extracts MRZ details with zero spelling errors.</p>
                </div>
                <div className="atlys-step-card">
                  <div className="atlys-step-num">2</div>
                  <h5>Select Contracted Stays</h5>
                  <p>Choose real inventory in Makkah &amp; Madinah. Direct contracts mean instant BRN voucher numbers locked to your name.</p>
                </div>
                <div className="atlys-step-card">
                  <div className="atlys-step-num">3</div>
                  <h5>Instant e-Visa Manifest</h5>
                  <p>Receive your digital Ministry of Hajj &amp; Umrah visa manifest directly on WhatsApp and email in under 24 hours.</p>
                </div>
              </div>
            </section>

            {/* Atlys Trust & Guarantee Strip (Only on Landing Page) */}
            <section className="atlys-trust-strip">
              <div className="atlys-trust-card">
                <div className="atlys-trust-icon-box" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4>Official Direct Integration</h4>
                <p>Direct electronic integration with the Saudi Ministry of Foreign Affairs ensures immediate border validity and clearance.</p>
              </div>
              <div className="atlys-trust-card">
                <div className="atlys-trust-icon-box" style={{ backgroundColor: '#deebff', color: '#0052cc' }}>
                  <FileCheck className="h-6 w-6" />
                </div>
                <h4>100% Confirmed BRNs</h4>
                <p>We do not display hypothetical rooms. Every allotment is contracted inventory with confirmed booking reference numbers.</p>
              </div>
              <div className="atlys-trust-card">
                <div className="atlys-trust-icon-box" style={{ backgroundColor: '#fff0b3', color: '#ff8b00' }}>
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <h4>24/7 Pilgrimage Concierge</h4>
                <p>Our dedicated Saudi field operations team assists you upon arrival at Jeddah/Madinah airport and hotel check-in desks.</p>
              </div>
            </section>
          </main>
        </>
      ) : (
        /* Standalone Isolated Multi-Step Booking Flow (No landing/marketing sections above or below) */
        <main style={{ maxWidth: '1240px', margin: '2rem auto 4rem auto', padding: '0 1.5rem', boxSizing: 'border-box', minHeight: '80vh' }}>
          <div>
            {/* Atlys-Grade Pre-configured Land Package Verified Banner */}
            {configuredPackage && (
              <div 
                style={{ 
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  border: '1.5px solid rgba(220, 5, 15, 0.15)',
                  padding: '1.5rem 1.75rem',
                  marginBottom: '1.75rem',
                  boxShadow: '0 8px 30px -10px rgba(220, 5, 15, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CheckCircle className="h-6 w-6" style={{ strokeWidth: 2.4 }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '0.2rem 0.65rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <ShieldCheck className="h-3.5 w-3.5" /> Stays & Visas Locked
                            </span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309', backgroundColor: '#fef3c7', padding: '0.2rem 0.65rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              ⚡ Flights Pending Action
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)', margin: '0.25rem 0 0 0', letterSpacing: '-0.01em' }}>
                            Family Umrah Package Pre-Configured
                          </h3>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('calculator');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          padding: '0.45rem 0.9rem',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Adjust in Calculator →
                      </button>
                    </div>

                    {/* Pre-configured Package Highlights Matrix */}
                    <div 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                        gap: '0.75rem',
                        backgroundColor: '#f8fafc',
                        padding: '1rem',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Pilgrims</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-dark)' }}>{configuredPackage.persons} Persons</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Rooms & Bedding</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-dark)', textTransform: 'capitalize' }}>{configuredPackage.rooms} {configuredPackage.roomType || 'Double'}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Duration</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-dark)' }}>{configuredPackage.days} Days ({configuredPackage.makkahNights}M {configuredPackage.madinahNights > 0 ? `+ ${configuredPackage.madinahNights}Mad` : ''})</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Accommodation Tier</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-dark)', textTransform: 'capitalize' }}>{configuredPackage.tier} VIP</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Locked Land Total</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>{formatPrice(configuredPackage.totalSAR)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stepper Progress Bar */}
                {configuredPackage ? (
                  <div className="progress-stepper" style={{ border: '1.5px solid rgba(19, 92, 70, 0.12)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                    <div className="progress-step completed">
                      <div className="progress-circle" style={{ backgroundColor: 'var(--primary)', borderColor: 'var(--primary)', color: 'white' }}>✓</div>
                      <span style={{ color: 'var(--primary)', fontWeight: 800 }}>Stays & Visas (Locked)</span>
                    </div>
                    <div className="progress-divider" style={{ backgroundColor: 'var(--primary)' }} />
                    <div className={`progress-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
                      <div className="progress-circle" style={step === 2 ? { backgroundColor: '#d97706', borderColor: '#d97706', color: 'white' } : {}}>
                        {step > 2 ? '✓' : '2'}
                      </div>
                      <span style={step === 2 ? { color: '#d97706', fontWeight: 800 } : {}}>Flights (Action Required)</span>
                    </div>
                    <div className="progress-divider" style={step > 2 ? { backgroundColor: 'var(--primary)' } : {}} />
                    <div className={`progress-step ${step === 6 ? 'active' : step > 6 ? 'completed' : ''}`}>
                      <div className="progress-circle">3</div>
                      <span>Passports & Checkout</span>
                    </div>
                  </div>
                ) : isQuickEVisa ? (
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
                        
                        <div className="search-grid grid-2-col" style={{ gap: '1.5rem' }}>
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
                            <input 
                              type="number"
                              min="1"
                              max="100"
                              className="search-input"
                              value={dates.travelers}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setDates({ ...dates, travelers: isNaN(val) ? 1 : Math.max(1, val) });
                              }}
                            />
                          </div>
                        </div>

                        {/* Iqama Fields if active */}
                        {isIqama && (
                          <div style={{ padding: '1.5rem', backgroundColor: 'var(--primary-light)', borderRadius: '12px', border: '1px solid var(--gold-border)', marginTop: '0.5rem' }}>
                            <h4 className="summary-title" style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '1rem' }}>
                              <UserCheck className="h-4 w-4 text-primary" /> Sponsor Iqama Details
                            </h4>
                            <div className="search-grid grid-2-col" style={{ gap: '1.25rem' }}>
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
                        
                        {/* Atlys-Grade Segmented Flight Mode Controller */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                          <div 
                            className={`option-item ${flightBookingMode === 'book' ? 'selected' : ''}`}
                            onClick={() => {
                              setFlightBookingMode('book');
                              setSkipOwnFlightDetails(false);
                            }}
                            style={{ 
                              padding: '1.25rem 1.5rem', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '0.4rem',
                              borderRadius: '16px',
                              border: flightBookingMode === 'book' ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                              backgroundColor: flightBookingMode === 'book' ? 'var(--primary-light)' : '#ffffff',
                              boxShadow: flightBookingMode === 'book' ? '0 8px 20px -6px rgba(19, 92, 70, 0.15)' : 'none',
                              position: 'relative',
                              transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)', backgroundColor: 'rgba(19, 92, 70, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                                Recommended
                              </span>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: flightBookingMode === 'book' ? '6px solid var(--primary)' : '2px solid #cbd5e1', backgroundColor: 'white' }} />
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)', marginTop: '0.25rem' }}>
                              Book Flights with Us
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              Instant carrier search (Saudia, Flynas, Emirates) with guaranteed visa coordination.
                            </span>
                          </div>
                          
                          <div 
                            className={`option-item ${flightBookingMode === 'own' ? 'selected' : ''}`}
                            onClick={() => {
                              setFlightBookingMode('own');
                              setSelectedArrivalFlight(null);
                              setSelectedDepartureFlight(null);
                            }}
                            style={{ 
                              padding: '1.25rem 1.5rem', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '0.4rem',
                              borderRadius: '16px',
                              border: flightBookingMode === 'own' ? '2px solid var(--secondary)' : '1px solid #e2e8f0',
                              backgroundColor: flightBookingMode === 'own' ? 'var(--secondary-light)' : '#ffffff',
                              boxShadow: flightBookingMode === 'own' ? '0 8px 20px -6px rgba(204, 140, 43, 0.2)' : 'none',
                              position: 'relative',
                              transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#b45309', backgroundColor: 'rgba(217, 119, 6, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                                Land-Only / Own Ticket
                              </span>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: flightBookingMode === 'own' ? '6px solid var(--secondary)' : '2px solid #cbd5e1', backgroundColor: 'white' }} />
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)', marginTop: '0.25rem' }}>
                              I Have My Own Ticket / Skip
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              Enter your flight PNR now or choose Land-only and provide flights later.
                            </span>
                          </div>
                        </div>

                        {/* MODE A: LIVE FLIGHT SEARCH & BOOKING */}
                        {flightBookingMode === 'book' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="search-grid grid-2-col" style={{ gap: '1rem', backgroundColor: 'var(--bg-light)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                              
                              {/* Onward Flight Ports */}
                              <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>Onward Flight Route (Home → KSA)</span>
                                <div className="grid-2-col" style={{ gap: '1rem' }}>
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
                                <div className="grid-2-col" style={{ gap: '1rem' }}>
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
                              <div className="grid-2-col" style={{ gridColumn: 'span 2', gap: '1rem' }}>
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
                            <div className="search-grid grid-2-col" style={{ gap: '1.5rem' }}>
                              
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
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', display: 'block' }}>{formatPrice(lf.price)} <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ person</span></span>
                                            {dates.travelers > 1 && (
                                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                Total: {formatPrice(lf.price * dates.travelers)} ({dates.travelers} pax)
                                              </span>
                                            )}
                                          </div>
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
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', display: 'block' }}>{formatPrice(lf.price)} <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ person</span></span>
                                            {dates.travelers > 1 && (
                                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                Total: {formatPrice(lf.price * dates.travelers)} ({dates.travelers} pax)
                                              </span>
                                            )}
                                          </div>
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
                                <CheckCircle className="h-5 w-5" /> Selected Onward: {selectedArrivalFlight.flightNumber} | Return: {selectedDepartureFlight.flightNumber} - {formatPrice((selectedArrivalFlight.price + selectedDepartureFlight.price) * dates.travelers)} total cost included.
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
                                  <div className="search-grid grid-2-col" style={{ gap: '1rem' }}>
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
                                  <div className="search-grid grid-2-col" style={{ gap: '1rem' }}>
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

                        <div className="step-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                          <button 
                            type="button"
                            className="nav-back-btn" 
                            onClick={() => {
                              if (configuredPackage) {
                                setActiveTab('calculator');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else {
                                setStep(1);
                              }
                            }}
                          >
                            {configuredPackage ? "← Return to Calculator" : "Back"}
                          </button>
                          <button 
                            type="button"
                            className="book-btn" 
                            disabled={flightBookingMode === 'book' && (!selectedArrivalFlight || !selectedDepartureFlight)}
                            onClick={() => {
                              if (configuredPackage || isQuickEVisa) {
                                setStep(6);
                              } else {
                                setStep(3);
                              }
                            }}
                          >
                            {configuredPackage ? "Passenger Details" : isQuickEVisa ? "eVisa & Checkout" : "Configure Stays"} <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Hotel Stays */}
                    {step === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                        
                        {/* Minimum stay warning */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--secondary-light)', border: '1px solid var(--gold-border)', borderRadius: '12px', color: 'var(--text-dark)', fontSize: '0.85rem', fontWeight: 600 }}>
                          <Info className="h-4 w-4 text-secondary flex-shrink-0" />
                          <span>Direct e-Visas require a minimum hotel stay allotment of at least 3 nights across Makkah &amp; Madinah.</span>
                        </div>

                        {/* Stay Duration Inputs */}
                        <div className="search-grid grid-2-col" style={{ gap: '1.25rem' }}>
                          <div className="search-field">
                            <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Makkah Nights</label>
                            <input 
                              type="number" 
                              className="search-input" 
                              min={1} 
                              value={dates.makkahNights}
                              onChange={(e) => setDates({ ...dates, makkahNights: Math.max(1, parseInt(e.target.value) || 1) })}
                            />
                          </div>
                          <div className="search-field">
                            <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Madinah Nights</label>
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
                          <div style={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 800, padding: '0.5rem 0.75rem', backgroundColor: 'rgba(220, 5, 15, 0.08)', borderRadius: '8px' }}>
                            ⚠️ Total nights (Makkah + Madinah) must be at least 3 nights!
                          </div>
                        )}

                        {/* ========================================================
                            HOTEL CATEGORY CARDS (Economy, Comfort, Luxury)
                            ======================================================== */}
                        <div>
                          <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Building className="h-4 w-4 text-primary" /> Choose Hotel Accommodation Category
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                              Select your preferred stay tier. Pricing and all-inclusive services update automatically for your selected nights.
                            </p>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                            {HOTEL_CATEGORIES.map((cat) => {
                              const isSelected = selectedHotelCategory === cat.id;
                              const makkahCatRate = cat.defaultMakkahPrice;
                              const madinahCatRate = cat.defaultMadinahPrice;
                              const categoryStayTotal = (makkahCatRate * dates.makkahNights) + (dates.madinahNights > 0 ? madinahCatRate * dates.madinahNights : 0);

                              return (
                                <div
                                  key={cat.id}
                                  onClick={() => {
                                    setSelectedHotelCategory(cat.id as any);
                                    if (cat.id === 'luxury') {
                                      setSelectedMakkahHotelId(hotels.find(h => h.name?.toLowerCase().includes('swiss') || h.category === 'luxury')?.id || DEFAULT_HOTELS[0].id);
                                      setSelectedMadinahHotelId(hotels.find(h => h.name?.toLowerCase().includes('oberoi') || h.category === 'luxury')?.id || DEFAULT_HOTELS[3].id);
                                    } else if (cat.id === 'comfort') {
                                      setSelectedMakkahHotelId(hotels.find(h => h.name?.toLowerCase().includes('zamzam') || h.category === 'comfort')?.id || DEFAULT_HOTELS[1].id);
                                      setSelectedMadinahHotelId(hotels.find(h => h.name?.toLowerCase().includes('anwar') || h.category === 'comfort')?.id || DEFAULT_HOTELS[4].id);
                                    } else {
                                      setSelectedMakkahHotelId(hotels.find(h => h.name?.toLowerCase().includes('kinda') || h.category === 'economy')?.id || DEFAULT_HOTELS[2].id);
                                      setSelectedMadinahHotelId(hotels.find(h => h.name?.toLowerCase().includes('hilton') || h.category === 'economy')?.id || DEFAULT_HOTELS[5].id);
                                    }
                                  }}
                                  style={{
                                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                    borderRadius: '16px',
                                    padding: '1.25rem',
                                    backgroundColor: isSelected ? '#fff9f9' : '#ffffff',
                                    boxShadow: isSelected ? '0 8px 24px rgba(220, 5, 15, 0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    position: 'relative'
                                  }}
                                >
                                  {isSelected && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-10px',
                                      right: '16px',
                                      backgroundColor: 'var(--primary)',
                                      color: 'white',
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      padding: '0.2rem 0.6rem',
                                      borderRadius: '9999px',
                                      letterSpacing: '0.04em',
                                      textTransform: 'uppercase'
                                    }}>
                                      Active Selection
                                    </div>
                                  )}

                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                      <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)' }}>
                                        {cat.title}
                                      </h5>
                                      <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        backgroundColor: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                                        color: isSelected ? 'white' : 'var(--text-dark)',
                                        padding: '0.2rem 0.55rem',
                                        borderRadius: '6px'
                                      }}>
                                        {cat.badge}
                                      </span>
                                    </div>

                                    {/* Description specified by user */}
                                    <p style={{
                                      fontSize: '0.78rem',
                                      color: 'var(--text-muted)',
                                      lineHeight: 1.45,
                                      margin: '0.4rem 0 0.85rem 0',
                                      minHeight: '44px'
                                    }}>
                                      {cat.description}
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                                        <MapPin className="h-3.5 w-3.5 text-primary" />
                                        <span>{cat.distance}</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--secondary)' }}>
                                        <Truck className="h-3.5 w-3.5" />
                                        <span>{cat.shuttle}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{
                                    borderTop: '1px solid var(--border-color)',
                                    paddingTop: '0.85rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline'
                                  }}>
                                    <div>
                                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Per Person Stay Rate</span>
                                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: isSelected ? 'var(--primary)' : 'var(--text-dark)' }}>
                                        {formatPrice(Math.round(categoryStayTotal / (dates.travelers || 1)))}
                                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}> / person</span>
                                      </span>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                        Total: {formatPrice(categoryStayTotal)} ({dates.makkahNights + dates.madinahNights} nights for {dates.travelers} pax)
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                      avg {formatPrice(Math.round((makkahCatRate + madinahCatRate) / 2))} / night
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Stay Allocation Summary Notice */}
                        <div style={{ backgroundColor: '#fafafa', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Building className="h-5 w-5 text-primary" />
                            <div>
                              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-dark)', display: 'block' }}>
                                Selected Tier: {selectedHotelCategory === 'luxury' ? 'Luxury (4/5★)' : selectedHotelCategory === 'comfort' ? 'Comfort (2–4★)' : 'Economy (1–3★)'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {dates.makkahNights} Nights Makkah {dates.madinahNights > 0 ? `• ${dates.madinahNights} Nights Madinah` : ''} Allotment Confirmed
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)', display: 'block' }}>
                              {formatPrice(Math.round(((selectedHotelCategory === 'luxury' ? 550 : selectedHotelCategory === 'comfort' ? 360 : 220) * dates.makkahNights + (dates.madinahNights > 0 ? (selectedHotelCategory === 'luxury' ? 520 : selectedHotelCategory === 'comfort' ? 330 : 200) * dates.madinahNights : 0)) / (dates.travelers || 1)))} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ person</span>
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Total: {formatPrice((selectedHotelCategory === 'luxury' ? 550 : selectedHotelCategory === 'comfort' ? 360 : 220) * dates.makkahNights + (dates.madinahNights > 0 ? (selectedHotelCategory === 'luxury' ? 520 : selectedHotelCategory === 'comfort' ? 330 : 200) * dates.madinahNights : 0))} ({dates.travelers} pax)
                            </span>
                          </div>
                        </div>

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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                        
                        {/* Route Type & Designated Route Corridor Dropdowns */}
                        <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                          <div style={{ marginBottom: '1.25rem' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Truck className="h-4 w-4 text-primary" /> 1. Select Route Type &amp; Corridor Route
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                              Choose your journey corridor. Default is set to Full Trip. Chauffeur fleet pricing is configured in the vehicle selection below.
                            </p>
                          </div>

                          <div className="search-grid grid-2-col" style={{ gap: '1.25rem' }}>
                            {/* Dropdown 1: Route Type */}
                            <div className="search-field">
                              <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Route Type</label>
                              <select
                                className="search-input"
                                value={selectedRouteType}
                                onChange={(e) => {
                                  const newType = e.target.value;
                                  setSelectedRouteType(newType);
                                  const matchingRoutes = routes.filter((r: any) => (r.routeType || '').toLowerCase() === newType.toLowerCase());
                                  if (matchingRoutes.length > 0) {
                                    const nextRoute = matchingRoutes[0];
                                    setSelectedRouteId(nextRoute.id);
                                    const matchingTransports = erpTransports.filter((t: any) => t.routeId === nextRoute.id);
                                    if (matchingTransports.length > 0) {
                                      setSelectedTransportMasterId(matchingTransports[0].id);
                                      setSelectedVehicleType(matchingTransports[0].vehicleType?.vehicleName || 'Sedan');
                                    }
                                  }
                                }}
                                style={{ cursor: 'pointer', fontWeight: 700 }}
                              >
                                <option value="fulltrip">Full Trip (Round Trip Corridor)</option>
                                <option value="citytocity">City to City (Intercity Transfer)</option>
                                <option value="airporttocity">Airport to City (Arrival Transfer)</option>
                                <option value="citytoairport">City to Airport (Departure Transfer)</option>
                                <option value="tripandtour">Trip &amp; Tour (Ziyarat Sightseeing)</option>
                              </select>
                            </div>

                            {/* Dropdown 2: Specific Route Corridor */}
                            <div className="search-field">
                              <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Corridor Route</label>
                              {(() => {
                                const filteredRoutes = routes.filter((r: any) => (r.routeType || '').toLowerCase() === selectedRouteType.toLowerCase());
                                const displayRoutes = filteredRoutes.length > 0 ? filteredRoutes : routes;

                                return (
                                  <select
                                    className="search-input"
                                    value={selectedRouteId}
                                    onChange={(e) => {
                                      const newRouteId = e.target.value;
                                      setSelectedRouteId(newRouteId);
                                      const matchingTransports = erpTransports.filter((t: any) => t.routeId === newRouteId);
                                      if (matchingTransports.length > 0) {
                                        setSelectedTransportMasterId(matchingTransports[0].id);
                                        setSelectedVehicleType(matchingTransports[0].vehicleType?.vehicleName || 'Sedan');
                                      }
                                    }}
                                    style={{ cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    {displayRoutes.map((r: any) => {
                                      const label = formatRouteName(r);
                                      const typeTag = (r.routeType || '').toUpperCase();
                                      return (
                                        <option key={r.id} value={r.id}>
                                          {label} ({typeTag})
                                        </option>
                                      );
                                    })}
                                  </select>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Selected Route Badge summary */}
                          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Truck className="h-4 w-4 text-primary flex-shrink-0" />
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-dark)' }}>
                                {selectedRouteName}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '0.2rem 0.6rem', borderRadius: '9999px', textTransform: 'uppercase' }}>
                              {selectedRouteType} Corridor
                            </span>
                          </div>
                        </div>

                        {/* Live Vehicles for the Selected Route from TransportMaster */}
                        <div>
                          <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Users className="h-4 w-4 text-primary" /> 2. Select Vehicle &amp; Fleet Type
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                              Real-time transport fleet rates directly from Moulavi ERP database. Pricing is charged per vehicle for your entire group (not per person).
                            </p>
                          </div>

                          {(() => {
                            const availableForRoute = erpTransports.filter((t: any) => t.routeId === selectedRouteId);
                            const displayList = availableForRoute.length > 0 ? availableForRoute : erpTransports.slice(0, 6);

                            if (displayList.length === 0) {
                              return (
                                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                  <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
                                  <p style={{ margin: 0 }}>No vehicle rates configured for this corridor. Standard fallback rates apply.</p>
                                </div>
                              );
                            }

                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                {displayList.map((tm: any) => {
                                  const isSelected = selectedTransportMasterId === tm.id;
                                  const vehicleName = tm.vehicleType?.vehicleName || 'Standard Vehicle';
                                  const paxCount = tm.vehicleType?.paxCount || 4;
                                  const priceSAR = Number(tm.price) || 0;

                                  return (
                                    <div
                                      key={tm.id}
                                      onClick={() => {
                                        setSelectedTransportMasterId(tm.id);
                                        setSelectedVehicleType(vehicleName);
                                        if (tm.routeId && tm.routeId !== selectedRouteId) {
                                          setSelectedRouteId(tm.routeId);
                                        }
                                      }}
                                      style={{
                                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                        borderRadius: '16px',
                                        padding: '1.15rem',
                                        backgroundColor: isSelected ? '#fff9f9' : '#ffffff',
                                        boxShadow: isSelected ? '0 6px 20px rgba(220, 5, 15, 0.12)' : '0 2px 6px rgba(0,0,0,0.02)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        position: 'relative'
                                      }}
                                    >
                                      {isSelected && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '-9px',
                                          right: '12px',
                                          backgroundColor: 'var(--primary)',
                                          color: 'white',
                                          fontSize: '0.62rem',
                                          fontWeight: 800,
                                          padding: '0.15rem 0.5rem',
                                          borderRadius: '9999px',
                                          textTransform: 'uppercase'
                                        }}>
                                          Selected
                                        </div>
                                      )}

                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                          <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)' }}>
                                            {vehicleName}
                                          </h5>
                                          <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            backgroundColor: 'rgba(0,0,0,0.05)',
                                            color: 'var(--text-dark)',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                          }}>
                                            <Users className="h-3 w-3" /> Up to {paxCount} Pax
                                          </span>
                                        </div>

                                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.85rem 0', lineHeight: 1.35 }}>
                                          Chauffeur-driven private VIP transfer with air-conditioned comfort and luggage space.
                                        </p>
                                      </div>

                                      <div style={{
                                        borderTop: '1px solid var(--border-color)',
                                        paddingTop: '0.75rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'baseline'
                                      }}>
                                        <div>
                                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Rate Per Vehicle (Entire Group)</span>
                                          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: isSelected ? 'var(--primary)' : 'var(--text-dark)' }}>
                                            {formatPrice(priceSAR)}
                                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}> / vehicle</span>
                                          </span>
                                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '1px' }}>
                                            Fixed price per vehicle (up to {paxCount} pax • Not charged per person)
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
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
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>{m.from} → {m.to}</span>
                                    <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>• {getMovementDate(m.id)}</span>
                                  </span>
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

                        {/* Dynamic Passenger Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {passengers.map((p, idx) => (
                            <div key={idx} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-light)' }}>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <UserCheck className="h-4 w-4" /> Passenger #{idx + 1} Passport Details
                              </h4>
                              <div className="search-grid grid-3-col" style={{ gap: '1rem' }}>
                                <div className="search-field">
                                  <label>Full Name (Matching Passport)</label>
                                  <input 
                                    type="text" 
                                    required
                                    className="search-input" 
                                    placeholder="e.g. John Doe"
                                    value={p.fullName}
                                    onChange={(e) => {
                                      const copy = [...passengers];
                                      copy[idx] = { ...copy[idx], fullName: e.target.value };
                                      setPassengers(copy);
                                      if (idx === 0) {
                                        setTraveler(prev => ({ ...prev, fullName: e.target.value }));
                                      }
                                    }}
                                  />
                                </div>
                                <div className="search-field">
                                  <label>Passport Number</label>
                                  <input 
                                    type="text" 
                                    required
                                    className="search-input" 
                                    placeholder="EP9832104"
                                    value={p.passportNumber}
                                    onChange={(e) => {
                                      const copy = [...passengers];
                                      copy[idx] = { ...copy[idx], passportNumber: e.target.value };
                                      setPassengers(copy);
                                      if (idx === 0) {
                                        setTraveler(prev => ({ ...prev, passportNumber: e.target.value }));
                                      }
                                    }}
                                  />
                                </div>
                                <div className="search-field">
                                  <label>Nationality</label>
                                  <input 
                                    type="text" 
                                    required
                                    className="search-input" 
                                    placeholder="e.g. IN or US"
                                    value={p.nationality}
                                    onChange={(e) => {
                                      const copy = [...passengers];
                                      copy[idx] = { ...copy[idx], nationality: e.target.value };
                                      setPassengers(copy);
                                      if (idx === 0) {
                                        setTraveler(prev => ({ ...prev, nationality: e.target.value }));
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Primary Booking Contact */}
                        <div style={{ padding: '1.5rem', border: '1px solid var(--gold-border)', borderRadius: '12px', backgroundColor: 'var(--primary-light)' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail className="h-4 w-4 text-primary" /> Primary Booking Contact Information
                          </h4>
                          <div className="search-grid grid-2-col" style={{ gap: '1.5rem' }}>
                            <div className="search-field">
                              <label>Primary Mobile Number (WhatsApp Alerts)</label>
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
                              <label>Primary Email Address</label>
                              <input 
                                type="email" 
                                required
                                className="search-input" 
                                placeholder="contact@example.com"
                                value={traveler.email}
                                onChange={(e) => setTraveler({ ...traveler, email: e.target.value })}
                              />
                            </div>
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

                        {/* Payment Method Selection: Cashfree PG vs Bank Transfer */}
                        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lock className="h-4 w-4 text-primary" /> Select Payment Method
                          </h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                            Choose instant online checkout via Cashfree Gateway or direct bank wire transfer to Moulavi Travels.
                          </p>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            {/* Option 1: Cashfree Online Payment */}
                            <div 
                              onClick={() => setPaymentMethod('cashfree')}
                              style={{
                                border: paymentMethod === 'cashfree' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                backgroundColor: paymentMethod === 'cashfree' ? 'var(--primary-light)' : '#ffffff',
                                borderRadius: '12px',
                                padding: '1.25rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-dark)' }}>Instant Online Payment</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '9999px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>CASHFREE PG</span>
                              </div>
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                                Pay securely via UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, or NetBanking. Instant automated confirmation.
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>
                                <ShieldCheck className="h-4 w-4" /> 256-Bit Encrypted & PCI-DSS Certified
                              </div>
                            </div>

                            {/* Option 2: Bank Transfer / UPI */}
                            <div 
                              onClick={() => setPaymentMethod('bank_transfer')}
                              style={{
                                border: paymentMethod === 'bank_transfer' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                backgroundColor: paymentMethod === 'bank_transfer' ? 'var(--primary-light)' : '#ffffff',
                                borderRadius: '12px',
                                padding: '1.25rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-dark)' }}>Direct Bank Transfer / UPI</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '9999px', backgroundColor: '#fef3c7', color: '#92400e' }}>FEDERAL BANK</span>
                              </div>
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                                Transfer via IMPS / NEFT / RTGS to our official corporate Federal Bank account or Moulavi UPI handle.
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--secondary)' }}>
                                <Building className="h-4 w-4" /> Official Moulavi Travels & Logistics A/C
                              </div>
                            </div>
                          </div>

                          {/* Bank details panel when bank transfer is chosen */}
                          {paymentMethod === 'bank_transfer' && (
                            <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '0.75rem' }}>
                              <h5 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.75rem' }}>
                                Official Moulavi Bank Account Details:
                              </h5>
                              <div className="search-grid grid-2-col" style={{ gap: '0.75rem', fontSize: '0.82rem' }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Bank Name</span>
                                  <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{bankDetails?.bankName || 'Federal Bank'}</span>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Account Number</span>
                                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', fontSize: '0.95rem' }}>{bankDetails?.accountNumber || '14140200001234'}</span>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>IFSC Code</span>
                                  <span style={{ fontWeight: 800, color: 'var(--text-dark)', fontFamily: 'monospace' }}>{bankDetails?.ifscCode || 'FDRL0001414'}</span>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Account Holder</span>
                                  <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{bankDetails?.accountHolder || 'Moulavi Travels & Logistics'}</span>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Official UPI ID</span>
                                  <span style={{ fontWeight: 800, color: '#15803d', fontFamily: 'monospace' }}>{bankDetails?.upiId || 'moulavi1414@fbl'}</span>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Branch</span>
                                  <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{bankDetails?.branch || 'Calicut Main Branch'}</span>
                                </div>
                              </div>

                              <div style={{ marginTop: '1rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                                  Transaction Reference / UTR Number (Optional, or send via WhatsApp):
                                </label>
                                <input 
                                  type="text" 
                                  className="search-input" 
                                  placeholder="e.g. UTR / IMPS Ref 1234567890" 
                                  value={paymentRefNumber}
                                  onChange={(e) => setPaymentRefNumber(e.target.value)}
                                  style={{ maxWidth: '350px' }}
                                />
                              </div>
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
                              } else if (configuredPackage || isQuickEVisa) {
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
                            disabled={!otpVerified || !isPassengersValid || isProcessingCheckout || isCashfreeLoading}
                            style={{ backgroundColor: 'var(--primary)' }}
                          >
                            {isProcessingCheckout || isCashfreeLoading ? (
                              <>
                                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px' }}>
                                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" strokeDasharray="30 30" />
                                </svg>
                                {paymentMethod === 'cashfree' ? 'Launching Gateway...' : 'Confirming...'}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" /> 
                                {paymentMethod === 'cashfree' ? 'Pay Online' : 'Confirm Booking'} • {formatPrice(quotePrices.total)}
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
                        {configuredPackage ? (
                          <>
                            <div className="summary-row">
                              <span className="summary-label">Package Type</span>
                              <span className="summary-value" style={{ color: 'var(--primary)', fontWeight: 800 }}>Family Umrah ({configuredPackage.tier.toUpperCase()} VIP)</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Pilgrims & Bedding</span>
                              <span className="summary-value" style={{ fontWeight: 700 }}>
                                {configuredPackage.persons} Pax • {configuredPackage.rooms} Room ({configuredPackage.roomType})
                              </span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Makkah Stay</span>
                              <span className="summary-value">{configuredPackage.makkahNights} Nights ({selectedMakkahHotelName})</span>
                            </div>
                            {configuredPackage.madinahNights > 0 && (
                              <div className="summary-row">
                                <span className="summary-label">Madinah Stay</span>
                                <span className="summary-value">{configuredPackage.madinahNights} Nights ({selectedMadinahHotelName})</span>
                              </div>
                            )}
                            <div className="summary-row">
                              <span className="summary-label">Ground Transport</span>
                              <span className="summary-value">{selectedRouteName}</span>
                            </div>
                            <div className="summary-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem' }}>
                              <span className="summary-label">Flight Route & Schedule</span>
                              <div className="summary-value" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--secondary)', boxSizing: 'border-box' }}>
                                {flightBookingMode === 'own' && skipOwnFlightDetails ? (
                                  <span>Land-only (Flights self-arranged)</span>
                                ) : (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem' }}>
                                      <span>Onward: <b>{flightBookingMode === 'own' ? flightInfo.onwardFlightNumber : (selectedArrivalFlight?.flightNumber || 'SV-300')}</b> ({getIataCode(flightInfo.onwardFromPortId)} → {getIataCode(flightInfo.onwardToPortId)})</span>
                                      <span style={{ color: 'var(--text-muted)' }}>{flightInfo.onwardDate}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem' }}>
                                      <span>Return: <b>{flightBookingMode === 'own' ? flightInfo.returnFlightNumber : (selectedDepartureFlight?.flightNumber || 'SV-301')}</b> ({getIataCode(flightInfo.returnFromPortId)} → {getIataCode(flightInfo.returnToPortId)})</span>
                                      <span style={{ color: 'var(--text-muted)' }}>{flightInfo.returnDate}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </>
                        ) : isQuickEVisa ? (
                          <>
                            <div className="summary-row">
                              <span className="summary-label">Booking Flow</span>
                              <span className="summary-value" style={{ color: 'var(--secondary)', fontWeight: 800 }}>Quick e-Visa</span>
                            </div>
                            
                            {/* Visa Cost Breakdown per passenger */}
                            <div className="summary-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                              <span className="summary-label">e-Visa Registration</span>
                              <span className="summary-value" style={{ fontWeight: 700 }}>{dates.travelers} Pilgrim{dates.travelers > 1 ? 's' : ''}</span>
                            </div>
                            <div className="summary-row">
                              <span className="summary-label">Visa Fee per passenger</span>
                              <span className="summary-value">{dates.accommodationType === 'iqama' ? 'Waived (0 SAR)' : formatPrice(450)}</span>
                            </div>

                            {/* Flight Details (only if they choose to book with us or provided flight details) */}
                            {((flightBookingMode === 'book') || (flightBookingMode === 'own' && !skipOwnFlightDetails)) && (
                              <div className="summary-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                                <span className="summary-label">Flight Route & Schedule</span>
                                <div className="summary-value" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--secondary)', boxSizing: 'border-box' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem' }}>
                                    <span>Onward: <b>{flightBookingMode === 'own' ? flightInfo.onwardFlightNumber : (selectedArrivalFlight?.flightNumber || 'SV-300')}</b> ({getIataCode(flightInfo.onwardFromPortId)} → {getIataCode(flightInfo.onwardToPortId)})</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{flightInfo.onwardDate}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem' }}>
                                    <span>Return: <b>{flightBookingMode === 'own' ? flightInfo.returnFlightNumber : (selectedDepartureFlight?.flightNumber || 'SV-301')}</b> ({getIataCode(flightInfo.returnFromPortId)} → {getIataCode(flightInfo.returnToPortId)})</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{flightInfo.returnDate}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
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
                                <div className="summary-row">
                                  <span className="summary-label">Madinah Hotel</span>
                                  <span className="summary-value">
                                    {selectedMadinahHotelName}
                                    {selectedMadinahHotelId !== selectedPackage.madinahHotelId && ' (Customized)'}
                                  </span>
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
                                  <span className="summary-value">
                                    {selectedHotelCategory === 'luxury' ? 'Luxury Category (4/5★)' : selectedHotelCategory === 'comfort' ? 'Comfort Category (2–4★)' : 'Economy Category (1–3★)'}
                                  </span>
                                </div>
                                {dates.madinahNights > 0 && (
                                  <div className="summary-row">
                                    <span className="summary-label">Madinah Accommodation</span>
                                    <span className="summary-value">
                                      {selectedHotelCategory === 'luxury' ? 'Luxury Category (4/5★)' : selectedHotelCategory === 'comfort' ? 'Comfort Category (2–4★)' : 'Economy Category (1–3★)'}
                                    </span>
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
                          </>
                        )}
                        
                        {/* Cost Breakdown Details */}
                        <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.5rem', display: 'block' }}>Cost Breakdown</span>
                          
                          {configuredPackage ? (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Land Package (Visas, Stays, Route)</span>
                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(configuredPackage.totalSAR)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Included Inclusions</span>
                                <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>Medical Insurance + Ziyarat Tour</span>
                              </div>
                            </>
                          ) : (
                            <>
                              {!isQuickEVisa && dates.makkahNights > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Makkah Stay ({dates.makkahNights}N)</span>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{formatPrice(Math.round(makkahTotalCost / (dates.travelers || 1)))} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ pax</span></span>
                                    {dates.travelers > 1 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Total: {formatPrice(makkahTotalCost)}</span>}
                                  </div>
                                </div>
                              )}
                              {!isQuickEVisa && dates.madinahNights > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Madinah Stay ({dates.madinahNights}N)</span>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{formatPrice(Math.round(madinahTotalCost / (dates.travelers || 1)))} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ pax</span></span>
                                    {dates.travelers > 1 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Total: {formatPrice(madinahTotalCost)}</span>}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Flights */}
                          {flightBookingMode === 'book' && (
                            <>
                              {onwardFlightTotalCost > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Onward Flight</span>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{formatPrice(onwardFlightUnitPrice)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ pax</span></span>
                                    {dates.travelers > 1 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Total: {formatPrice(onwardFlightTotalCost)}</span>}
                                  </div>
                                </div>
                              )}
                              {returnFlightTotalCost > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Return Flight</span>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{formatPrice(returnFlightUnitPrice)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ pax</span></span>
                                    {dates.travelers > 1 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Total: {formatPrice(returnFlightTotalCost)}</span>}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          {flightBookingMode === 'own' && !skipOwnFlightDetails && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Self-booked Flights</span>
                              <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>Excluded</span>
                            </div>
                          )}

                          {/* Transport */}
                          {!isQuickEVisa && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Private Ground Transfer ({selectedVehicleType})</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{formatPrice(routePrice)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ vehicle</span></span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>
                                  Per vehicle (flat rate for entire party)
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Visa */}
                          {dates.accommodationType !== 'iqama' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Visa Registration Fee</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{formatPrice(450)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ pax</span></span>
                                {dates.travelers > 1 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Total: {formatPrice(visaPriceTotal)}</span>}
                              </div>
                            </div>
                          )}
                          {dates.accommodationType === 'iqama' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Iqama Sponsor Visa</span>
                              <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>Waived</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="summary-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                          <span className="summary-label">eVisa Registration (Pax)</span>
                          <span className="summary-value">{dates.travelers} Pilgrims</span>
                        </div>
                      </div>

                      <div className="summary-total">
                        <span className="total-label">Subtotal</span>
                        <span className="summary-value" style={{ fontWeight: 700 }}>{formatPrice(quotePrices.subtotal)}</span>
                      </div>

                      <div className="summary-total" style={{ borderTop: 'none', paddingTop: 0 }}>
                        <span className="total-label" style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Processing Fee (1.5%)</span>
                        <span className="summary-value" style={{ fontWeight: 600 }}>{formatPrice(quotePrices.vat)}</span>
                      </div>

                      {/* Prominent Per-Person Highlight & Total Subtext */}
                      <div className="summary-total" style={{ borderTop: '2px solid var(--primary)', marginTop: '0.75rem', paddingTop: '0.75rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'baseline' }}>
                          <span className="total-label" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)' }}>Rate Per Person</span>
                          <span className="total-value" style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--primary)' }}>
                            {formatPrice(Math.round(quotePrices.total / (dates.travelers || 1)))}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span>Grand Total ({dates.travelers} Pax incl. Fee):</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{formatPrice(quotePrices.total)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--primary)' }}>
                          <ShieldCheck className="h-4 w-4" />
                          <span>Direct API e-Visa Gate</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--primary)' }}>
                          <FileCheck className="h-4 w-4" />
                          <span>Real-time Room BRN Reservation</span>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              </div>
        </main>
      )}

      {/* Atlys Clean Minimalist Footer */}
      {activeTab !== 'calculator' && (
        <footer>
          <div className="footer-container">
            <div className="footer-column">
              <div style={{ marginBottom: '1.25rem' }}>
                <img 
                  src={moulaviLogo} 
                  alt="Moulavi Travels" 
                  className="footer-logo-img"
                />
              </div>
              <p style={{ marginBottom: '1rem' }}>
                Licensed and verified direct consumer pilgrimage portal by Moulavi Travels. Official electronic visa processing and contracted hotel packages.
              </p>
              <span className="footer-badge">KSA License #9823-U • Saudi Vision 2030</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>HQ: King Abdulaziz Road, Makkah, Saudi Arabia</p>
            </div>
            <div className="footer-column">
              <h4>Quick Links</h4>
              <ul className="footer-links">
                <li><button onClick={() => resetToHome()}>Home Portal</button></li>
                <li><button onClick={() => { setIsQuickEVisa(false); navigateToBuilder(1); }}>Custom Package Builder</button></li>
                <li><button onClick={() => { setActiveTab('calculator'); setBookingFinished(false); if (typeof window !== 'undefined' && window.history.pushState) { window.history.pushState({}, '', '/b2c/calculator'); } }}>Family Calculator App</button></li>
                <li><button onClick={() => { setIsQuickEVisa(true); navigateToBuilder(1); }}>Quick 24hr eVisa</button></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Mumbai Office</h4>
              <p>Ashoka Shopping Centre, Lokmanya Tilak Rd, near G T Hospital, Fort, Mumbai, Maharashtra 400001, India</p>
              <p style={{ marginTop: '0.5rem', fontWeight: 700, color: 'var(--text-dark)' }}>📞 +91 80027 70277</p>
            </div>
            <div className="footer-column">
              <h4>Kerala Office</h4>
              <p>Railway Station Road, Thayalangadi, Kasaragod, Kerala 671121, India</p>
              <p style={{ marginTop: '0.5rem', fontWeight: 700, color: 'var(--text-dark)' }}>📞 +91 4994 230 216</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Nusync Direct / Moulavi Travels. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><ShieldCheck className="h-4 w-4 text-emerald-600" /> Secure Checkout</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Lock className="h-4 w-4 text-emerald-600" /> 256-bit SSL Encrypted</span>
            </div>
          </div>
        </footer>
      )}


      {/* Floating WhatsApp Chat Widget */}
      <a 
        href="https://wa.me/919004481414"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float"
        title="Chat on WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="whatsapp-icon">
          <path fill="currentColor" d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.233-1.371a9.936 9.936 0 0 0 4.777 1.218h.005c5.505 0 9.989-4.478 9.99-9.985A9.993 9.993 0 0 0 12.012 2Zm4.97 14.155c-.273.768-1.576 1.395-2.176 1.48-.545.077-1.258.14-3.633-.846-3.037-1.262-4.993-4.354-5.143-4.557-.15-.202-1.212-1.614-1.212-3.08 0-1.467.769-2.189 1.042-2.483.272-.295.6-.368.8-.368.2 0 .4 0 .573.008.18.008.423-.075.66.495.244.59.833 2.03.905 2.18.073.15.122.325.02.525-.098.2-.147.3-.295.474-.148.175-.31.39-.443.524-.147.15-.3.315-.13.606.17.292.756 1.248 1.623 2.022.868.773 1.597 1.013 1.897 1.163.3.15.473.125.648-.075.176-.2.75-.873.948-1.173.2-.3.398-.25.674-.15.275.1.1.25 1.748.924.3.15.5.225.575.35.075.125.075.722-.198 1.49Z" />
        </svg>
        <span className="whatsapp-text">Chat with Us</span>
      </a>
    </>
  );
}
