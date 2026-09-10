"use client";

import { Search, SlidersHorizontal } from "lucide-react";

import ServiceCard from "@/components/bookings/ServiceCard";

export default function ServiceSelectionStep({
  categories,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  filteredServices,
  selectedServices,
  onSelectService,
}) {
  return (
    <>
      {/* Hero row: heading + decorative photo, side by side */}
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#6862b5] sm:text-xs">
            Book an appointment
          </p>

          <h1 className="mt-2 text-4xl font-medium tracking-[-0.04em] text-slate-900 sm:text-5xl">
            Select your services
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Pamper yourself with expert care. Choose one or more services and
            continue to the next step.
          </p>
        </div>

      
      </div>

      {/* Filters */}
      <div className="mt-7 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {categories.map((category) => {
            const active = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange(category)}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "border border-black/10 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + Sort */}
      <div className="mt-5 flex gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            size={19}
            strokeWidth={1.7}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search for services (e.g. haircut, facial, massage...)"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-12 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </div>

        <button
          type="button"
          className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          <SlidersHorizontal size={17} strokeWidth={1.7} />
          <span className="hidden sm:inline">Sort by</span>
        </button>
      </div>

      {/* Services */}
      <div className="mt-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              selected={selectedServices.some((item) => item.id === service.id)}
              onSelect={onSelectService}
            />
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-700">
              No services found
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Try another category or search term.
            </p>
          </div>
        )}
      </div>
    </>
  );
}