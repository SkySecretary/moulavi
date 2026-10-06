'use client';

import React from 'react';
import Link from 'next/link';
import { FamilyUmrahCalculator } from '@/components/b2c/FamilyUmrahCalculator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Award,
  Sparkles,
  HeartHandshake,
  MessageSquare,
  Phone,
  CheckCircle2,
  Clock,
  Compass,
  Star,
  Users,
  Building2,
  Globe,
  Plane,
  Hotel,
} from 'lucide-react';

export default function B2CPackageCalculatorPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950">
      
      {/* Top Floating Glass Navigation */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-emerald-900/40 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-lg shadow-md">
                🕋
              </div>
              <div>
                <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-white block leading-tight">
                  MOULAVI TRAVELS
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest block">
                  B2C Direct Umrah Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/966500000000?text=Salam,%20I%20need%20assistance%20with%20Family%20Umrah%20Booking"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 px-3.5 py-1.5 rounded-xl border border-emerald-700/40 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
              WhatsApp Concierge
            </a>

            <Link href="/login">
              <Button size="sm" variant="outline" className="text-xs border-emerald-700/60 bg-emerald-950/40 text-emerald-200 hover:text-white hover:bg-emerald-900">
                Agent / Staff Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative px-4 sm:px-8 pt-8 pb-4 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl mx-auto relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Saudi Ministry Approved Umrah Operator • 40+ Years of Service
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold font-display text-white tracking-tight leading-tight">
            Design Your Blessed <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500">Family Umrah Package</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300/90 max-w-2xl mx-auto leading-relaxed">
            Use our live interactive simulator to customize pilgrims, stay duration, hotels, and sacred ziyarah with instant real-time pricing and guaranteed VIP visa processing.
          </p>
        </div>
      </section>

      {/* Main Interactive Calculator Arena */}
      <main className="flex-1 px-4 sm:px-8 py-4 sm:py-6">
        <FamilyUmrahCalculator />
      </main>

      {/* Trust Badges & Features Section */}
      <section className="px-4 sm:px-8 py-10 border-t border-emerald-900/40 bg-slate-900/40">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-emerald-800/30 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Official Nusuk Approved</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Direct integration with Ministry of Hajj & Umrah for instant visa approval.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-emerald-800/30 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-400/10 text-emerald-400 shrink-0">
              <Hotel className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Verified Haram Hotels</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Guaranteed front-row and walking distance hotels in Makkah & Madinah.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-emerald-800/30 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-400/10 text-blue-400 shrink-0">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Airport Meet & Assist</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Personal on-ground concierge welcoming your family right at Jeddah/Madinah.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-emerald-800/30 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-teal-400/10 text-teal-400 shrink-0">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">24/7 Spiritual Guidance</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Multilingual guide support throughout your Tawaf, Sa&apos;i, and Ziyarah.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-8 py-6 border-t border-emerald-950 text-center text-xs text-slate-500 bg-slate-950">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© 2026 Moulavi Travels & Recruiting Agents Pvt Ltd. All rights reserved.</span>
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <Link href="/" className="hover:text-amber-300 transition-colors">Home</Link>
            <Link href="/b2c" className="hover:text-amber-300 transition-colors">Family Calculator</Link>
            <Link href="/re-entry-visa" className="hover:text-amber-300 transition-colors">Re-Entry Visa</Link>
            <Link href="/login" className="hover:text-amber-300 transition-colors">Portal Login</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
