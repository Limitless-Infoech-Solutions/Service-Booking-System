"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Fixed demo data — in a real app these would come from your booking API,
// scoped to the stylist/branch and how long the selected services take.
const TIME_SECTIONS = [
  {
    label: "Morning",
    slots: ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM"],
  },
  {
    label: "Afternoon",
    slots: [
      "12:00 PM",
      "12:30 PM",
      "1:00 PM",
      "1:30 PM",
      "2:00 PM",
      "2:30 PM",
      "3:00 PM",
      "3:30 PM",
    ],
  },
  {
    label: "Evening",
    slots: ["4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"],
  },
];

// Slots that are already booked, for demo purposes.
const UNAVAILABLE_SLOTS = new Set(["10:00 AM", "1:00 PM", "3:30 PM", "5:30 PM"]);

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Builds a 6-row calendar grid for the given month, padded with the
// leading/trailing days needed to fill full weeks.
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export default function DateTimeStep({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const monthGrid = useMemo(
    () => buildMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth]
  );

  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const isCurrentMonth =
    visibleMonth.getFullYear() === today.getFullYear() &&
    visibleMonth.getMonth() === today.getMonth();

  const goToPrevMonth = () => {
    if (isCurrentMonth) return;
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
    );
  };

  return (
    <>
      {/* Heading */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#6862b5] sm:text-xs">
          Book an appointment
        </p>

        <h1 className="mt-2 text-4xl font-medium tracking-[-0.04em] text-slate-900 sm:text-5xl">
          Choose date &amp; time
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Pick a day and a time slot that works for you. You can always
          reschedule later.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Calendar */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDays size={17} strokeWidth={1.8} className="text-[#6862b5]" />
              {monthLabel}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goToPrevMonth}
                disabled={isCurrentMonth}
                aria-label="Previous month"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={goToNextMonth}
                aria-label="Next month"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-slate-600 transition hover:bg-slate-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          {/* Days */}
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthGrid.map((date, index) => {
              if (!date) {
                return <span key={`blank-${index}`} />;
              }

              const isPast = date < today;
              const isToday = isSameDay(date, today);
              const isSelected =
                selectedDate && isSameDay(date, selectedDate);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={isPast}
                  onClick={() => onSelectDate(date)}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition ${
                    isSelected
                      ? "bg-slate-900 text-white"
                      : isPast
                        ? "cursor-not-allowed text-slate-300"
                        : "text-slate-700 hover:bg-[#f3efff] hover:text-[#6862b5]"
                  }`}
                >
                  {date.getDate()}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#6862b5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Clock size={17} strokeWidth={1.8} className="text-[#6862b5]" />
            Available times
            {selectedDate && (
              <span className="font-normal text-slate-400">
                for{" "}
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {!selectedDate ? (
            <div className="mt-6 rounded-xl border border-dashed border-black/10 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">
                Pick a date first
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Available time slots will show up here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {TIME_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {section.label}
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {section.slots.map((slot) => {
                      const unavailable = UNAVAILABLE_SLOTS.has(slot);
                      const selected = selectedTime === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={unavailable}
                          onClick={() => onSelectTime(slot)}
                          className={`h-10 rounded-xl border text-sm font-medium transition ${
                            selected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : unavailable
                                ? "cursor-not-allowed border-black/5 bg-slate-50 text-slate-300 line-through"
                                : "border-black/10 bg-white text-slate-700 hover:border-[#6862b5] hover:text-[#6862b5]"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}