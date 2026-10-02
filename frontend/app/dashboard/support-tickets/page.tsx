'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supportTicketAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  FileText
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
  party?: {
    partyName: string;
    partyCode: string;
  };
}

export default function SupportTicketsAdminPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
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
    const user = getUser();
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [statusFilter, priorityFilter, categoryFilter, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
    toast.success('Filters cleared');
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
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200 animate-pulse uppercase font-bold text-[10px]">Urgent</Badge>;
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
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary flex items-center gap-2">
            <LifeBuoy className="h-8 w-8 text-primary" />
            SUPPORT TICKET MANAGEMENT
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Review, reply, and manage support requests from users, agencies, and suppliers.
          </p>
        </div>
        <Button
          onClick={() => {
            setRefreshing(true);
            loadData();
          }}
          disabled={loading || refreshing}
          variant="outline"
          className="border-gray-200 text-secondary hover:bg-gray-50 flex items-center gap-2 rounded-xl"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Reports Stats Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-gray-150 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Tickets</span>
              <span className="text-3xl font-black text-secondary mt-2">{stats.total}</span>
            </CardContent>
          </Card>
          <Card className="border-blue-150 rounded-2xl shadow-sm bg-blue-50/20 hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col justify-between">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Open
              </span>
              <span className="text-3xl font-black text-blue-700 mt-2">{stats.status?.open || 0}</span>
            </CardContent>
          </Card>
          <Card className="border-yellow-150 rounded-2xl shadow-sm bg-yellow-50/20 hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col justify-between">
              <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                In Progress
              </span>
              <span className="text-3xl font-black text-yellow-700 mt-2">{stats.status?.inProgress || 0}</span>
            </CardContent>
          </Card>
          <Card className="border-emerald-150 rounded-2xl shadow-sm bg-emerald-50/20 hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resolved
              </span>
              <span className="text-3xl font-black text-emerald-700 mt-2">{stats.status?.resolved || 0}</span>
            </CardContent>
          </Card>
          <Card className="border-slate-150 rounded-2xl shadow-sm bg-slate-50/40 hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Closed</span>
              <span className="text-3xl font-black text-slate-700 mt-2">{stats.status?.closed || 0}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter and Search controls */}
      <Card className="border-gray-100 rounded-2xl shadow-sm bg-white">
        <CardContent className="p-6">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Search Keyword</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ticket ID, subject, client name, email..."
                    className="pl-9 rounded-xl border-gray-200 h-10 w-full"
                  />
                </div>
              </div>

              <div className="w-full md:w-44 space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Status</label>
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

              <div className="w-full md:w-44 space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Priority</label>
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

              <div className="w-full md:w-44 space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="rounded-xl border-gray-200 h-10">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="billing">Billing / Invoices</SelectItem>
                    <SelectItem value="booking">Umrah Booking</SelectItem>
                    <SelectItem value="technical">Technical Support</SelectItem>
                    <SelectItem value="general">General Query</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <Button type="submit" className="rounded-xl h-10 bg-secondary hover:bg-secondary/90 text-white font-bold flex-1 md:flex-none">
                  Search
                </Button>
                <Button type="button" onClick={handleResetFilters} variant="outline" className="rounded-xl h-10 border-gray-200 text-secondary hover:bg-gray-50 flex-1 md:flex-none">
                  Reset
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tickets List Table */}
      <Card className="border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="text-sm font-medium">Loading tickets...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 stroke-1 opacity-45" />
              <p className="text-base font-semibold">No tickets found</p>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4 pl-6">Ticket ID</TableHead>
                    <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Subject</TableHead>
                    <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Agency/Supplier</TableHead>
                    <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Contact Info</TableHead>
                    <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Category</TableHead>
                    <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Priority</TableHead>
                    <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Status</TableHead>
                    <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4">Created Date</TableHead>
                    <TableHead className="font-bold text-secondary text-[11px] uppercase tracking-wider py-4 pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-secondary font-mono text-xs pl-6 py-4">
                        {ticket.ticketId}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="font-bold text-gray-900 line-clamp-1 max-w-[200px]">{ticket.subject}</div>
                        <div className="text-[10px] text-gray-500 line-clamp-1 max-w-[200px] mt-0.5">{ticket.description}</div>
                      </TableCell>
                      <TableCell className="font-semibold text-gray-700 py-4">
                        {ticket.party ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{ticket.party.partyName}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{ticket.party.partyCode}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Direct User</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-xs font-bold text-slate-800">{ticket.contactName}</div>
                        <div className="text-[10px] text-gray-500">{ticket.contactEmail}</div>
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
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <Button
                          onClick={() => router.push(`/dashboard/support-tickets/${ticket.id}`)}
                          size="sm"
                          className="bg-secondary hover:bg-secondary/90 text-white font-bold h-8 rounded-lg flex items-center gap-1.5 ml-auto"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View & Reply
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
  );
}
