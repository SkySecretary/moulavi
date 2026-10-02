'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supportTicketAPI } from '@/lib/api';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUser } from '@/lib/auth';
import {
  LifeBuoy,
  ArrowLeft,
  Calendar,
  Send,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Comment {
  id: string;
  senderName: string;
  comment: string;
  createdAt: string;
  user?: {
    name: string;
    role: string;
  };
}

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
  comments: Comment[];
}

export default function PartySupportTicketDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [closingTicket, setClosingTicket] = useState(false);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const res = await supportTicketAPI.getById(id);
      setTicket(res.data.ticket);
    } catch (error: any) {
      console.error('Error loading ticket:', error);
      toast.error('Failed to load ticket details');
      router.push('/party/support-tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push('/');
      return;
    }
    loadTicket();
  }, [id, router]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      await supportTicketAPI.addComment(id, { comment: newComment });
      toast.success('Message sent to support');
      setNewComment('');
      loadTicket(); // Reload conversation
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to send message');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCloseTicket = async () => {
    try {
      setClosingTicket(true);
      await supportTicketAPI.update(id, { status: 'closed' });
      toast.success('Ticket marked as closed');
      loadTicket();
    } catch (error: any) {
      console.error('Error closing ticket:', error);
      toast.error('Failed to close ticket');
    } finally {
      setClosingTicket(false);
    }
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

  if (loading) {
    return (
      <PartyLayout>
        <div className="flex flex-col items-center justify-center py-40 text-gray-400 space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-semibold">Loading ticket details...</span>
        </div>
      </PartyLayout>
    );
  }

  if (!ticket) {
    return (
      <PartyLayout>
        <div className="container mx-auto p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold text-secondary">Ticket Not Found</h2>
          <Button onClick={() => router.push('/party/support-tickets')} className="bg-secondary text-white font-bold rounded-xl">
            Back to Tickets
          </Button>
        </div>
      </PartyLayout>
    );
  }

  return (
    <PartyLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl animate-in fade-in duration-500">
        {/* Back Link and Close Ticket Action */}
        <div className="flex justify-between items-center gap-4">
          <Button
            onClick={() => router.push('/party/support-tickets')}
            variant="ghost"
            className="text-secondary hover:text-primary pl-0 font-bold flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Support Center
          </Button>

          {ticket.status !== 'closed' && (
            <Button
              onClick={handleCloseTicket}
              disabled={closingTicket}
              variant="outline"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1"
            >
              {closingTicket ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Close Ticket
            </Button>
          )}
        </div>

        {/* Conversation & Details Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Conversation Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50 border-b pb-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-md font-bold text-secondary font-mono">{ticket.ticketId}</span>
                      {getPriorityBadge(ticket.priority)}
                      {getStatusBadge(ticket.status)}
                    </div>
                    <h2 className="text-lg font-bold text-secondary mt-1">{ticket.subject}</h2>
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {/* Description Box */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Original Query Details</p>
                  <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                </div>

                {/* Comment Feed */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Discussion Log ({ticket.comments.length})
                  </h3>

                  {ticket.comments.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs italic">
                      No updates or replies yet. Our team will review and reply shortly.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ticket.comments.map((comment) => {
                        const isStaff = comment.user && (comment.user.role === 'admin' || comment.user.role === 'staff');
                        return (
                          <div
                            key={comment.id}
                            className={`flex flex-col rounded-xl p-4 border max-w-[85%] ${
                              isStaff
                                ? 'bg-primary/5 border-primary/10 mr-auto'
                                : 'bg-slate-50/50 border-slate-200 ml-auto'
                            }`}
                          >
                            <div className="flex justify-between items-center gap-4 mb-2">
                              <span className={`text-xs font-bold ${isStaff ? 'text-secondary' : 'text-slate-800'}`}>
                                {comment.senderName}
                                {isStaff && <span className="ml-1 text-[8px] bg-secondary text-primary px-1 py-0.5 rounded font-mono uppercase">Support Staff</span>}
                              </span>
                              <span className="text-[9px] text-gray-400 font-semibold">
                                {new Date(comment.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-normal">{comment.comment}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {ticket.status !== 'closed' ? (
                  <form onSubmit={handleAddComment} className="pt-4 border-t space-y-4">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Type your response to support staff here..."
                      rows={4}
                      className="rounded-xl border-gray-200 text-sm focus:ring-primary focus:border-primary"
                      required
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="bg-secondary hover:bg-secondary/90 text-white font-bold rounded-xl flex items-center gap-1.5"
                      >
                        {submittingComment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send Message
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs font-semibold text-slate-500">
                    This support ticket is closed. You can submit a new ticket if the issue persists.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Ticket Info Column */}
          <div className="space-y-6">
            <Card className="border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50 border-b pb-4">
                <CardTitle className="text-xs font-bold text-secondary uppercase tracking-wider">Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Subject</span>
                  <p className="text-xs font-bold text-slate-800 leading-snug">{ticket.subject}</p>
                </div>
                
                <div className="border-t pt-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Category</span>
                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{getCategoryLabel(ticket.category)}</span>
                </div>

                <div className="border-t pt-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Priority</span>
                  <div>{getPriorityBadge(ticket.priority)}</div>
                </div>

                <div className="border-t pt-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Current Status</span>
                  <div>{getStatusBadge(ticket.status)}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50 border-b pb-4">
                <CardTitle className="text-xs font-bold text-secondary uppercase tracking-wider">Registered Contacts</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="text-xs">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Contact Person</span>
                  <span className="font-bold text-slate-700">{ticket.contactName}</span>
                </div>
                <div className="text-xs border-t pt-2.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Notification Email</span>
                  <span className="font-bold text-slate-700 truncate block">{ticket.contactEmail}</span>
                </div>
                {ticket.contactPhone && (
                  <div className="text-xs border-t pt-2.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Contact Phone</span>
                    <span className="font-bold text-slate-700">{ticket.contactPhone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PartyLayout>
  );
}
