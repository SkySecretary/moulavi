import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle, 
  Smartphone, 
  BookOpen,
  Train,
  FileCheck,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

interface PortalOrGuideItem {
  id: string;
  type: 'portal' | 'guide';
  name: string;
  authority: string;
  categoryTag: string;
  statusBadge: string;
  badgeColor: string;
  iconType: 'nusuk' | 'tawakkalna' | 'mofa' | 'train' | 'guide' | 'pack';
  url?: string;
  description: string;
  keyHighlights: string[];
  instructionsHeading: string;
  instructionsSteps: string[];
}

const ITEMS: PortalOrGuideItem[] = [
  {
    id: 'nusuk',
    type: 'portal',
    name: 'Nusuk (Official Umrah & Rawdah Platform)',
    authority: 'Ministry of Hajj & Umrah (MoHU)',
    categoryTag: 'Government App • Mandatory',
    statusBadge: 'Mandatory for All International Pilgrims',
    badgeColor: '#059669',
    iconType: 'nusuk',
    url: 'https://www.nusuk.sa',
    description: 'The unified official digital gateway established by the Saudi Ministry of Hajj & Umrah. Every pilgrim arriving in the Kingdom must register on Nusuk to reserve their mandatory Rawdah Ash-Sharifah prayer permit and official Umrah time-slots.',
    keyHighlights: [
      'Official Rawdah Ash-Sharifah appointment booking for Men & Women',
      'Instant Umrah ritual entry slot clearance',
      'Authorized package verification & 24/7 Pilgrim Emergency SOS',
      'Available on iOS, Android, and Web in 7 languages'
    ],
    instructionsHeading: 'How to Register & Book Rawdah on Nusuk:',
    instructionsSteps: [
      'Download the official "Nusuk" app from the Apple App Store or Google Play.',
      'Select "Visitor / International Pilgrim", then enter your Visa Number, Passport Number, and Date of Birth.',
      'Verify your registered email address with the instant 4-digit OTP code.',
      'Tap "Pray in the Noble Rawdah" to view the live availability calendar and confirm your prayer window.'
    ]
  },
  {
    id: 'tawakkalna',
    type: 'portal',
    name: 'Tawakkalna Services (Visitor Identity App)',
    authority: 'Saudi Data & AI Authority (SDAIA)',
    categoryTag: 'Government App • Essential',
    statusBadge: 'Official Digital ID & Health Pass',
    badgeColor: '#0284C7',
    iconType: 'tawakkalna',
    url: 'https://tawakkalna.sdaia.gov.sa',
    description: 'Saudi Arabia’s national digital companion app. International pilgrims use Tawakkalna to display their official digital visa ID, access travel health insurance documentation, and clear entry credentials at airports and train stations.',
    keyHighlights: [
      'Official Digital Pilgrim ID card with verified biometric status',
      'Council of Health Insurance (CHI) medical coverage policy',
      'Electronic boarding passes for Haramain bullet train & airport terminals',
      'Multilingual 24/7 tourist helpline & immediate emergency support'
    ],
    instructionsHeading: 'How to Activate Tawakkalna Services:',
    instructionsSteps: [
      'Download "Tawakkalna Services" onto your smartphone.',
      'Choose the "Visitor / Gulf / Border Number" option on the home screen.',
      'Enter your Passport Number, Nationality, and Saudi Border Number (stamped on your passport at airport immigration or printed on your e-Visa).',
      'Set an 8-character PIN code for quick biometric unlock inside the Holy Cities.'
    ]
  },
  {
    id: 'mofa',
    type: 'portal',
    name: 'KSA MOFA Electronic Visa Verification',
    authority: 'Ministry of Foreign Affairs (MOFA)',
    categoryTag: 'Official Visa Verification',
    statusBadge: '24-Hour Instant Verification',
    badgeColor: '#B88933',
    iconType: 'mofa',
    url: 'https://visa.mofa.gov.sa',
    description: 'The official visa verification gateway of the Kingdom of Saudi Arabia. Easily verify your 24-hour electronic visa status, download your official signed PDF certificate, and review multiple-entry 90-day permissions.',
    keyHighlights: [
      'Real-time visa issuance & validity confirmation',
      'Cryptographically signed official QR clearance code',
      '90-day stay duration calculator & entry port rules',
      'Multi-lingual visa enquiry by Application / Passport Number'
    ],
    instructionsHeading: 'How to Check Your Official Visa Status:',
    instructionsSteps: [
      'Visit the official KSA MOFA visa enquiry portal (visa.mofa.gov.sa).',
      'Select "Inquiry by Application / Visa Number".',
      'Enter your Visa Number and Passport Number.',
      'Download and print the official signed PDF copy with the biometric QR stamp.'
    ]
  },
  {
    id: 'hhr',
    type: 'portal',
    name: 'Haramain High-Speed Railway Portal',
    authority: 'Saudi Arabia Railways (SAR)',
    categoryTag: 'Transit Booking Portal',
    statusBadge: '300 km/h Bullet Train Booking',
    badgeColor: '#7C3AED',
    iconType: 'train',
    url: 'https://sar.hhr.sa',
    description: 'The official ticket booking platform for the high-speed electrified railway connecting Makkah Al-Mukarramah, Jeddah Airport (Terminal 1), King Abdullah Economic City, and Madinah Al-Munawwarah in 2 hours flat.',
    keyHighlights: [
      'Live train departure schedules every 30 to 45 minutes',
      'First-Class Executive & Economy coach seat selector',
      'Generous luggage allowances (Up to 32 kg + cabin bag per passenger)',
      'Direct airport train station connection inside JED Terminal 1'
    ],
    instructionsHeading: 'How to Book Haramain Train Tickets:',
    instructionsSteps: [
      'Visit sar.hhr.sa or download the official "HHR Train" mobile app.',
      'Select origin (e.g. Makkah Haramain) and destination (Madinah).',
      'Choose departure date, time, and class (Executive Business or Economy).',
      'Enter passenger passport details and complete instant seat confirmation.'
    ]
  },
  {
    id: 'umrah-guide',
    type: 'guide',
    name: 'Core Rites of Umrah: Step-by-Step Guide',
    authority: 'Moulavi Senior Pilgrimage Scholars',
    categoryTag: 'Pilgrim Spiritual Guide',
    statusBadge: 'Sunnah Pilgrimage Walkthrough',
    badgeColor: '#059669',
    iconType: 'guide',
    description: 'A complete step-by-step Sunnah guide to performing your Umrah pilgrimage with absolute confidence, covering Ihram Niyyah, Tawaf etiquette, Sa’i, and Halq / Taqseer.',
    keyHighlights: [
      '1. Ihram: Cleanse, wear unstitched towels (men) or modest dress (women), and declare Niyyah before passing Miqat.',
      '2. Tawaf: Seven counter-clockwise circuits of the Holy Kaaba starting at the Hajar Al-Aswad line.',
      '3. Maqam Ibrahim: Offer two Rakats behind the Station of Abraham and drink blessed Zamzam water.',
      '4. Sa’i: Seven brisk laps between Safa and Marwah (approx 3.15 km) commemorating Sayyidatuna Hajar.',
      '5. Halq / Taqseer: Shave or evenly trim the hair to complete your Umrah with full spiritual peace.'
    ],
    instructionsHeading: 'Essential Duas & Adhkar During Rites:',
    instructionsSteps: [
      'Recite the Talbiyah frequently after entering Ihram: "Labbayk Allahumma Labbayk, Labbayk la shareeka laka Labbayk..."',
      'Between the Yemeni Corner (Rukn Al-Yamani) and Hajar Al-Aswad, recite: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina \'adhaban-nar."',
      'Upon drinking Zamzam water, supplicate for beneficial knowledge, abundant provision, and cure from illness.',
      'At the hills of Safa and Marwah, face the Kaaba, raise your hands, and recite Takbeer three times with sincere personal Duas.'
    ]
  },
  {
    id: 'packing-guide',
    type: 'guide',
    name: 'Essential Packing Checklist for Holy Cities',
    authority: 'Moulavi Travel Operations Team',
    categoryTag: 'Practical Travel Checklist',
    statusBadge: 'Luggage & Health Kit',
    badgeColor: '#D97706',
    iconType: 'pack',
    description: 'An authoritative checklist of required clothing, footwear, toiletries, and electronic accessories curated for seamless comfort across Makkah and Madinah.',
    keyHighlights: [
      'Clothing: 2 sets of certified 100% cotton unstitched Ihram towels (for men) & security waist belts.',
      'Footwear: Slip-resistant walking sandals that leave ankle bones exposed for Ihram; padded socks for marble floors.',
      'Health Care: Unscented soap, unscented sunscreen, unscented lip balm, petroleum jelly (for chafing prevention).',
      'Electronics: UK/KSA 3-pin universal power adapter, 20,000mAh power bank for long mosque stays.'
    ],
    instructionsHeading: 'Important Packing Pro-Tips:',
    instructionsSteps: [
      'Keep one set of Ihram towels, slippers, and essential medicines in your cabin handbag in case of checked luggage delay.',
      'Ensure all toiletries used in Ihram state are strictly unscented and fragrance-free.',
      'Carry a lightweight drawstring backpack for shoes when entering the Holy Mosques.',
      'Keep printed photocopies of your passport and electronic visa in each luggage bag.'
    ]
  }
];

export const OfficialPortalsGuide: React.FC = () => {
  const [activeItemId, setActiveItemId] = useState<string>(ITEMS[0].id);
  const activeItem = ITEMS.find(item => item.id === activeItemId) || ITEMS[0];

  const renderIcon = (type: string) => {
    switch (type) {
      case 'nusuk':
        return <Smartphone className="h-5 w-5 text-emerald-600" />;
      case 'tawakkalna':
        return <ShieldCheck className="h-5 w-5 text-blue-600" />;
      case 'mofa':
        return <FileCheck className="h-5 w-5 text-amber-600" />;
      case 'train':
        return <Train className="h-5 w-5 text-purple-600" />;
      case 'guide':
        return <BookOpen className="h-5 w-5 text-emerald-600" />;
      case 'pack':
        return <Info className="h-5 w-5 text-amber-600" />;
      default:
        return <Sparkles className="h-5 w-5 text-amber-600" />;
    }
  };

  return (
    <section className="official-portals-section">
      <div className="official-portals-container">
        
        {/* Section Header */}
        <div className="portals-header">
          <div className="portals-badge">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Official Saudi Ecosystem &amp; Pilgrim Guides</span>
          </div>

          <h2 className="portals-title">
            Government Portals &amp; <span className="gold-shimmer-text">Pilgrim Guidelines</span>
          </h2>

          <p className="portals-subtitle">
            Direct verified links and step-by-step walkthroughs for Nusuk Rawdah permits, Tawakkalna identity, MOFA visa verification, and Haramain rail.
          </p>
        </div>

        {/* 50 / 50 Split Layout: Left List + Right Half-Screen Active Card */}
        <div className="portals-split-layout">
          
          {/* Left Column (50%): Interactive List of Titles & Badges */}
          <div className="portals-master-list">
            <span className="master-list-header">
              Select Portal or Guide to View Official Instructions:
            </span>

            <div className="master-list-items">
              {ITEMS.map((item, idx) => {
                const isActive = item.id === activeItem.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`master-list-card ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveItemId(item.id)}
                  >
                    <div className="master-card-left">
                      <span className="master-item-number">0{idx + 1}</span>
                      <div className="master-item-icon-box">
                        {renderIcon(item.iconType)}
                      </div>
                    </div>

                    <div className="master-card-text">
                      <div className="master-card-meta">
                        <span className="master-authority-tag">{item.authority}</span>
                        <span 
                          className="master-status-tag"
                          style={{ color: item.badgeColor, backgroundColor: `${item.badgeColor}15` }}
                        >
                          {item.statusBadge}
                        </span>
                      </div>
                      <h4 className="master-item-title">{item.name}</h4>
                    </div>

                    <ChevronRight className={`master-arrow-icon ${isActive ? 'active' : ''}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column (50%): Single Active Card (Takes Half Screen) */}
          <div className="portals-detail-col">
            <div className="portal-spotlight-card" key={activeItem.id}>
              
              {/* Card Header */}
              <div className="spotlight-card-header">
                <div className="spotlight-authority-strip">
                  <span className="spotlight-authority-name">{activeItem.authority}</span>
                  <span 
                    className="spotlight-badge-pill"
                    style={{ color: activeItem.badgeColor, backgroundColor: `${activeItem.badgeColor}15`, border: `1px solid ${activeItem.badgeColor}35` }}
                  >
                    {activeItem.statusBadge}
                  </span>
                </div>

                <h3 className="spotlight-portal-title">{activeItem.name}</h3>
                <p className="spotlight-portal-desc">{activeItem.description}</p>
              </div>

              {/* Key Platform Highlights */}
              <div className="spotlight-highlights-block">
                <h5 className="spotlight-block-title">Key Highlights &amp; Inclusions:</h5>
                <ul className="spotlight-highlights-list">
                  {activeItem.keyHighlights.map((feat, idx) => (
                    <li key={idx}>
                      <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Numbered Step-by-Step Instructions */}
              <div className="spotlight-instructions-block">
                <h5 className="spotlight-block-title">{activeItem.instructionsHeading}</h5>
                <ol className="spotlight-steps-list">
                  {activeItem.instructionsSteps.map((step, idx) => (
                    <li key={idx}>
                      <span className="step-circle">{idx + 1}</span>
                      <span className="step-text-content">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Direct External Action CTA Button */}
              {activeItem.url ? (
                <div className="spotlight-action-row">
                  <a 
                    href={activeItem.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="spotlight-portal-btn"
                  >
                    <span>Open Official Platform ({activeItem.url.replace('https://', '')})</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <div className="spotlight-action-row">
                  <button 
                    type="button" 
                    className="spotlight-portal-btn"
                    onClick={() => {
                      const el = document.getElementById('ready-packages');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <span>Explore Packages With Scholar Guidance</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
