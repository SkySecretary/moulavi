"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TimePickerProps {
  value: string // Format: "HH:mm"
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

/**
 * An Ultra-Compact 24-Hour TimePicker.
 * Looks like a standard small input with an internal clickable icon.
 */
export function TimePicker({ value, onChange, disabled, className, placeholder = "20:30" }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [localValue, setLocalValue] = React.useState("")

  // Synchronization
  React.useEffect(() => {
    if (value) {
      let timePart = value
      if (value.includes('T')) {
        timePart = value.split('T')[1].slice(0, 5)
      }
      if (/^\d{1,2}:\d{2}/.test(timePart)) {
        const [h, m] = timePart.split(':')
        const formatted = `${h.padStart(2, '0')}:${m.slice(0, 2)}`
        if (formatted !== localValue) setLocalValue(formatted)
      } else {
        const formatted = timePart.slice(0, 5)
        if (formatted !== localValue) setLocalValue(formatted)
      }
    } else {
      if (localValue !== "") setLocalValue("")
    }
  }, [value])

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "")
    if (val.length > 4) val = val.slice(0, 4)
    
    let formatted = val
    if (val.length >= 3) {
      formatted = val.slice(0, 2) + ":" + val.slice(2)
    } else if (val.length > 0) {
      formatted = val
    }
    
    setLocalValue(formatted)
    
    if (formatted.length === 5) {
      const [h, m] = formatted.split(":").map(Number)
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        onChange(formatted)
      }
    }
  }

  const handleBlur = () => {
    if (!localValue) {
      onChange("")
      return
    }

    const digits = localValue.replace(/\D/g, "")
    if (digits.length === 0) {
      setLocalValue("")
      onChange("")
      return
    }

    let h = 0, m = 0
    if (digits.length <= 2) {
      h = Math.min(parseInt(digits) || 0, 23)
      m = 0
    } else {
      h = Math.min(parseInt(digits.slice(0, 2)) || 0, 23)
      m = Math.min(parseInt(digits.slice(2)) || 0, 59)
    }

    const finalValue = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    setLocalValue(finalValue)
    onChange(finalValue)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  const selectHour = (h: string) => {
    const currentM = localValue.includes(':') ? localValue.split(':')[1] : "00"
    const newVal = `${h}:${currentM}`
    setLocalValue(newVal)
    onChange(newVal)
  }

  const selectMinute = (m: string) => {
    const currentH = localValue.includes(':') ? localValue.split(':')[0] : "12"
    const newVal = `${currentH}:${m}`
    setLocalValue(newVal)
    onChange(newVal)
    setIsOpen(false)
  }

  const currentHour = localValue.includes(':') ? localValue.split(':')[0] : "12"
  const currentMinute = localValue.includes(':') ? localValue.split(':')[1] : "00"

  return (
    <div className={cn("relative inline-block w-[90px]", className)}>
      <div className={cn(
        "flex items-center border border-slate-200 rounded-md bg-white transition-all h-9 group",
        "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20",
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        {/* PLAIN INPUT AREA */}
        <input
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={5}
          className={cn(
            "w-full bg-transparent border-0 pl-2 pr-7 py-0 font-bold text-xs text-slate-900 placeholder:text-slate-300 transition-all",
            "focus:outline-none focus:ring-0"
          )}
        />

        {/* CLICKABLE ICON INSIDE INPUT */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="absolute right-0 top-0 bottom-0 px-1.5 flex items-center justify-center text-slate-400 hover:text-primary transition-colors border-l border-slate-50"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-0 shadow-2xl border-primary/10" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="flex h-[200px] divide-x divide-border bg-white rounded-md overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="flex flex-col p-1">
                  <div className="px-2 py-1.5 text-[8px] font-black text-muted-foreground uppercase tracking-widest text-center border-b mb-1">Hour</div>
                  {hours.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        selectHour(h)
                      }}
                      className={cn(
                        "flex items-center justify-center rounded px-2 py-1.5 text-xs font-bold transition-colors mb-0.5",
                        currentHour === h ? "bg-primary text-white" : "hover:bg-primary/10 text-slate-700"
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <ScrollArea className="flex-1">
                <div className="flex flex-col p-1">
                  <div className="px-2 py-1.5 text-[8px] font-black text-muted-foreground uppercase tracking-widest text-center border-b mb-1">Min</div>
                  {minutes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        selectMinute(m)
                      }}
                      className={cn(
                        "flex items-center justify-center rounded px-2 py-1.5 text-xs font-bold transition-colors mb-0.5",
                        currentMinute === m ? "bg-primary text-white" : "hover:bg-primary/10 text-slate-700"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
