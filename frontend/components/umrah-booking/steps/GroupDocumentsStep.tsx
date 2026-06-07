import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { UploadCloud, File, X, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Step5Data, Step1Data, Step3Data } from '@/lib/umrah/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface GroupDocumentsStepProps {
  data: Step5Data & { documents?: File[] };
  step1Data: Step1Data;
  step3Data: Step3Data;
  onChange: (data: Partial<Step5Data | { documents: File[] }>) => void;
  onStep1DataChange: (data: Partial<Step1Data>) => void;
  onAddPassenger: () => void;
  onRemovePassenger: (index: number) => void;
  disabled?: boolean;
}

export const GroupDocumentsStep: React.FC<GroupDocumentsStepProps> = ({
  data,
  step1Data,
  step3Data,
  onChange,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get uploaded files
  const uploadedFiles = data.documents || [];

  const handleFilesSelect = (newFiles: FileList | File[]) => {
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const validFiles: File[] = [...uploadedFiles];
    let hasError = false;

    Array.from(newFiles).forEach(file => {
      // Validate file type - Expanded to include HEIC/HEIF and WEBP
      const isValidType = /jpeg|jpg|png|pdf|zip|heic|heif|webp/.test(file.type.toLowerCase()) || 
                          /\.(zip|pdf|jpg|jpeg|png|heic|heif|webp)$/i.test(file.name);
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid file type. Please upload images (JPG, PNG, HEIC, WEBP), PDFs or ZIP.`);
        hasError = true;
        return;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 20MB size limit.`);
        hasError = true;
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      onChange({ documents: validFiles });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = [...uploadedFiles];
    updatedFiles.splice(index, 1);
    onChange({ documents: updatedFiles });
    if (updatedFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
            className="w-full h-auto object-cover max-h-[250px]"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div class="flex flex-col sm:items-start gap-1 border-b border-secondary/10 pb-4">
        <h4 className="text-lg font-bold text-primary uppercase tracking-tight">Group Documentation Upload</h4>
        <p className="text-[10px] text-muted-foreground font-medium opacity-60">
          Upload individual images (JPG, PNG, HEIC), PDFs or a ZIP file containing all required documents (Max 20MB per file)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative group overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-700 cursor-pointer min-h-[150px] flex items-center justify-center",
              isDragging
                ? "bg-primary/5 border-primary shadow-lg scale-[1.01]"
                : "bg-gray-50/50 border-secondary/20 hover:bg-white hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.zip,.heic,.heif"
              onChange={handleFileInputChange}
              disabled={disabled}
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-700 shadow-md",
                isDragging 
                  ? "bg-primary text-white" 
                  : "bg-white text-secondary border border-secondary/10 group-hover:bg-primary group-hover:text-white"
              )}>
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-primary tracking-tight mb-0.5 uppercase">
                {isDragging ? 'Drop files now' : 'Click to upload multiple files'}
              </p>
              <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                JPG, PNG, HEIC, PDF or ZIP (Max 20MB each)
              </p>
            </div>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-primary/40 uppercase tracking-widest mb-3">Attached Files ({uploadedFiles.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="p-3 rounded-xl bg-white border border-secondary/10 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all animate-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        {file.name.toLowerCase().endsWith('.pdf') ? <FileText className="h-4 w-4" /> : <File className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-primary truncate uppercase tracking-tight">{file.name}</p>
                        <p className="text-[8px] text-muted-foreground font-medium">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(index); }}
                      className="h-6 w-6 rounded-full hover:bg-destructive/10 flex items-center justify-center text-destructive/40 hover:text-destructive transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                "Ensure all documentation for the group is attached. Submissions without proper documentation (PAN Cards, Passports, etc.) will be subject to cancellation."
              </p>
            </div>

            <div className="pt-4 border-t border-white/5 relative z-10">
              <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase tracking-widest text-center">
                Supported: JPG, PNG, HEIC, PDF, ZIP
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
