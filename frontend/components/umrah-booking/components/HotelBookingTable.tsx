import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Hotel, Plus, Search, Trash2 } from 'lucide-react';
import { HotelBooking, Location, Hotel as HotelType } from '@/lib/umrah/types';
import { QuickAddHotelDialog } from './QuickAddHotelDialog';
import { toDisplayDate, fromDisplayDate } from '@/lib/umrah/validation';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface AdditionalBrnsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hotelName: string;
  initialBrns?: { brnNumber: string; checkInDate: string; checkOutDate: string; }[];
  onSave: (brns: { brnNumber: string; checkInDate: string; checkOutDate: string; }[]) => void;
  disabled?: boolean;
}

const AdditionalBrnsDialog: React.FC<AdditionalBrnsDialogProps> = ({
  isOpen,
  onClose,
  hotelName,
  initialBrns = [],
  onSave,
  disabled = false,
}) => {
  const [brns, setBrns] = useState<{ brnNumber: string; checkInDate: string; checkOutDate: string; }[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      setBrns(initialBrns || []);
    }
  }, [isOpen]);

  const addRow = () => {
    setBrns([...brns, { brnNumber: '', checkInDate: '', checkOutDate: '' }]);
  };

  const removeRow = (idx: number) => {
    setBrns(brns.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: 'brnNumber' | 'checkInDate' | 'checkOutDate', value: string) => {
    const updated = [...brns];
    updated[idx] = { ...updated[idx], [field]: value };
    setBrns(updated);
  };

  const handleSave = () => {
    const valid = brns.filter(b => b.brnNumber && b.brnNumber.trim().length > 0);
    onSave(valid);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 uppercase tracking-tight">
            Manage Additional BRNs
          </DialogTitle>
          <div className="text-xs text-gray-500 block mt-1">
            Add multiple sub-BRNs for hotel: <strong className="text-gray-700">{hotelName}</strong>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-4 max-h-[350px] overflow-y-auto pr-1">
          {brns.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400 font-medium">
              No additional BRNs configured. Click "Add BRN Row" to start.
            </div>
          ) : (
            <div className="space-y-3">
              {brns.map((b, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center border p-3 rounded-xl bg-gray-50/50">
                  <div className="col-span-5 space-y-1">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">BRN Number *</Label>
                    <Input
                      placeholder="e.g. BRN12345"
                      value={b.brnNumber}
                      onChange={(e) => updateRow(idx, 'brnNumber', e.target.value)}
                      disabled={disabled}
                      className="h-9 text-xs font-semibold w-full"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Check-in</Label>
                    <DatePicker
                      value={b.checkInDate}
                      onChange={(val) => updateRow(idx, 'checkInDate', val || '')}
                      disabled={disabled}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Check-out</Label>
                    <DatePicker
                      value={b.checkOutDate}
                      onChange={(val) => updateRow(idx, 'checkOutDate', val || '')}
                      disabled={disabled}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(idx)}
                      disabled={disabled}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8 rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="w-full border-dashed text-xs py-2 h-9 font-bold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add BRN Row
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 text-xs font-bold">
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={disabled} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
            Save BRNs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface HotelBookingTableProps {
  hotelBookings: HotelBooking[];
  locations: Location[];
  hotels: HotelType[];
  getHotelsForLocation: (cityId: string) => HotelType[];
  onUpdateBooking: (index: number, field: keyof HotelBooking, value: string | string[]) => void;
  onRemoveBooking?: (index: number) => void;
  onAddBooking?: () => void;
  disabled?: boolean;
  showAddButton?: boolean;
  emptyStateMessage?: string;
  arrivalDate?: string; // For date range validation
  departureDate?: string; // For date range validation
  onHotelsRefresh?: () => void; // Callback to refresh hotels after quick add
}

export const HotelBookingTable: React.FC<HotelBookingTableProps> = ({
  hotelBookings,
  locations,
  hotels,
  getHotelsForLocation,
  onUpdateBooking,
  onRemoveBooking,
  onAddBooking,
  disabled = false,
  showAddButton = false,
  emptyStateMessage,
  arrivalDate,
  departureDate,
  onHotelsRefresh,
}) => {
  // Store raw input values for BRN fields to preserve commas while typing
  const [brnInputs, setBrnInputs] = useState<{ [key: number]: string }>({});
  // Store raw input values for duration fields
  const [durationInputs, setDurationInputs] = useState<{ [key: number]: string }>({});
  // Search state for hotels
  const [hotelSearch, setHotelSearch] = useState<{ [key: number]: string }>({});
  // Quick add dialog state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [activeBookingIndex, setActiveBookingIndex] = useState<number | null>(null);
  
  // Additional BRNs dialog state
  const [isBrnDialogOpen, setIsBrnDialogOpen] = useState(false);
  const [selectedHotelRowIndex, setSelectedHotelRowIndex] = useState<number | null>(null);

  // Initialize BRN inputs from booking data
  React.useEffect(() => {
    const inputs: { [key: number]: string } = {};
    hotelBookings.forEach((booking, index) => {
      if (booking.brn && booking.brn.length > 0) {
        inputs[index] = booking.brn.join(', ');
      } else if (!brnInputs[index]) {
        inputs[index] = '';
      }
    });
    setBrnInputs(prev => ({ ...prev, ...inputs }));
  }, [hotelBookings.length]);

  // Initialize duration inputs from booking data
  React.useEffect(() => {
    const inputs: { [key: number]: string } = {};
    hotelBookings.forEach((booking, index) => {
      if (booking.checkInDate && booking.checkOutDate) {
        // Ensure we parse correctly regardless of format
        const inISO = fromDisplayDate(booking.checkInDate);
        const outISO = fromDisplayDate(booking.checkOutDate);
        const inParts = inISO.split('-').map(Number);
        const outParts = outISO.split('-').map(Number);
        
        const inDate = Date.UTC(inParts[0], inParts[1] - 1, inParts[2]);
        const outDate = Date.UTC(outParts[0], outParts[1] - 1, outParts[2]);
        
        const duration = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
        inputs[index] = duration > 0 ? duration.toString() : '';
      } else if (!durationInputs[index]) {
        inputs[index] = '';
      }
    });
    setDurationInputs(prev => ({ ...prev, ...inputs }));
  }, [hotelBookings.length]);

  if (hotelBookings.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <Hotel className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hotel bookings added</h3>
        <p className="text-gray-500 mb-4">
          {emptyStateMessage || 'Add your first hotel booking to get started'}
        </p>
        {showAddButton && onAddBooking && (
          <Button type="button" variant="outline" onClick={onAddBooking} disabled={disabled}>
            <Hotel className="h-4 w-4 mr-2" />
            Add First Hotel
          </Button>
        )}
      </div>
    );
  }

  const handleQuickAddSuccess = async (newHotelId: string) => {
    if (activeBookingIndex !== null) {
      if (onHotelsRefresh) await onHotelsRefresh();
      
      // Clear the search for this index so the newly added hotel is not filtered out
      setHotelSearch(prev => ({ ...prev, [activeBookingIndex]: '' }));
      
      onUpdateBooking(activeBookingIndex, 'hotelId', newHotelId);
    }
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700 w-10">
              #
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700 w-48">
              City
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700 min-w-[250px]">
              Hotel
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700 w-40">
              Check-in
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700 w-24">
              Duration
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700 w-40">
              Check-out
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700 min-w-[300px]">
              BRN
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700 w-44">
              Additional BRNs
            </th>
            {onRemoveBooking && (
              <th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700 w-20">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {hotelBookings.map((booking, index) => {
            const hotelsForLocation = getHotelsForLocation(booking.cityId);
            const filteredHotels = hotelsForLocation.filter(h => 
              !hotelSearch[index] || 
              (h.name || h.hotelName || '').toLowerCase().includes(hotelSearch[index].toLowerCase())
            );

            return (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-200 p-3 font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="border border-gray-200 p-3">
                  <Select
                    value={booking.cityId || undefined}
                    onValueChange={(value) => onUpdateBooking(index, 'cityId', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full h-11 text-sm font-medium">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations
                        .filter((location) => location.id && location.id.trim() !== '')
                        .map((location) => (
                          <SelectItem key={location.id} value={location.id} className="text-sm py-2">
                            {location.destinationName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-gray-200 p-3">
                  <div className="flex flex-col gap-2">
                    <Select
                      value={booking.hotelId || undefined}
                      onValueChange={(value) => onUpdateBooking(index, 'hotelId', value)}
                      disabled={disabled || !booking.cityId}
                    >
                      <SelectTrigger className="w-full h-11 text-sm font-medium">
                        <SelectValue placeholder="Select hotel" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="px-2 py-2 sticky top-0 bg-white z-10 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search hotels..."
                              className="pl-8 h-10 text-sm"
                              value={hotelSearch[index] || ''}
                              onChange={(e) => setHotelSearch({ ...hotelSearch, [index]: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        {filteredHotels.length > 0 ? (
                          filteredHotels.map((hotel) => (
                            <SelectItem key={hotel.id} value={hotel.id} className="text-sm py-2">
                              {hotel.name || hotel.hotelName}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="py-6 px-2 text-center text-sm text-muted-foreground">
                            {hotelSearch[index] ? 'No hotels matching search' : 'No hotels available'}
                            <div className="mt-4">
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="w-full h-10 text-sm"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setActiveBookingIndex(index);
                                   setQuickAddOpen(true);
                                 }}
                               >
                                 <Plus className="h-4 w-4 mr-2" /> Add New Hotel
                               </Button>
                            </div>
                          </div>
                        )}
                        {filteredHotels.length > 0 && (
                          <div className="border-t p-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="w-full justify-start font-normal text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-10 text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveBookingIndex(index);
                                setQuickAddOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" /> Quick Add Hotel
                            </Button>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </td>
                <td className="border border-gray-200 p-3">
                  <DatePicker
                    value={booking.checkInDate}
                    onChange={(val) => {
                      const selectedDate = val;
                      onUpdateBooking(index, 'checkInDate', selectedDate);
                      const durationValue = durationInputs[index] ?? (booking.checkInDate && booking.checkOutDate ? Math.ceil((new Date(fromDisplayDate(booking.checkOutDate)).getTime() - new Date(fromDisplayDate(booking.checkInDate)).getTime()) / (1000 * 60 * 60 * 24)).toString() : '');
                      const durationNum = parseInt(durationValue, 10);
                      if (!isNaN(durationNum) && durationNum > 0 && selectedDate) {
                        const checkIn = new Date(fromDisplayDate(selectedDate));
                        if (!isNaN(checkIn.getTime())) {
                          const checkOut = new Date(checkIn);
                          checkOut.setDate(checkOut.getDate() + durationNum);
                          if (!isNaN(checkOut.getTime())) {
                            const checkOutStr = toDisplayDate(checkOut.toISOString().split('T')[0]);
                            onUpdateBooking(index, 'checkOutDate', checkOutStr);
                          }
                        }
                      }
                    }}
                    disabled={disabled}
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Days"
                    value={durationInputs[index] ?? (booking.checkInDate && booking.checkOutDate ? Math.ceil((new Date(fromDisplayDate(booking.checkOutDate)).getTime() - new Date(fromDisplayDate(booking.checkInDate)).getTime()) / (1000 * 60 * 60 * 24)).toString() : '')}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setDurationInputs(prev => ({ ...prev, [index]: inputValue }));
                      const durationNum = parseInt(inputValue, 10);
                      if (!isNaN(durationNum) && durationNum > 0 && booking.checkInDate && booking.checkInDate.split('/').length === 3) {
                        const checkIn = new Date(fromDisplayDate(booking.checkInDate));
                        if (!isNaN(checkIn.getTime())) {
                          const checkOut = new Date(checkIn);
                          checkOut.setDate(checkOut.getDate() + durationNum);
                          if (!isNaN(checkOut.getTime())) {
                            const checkOutStr = toDisplayDate(checkOut.toISOString().split('T')[0]);
                            onUpdateBooking(index, 'checkOutDate', checkOutStr);
                          }
                        }
                      }
                    }}
                    className="w-full h-10 text-sm"
                    disabled={disabled}
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <DatePicker
                    value={booking.checkOutDate}
                    onChange={(val) => onUpdateBooking(index, 'checkOutDate', val)}
                    disabled={disabled}
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="text"
                    placeholder="BRN"
                    value={brnInputs[index] ?? (booking.brn?.join(', ') || '')}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setBrnInputs(prev => ({ ...prev, [index]: inputValue }));
                      const brnArray = inputValue.split(',').map(brn => brn.trim()).filter(brn => brn.length > 0);
                      onUpdateBooking(index, 'brn', brnArray);
                    }}
                    className="w-full h-10 text-sm"
                    disabled={disabled}
                  />
                  {booking.additionalBrns && booking.additionalBrns.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1 max-w-[280px]">
                      {booking.additionalBrns.map((sub, sidx) => (
                        <span key={sidx} className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-semibold border border-indigo-100/80">
                          {sub.brnNumber} ({sub.checkInDate || 'N/A'} - {sub.checkOutDate || 'N/A'})
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="border border-gray-200 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedHotelRowIndex(index);
                      setIsBrnDialogOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Manage BRNs ({booking.additionalBrns?.length || 0})
                  </Button>
                </td>
                {onRemoveBooking && (
                  <td className="border border-gray-200 p-3 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveBooking(index)}
                      disabled={disabled}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* Mobile view and bottom buttons remained same but with QuickAdd trigger logic if needed */}
      <div className="lg:hidden space-y-4">
        {hotelBookings.map((booking, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white shadow-sm">
             {/* Simplified mobile view - keeping it basic for now as requested */}
             <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold">Hotel #{index + 1}</span>
                {onRemoveBooking && (
                  <Button variant="ghost" size="sm" onClick={() => onRemoveBooking(index)} className="text-red-500 h-8">Remove</Button>
                )}
             </div>
             <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                   <Label className="text-xs">City</Label>
                   <Select value={booking.cityId || undefined} onValueChange={(val) => onUpdateBooking(index, 'cityId', val)}>
                      <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                      <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.destinationName}</SelectItem>)}</SelectContent>
                   </Select>
                </div>
                <div className="space-y-1">
                   <Label className="text-xs">Hotel</Label>
                   <div className="flex gap-2">
                      <Select value={booking.hotelId || undefined} onValueChange={(val) => onUpdateBooking(index, 'hotelId', val)} disabled={!booking.cityId}>
                         <SelectTrigger className="flex-1"><SelectValue placeholder="Hotel" /></SelectTrigger>
                         <SelectContent>
                            {getHotelsForLocation(booking.cityId).map(h => <SelectItem key={h.id} value={h.id}>{h.name || h.hotelName}</SelectItem>)}
                         </SelectContent>
                      </Select>
                      <Button size="icon" variant="outline" onClick={() => { setActiveBookingIndex(index); setQuickAddOpen(true); }} disabled={!booking.cityId}>
                         <Plus className="h-4 w-4" />
                      </Button>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div className="space-y-1">
                      <Label className="text-xs">Check-in</Label>
                      <DatePicker value={booking.checkInDate} onChange={(val) => onUpdateBooking(index, 'checkInDate', val)} />
                   </div>
                   <div className="space-y-1">
                      <Label className="text-xs">Check-out</Label>
                      <DatePicker value={booking.checkOutDate} onChange={(val) => onUpdateBooking(index, 'checkOutDate', val)} />
                   </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">BRN</Label>
                    <Input value={brnInputs[index] ?? (booking.brn?.join(', ') || '')} onChange={(e) => { setBrnInputs({...brnInputs, [index]: e.target.value}); onUpdateBooking(index, 'brn', e.target.value.split(',').map(s => s.trim()).filter(Boolean)); }} />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs">Additional BRNs</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHotelRowIndex(index);
                        setIsBrnDialogOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Manage Additional BRNs ({booking.additionalBrns?.length || 0})
                    </Button>
                 </div>
             </div>
          </div>
        ))}
      </div>

      {showAddButton && onAddBooking && (
        <div className="mt-4">
          <Button type="button" variant="outline" onClick={onAddBooking} disabled={disabled} className="w-full lg:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Hotel Booking
          </Button>
        </div>
      )}

      <QuickAddHotelDialog 
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSuccess={handleQuickAddSuccess}
        initialCityId={activeBookingIndex !== null ? hotelBookings[activeBookingIndex].cityId : undefined}
      />

      <AdditionalBrnsDialog
        isOpen={isBrnDialogOpen}
        onClose={() => {
          setIsBrnDialogOpen(false);
          setSelectedHotelRowIndex(null);
        }}
        hotelName={
          selectedHotelRowIndex !== null && hotelBookings[selectedHotelRowIndex]
            ? hotels.find(h => h.id === hotelBookings[selectedHotelRowIndex].hotelId)?.name || 
              hotels.find(h => h.id === hotelBookings[selectedHotelRowIndex].hotelId)?.hotelName || 
              'Selected Hotel'
            : ''
        }
        initialBrns={
          selectedHotelRowIndex !== null && hotelBookings[selectedHotelRowIndex]
            ? hotelBookings[selectedHotelRowIndex].additionalBrns
            : []
        }
        onSave={(updatedBrns) => {
          if (selectedHotelRowIndex !== null) {
            onUpdateBooking(selectedHotelRowIndex, 'additionalBrns' as any, updatedBrns as any);
          }
        }}
        disabled={disabled}
      />
    </>
  );
};
