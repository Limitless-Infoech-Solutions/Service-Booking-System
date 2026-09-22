"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

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

function formatTime(time) {
  const [hours, minutes] = time.split(":").map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getTimeSection(time) {
  const [hours] = time.split(":").map(Number);

  if (hours < 12) {
    return "Morning";
  }

  if (hours < 16) {
    return "Afternoon";
  }

  return "Evening";
}

export default function DateTimeStep({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  serviceIds,
}) {
  const today = useMemo(
    () => startOfDay(new Date()),
    []
  );

  const [visibleMonth, setVisibleMonth] = useState(
    () =>
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
  );

  // Stores the complete API slot objects.
  // Example:
  // {
  //   time: "09:00",
  //   status: "available",
  //   allocationType: "single_staff"
  // }
  const [slots, setSlots] = useState([]);

  const [loadingSlots, setLoadingSlots] =
    useState(false);

  const [availabilityError, setAvailabilityError] =
    useState("");

  const monthGrid = useMemo(
    () =>
      buildMonthGrid(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth()
      ),
    [visibleMonth]
  );

  const monthLabel = visibleMonth.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );

  const isCurrentMonth =
    visibleMonth.getFullYear() ===
      today.getFullYear() &&
    visibleMonth.getMonth() === today.getMonth();

  const goToPrevMonth = () => {
    if (isCurrentMonth) return;

    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1
        )
    );
  };

  const goToNextMonth = () => {
    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1
        )
    );
  };

  // -----------------------------------------
  // Fetch real availability when date changes
  // -----------------------------------------

  useEffect(() => {
    if (!selectedDate || !serviceIds?.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlots([]);
      return;
    }

    async function fetchAvailability() {
      setLoadingSlots(true);
      setAvailabilityError("");
      setSlots([]);

      const year = selectedDate.getFullYear();

      const month = String(
        selectedDate.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        selectedDate.getDate()
      ).padStart(2, "0");

      const dateString = `${year}-${month}-${day}`;

      try {
        const response = await fetch(
          `/api/services/availability?date=${dateString}&services=${serviceIds.join(",")}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load available times."
          );
        }

        const apiSlots = data.slots || [];

        setSlots(apiSlots);

        // Only AVAILABLE slots can remain selected.
        const selectedSlotStillAvailable =
          apiSlots.some(
            (slot) =>
              slot.time === selectedTime &&
              slot.status === "available"
          );

        if (
          selectedTime &&
          !selectedSlotStillAvailable
        ) {
          onSelectTime(null);
        }
      } catch (error) {
        console.error(
          "Availability error:",
          error
        );

        setAvailabilityError(
          "Unable to load available times. Please try again."
        );

        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchAvailability();
  }, [
    selectedDate,
    serviceIds,
    selectedTime,
    onSelectTime,
  ]);

  // -----------------------------------------
  // Group API slots into Morning / Afternoon /
  // Evening sections
  // -----------------------------------------

  const timeSections = useMemo(() => {
    const sections = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };

    slots.forEach((slot) => {
      const section = getTimeSection(slot.time);

      sections[section].push(slot);
    });

    return Object.entries(sections)
      .filter(([, sectionSlots]) => sectionSlots.length > 0)
      .map(([label, sectionSlots]) => ({
        label,
        slots: sectionSlots,
      }));
  }, [slots]);

  return (
    <>
      {/* Heading */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#6862b5] sm:text-xs">
          Book an appointment
        </p>

        <h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] text-slate-900 sm:text-5xl">
          Choose date &amp; time
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Pick a day and a time slot that works
          for you. You can always reschedule
          later.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Calendar */}
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDays
                size={17}
                strokeWidth={1.8}
                className="shrink-0 text-[#6862b5]"
              />

              <span className="truncate">
                {monthLabel}
              </span>
            </div>

            <div className="ml-3 flex shrink-0 items-center gap-1.5">
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

          {/* Weekdays */}
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400 sm:text-[11px]">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          {/* Days */}
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthGrid.map((date, index) => {
              if (!date) {
                return (
                  <span
                    key={`blank-${index}`}
                    className="aspect-square"
                  />
                );
              }

              const isPast = date < today;

              const isToday = isSameDay(
                date,
                today
              );

              const isSelected =
                selectedDate &&
                isSameDay(date, selectedDate);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={isPast}
                  onClick={() =>
                    onSelectDate(date)
                  }
                  className={`mx-auto flex aspect-square w-full max-w-10 items-center justify-center rounded-full text-sm font-medium transition ${
                    isSelected
                      ? "bg-slate-900 text-white"
                      : isPast
                      ? "cursor-not-allowed text-slate-300"
                      : "text-slate-700 hover:bg-[#f3efff] hover:text-[#6862b5]"
                  }`}
                >
                  {date.getDate()}

                  {isToday && !isSelected && (
                    <span className="absolute" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-2 text-sm font-semibold text-slate-900">
            <Clock
              size={17}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-[#6862b5]"
            />

            <div>
              Available times

              {selectedDate && (
                <span className="ml-1 font-normal text-slate-400">
                  for{" "}
                  {selectedDate.toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }
                  )}
                </span>
              )}
            </div>
          </div>

          {!selectedDate ? (
            <div className="mt-5 rounded-xl border border-dashed border-black/10 px-4 py-8 text-center sm:py-10">
              <p className="text-sm font-medium text-slate-600">
                Pick a date first
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Available time slots will show
                up here.
              </p>
            </div>
          ) : loadingSlots ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-xl border border-black/10 px-4 py-5">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Array.from({ length: 9 }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="h-10 animate-pulse rounded-xl bg-slate-100"
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          ) : availabilityError ? (
            <div className="mt-5 rounded-xl border border-dashed border-red-200 bg-red-50 px-4 py-8 text-center sm:py-10">
              <p className="text-sm font-medium text-red-600">
                {availabilityError}
              </p>
            </div>
          ) : timeSections.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-black/10 px-4 py-8 text-center sm:py-10">
              <p className="text-sm font-medium text-slate-600">
                No time slots available
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Please choose another date.
              </p>
            </div>
          ) : (
            <div className="mt-5 max-h-140 space-y-5 overflow-y-auto pr-2">
  {timeSections.map((section) => (
                <div key={section.label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {section.label}
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {section.slots.map((slot) => {
                      const isAvailable =
                        slot.status ===
                        "available";

                      const selected =
                        selectedTime ===
                        slot.time;

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => {
                            if (isAvailable) {
                              onSelectTime(
                                slot.time
                              );
                            }
                          }}
                          className={`relative h-10 rounded-xl border text-sm font-medium transition ${
                            selected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : isAvailable
                              ? "border-black/10 bg-white text-slate-700 hover:border-[#6862b5] hover:text-[#6862b5]"
                              : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                          }`}
                        >
                          {formatTime(
                            slot.time
                          )}

                          {!isAvailable && (
                            <span className="ml-1 text-[10px] font-normal">
                              Full
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          {!loadingSlots &&
            !availabilityError &&
            slots.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/5 pt-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  Selected
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
                  Available
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-100" />
                  Full
                </div>
              </div>
            )}
        </div>
      </div>
    </>
  );
}