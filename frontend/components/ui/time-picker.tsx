"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"

interface TimePickerProps {
  value: string // Format: "HH:mm"
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function TimePicker({ value, onChange, disabled, className }: TimePickerProps) {
  const [displayValue, setDisplayValue] = React.useState(value || '')

  React.useEffect(() => {
    // Format the value to HH:mm if it's valid
    if (value) {
      const formatted = formatTimeValue(value)
      setDisplayValue(formatted)
    } else {
      setDisplayValue('')
    }
  }, [value])

  const formatTimeValue = (time: string): string => {
    // If already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(time)) {
      return time
    }
    
    // Remove any non-digit characters
    const digits = time.replace(/\D/g, '')
    
    if (digits.length === 0) return ''
    if (digits.length <= 2) return digits
    if (digits.length >= 3) {
      // Format as HH:mm
      const hours = digits.slice(0, 2)
      const minutes = digits.slice(2, 4)
      return `${hours}:${minutes}`
    }
    
    return time
  }

  const validateTime = (timeStr: string): string | null => {
    if (!timeStr || timeStr.length !== 5) return null
    
    const [hours, minutes] = timeStr.split(':')
    if (!hours || !minutes) return null
    
    const h = parseInt(hours, 10)
    const m = parseInt(minutes, 10)
    
    if (isNaN(h) || isNaN(m)) return null
    if (h < 0 || h > 23) return null
    if (m < 0 || m > 59) return null
    
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    
    // Allow backspace/delete
    if (input.length < displayValue.length) {
      setDisplayValue(input)
      if (input === '') {
        onChange('')
      }
      return
    }
    
    const formatted = formatTimeValue(input)
    setDisplayValue(formatted)
    
    // Validate and call onChange only if we have a complete valid time
    const validated = validateTime(formatted)
    if (validated) {
      onChange(validated)
    }
  }

  const handleBlur = () => {
    // On blur, ensure we have a valid time
    const validated = validateTime(displayValue)
    if (validated) {
      setDisplayValue(validated)
      onChange(validated)
    } else if (displayValue) {
      // If invalid, try to fix or clear
      const digits = displayValue.replace(/\D/g, '')
      if (digits.length === 0) {
        setDisplayValue('')
        onChange('')
      } else if (digits.length <= 2) {
        // Only hours entered, pad with :00
        const hours = digits.padStart(2, '0')
        const fixed = parseInt(hours) <= 23 ? `${hours}:00` : '00:00'
        setDisplayValue(fixed)
        onChange(fixed)
      } else if (digits.length === 3) {
        // Hours + 1 minute digit, pad minutes
        const hours = digits.slice(0, 2)
        const minutes = `0${digits[2]}`
        const fixed = `${hours}:${minutes}`
        setDisplayValue(fixed)
        onChange(fixed)
      } else {
        // Invalid format, reset to empty or last valid value
        setDisplayValue(value || '')
      }
    }
  }

  return (
    <div className={cn("relative w-full min-w-[140px]", className)}>
      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none group-focus-within:text-primary transition-colors" />
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="HH:MM"
        maxLength={5}
        className="pl-10 h-10 font-mono text-sm tracking-widest bg-white border-gray-200 hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-center"
        pattern="[0-9]{2}:[0-9]{2}"
      />
    </div>
  )
}

