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
    <div className={cn("relative inline-flex items-center", className)}>
      <Input
        type="date"
        value={internalValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "w-full h-full text-xs font-medium bg-white border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all pl-2.5 pr-7",
          "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
          !internalValue && "text-muted-foreground"
        )}
      />
      <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
    </div>
  )
}
