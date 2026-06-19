import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { UploadCloud, File, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Step1Data, Step3Data, Step6Data } from '@/lib/umrah/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';


interface DocumentsStepProps {
  data: Step6Data;
  step1Data: Step1Data;
  step3Data: Step3Data;
  onChange: (data: Partial<Step6Data>) => void;
  disabled?: boolean;
  passengerCount: number;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({
  data,
  step1Data,
  step3Data,
  onChange,
  disabled = false,
  passengerCount,
}) => {
  // Determine bookingMode and accommodationType
  const hasGroupNumber = step1Data.bookingMode === 'group_number';
  const accommodationType = step3Data.accommodationType;

  // Helper: Get files list for a given field name safely
  const getFieldFiles = (field: keyof Step6Data): File[] => {
    const val = data[field];
    return Array.isArray(val) ? (val as File[]) : [];
  };

  const handleFilesSelectForField = (field: keyof Step6Data, newFiles: FileList | File[]) => {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const currentFiles = getFieldFiles(field);
    const validFiles: File[] = [...currentFiles];

    Array.from(newFiles).forEach(file => {
      // Validate file type
      const isValidType = /jpeg|jpg|png|pdf|zip|heic|heif|webp/.test(file.type.toLowerCase()) || 
                          /\.(zip|pdf|jpg|jpeg|png|heic|heif|webp)$/i.test(file.name);
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid file type. Please upload images (JPG, PNG, HEIC, WEBP), PDFs or ZIP.`);
        return;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 50MB size limit.`);
        return;
      }

      validFiles.push(file);
    });

    onChange({ [field]: validFiles });

    // Initialize/extend passportNumbers if passengerPhotos changed
    if (field === 'passengerPhotos') {
      const currentPassportNumbers = data.passportNumbers || [];
      const newPassportNumbers = [...currentPassportNumbers];
      while (newPassportNumbers.length < validFiles.length) {
        newPassportNumbers.push('');
      }
      onChange({ passportNumbers: newPassportNumbers });
    }
  };

  const handleRemoveFileForField = (field: keyof Step6Data, index: number) => {
    const currentFiles = getFieldFiles(field);
    const updatedFiles = [...currentFiles];
    updatedFiles.splice(index, 1);
    
    const updates: Partial<Step6Data> = { [field]: updatedFiles };
    
    // Also remove corresponding passport number entry if passengerPhotos changed
    if (field === 'passengerPhotos' && data.passportNumbers) {
      const updatedPassportNumbers = [...data.passportNumbers];
      updatedPassportNumbers.splice(index, 1);
      updates.passportNumbers = updatedPassportNumbers;
    }

    // Clear confirmation if no files are remaining in ticket fields
    if (updatedFiles.length === 0) {
      if (field === 'onwardTickets') {
        updates.onwardTicketConfirmed = false;
      } else if (field === 'returnTickets') {
        updates.returnTicketConfirmed = false;
      }
    }
    
    onChange(updates);
  };

  const handlePassportNumberChange = (index: number, val: string) => {
    const currentNumbers = data.passportNumbers || [];
    const updatedNumbers = [...currentNumbers];
    updatedNumbers[index] = val;
    onChange({ passportNumbers: updatedNumbers });
  };

  // Generate dynamic instructions based on conditions
  const getInstructions = () => {
    const baseWarning = "Ensure all required documents are attached. Individual files should not exceed 50MB. Bookings without proper documentation will be subject to cancellation.";
    
    let requiredDocs: string[] = [];

    if (hasGroupNumber && accommodationType === 'hotel') {
      requiredDocs = ['PAN card copy of passengers'];
    } else if (hasGroupNumber && accommodationType === 'iqama') {
      requiredDocs = ['PAN card copy of passengers', 'Iqama copy of Sponsor'];
    } else if (!hasGroupNumber && accommodationType === 'hotel') {
      requiredDocs = [
        'Passport front and back of all passengers',
        'Passport sized photo of each passenger',
        'Onward Flight Ticket copy',
        'Return Flight Ticket copy'
      ];
    } else if (!hasGroupNumber && accommodationType === 'iqama') {
      requiredDocs = [
        'Passport front and back of all passengers',
        'Passport sized photo of each passenger',
        'Iqama copy of Sponsor',
        'Onward Flight Ticket copy',
        'Return Flight Ticket copy'
      ];
    } else {
      requiredDocs = ['All required documents as per your booking type'];
    }

    return { baseWarning, requiredDocs };
  };

  const { baseWarning, requiredDocs } = getInstructions();

  // Reusable Section Uploader Component
  const SectionUploader = ({ 
    field, 
    label, 
    description, 
    required = false, 
    showPassportLabel = false,
    showTicketConfirmation = false
  }: { 
    field: keyof Step6Data; 
    label: string; 
    description: string; 
    required?: boolean; 
    showPassportLabel?: boolean;
    showTicketConfirmation?: boolean;
  }) => {
    const files = getFieldFiles(field);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    return (
      <Card className="p-4 rounded-xl border border-secondary/10 bg-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-bold text-primary uppercase tracking-wider">
                {label} {required && <span className="text-destructive">*</span>}
              </h5>
              {files.length > 0 && (
                <Badge variant="secondary" className="text-[9px] font-bold bg-primary/5 text-primary">
                  {files.length} {files.length === 1 ? 'file' : 'files'}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length > 0) {
              handleFilesSelectForField(field, e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative group overflow-hidden rounded-xl border-2 border-dashed transition-all cursor-pointer p-4 flex flex-col items-center justify-center min-h-[90px]",
            dragging
              ? "bg-primary/5 border-primary shadow-sm"
              : "bg-gray-50/50 border-secondary/20 hover:bg-white hover:border-primary/40"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.zip,.heic,.heif,.webp"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFilesSelectForField(field, e.target.files);
              }
            }}
            disabled={disabled}
            className="hidden"
          />
          <UploadCloud className="h-5 w-5 text-secondary group-hover:text-primary mb-1.5 transition-all" />
          <p className="text-[9px] font-bold text-primary uppercase tracking-wide">
            {dragging ? 'Drop files here' : 'Drag & drop or click to upload'}
          </p>
        </div>

        {/* File Cards */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file: File, index: number) => (
              <div key={index} className="p-3 rounded-xl bg-gray-50/50 border border-secondary/5 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                  <div className="h-7 w-7 rounded bg-primary/5 flex items-center justify-center text-primary flex-shrink-0">
                    <File className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-primary truncate uppercase tracking-tight" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[8px] text-muted-foreground font-medium">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {/* Passport Number Label Input (for Passenger Photos) */}
                {showPassportLabel && (
                  <div className="w-full sm:w-44 flex flex-col gap-1">
                    <Label className="text-[8px] font-bold text-primary/60 uppercase">Passport Number *</Label>
                    <Input
                      placeholder="e.g. P1234567"
                      value={(data.passportNumbers || [])[index] || ''}
                      onChange={(e) => handlePassportNumberChange(index, e.target.value.toUpperCase())}
                      className="h-7 text-[10px] uppercase font-bold"
                      disabled={disabled}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveFileForField(field, index)}
                  className="h-6 w-6 rounded-full hover:bg-destructive/10 flex items-center justify-center text-destructive/40 hover:text-destructive transition-all self-end sm:self-auto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ticket Validity Confirmation */}
        {showTicketConfirmation && files.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50/45 border border-amber-500/20 flex items-start gap-3 mt-2 animate-in fade-in duration-300">
            <Checkbox
              id={`${field}-confirm`}
              checked={
                field === 'onwardTickets'
                  ? !!data.onwardTicketConfirmed
                  : !!data.returnTicketConfirmed
              }
              onCheckedChange={(checked) => {
                if (field === 'onwardTickets') {
                  onChange({ onwardTicketConfirmed: !!checked });
                } else if (field === 'returnTickets') {
                  onChange({ returnTicketConfirmed: !!checked });
                }
              }}
              className="mt-0.5 border-amber-500/50 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 focus-visible:ring-amber-500"
              disabled={disabled}
            />
            <div className="space-y-1">
              <label
                htmlFor={`${field}-confirm`}
                className="text-[10px] font-bold text-amber-900 cursor-pointer select-none leading-normal uppercase tracking-wider block"
              >
                Ticket Declaration & Confirmation
              </label>
              <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                I declare and confirm that this is a valid ticket and represents the exact itinerary the pilgrim will use to travel.
              </p>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sample Image - Displayed above upload */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 bg-primary rounded-full" />
          <h5 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Sample Documentation</h5>
        </div>
        <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border-4 border-white bg-gray-100 group transition-all hover:shadow-md">
          <Image
            src="/documentdemo.jpeg"
            alt="Sample Documents Guide"
            width={1200}
            height={400}
            className="w-full h-auto object-cover max-h-[200px]"
            unoptimized
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-secondary/10 pb-4">
        <div>
          <h4 className="text-lg font-bold text-primary uppercase tracking-tight">Documents Upload</h4>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5 opacity-60">
            Upload files in their corresponding categories (Max 50MB per file)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          
          {/* Section 1: Passport copies (mandatory if no group number) */}
          {!hasGroupNumber && (
            <SectionUploader 
              field="passportCopies"
              label="Passport Copies"
              description={`Passport front and back pages. Exactly ${passengerCount} files are required.`}
              required
            />
          )}

          {/* Section 2: Passenger photo (mandatory if no group number) */}
          {!hasGroupNumber && (
            <SectionUploader 
              field="passengerPhotos"
              label="Passenger Photos"
              description={`Passport size white background photos. Exactly ${passengerCount} files are required.`}
              required
              showPassportLabel
            />
          )}

          {/* Section 3: Pan card copies (optional) */}
          <SectionUploader 
            field="panCardCopies"
            label="PAN Card Copies"
            description="PAN card copy of passengers. (Optional)"
          />

          {/* Section 4: Iqama copies (mandatory for individual iqama bookings) */}
          {accommodationType === 'iqama' && (
            <SectionUploader 
              field="iqamaCopies"
              label="Iqama Copies"
              description="Sponsor's Iqama copy. (Required)"
              required
            />
          )}

          {/* Section 5: Onward Flight Ticket (mandatory) */}
          <SectionUploader 
            field="onwardTickets"
            label="Onward Flight Tickets"
            description="Onward flight reservation or ticket copies. (Required)"
            required
            showTicketConfirmation
          />

          {/* Section 6: Return Flight Ticket (mandatory) */}
          <SectionUploader 
            field="returnTickets"
            label="Return Flight Tickets"
            description="Return flight reservation or ticket copies. (Required)"
            required
            showTicketConfirmation
          />

          {/* Section 7: National Address (optional) */}
          <SectionUploader 
            field="nationalAddresses"
            label="National Address Copy"
            description="National Address verification document or short address copy. (Optional)"
          />

        </div>

        {/* Instructions Sidebar - Compact */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0B1120] text-white space-y-4 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                 <div className="h-0.5 w-4 bg-secondary rounded-full" />
                 <h6 className="text-[9px] font-bold text-secondary uppercase tracking-[0.2em]">Important Instructions</h6>
              </div>
              <p className="text-[11px] font-medium text-gray-300 leading-relaxed italic border-l-2 border-secondary/30 pl-3 py-0.5">
                "{baseWarning}"
              </p>
            </div>

            <div className="space-y-3 relative z-10">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.1em]">Required Documents</p>
              <div className="grid grid-cols-1 gap-2">
                {requiredDocs.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2.5">
                    <div className="h-1 w-1 rounded-full bg-secondary shadow-lg shadow-secondary/50" />
                    <span className="text-[10px] font-bold text-gray-200 uppercase tracking-wide">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 relative z-10">
              <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase tracking-widest text-center">
                Ensure passenger photos are labeled with the correct passport number.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
