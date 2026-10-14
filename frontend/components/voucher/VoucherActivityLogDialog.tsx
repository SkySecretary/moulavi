'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { voucherAPI } from '@/lib/api';
import {
  History,
  RotateCcw,
  Ban,
  PlaneLanding,
  PlaneTakeoff,
  User,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';

interface VoucherActivityLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherId: string | null;
  voucherNumber?: string;
  guestName?: string;
}

export function VoucherActivityLogDialog({
  open,
  onOpenChange,
  voucherId,
  voucherNumber,
  guestName,
}: VoucherActivityLogDialogProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [voucherInfo, setVoucherInfo] = useState<any>(null);

  const loadLogs = async () => {
    if (!voucherId) return;
    try {
      setLoading(true);
      const res = await voucherAPI.getActivityLog(voucherId);
      if (res.data?.success) {
        setLogs(res.data.logs || []);
        setVoucherInfo(res.data.voucher || null);
      }
    } catch (err) {
      console.error('Failed to load voucher activity log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && voucherId) {
      loadLogs();
    } else {
      setLogs([]);
      setVoucherInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, voucherId]);

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getActionBadge = (action: string, newValues: any) => {
    const cancelType = newValues?.cancelType;
    if (action === 'cancel') {
      if (cancelType === 'arrival') {
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1 font-bold text-xs py-0.5">
            <PlaneLanding className="h-3 w-3 text-amber-600" />
            Arrival Cancelled
          </Badge>
        );
      }
      if (cancelType === 'departure') {
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1 font-bold text-xs py-0.5">
            <PlaneTakeoff className="h-3 w-3 text-purple-600" />
            Departure Cancelled
          </Badge>
        );
      }
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-200 flex items-center gap-1 font-bold text-xs py-0.5">
          <Ban className="h-3 w-3 text-rose-600" />
          Completely Cancelled
        </Badge>
      );
    }
    if (action === 'reactivate') {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1 font-bold text-xs py-0.5">
          <RotateCcw className="h-3 w-3 text-emerald-600" />
          Reactivated
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-700">
        {action.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="bg-slate-900 p-6 text-white text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                <History className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  Activity & Audit Log
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Voucher #{voucherNumber || voucherInfo?.voucherNumber || '—'}
                  {(guestName || voucherInfo?.guestName) && (
                    <span> • {guestName || voucherInfo?.guestName}</span>
                  )}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={loading}
              className="h-8 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
            >
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-xl">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed rounded-xl bg-gray-50/50">
              <History className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-700">No activity logs recorded yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Any status changes, cancellations, or updates to this voucher will be tracked here.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
              {logs.map((log) => {
                const newVals = log.newValues ? (typeof log.newValues === 'string' ? JSON.parse(log.newValues) : log.newValues) : {};
                const oldVals = log.oldValues ? (typeof log.oldValues === 'string' ? JSON.parse(log.oldValues) : log.oldValues) : {};
                const reason = newVals.cancellationReason || '';

                return (
                  <div key={log.id} className="relative group">
                    {/* Timeline dot */}
                    <div className="absolute -left-6 top-1 h-5 w-5 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-sm">
                      <div className="h-2 w-2 rounded-full bg-indigo-600" />
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-gray-200 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          {getActionBadge(log.action, newVals)}
                          <span className="text-xs font-bold text-gray-700">
                            {log.user?.name || 'System User'}
                          </span>
                          {log.user?.role && (
                            <Badge variant="outline" className="text-[10px] uppercase font-bold text-gray-400 py-0 px-1.5 h-4">
                              {log.user.role}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-medium">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(log.changedAt)}</span>
                        </div>
                      </div>

                      {reason && (
                        <div className="mt-2.5 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100/80">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                            Reason / Remarks:
                          </p>
                          <p className="text-xs text-gray-800 font-medium whitespace-pre-wrap">
                            {reason}
                          </p>
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center gap-4 text-[11px] text-gray-400">
                        {oldVals.status && newVals.status && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-500">Status change:</span>
                            <span className="font-semibold text-gray-600">{oldVals.status}</span>
                            <span>→</span>
                            <span className="font-semibold text-gray-900">{newVals.status}</span>
                          </div>
                        )}
                        {log.ipAddress && (
                          <span className="text-gray-400 text-[10px]">
                            IP: {log.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
