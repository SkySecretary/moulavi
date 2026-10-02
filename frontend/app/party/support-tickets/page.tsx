'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supportTicketAPI, partyAPI } from '@/lib/api';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser } from '@/lib/auth';
import {
  LifeBuoy,
  Search,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  Plus,
  Loader2,
  Mail,
  User,
  Phone
} from 'lucide-react';

interface Ticket {
  id: string;
  ticketId: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PartySupportTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partyDetails, setPartyDetails] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  // New ticket form state
  const [isOpenCreateSheet, setIsOpenCreateSheet] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (searchQuery.trim() !== '') params.search = searchQuery;

      const [ticketsRes, statsRes] = await Promise.all([
        supportTicketAPI.getAll(params),
        supportTicketAPI.getStats()
      ]);

      setTickets(ticketsRes.data.tickets || []);
      setStats(statsRes.data || null);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const activeUser = getUser();
    if (!activeUser) {
      router.push('/');
      return;
    }
    setUser(activeUser);

    // Load party info to pre-fill contact details
    partyAPI.getMyParty()
      .then(res => {
        const party = res.data.party;
        setPartyDetails(party);
        setContactName(activeUser.name || party.partyName || '');
        setContactEmail(activeUser.email || party.email || '');
        setContactPhone(party.contactNumber || '');
      })
      .catch(err => {
        console.error('Error fetching party details:', err);
      });

    loadData();
  }, [statusFilter, priorityFilter, router]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !contactName.trim() || !contactEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreatingTicket(true);
      await supportTicketAPI.create({
        subject,
        description,
        category,
        priority,
        contactName,
        contactEmail,
        contactPhone: contactPhone || undefined,
      });

      toast.success('Support ticket created successfully!');
      
      // Reset form
      setSubject('');
      setDescription('');
      setCategory('general');
      setPriority('medium');
      setIsOpenCreateSheet(false);
      
      loadData(); // Refresh list
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to submit support ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Resolved</Badge>;
      case 'closed':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200 uppercase font-bold text-[10px]">Low</Badge>;
      case 'medium':
        return <Badge className="bg-blue-100 text-blue-600 border-blue-200 uppercase font-bold text-[10px]">Medium</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200 uppercase font-bold text-[10px]">High</Badge>;
      case 'urgent':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200 uppercase font-bold text-[10px]">Urgent</Badge>;
      default:
        return <Badge variant="outline" className="uppercase font-bold text-[10px]">{priority}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'billing':
        return 'Billing / Invoicing';
      case 'booking':
        return 'Umrah Booking';
      case 'technical':
        return 'Technical Support';
      case 'general':
        return 'General Query';
      default:
        return category;
    }
  };

  return (
    <PartyLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-secondary flex items-center gap-2">
              <LifeBuoy className="h-7 w-7 md:h-8 md:w-8 text-primary" />
              SUPPORT CENTER
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">
              Submit support tickets, report booking or billing issues, and view solutions.
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              disabled={loading || refreshing}
              variant="outline"
              className="border-gray-200 text-secondary hover:bg-gray-50 flex items-center gap-2 rounded-xl text-xs md:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Sheet open={isOpenCreateSheet} onOpenChange={setIsOpenCreateSheet}>
              <SheetTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-secondary font-bold rounded-xl flex items-center gap-1.5 text-xs md:text-sm flex-1 sm:flex-initial">
                  <Plus className="h-4 w-4" />
                  New Ticket
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="rounded-l-3xl border-l-0 w-full max-w-lg flex flex-col h-full overflow-hidden">
                <SheetHeader className="pb-4 border-b">
                  <SheetTitle className="text-lg font-bold text-secondary flex items-center gap-2">
                    <LifeBuoy className="h-5 w-5 text-primary" />
                    CREATE SUPPORT TICKET
                  </SheetTitle>
                  <SheetDescription className="text-xs">
                    Please provide the details below. Our support agents will revert shortly.
                  </SheetDescription>
                </SheetHeader>
                <form onSubmit={handleCreateTicket} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  {/* Subject */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase">Subject *</label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief title of the issue"
                      className="rounded-xl border-gray-200"
                      required
                    />
                  </div>

                  {/* Category & Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-600 uppercase">Category</label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="rounded-xl border-gray-200">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="booking">Umrah Booking</SelectItem>
                          <SelectItem value="billing">Billing / Finance</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-600 uppercase">Priority</label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger className="rounded-xl border-gray-200">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase">Description *</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Explain the issue in detail. Include booking references or BRNs if applicable."
                      rows={6}
                      className="rounded-xl border-gray-200 text-sm"
                      required
                    />
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Person Details</p>
                    
                    {/* Contact Name */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-600 uppercase">Contact Name *</label>
                      <Input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Your name"
                        className="rounded-xl border-gray-200"
                        required
                      />
                    </div>

                    {/* Email and Phone */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-600 uppercase">Contact Email *</label>
                      <Input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="rounded-xl border-gray-200"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-600 uppercase">Contact Phone</label>
                      <Input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Mobile or WhatsApp number"
                        className="rounded-xl border-gray-200"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t flex gap-2">
                    <Button
                      type="submit"
                      disabled={creatingTicket}
                      className="bg-secondary hover:bg-secondary/90 text-white font-bold rounded-xl flex-1 h-12"
                    >
                      {creatingTicket ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Ticket'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpenCreateSheet(false)}
                      className="rounded-xl border-gray-200 text-secondary h-12"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Stats summary banner */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            <Card className="border-gray-150 rounded-2xl shadow-sm bg-white">
              <CardContent className="p-4 md:p-5 flex flex-col justify-between">
                <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">My Tickets</span>
                <span className="text-2xl md:text-3xl font-black text-secondary mt-2">{stats.total}</span>
              </CardContent>
            </Card>
            <Card className="border-blue-150 rounded-2xl shadow-sm bg-blue-50/20">
              <CardContent className="p-4 md:p-5 flex flex-col justify-between">
                <span className="text-[10px] md:text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Open
                </span>
                <span className="text-2xl md:text-3xl font-black text-blue-700 mt-2">{stats.status?.open || 0}</span>
              </CardContent>
            </Card>
            <Card className="border-yellow-150 rounded-2xl shadow-sm bg-yellow-50/20">
              <CardContent className="p-4 md:p-5 flex flex-col justify-between">
                <span className="text-[10px] md:text-xs font-bold text-yellow-600 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  In Progress
                </span>
                <span className="text-2xl md:text-3xl font-black text-yellow-700 mt-2">{stats.status?.inProgress || 0}</span>
              </CardContent>
            </Card>
            <Card className="border-emerald-150 rounded-2xl shadow-sm bg-emerald-50/20">
              <CardContent className="p-4 md:p-5 flex flex-col justify-between">
                <span className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolved
                </span>
                <span className="text-2xl md:text-3xl font-black text-emerald-700 mt-2">{stats.status?.resolved || 0}</span>
              </CardContent>
            </Card>
            <Card className="border-slate-150 rounded-2xl shadow-sm bg-slate-50/40">
              <CardContent className="p-4 md:p-5 flex flex-col justify-between">
                <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Closed</span>
                <span className="text-2xl md:text-3xl font-black text-slate-700 mt-2">{stats.status?.closed || 0}</span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter controls card */}
        <Card className="border-gray-100 rounded-2xl shadow-sm bg-white">
          <CardContent className="p-4 md:p-5">
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Search Subject or Ticket ID</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type ticket ID or subject keywords..."
                      className="pl-9 rounded-xl border-gray-200 h-10 w-full"
                    />
                  </div>
                </div>

                <div className="w-full md:w-48 space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Status Filter</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="rounded-xl border-gray-200 h-10">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-48 space-y-1">
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Priority Filter</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="rounded-xl border-gray-200 h-10">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <Button type="submit" className="rounded-xl h-10 bg-secondary hover:bg-secondary/90 text-white font-bold flex-1 md:flex-none">
                    Filter
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Support Tickets List */}
        <Card className="border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs font-semibold">Retrieving tickets...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 stroke-1 opacity-45" />
                <p className="text-sm font-bold text-slate-700">No support tickets found</p>
                <p className="text-xs text-gray-500 mt-1">If you have any queries or issues, click the "New Ticket" button.</p>
              </div>
            ) : (
              <div className="overflow-x-auto font-sans">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4 pl-6">Ticket ID</TableHead>
                      <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Subject</TableHead>
                      <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Category</TableHead>
                      <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Priority</TableHead>
                      <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Status</TableHead>
                      <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Submitted Date</TableHead>
                      <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4 pr-6 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-secondary font-mono text-xs pl-6 py-4">
                          {ticket.ticketId}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="font-bold text-gray-900 line-clamp-1 max-w-[250px]">{ticket.subject}</div>
                          <div className="text-[10px] text-gray-400 line-clamp-1 max-w-[250px] mt-0.5">{ticket.description}</div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700 py-4">
                          {getCategoryLabel(ticket.category)}
                        </TableCell>
                        <TableCell className="py-4">
                          {getPriorityBadge(ticket.priority)}
                        </TableCell>
                        <TableCell className="py-4">
                          {getStatusBadge(ticket.status)}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 font-semibold py-4">
                          {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-right pr-6 py-4">
                          <Button
                            onClick={() => router.push(`/party/support-tickets/${ticket.id}`)}
                            size="sm"
                            className="bg-secondary hover:bg-secondary/90 text-white font-bold h-8 rounded-lg flex items-center gap-1 ml-auto"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PartyLayout>
  );
}
