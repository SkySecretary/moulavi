'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supportTicketAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUser } from '@/lib/auth';
import {
  LifeBuoy,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Send,
  MessageSquare,
  Loader2,
  CheckCircle,
  Tag,
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
  party?: {
    partyName: string;
    partyCode: string;
  };
  comments: Comment[];
}

export default function SupportTicketDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const res = await supportTicketAPI.getById(id);
      setTicket(res.data.ticket);
    } catch (error: any) {
      console.error('Error loading ticket details:', error);
      toast.error('Failed to load support ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getUser();
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      router.push('/dashboard');
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
      toast.success('Reply posted successfully');
      setNewComment('');
      loadTicket(); // Reload ticket to show the new comment
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to post reply');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (value: string) => {
    try {
      setUpdatingStatus(true);
      await supportTicketAPI.update(id, { status: value });
      toast.success(`Status updated to ${value.toUpperCase()}`);
      loadTicket();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (value: string) => {
    try {
      setUpdatingPriority(true);
      await supportTicketAPI.update(id, { priority: value });
      toast.success(`Priority updated to ${value.toUpperCase()}`);
      loadTicket();
    } catch (error: any) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'closed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return '';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-sm font-semibold text-gray-500">Loading support ticket details...</span>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto p-6 text-center space-y-4">
        <h2 className="text-2xl font-bold text-secondary">Ticket Not Found</h2>
        <Button onClick={() => router.push('/dashboard/support-tickets')} className="bg-secondary text-white font-bold rounded-xl">
          Back to Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl animate-in fade-in duration-500">
      {/* Back link */}
      <div>
        <Button
          onClick={() => router.push('/dashboard/support-tickets')}
          variant="ghost"
          className="text-secondary hover:text-primary pl-0 font-bold flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support Tickets
        </Button>
      </div>

      {/* Ticket Details & Action Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Conversation Thread & Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-gray-50 border-b pb-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-secondary font-mono">{ticket.ticketId}</span>
                    {getPriorityBadge(ticket.priority)}
                    <Badge className={getStatusColor(ticket.status)}>{ticket.status.toUpperCase()}</Badge>
                  </div>
                  <h2 className="text-xl font-bold text-secondary mt-1">{ticket.subject}</h2>
                </div>
                <div className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Ticket Description */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Issue Description</p>
                <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              </div>

              {/* Conversation History */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Discussion Thread ({ticket.comments.length})
                </h3>

                {ticket.comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs italic">
                    No comments or replies yet. Start the conversation below.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticket.comments.map((comment) => {
                      const isAdminReply = comment.user && (comment.user.role === 'admin' || comment.user.role === 'staff');
                      return (
                        <div
                          key={comment.id}
                          className={`flex flex-col rounded-xl p-4 border max-w-[85%] ${
                            isAdminReply
                              ? 'bg-teal-50/20 border-teal-100 ml-auto'
                              : 'bg-white border-gray-150 mr-auto'
                          }`}
                        >
                          <div className="flex justify-between items-center gap-4 mb-2">
                            <span className={`text-xs font-bold ${isAdminReply ? 'text-teal-700' : 'text-slate-800'}`}>
                              {comment.senderName}
                              {isAdminReply && <span className="ml-1 text-[9px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-mono uppercase">Staff</span>}
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold">
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
              <form onSubmit={handleAddComment} className="pt-4 border-t space-y-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type your reply here..."
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
                    Post Reply
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Ticket Info & Action Controls */}
        <div className="space-y-6">
          <Card className="border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="text-sm font-bold text-secondary uppercase tracking-wider">Ticket Management</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Status Update */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Update Status</label>
                <Select value={ticket.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
                  <SelectTrigger className="rounded-xl border-gray-200">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Update */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Update Priority</label>
                <Select value={ticket.priority} onValueChange={handlePriorityChange} disabled={updatingPriority}>
                  <SelectTrigger className="rounded-xl border-gray-200">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500 uppercase tracking-wider">Category</span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{getCategoryLabel(ticket.category)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact / Owner Information */}
          <Card className="border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="text-sm font-bold text-secondary uppercase tracking-wider">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Agency link if available */}
              {ticket.party ? (
                <div className="flex items-start gap-3 border-b pb-3.5">
                  <Building className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Agency / Partner</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{ticket.party.partyName}</p>
                    <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{ticket.party.partyCode}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 border-b pb-3.5">
                  <User className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Creator Type</p>
                    <p className="text-sm font-bold text-slate-800">Direct Portal User</p>
                  </div>
                </div>
              )}

              {/* Contact details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Contact Person</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{ticket.contactName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Email Address</p>
                    <a href={`mailto:${ticket.contactEmail}`} className="text-xs font-bold text-primary hover:underline truncate block">
                      {ticket.contactEmail}
                    </a>
                  </div>
                </div>

                {ticket.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</p>
                      <p className="text-xs font-bold text-slate-700">{ticket.contactPhone}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
