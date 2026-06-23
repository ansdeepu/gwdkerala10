"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { enUS } from "date-fns/locale"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: CalendarProps) {
  const [month, setMonth] = React.useState<Date>(new Date())

  // Year range 2010 → 2050
  const years = Array.from({ length: 41 }, (_, i) => 2010 + i)
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  return (
    <DayPicker
      month={month}
      onMonthChange={setMonth}
      locale={{ ...enUS, options: { weekStartsOn: 0 } }} // Sunday first
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      formatters={{
        formatWeekdayName: (day) => format(day, "eee"),
      }}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-center items-center gap-2",
        caption_label: "hidden", // using custom dropdowns
        nav: "hidden", // hide arrows
        table: "w-full border-collapse table-fixed", // fix width
        head_row: "table-row",
        head_cell:
          "table-cell text-center text-xs font-semibold text-muted-foreground p-1",
        row: "table-row",
        cell: "table-cell text-center align-middle p-1",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "p-0 w-8 h-8 font-normal rounded-full aria-selected:bg-primary aria-selected:text-primary-foreground"
        ),
        day_today: "bg-accent/20 text-accent-foreground rounded-full",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_hidden: "invisible",
        ...classNames,
      }}
      modifiers={{
        sunday: (date) => date.getDay() === 0,
      }}
      modifiersClassNames={{
        sunday: "text-red-600 font-semibold",
      }}
      components={{
        Caption: () => (
          <div className="flex items-center justify-center gap-2 mb-2">
            {/* Month Picker */}
            <select
              className="rounded-md border px-2 py-1 text-sm bg-background"
              value={month.getMonth()}
              onInput={(e) => {
                const newMonth = new Date(month)
                newMonth.setMonth(Number((e.target as HTMLSelectElement).value))
                setMonth(newMonth)
              }}
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            {/* Year Picker */}
            <select
              className="rounded-md border px-2 py-1 text-sm bg-background"
              value={month.getFullYear()}
              onInput={(e) => {
                const newMonth = new Date(month)
                newMonth.setFullYear(Number((e.target as HTMLSelectElement).value))
                setMonth(newMonth)
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
