'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { partyAPI, umrahVisaAPI, nusukAPI } from '@/lib/api';
import { Users, FileText, TrendingUp, Activity, PlusCircle, Globe, Calendar, Clock, Shield, Award, CheckCircle2, Plane } from 'lucide-react';
import CreatePartyDialog from '@/components/CreatePartyDialog';
import PartyList from '@/components/PartyList';
import { DashboardStats } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const user = getUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalParties: 0,
    totalServices: 0,
    pendingServices: 0,
  });
  const [complianceData, setComplianceData] = useState<{
    todayCount: number;
    yesterdayCount: number;
    recentMismatches: Array<{
      id: string;
      bookingReference: string;
      partyName: string;
      mismatchType: 'entry' | 'exit' | 'both' | 'pax_count';
      mutamerName: string;
      createdAt: string;
    }>;
    visaSummary?: {
      systemPassengers: number;
      nusukPassengers: number;
      visasIssued: number;
      passengersInKSA: number;
      passengersToArrive: number;
    };
  } | null>(null);
  const [adminFilter, setAdminFilter] = useState<'all' | 'arrival' | 'departure'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }

    const loadStats = async () => {
      try {
        const [partiesRes, bookingsRes, pendingBookingsRes, complianceRes] = await Promise.all([
          partyAPI.getAll({ limit: 1 }),
          umrahVisaAPI.getBookings({ limit: 1 }),
          umrahVisaAPI.getBookings({ 
            status: ['pending', 'documents_downloaded', 'group_assigned'],
            limit: 1 
          }),
          nusukAPI.getComplianceDashboard()
        ]);

        setStats({
          totalParties: partiesRes.data.pagination.total,
          totalServices: bookingsRes.data.pagination.total,
          pendingServices: pendingBookingsRes.data.pagination.total,
        });

        setComplianceData(complianceRes.data);
      } catch (error) {
        setStats({
          totalParties: 0,
          totalServices: 0,
          pendingServices: 0,
        });
      }
    };

    loadStats();
  }, [user, router]);

  const handlePartyCreated = () => {
    setRefreshKey(prev => prev + 1);
    setShowCreateDialog(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50 pb-10">
      {/* Hero / Welcome Section */}
      <div className="relative bg-gradient-to-r from-secondary to-[#112020] text-white px-8 py-12 mb-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <Globe className="h-64 w-64 text-white" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto">
          <h2 className="text-4xl font-black mb-2 text-primary-foreground tracking-tighter uppercase">Welcome back, {user.name}</h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl font-medium">
            NuSync simplifies your Umrah campaign management with Nusuk-style precision.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => router.push('/dashboard/umrah-visa/create-individual')}
              className="bg-primary hover:bg-primary/90 text-secondary font-black border-none shadow-xl hover:shadow-primary/20 transition-all h-12 px-6 rounded-xl"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              NEW INDIVIDUAL
            </Button>
            <Button 
              onClick={() => router.push('/dashboard/umrah-visa/create-group')}
              className="bg-primary hover:bg-primary/90 text-secondary font-black border-none shadow-xl hover:shadow-primary/20 transition-all h-12 px-6 rounded-xl"
            >
              <Users className="mr-2 h-5 w-5" />
              NEW GROUP
            </Button>
            <Button 
              onClick={() => router.push('/dashboard/umrah-visa/add-to-existing-booking')}
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white backdrop-blur-md h-12 px-6 rounded-xl font-bold"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              ADD TO EXISTING
            </Button>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white backdrop-blur-md h-12 px-6 rounded-xl font-bold"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              NEW PARTY
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard 
            title="Total Parties" 
            value={stats.totalParties} 
            icon={Users} 
            description="Registered Agencies"
            trend="Active"
            color="text-secondary"
            bgColor="bg-secondary/10"
          />
          <StatsCard 
            title="Total Bookings" 
            value={stats.totalServices} 
            icon={FileText} 
            description="Visa Applications"
            trend="All Time"
            color="text-primary"
            bgColor="bg-primary/10"
          />
          <StatsCard 
            title="Pending Action" 
            value={stats.pendingServices} 
            icon={Clock} 
            description="Awaiting Processing"
            trend="Needs Attention"
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <StatsCard 
            title="Completed" 
            value={stats.totalServices - stats.pendingServices} 
            icon={TrendingUp} 
            description="Processed Successfully"
            trend="Finished"
            color="text-green-600"
            bgColor="bg-green-50"
          />
        </div>

        {/* Nusuk Visa & Arrival Summary Stats Grid */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nusuk Visa & Arrival Summary</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard 
              title="Pilgrims (System / Nusuk)" 
              value={`${complianceData?.visaSummary?.systemPassengers ?? 0} / ${complianceData?.visaSummary?.nusukPassengers ?? 0}`} 
              icon={Users} 
              description="Applications in System vs Synced"
              color="text-indigo-650"
              bgColor="bg-indigo-50"
            />
            <StatsCard 
              title="Visas Issued" 
              value={complianceData?.visaSummary?.visasIssued ?? 0} 
              icon={CheckCircle2} 
              description="Visas active in Nusuk"
              color="text-emerald-650"
              bgColor="bg-emerald-50"
            />
            <StatsCard 
              title="Pilgrims in KSA" 
              value={complianceData?.visaSummary?.passengersInKSA ?? 0} 
              icon={Globe} 
              description="Present in the Kingdom"
              color="text-teal-650"
              bgColor="bg-teal-50"
            />
            <StatsCard 
              title="Expected to Arrive" 
              value={complianceData?.visaSummary?.passengersToArrive ?? 0} 
              icon={Plane} 
              description="Visas printed, not in KSA yet"
              color="text-blue-650"
              bgColor="bg-blue-50"
            />
          </div>
        </div>

        {/* Expanded Nusuk Compliance & Discrepancies Hub */}
        <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden bg-white rounded-3xl">
          <CardHeader className="border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between py-6 px-8 gap-4">
            <div>
              <CardTitle className="text-xl font-black text-secondary uppercase tracking-tight">Nusuk Compliance & Mismatches</CardTitle>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Discrepancies detected between system bookings and Nusuk records</p>
            </div>
            <div className="flex items-center gap-4">
              <select 
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value as any)}
                className="text-xs font-bold text-indigo-650 border border-slate-200 rounded-xl px-3 py-1.5 bg-white cursor-pointer focus:outline-none"
              >
                <option value="all">All Mismatches</option>
                <option value="arrival">Arrival Mismatches</option>
                <option value="departure">Departure Mismatches</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-8">
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Statistics panel */}
                <div className="lg:col-span-1 flex flex-row lg:flex-col gap-4 justify-center">
                  <div className="flex-1 bg-rose-50/70 border border-rose-100 p-6 rounded-2xl text-center shadow-sm">
                    <div className="text-[10px] font-black text-rose-550 uppercase tracking-widest">Today's Mismatches</div>
                    <div className="text-4xl font-black text-rose-700 mt-2">{complianceData?.todayCount ?? 0}</div>
                    <p className="text-[9px] text-rose-450 mt-1 font-bold">Requires urgent verification</p>
                  </div>
                  <div className="flex-1 bg-amber-50/70 border border-amber-100 p-6 rounded-2xl text-center shadow-sm">
                    <div className="text-[10px] font-black text-amber-550 uppercase tracking-widest">Yesterday's Mismatches</div>
                    <div className="text-4xl font-black text-amber-700 mt-2">{complianceData?.yesterdayCount ?? 0}</div>
                    <p className="text-[9px] text-amber-450 mt-1 font-bold">Unresolved discrepancy list</p>
                  </div>
                </div>

                {/* Table list panel */}
                <div className="lg:col-span-3">
                  <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/30">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold GFM uppercase text-[9px] tracking-wider border-b border-slate-100">
                          <th className="py-3 px-4">Booking Ref</th>
                          <th className="py-3 px-4">Mutamer Name</th>
                          <th className="py-3 px-4">Agency Name</th>
                          <th className="py-3 px-4 text-center">Type</th>
                          <th className="py-3 px-4 text-right">Detected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complianceData?.recentMismatches && complianceData.recentMismatches
                          .filter(m => {
                            if (adminFilter === 'arrival') return m.mismatchType === 'entry' || m.mismatchType === 'both';
                            if (adminFilter === 'departure') return m.mismatchType === 'exit' || m.mismatchType === 'both';
                            return true;
                          })
                          .slice(0, 5)
                          .map((m) => (
                            <tr key={m.id} className="border-b border-slate-150 hover:bg-slate-50/50 transition">
                              <td className="py-3.5 px-4 font-mono font-bold text-indigo-650">{m.bookingReference}</td>
                              <td className="py-3.5 px-4 font-semibold text-slate-800">{m.mutamerName}</td>
                              <td className="py-3.5 px-4 text-gray-500">{m.partyName}</td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${
                                  m.mismatchType === 'entry' ? 'bg-indigo-50 text-indigo-650' :
                                  m.mismatchType === 'exit' ? 'bg-emerald-50 text-emerald-650' :
                                  m.mismatchType === 'both' ? 'bg-purple-50 text-purple-650' : 'bg-amber-50 text-amber-650'
                                }`}>
                                  {m.mismatchType === 'entry' && 'Arrival'}
                                  {m.mismatchType === 'exit' && 'Departure'}
                                  {m.mismatchType === 'both' && 'Arr & Dep'}
                                  {m.mismatchType === 'pax_count' && 'Count'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right text-gray-400 font-mono text-[10px]">
                                {new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </td>
                            </tr>
                          ))}
                        {(!complianceData || !complianceData.recentMismatches || complianceData.recentMismatches.filter(m => {
                          if (adminFilter === 'arrival') return m.mismatchType === 'entry' || m.mismatchType === 'both';
                          if (adminFilter === 'departure') return m.mismatchType === 'exit' || m.mismatchType === 'both';
                          return true;
                        }).length === 0) && (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                              No active mismatches found matching the criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
             </div>
             
             <div className="mt-6 flex justify-end">
                <Button 
                  onClick={() => router.push('/dashboard/umrah-visa/mismatched-travel')}
                  className="bg-secondary hover:bg-secondary/90 text-primary font-black text-xs uppercase tracking-widest h-11 px-8 rounded-xl"
                >
                  Go to Mismatched Travel Directory
                </Button>
             </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden bg-white rounded-3xl">
              <CardHeader className="bg-white border-b border-gray-50 pb-6 px-8 pt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black text-secondary uppercase tracking-tight">Recent Agencies</CardTitle>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Latest registered clients</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary font-black hover:text-primary/80 hover:bg-primary/10 rounded-lg px-4 uppercase tracking-tighter" onClick={() => router.push('/dashboard/masters/party')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <PartyList key={refreshKey} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-xl bg-secondary text-white overflow-hidden rounded-3xl relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Globe className="h-32 w-32" />
              </div>
              <CardHeader className="px-8 pt-8">
                <CardTitle className="text-xl font-black text-white uppercase tracking-tight">Quick Access</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 px-6 pb-8">
                 <QuickLink 
                  icon={Users} 
                  label="Manage Groups" 
                  onClick={() => router.push('/dashboard/umrah-visa/bookings')} 
                  description="View and manage pilgrim groups"
                 />
                 <QuickLink 
                  icon={Calendar} 
                  label="Availability" 
                  onClick={() => router.push('/dashboard/masters/umrah-visa')} 
                  description="Check visa quotas and dates"
                 />
                 <QuickLink 
                  icon={Activity} 
                  label="Reports" 
                  onClick={() => toast.info("Reports module coming soon")} 
                  description="Download performance reports"
                 />
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-gray-200/50 rounded-3xl">
               <CardHeader className="px-8 pt-8">
                  <CardTitle className="text-lg font-black text-secondary uppercase tracking-tight">System Status</CardTitle>
               </CardHeader>
               <CardContent className="px-8 pb-8">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">System Date</span>
                        <span className="font-black text-secondary text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                     </div>
                     <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Status</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-600 border border-green-100 uppercase tracking-tighter">
                           Operational
                        </span>
                     </div>
                  </div>
               </CardContent>
            </Card>


          </div>
        </div>
      </div>

      <CreatePartyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={async (partyData) => {
          try {
            await partyAPI.create(partyData);
            handlePartyCreated();
          } catch (error) {
            throw error; 
          }
        }}
      />
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, description, color, bgColor }: any) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-3xl font-black text-secondary mb-1">{value}</h3>
            <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase">
               {description}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ icon: Icon, label, onClick, description }: any) {
   return (
      <button 
        onClick={onClick}
        className="flex items-center w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left group hover:translate-x-1"
      >
         <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center mr-3 group-hover:bg-primary/30 transition-colors shadow-inner">
            <Icon className="h-5 w-5 text-primary" />
         </div>
         <div>
            <div className="font-bold text-white text-sm uppercase tracking-tight">{label}</div>
            <div className="text-[10px] text-white/60 font-medium">{description}</div>
         </div>
      </button>
   )
}

function PerformanceMetric({ label, percentage, description, icon: Icon }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-50 rounded-lg text-secondary">
             <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-black text-secondary uppercase tracking-tight">{label}</span>
        </div>
        <span className="text-sm font-black text-secondary">{percentage}%</span>
      </div>
      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full bg-primary transition-all duration-1000 shadow-md" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter leading-tight">
        {description}
      </p>
    </div>
  );
}

function ComplianceRow({ label, count, color, percentage }: any) {
   return (
      <div className="space-y-2">
         <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
            <div className="flex items-center gap-1.5">
               <div className={`h-1.5 w-1.5 rounded-full ${color}`}></div>
               <span className="text-gray-600">{label}</span>
            </div>
            <span className="text-gray-400">{count} Agencies</span>
         </div>
         <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div className={`h-full ${color} opacity-80 shadow-sm`} style={{ width: `${percentage}%` }}></div>
         </div>
      </div>
   )
}
