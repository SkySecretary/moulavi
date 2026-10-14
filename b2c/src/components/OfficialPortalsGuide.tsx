import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle, 
  Smartphone, 
  ChevronDown, 
  ChevronUp, 
  BookOpen
} from 'lucide-react';

interface PortalCard {
  id: string;
  name: string;
  authority: string;
  tag: string;
  badgeColor: string;
  url: string;
  description: string;
  features: string[];
  howToRegister: string[];
}

const OFFICIAL_PORTALS: PortalCard[] = [
  {
    id: 'nusuk',
    name: 'Nusuk (Official Umrah & Rawdah Platform)',
    authority: 'Ministry of Hajj & Umrah (MoHU)',
    tag: 'Mandatory for All Pilgrims',
    badgeColor: '#10B981',
    url: 'https://www.nusuk.sa',
    description: 'The unified official digital gateway by the Ministry of Hajj & Umrah. Every international pilgrim must use Nusuk to reserve their mandatory Rawdah Ash-Sharifah prayer permit and Umrah time-slots.',
    features: [
      'Official Rawdah Ash-Sharifah appointment booking',
      'Umrah ritual entry slot clearance',
      'Authorized package verification & emergency services',
      'Available on iOS, Android, and Web in 7 languages'
    ],
    howToRegister: [
      'Download the official "Nusuk" app from the App Store or Google Play.',
      'Open the app, select "Visitor / International Pilgrim", and enter your Visa Number, Passport Number, and Date of Birth.',
      'Verify your registered email address with the 4-digit OTP.',
      'Tap "Pray in the Noble Rawdah" to view the live calendar and select your preferred prayer time window.'
    ]
  },
  {
    id: 'tawakkalna',
    name: 'Tawakkalna Services (Visitor Identity App)',
    authority: 'Saudi Data & AI Authority (SDAIA)',
    tag: 'Official Digital ID & Health Pass',
    badgeColor: '#0284C7',
    url: 'https://tawakkalna.sdaia.gov.sa',
    description: 'Saudi Arabia’s central national digital companion. International visitors use Tawakkalna to display verified digital visa ID, access travel health insurance documentation, and show entry credentials at transport hubs.',
    features: [
      'Digital Pilgrim Card with verified biometric status',
      'Official Council of Health Insurance policy card',
      'Digital gate passes for Haramain rail and airport gates',
      'Multilingual 24/7 tourist helpline & emergency SOS'
    ],
    howToRegister: [
      'Download "Tawakkalna Services" app onto your smartphone.',
      'Choose "Visitor / Gulf / Border Number" option on the login screen.',
      'Enter your Passport Number, Nationality, and Saudi Border Number (found on your stamped passport or eVisa).',
      'Set your secure 8-character passcode for instant biometric touch unlock.'
    ]
  },
  {
    id: 'mofa',
    name: 'KSA MOFA Electronic Visa Portal',
    authority: 'Ministry of Foreign Affairs (MOFA)',
    tag: 'Instant Visa Verification',
    badgeColor: '#D4AF37',
    url: 'https://visa.mofa.gov.sa',
    description: 'The official visa verification gateway of the Kingdom of Saudi Arabia. Verify your 24-hour electronic visa status, download your official signed PDF certificate, and review multiple-entry permissions.',
    features: [
      'Real-time visa issuance & validity confirmation',
      'Cryptographically signed official QR clearance code',
      '90-day stay duration calculator & entry port rules',
      'Multi-lingual visa inquiry by Application Number'
    ],
    howToRegister: [
      'Visit the official KSA MOFA visa enquiry portal (visa.mofa.gov.sa).',
      'Select "Inquiry by Application / Visa Number".',
      'Enter your Visa Number and Passport Number.',
      'Download and print the official signed PDF copy with biometric QR stamp.'
    ]
  },
  {
    id: 'hhr',
    name: 'Haramain High-Speed Railway Portal',
    authority: 'Saudi Arabia Railways (SAR)',
    tag: '300 km/h Bullet Train Booking',
    badgeColor: '#8B5CF6',
    url: 'https://sar.hhr.sa',
    description: 'The official ticket booking platform for the high-speed electrified railway connecting Makkah Al-Mukarramah, Jeddah Airport (Terminal 1), King Abdullah Economic City, and Madinah Al-Munawwarah in 2 hours.',
    features: [
      'Live train departure schedules every 30-45 minutes',
      'First-Class Executive & Economy coach seat selector',
      'Luggage allowance guidelines (Up to 32 kg + cabin bag)',
      'Direct airport station connection inside JED Terminal 1'
    ],
    howToRegister: [
      'Visit sar.hhr.sa or download the "HHR Train" app.',
      'Select origin (e.g. Makkah Haramain) and destination (Madinah).',
      'Choose departure date, time, and class (Business / Economy).',
      'Enter passenger passport numbers and complete instant reservation.'
    ]
  }
];

interface GuideAccordion {
  id: string;
  title: string;
  subtitle: string;
  content: string[];
}

const GUIDE_SECTIONS: GuideAccordion[] = [
  {
    id: 'umrah-steps',
    title: 'Core Rites of Umrah: Step-by-Step Guide',
    subtitle: 'Ihram, Tawaf, Sa’i, and Halq / Taqseer',
    content: [
      '1. Ihram: Cleanse yourself, wear the two unstitched white towels (for men) or modest clothing (for women), offer two Rakats, and declare your Niyyah before passing the Miqat. Recite the Talbiyah: "Labbayk Allahumma Labbayk..."',
      '2. Tawaf: Enter Al-Masjid Al-Haram with your right foot. Perform seven counter-clockwise circuits around the Holy Kaaba starting at Hajar Al-Aswad. Uncover your right shoulder (Idtiba) for men during the 7 rounds.',
      '3. Prayer at Maqam Ibrahim: Offer two Rakats behind the Station of Abraham, or anywhere in the Haram, then drink Zamzam water making sincere supplications.',
      '4. Sa’i: Walk between the hills of Safa and Marwah for seven laps, beginning at Safa and concluding at Marwah (approx 3.15 km). Men briskly jog between the two green light markers.',
      '5. Halq or Taqseer: Shave the head (Halq - greater reward for men) or trim hair evenly by at least 1-2 cm (Taqseer - for men; women cut a fingertip length from the end of their hair). Your Umrah is now complete!'
    ]
  },
  {
    id: 'packing-list',
    title: 'Essential Packing Checklist for Holy Cities',
    subtitle: 'Clothing, foot care, medicines, and prayer gear',
    content: [
      '• Clothing: 2 sets of certified 100% cotton unstitched Ihram towels (for men), comfortable cotton abayas/hijabs (for women), and an Ihram security waist belt.',
      '• Footwear: Comfortable, slip-resistant walking sandals that do not cover the ankle bones for Ihram; thick cushioned socks for marble courtyards.',
      '• Health & Hygiene: Unscented soap, unscented sunscreen, unscented lip balm, petroleum jelly (to prevent inner-thigh chafing during Tawaf), and prescribed medications.',
      '• Electronics: Dual-pin universal UK/KSA power adapter, portable 20,000mAh power bank (essential for long stays inside the Haram), and lightweight sling pouch.'
    ]
  },
  {
    id: 'rawdah-etiquette',
    title: 'Sacred Etiquette for Rawdah Ash-Sharifah & Prophet’s Mosque',
    subtitle: 'Supplications, Rawdah rules, and visiting the Green Dome',
    content: [
      '• Arrive 30 minutes before your scheduled Nusuk permit appointment window at the assigned courtyard gates.',
      '• Enter with deep reverence, humility, and lowered gaze, conscious that you are standing in a garden from the gardens of Paradise.',
      '• Pray two Rakats of Tahiyyat al-Masjid, make heartfelt personal Duas, and recite salutations upon the beloved Prophet Muhammad ﷺ.',
      '• Walk calmly along the sacred corridor past the Golden Grills, offering Salam to the Prophet ﷺ, Abu Bakr as-Siddiq (RA), and Umar ibn al-Khattab (RA) with dignity and quiet voice.'
    ]
  }
];

export const OfficialPortalsGuide: React.FC = () => {
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>('nusuk');
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>('umrah-steps');

  return (
    <section className="official-portals-section">
      <div className="official-portals-container">
        {/* Section Header */}
        <div className="portals-header">
          <span className="portals-badge">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Official Saudi Pilgrimage Ecosystem
          </span>
          <h2 className="portals-title">
            Essential Government Portals &amp; Pilgrim Guides
          </h2>
          <p className="portals-subtitle">
            Direct verified links, official regulatory apps, and step-by-step registration instructions for your smooth journey through the Kingdom of Saudi Arabia.
          </p>
        </div>

        {/* 4 Official Gateways Grid */}
        <div className="portals-grid">
          {OFFICIAL_PORTALS.map((portal) => {
            const isExpanded = expandedPortalId === portal.id;
            return (
              <div key={portal.id} className="portal-card">
                <div className="portal-card-top">
                  <div className="portal-authority-row">
                    <span className="portal-authority-tag">{portal.authority}</span>
                    <span 
                      className="portal-badge-pill"
                      style={{ backgroundColor: `${portal.badgeColor}15`, color: portal.badgeColor, border: `1px solid ${portal.badgeColor}35` }}
                    >
                      {portal.tag}
                    </span>
                  </div>

                  <h3 className="portal-title">{portal.name}</h3>
                  <p className="portal-desc">{portal.description}</p>

                  <h5 className="portal-features-heading">Official Platform Features:</h5>
                  <ul className="portal-features-list">
                    {portal.features.map((feat, idx) => (
                      <li key={idx}>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="portal-card-bottom">
                  <button
                    type="button"
                    className="portal-toggle-instructions"
                    onClick={() => setExpandedPortalId(isExpanded ? null : portal.id)}
                  >
                    <Smartphone className="h-4 w-4 text-amber-500" />
                    <span>How to Register &amp; Use</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {isExpanded && (
                    <div className="portal-instruction-drawer">
                      <ol className="instruction-steps">
                        {portal.howToRegister.map((step, idx) => (
                          <li key={idx}>
                            <span className="step-idx">{idx + 1}</span>
                            <span className="step-txt">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <a 
                    href={portal.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="portal-external-link-btn"
                  >
                    <span>Visit Official Platform ({portal.url.replace('https://', '')})</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Moulavi Pilgrim Digital Guidebook Section */}
        <div className="digital-guidebook-card">
          <div className="guidebook-header">
            <div className="guidebook-title-block">
              <span className="guidebook-tag">
                <BookOpen className="h-3.5 w-3.5 text-amber-500" /> Free Pilgrim Resource
              </span>
              <h3 className="guidebook-title">Moulavi Digital Pilgrimage Guide</h3>
              <p className="guidebook-desc">
                Concise step-by-step instructions, essential packing lists, and sacred supplications prepared by our senior pilgrimage scholars.
              </p>
            </div>
          </div>

          <div className="guidebook-accordions">
            {GUIDE_SECTIONS.map((sec) => {
              const isOpen = expandedGuideId === sec.id;
              return (
                <div key={sec.id} className={`guide-accordion-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="guide-accordion-trigger"
                    onClick={() => setExpandedGuideId(isOpen ? null : sec.id)}
                  >
                    <div>
                      <h4 className="accordion-heading">{sec.title}</h4>
                      <p className="accordion-sub">{sec.subtitle}</p>
                    </div>
                    {isOpen ? <ChevronUp className="h-5 w-5 text-amber-500" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </button>

                  {isOpen && (
                    <div className="guide-accordion-body">
                      <ul className="guide-content-list">
                        {sec.content.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
