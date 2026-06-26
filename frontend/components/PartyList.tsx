import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { partyAPI } from '@/lib/api';
import { Search, Mail, Phone, MapPin, Activity, UserPlus, Users, Edit3, ShieldCheck, Globe, ChevronRight } from 'lucide-react';
import { Party, PaginationInfo } from '@/types';
import { cn } from '@/lib/utils';

const getComplianceStatus = (party: Party) => {
  const metrics = party.complianceMetrics;
  if (!metrics) {
    return { label: 'Compliant', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' };
  }
  
  if (metrics.complianceStatus === 'RED') {
    return { label: 'Suspended (Red)', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' };
  }
  if (metrics.complianceStatus === 'YELLOW') {
    return { label: 'Throttled (Yellow)', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
  }
  return { label: 'Compliant (Green)', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' };
};

export default function PartyList() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  useEffect(() => {
    loadParties();
  }, [page, search]);

  const loadParties = async () => {
    setLoading(true);
    try {
      const response = await partyAPI.getAll({
        page,
        limit: 10,
        search: search || undefined,
      });
      setParties(response.data.parties);
      setPagination(response.data.pagination);
    } catch (error) {
      setParties([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleAction = (partyId: string, action: 'individual' | 'group' | 'edit') => {
    // In a real app, you'd probably store the selected party in a context or pass via query param
    switch(action) {
      case 'individual':
        router.push(`/dashboard/umrah-visa/create-individual?partyId=${partyId}`);
        break;
      case 'group':
        router.push(`/dashboard/umrah-visa/create-group?partyId=${partyId}`);
        break;
      case 'edit':
        router.push(`/dashboard/umrah-visa/bookings?partyId=${partyId}`);
        break;
    }
  };

  if (loading && parties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Activity className="h-10 w-10 text-primary/20 animate-pulse" />
        <p className="text-xs font-black text-primary/40 uppercase tracking-[0.3em]">Scanning Portfolios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tactical Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 h-5 w-5" />
        <Input
          placeholder="SEARCH PARTNER AGENCIES OR IDENTIFIERS..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-14 pl-12 rounded-2xl border-secondary/20 bg-white font-black text-primary placeholder:text-primary/20 focus:ring-secondary/20 uppercase tracking-widest text-[11px]"
        />
      </div>

      {/* Partner List Architecture */}
      {parties.length === 0 ? (
        <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-secondary/10">
          <Globe className="h-16 w-16 text-primary/10 mx-auto mb-6" />
          <p className="text-sm font-black text-primary/40 uppercase tracking-widest italic">No matching portfolios detected</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {parties.map((party) => {
            const compliance = getComplianceStatus(party);
            return (
              <Card
                key={party.id}
                className="group border-0 shadow-xl shadow-primary/5 bg-white rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Identity Core */}
                    <div className="lg:w-[35%] p-8 lg:p-10 bg-primary/5 border-r border-secondary/10">
                      <div className="flex items-start justify-between mb-6">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                          <span className="text-2xl font-black italic">{party.partyName[0].toUpperCase()}</span>
                        </div>
                        <div className={cn(
                          "px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-sm",
                          compliance.bg, compliance.text, "border-current/20"
                        )}>
                           <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", compliance.color)} />
                           {compliance.label}
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-black text-primary tracking-tighter uppercase italic mb-4">{party.partyName}</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                          <Mail className="h-4 w-4 text-secondary" />
                          <span className="text-[11px] font-bold tracking-tight truncate uppercase">{party.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                          <Phone className="h-4 w-4 text-secondary" />
                          <span className="text-[11px] font-bold tracking-widest uppercase">{party.contactNumber || 'NO CHANNEL'}</span>
                        </div>
                        <div className="flex items-start gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                          <MapPin className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                          <span className="text-[10px] font-bold uppercase leading-relaxed tracking-wide line-clamp-2">{party.address || 'UNDEFINED LOCATION'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Commands */}
                    <div className="flex-1 p-8 lg:p-10 flex flex-col justify-center bg-white">
                      <div className="flex items-center gap-4 mb-8">
                         <span className="text-[9px] font-black text-primary/30 uppercase tracking-[0.4em]">Tactical Actions</span>
                         <div className="h-px flex-1 bg-secondary/10" />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Button
                          onClick={() => handleAction(party.id, 'individual')}
                          className="h-20 rounded-[1.5rem] bg-white border border-secondary/20 text-primary hover:bg-secondary hover:text-primary hover:border-secondary transition-all duration-500 shadow-xl shadow-primary/5 flex flex-col items-center justify-center gap-1 group/btn overflow-hidden relative"
                        >
                          <UserPlus className="h-5 w-5 mb-1 relative z-10" />
                          <span className="text-[10px] font-black uppercase tracking-widest relative z-10">New Individual</span>
                          <div className="absolute inset-0 bg-secondary translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                        </Button>

                        <Button
                          onClick={() => handleAction(party.id, 'group')}
                          className="h-20 rounded-[1.5rem] bg-white border border-secondary/20 text-primary hover:bg-secondary hover:text-primary hover:border-secondary transition-all duration-500 shadow-xl shadow-primary/5 flex flex-col items-center justify-center gap-1 group/btn overflow-hidden relative"
                        >
                          <Users className="h-5 w-5 mb-1 relative z-10" />
                          <span className="text-[10px] font-black uppercase tracking-widest relative z-10">New Group</span>
                          <div className="absolute inset-0 bg-secondary translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                        </Button>

                        <Button
                          onClick={() => handleAction(party.id, 'edit')}
                          className="h-20 rounded-[1.5rem] bg-primary text-white hover:bg-primary/90 transition-all duration-500 shadow-2xl shadow-primary/20 flex flex-col items-center justify-center gap-1 group/btn overflow-hidden relative"
                        >
                          <Edit3 className="h-5 w-5 mb-1 relative z-10 text-secondary" />
                          <span className="text-[10px] font-black uppercase tracking-widest relative z-10">Manage Bookings</span>
                          <div className="absolute inset-0 bg-white/5 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                        </Button>
                      </div>

                      <div className="mt-8 flex items-center justify-between px-2">
                         <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                               <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Type</span>
                               <span className="text-[10px] font-black text-primary uppercase italic tracking-tighter">{party.customerType}</span>
                            </div>
                            <div className="w-px h-6 bg-secondary/20" />
                            <div className="flex flex-col">
                               <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Currency</span>
                               <span className="text-[10px] font-black text-primary uppercase italic tracking-tighter">{party.accountCurrency?.currencyCode || 'SAR'}</span>
                            </div>
                         </div>
                         {party.loginRequired && (
                           <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100 shadow-sm">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest italic">Auth Secure</span>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Command Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 pt-10 border-t border-secondary/10">
          <Button
            variant="ghost"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-12 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 text-primary/40 disabled:opacity-20"
          >
            Regress
          </Button>
          <div className="flex items-center gap-3">
             <span className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-black shadow-lg shadow-primary/20">
                {pagination.page}
             </span>
             <span className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">of</span>
             <span className="h-10 w-10 rounded-xl bg-white border border-secondary/20 text-primary flex items-center justify-center text-xs font-black shadow-sm">
                {pagination.totalPages}
             </span>
          </div>
          <Button
            variant="ghost"
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="h-12 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 text-primary disabled:opacity-20 transition-all group"
          >
            Advance
            <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      )}
    </div>
  );
}

