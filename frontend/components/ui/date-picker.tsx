"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Calendar } from "lucide-react"
import { toDisplayDate, fromDisplayDate } from "@/lib/umrah/validation"

interface DatePickerProps {
  value: string // Expects DD/MM/YY or YYYY-MM-DD
  onChange: (value: string) => void // Returns DD/MM/YY
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function DatePicker({ value, onChange, disabled, className, placeholder = "DD/MM/YYYY" }: DatePickerProps) {
  // Convert incoming value to YYYY-MM-DD for the native input
  const internalValue = fromDisplayDate(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value; // This will be YYYY-MM-DD
    if (!newValue) {
      onChange("");
      return;
    }
    // Convert back to DD/MM/YY for the parent state
    onChange(toDisplayDate(newValue));
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        type="date"
        value={internalValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "h-10 pr-10 font-medium text-sm bg-white border-gray-200 hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all",
          !internalValue && "text-muted-foreground"
        )}
      />
      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  )
}
