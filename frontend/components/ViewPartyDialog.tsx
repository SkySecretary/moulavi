'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Party, ComplianceAuditLog } from '@/types';
import { Edit, X, ShieldAlert, AlertTriangle, CheckCircle, ShieldCheck, History } from 'lucide-react';
import { nusukAPI } from '@/lib/api';

interface ViewPartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  party: Party | null;
  onEdit?: (party: Party) => void;
}

export default function ViewPartyDialog({
  open,
  onOpenChange,
  party,
  onEdit
}: ViewPartyDialogProps) {
  const [logs, setLogs] = useState<ComplianceAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (open && party) {
      const fetchLogs = async () => {
        try {
          setLoadingLogs(true);
          const response = await nusukAPI.getComplianceAgentLogs(party.id);
          setLogs(response.data || []);
        } catch (error) {
          console.error('Failed to load compliance audit logs:', error);
        } finally {
          setLoadingLogs(false);
        }
      };
      fetchLogs();
    } else {
      setLogs([]);
    }
  }, [open, party]);

  if (!party) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <span>Party Details</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4 px-1 space-y-6 pr-2">
          {/* Compliance & Risk Monitoring */}
          {party.isCustomer && (
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Compliance & Lock Status
              </h3>
              
              {/* Status Alert Banner */}
              {party.complianceMetrics?.complianceStatus === 'RED' && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-2 text-xs">
                  <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">SUSPENDED (Account Locked)</strong>
                    <span>Sub-agent is blocked from creating new booking requests due to severe flight deviations or overstays.</span>
                  </div>
                </div>
              )}
              {party.complianceMetrics?.complianceStatus === 'YELLOW' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">THROTTLED (Daily Restrictions Active)</strong>
                    <span>Daily quota limits: max 1 group booking and 3 individual bookings.</span>
                  </div>
                </div>
              )}
              {(!party.complianceMetrics || party.complianceMetrics.complianceStatus === 'GREEN') && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg flex items-start gap-2 text-xs">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">ACTIVE (Compliant)</strong>
                    <span>Sub-agent in good standing. Standard privileges enabled.</span>
                  </div>
                </div>
              )}

              {/* Grid of Key Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="border rounded-lg p-2.5 bg-slate-50">
                  <div className="text-gray-500 font-medium">Compliance Score</div>
                  <div className="text-base font-bold text-gray-900 mt-0.5 font-mono">
                    {party.complianceMetrics?.weightedScore ? Number(party.complianceMetrics.weightedScore).toFixed(4) : '0.0000'}
                  </div>
                </div>
                <div className="border rounded-lg p-2.5 bg-slate-50">
                  <div className="text-gray-500 font-medium">30-Day Activity</div>
                  <div className="text-[11px] font-bold text-gray-900 mt-1">
                    {party.complianceMetrics?.totalArrivals || 0} Arr / {party.complianceMetrics?.totalDepartures || 0} Dep
                  </div>
                </div>
                <div className="border rounded-lg p-2.5 bg-slate-50">
                  <div className="text-gray-500 font-medium">Mismatches (Arr/Dep)</div>
                  <div className="text-base font-bold text-gray-900 mt-0.5 font-mono">
                    {party.complianceMetrics?.arrivalMismatches || 0} / {party.complianceMetrics?.departureMismatches || 0}
                  </div>
                </div>
                <div className="border rounded-lg p-2.5 bg-slate-50">
                  <div className="text-gray-500 font-medium">Severe Violations</div>
                  <div className="text-base font-bold text-red-600 mt-0.5 font-mono">
                    {party.complianceMetrics?.severeViolations || 0}
                  </div>
                </div>
              </div>

              {/* Audit logs timeline */}
              <div className="space-y-2 mt-4">
                <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <History className="h-3.5 w-3.5 text-gray-400" />
                  Audit Logs Timeline
                </div>
                {loadingLogs ? (
                  <div className="text-[10px] text-gray-400 animate-pulse">Loading logs...</div>
                ) : logs.length === 0 ? (
                  <div className="text-[10px] text-gray-400 italic">No historical status changes found.</div>
                ) : (
                  <div className="relative border-l border-gray-200 pl-3 ml-1.5 space-y-3.5 max-h-48 overflow-y-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="relative text-[10px]">
                        {/* Dot marker */}
                        <div className={`absolute -left-[16.5px] top-1 h-2 w-2 rounded-full border border-white ${
                          log.newStatus === 'RED' ? 'bg-red-500' : (log.newStatus === 'YELLOW' ? 'bg-amber-500' : 'bg-green-500')
                        }`} />
                        <div className="flex justify-between text-gray-400 font-medium text-[9px] mb-0.5">
                          <span className="font-semibold text-gray-600">Status: {log.previousStatus} &rarr; {log.newStatus}</span>
                          <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-700 leading-normal">{log.reasonSummary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Basic Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Party Name</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.partyName}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.email}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Contact Number</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.contactNumber || 'N/A'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">WhatsApp Number</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.whatsappNumber || 'N/A'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Address</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.address || 'N/A'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">GST Number</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.gstNumber || 'N/A'}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">PAN Number</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.panNumber || 'N/A'}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Aadhaar Number</Label>
                  <p className="text-sm text-gray-900 mt-1">{party.aadhaarNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Contact Person Details */}
            {party.contacts && party.contacts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Contact Person Details
                </h3>
                
                <div className="space-y-3">
                  {party.contacts.map((contact, index) => (
                    <div key={contact.id || index} className="p-3 border rounded-lg bg-gray-50">
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs font-medium text-gray-500">Contact Person Name</Label>
                          <p className="text-sm text-gray-900 mt-1">{contact.contactName}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-500">Contact Number</Label>
                          <p className="text-sm text-gray-900 mt-1">{contact.contactNumber}</p>
                        </div>
                        {contact.department && (
                          <div>
                            <Label className="text-xs font-medium text-gray-500">Department</Label>
                            <p className="text-sm text-gray-900 mt-1">{contact.department}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Business Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Customer Type</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={party.customerType === 'b2b' ? 'info' : 'success'}
                      className="text-xs"
                    >
                      {party.customerType.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Account Currency</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-xs">
                      {party.accountCurrency?.currencyCode || 'N/A'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Party Type</Label>
                  <div className="mt-1 flex gap-2">
                    {party.isSupplier && (
                      <Badge variant="secondary" className="text-xs">
                        Supplier
                      </Badge>
                    )}
                    {party.isCustomer && (
                      <Badge variant="secondary" className="text-xs">
                        Customer
                      </Badge>
                    )}
                  </div>
                </div>

                {party.isSupplier && party.supplierServiceTypes && party.supplierServiceTypes.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Supplier Service Types</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {party.supplierServiceTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>

                    {party.supplierServiceTypes.includes('umrah_service') && (
                      <div className="mt-3 p-2 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5 text-xs">
                        <div className="font-semibold text-slate-700">Nusuk Settings</div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                          <div>
                            <span className="text-slate-500">Entity ID:</span>{' '}
                            <span className="font-mono text-slate-800">{party.nusukEntityId || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Active ID:</span>{' '}
                            <span className="font-mono text-slate-800">{party.nusukActiveEntityId || '—'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500">Active Type ID:</span>{' '}
                            <span className="font-mono text-slate-800">{party.nusukActiveEntityTypeId || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Login Access</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={party.loginRequired ? 'success' : 'outline'} 
                      className="text-xs"
                    >
                      {party.loginRequired ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Notification Preferences
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email Notifications</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={party.emailNotification ? 'success' : 'outline'} 
                      className="text-xs"
                    >
                      {party.emailNotification ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">SMS Notifications</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={party.smsNotification ? 'success' : 'outline'} 
                      className="text-xs"
                    >
                      {party.smsNotification ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Marketing Notifications</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={party.marketingNotification ? 'success' : 'outline'} 
                      className="text-xs"
                    >
                      {party.marketingNotification ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            {party.documents && party.documents.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Documents
                </h3>
                
                <div className="space-y-2">
                  {party.documents.map((doc) => (
                    <div key={doc.id} className="p-2 border rounded-lg bg-gray-50 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {doc.documentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Timestamps
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created At</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(party.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(party.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
        </div>

        <SheetFooter className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {onEdit && (
            <Button
              type="button"
              onClick={() => {
                onEdit(party);
                onOpenChange(false);
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Party
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
