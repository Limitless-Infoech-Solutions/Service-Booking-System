"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  Plus,
  Heart,
  Flame,
  Crown,
  Leaf,
  Zap,
  TrendingUp,
  Gem,
  Scissors,
  Sparkles,
  Hand,
  CircleEllipsis,
} from "lucide-react";

import { categoryMeta, badgeMeta } from "@/data/serviceData";

// Maps the icon name stored in serviceData.js to an actual lucide component.
const ICONS = {
  Flame,
  Crown,
  Leaf,
  Zap,
  TrendingUp,
  Gem,
  Scissors,
  Sparkles,
  Hand,
  CircleEllipsis,
};

export default function ServiceCard({ service, selected, onSelect }) {
  const [favorited, setFavorited] = useState(false);

  const badge = service.badge ? badgeMeta[service.badge] : null;
  const BadgeIcon = badge ? ICONS[badge.icon] : null;

  const category = categoryMeta[service.category] ?? categoryMeta.Others;
  const CategoryIcon = ICONS[category.icon];

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={`group overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
        selected
          ? "border-slate-900 shadow-md"
          : "border-black/10 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Image */}
      <div
        className="relative aspect-[1.35/1] cursor-pointer overflow-hidden"
        onClick={() => onSelect(service)}
      >
        <Image
          src={service.image}
          alt={service.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badge */}
        {badge && (
          <div
            className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm"
            style={{ backgroundColor: badge.bg, color: badge.fg }}
          >
            {BadgeIcon && <BadgeIcon size={12} strokeWidth={2.4} />}
            {service.badge}
          </div>
        )}

        {/* Favorite */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setFavorited((current) => !current);
          }}
          aria-label={
            favorited ? "Remove from favorites" : "Add to favorites"
          }
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur transition hover:text-rose-500"
        >
          <Heart
            size={15}
            strokeWidth={2}
            className={favorited ? "fill-rose-500 text-rose-500" : ""}
          />
        </button>

        {/* Selected indicator */}
        {selected && (
          <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
            <Check size={16} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category icon + Name */}
        <div
          className="flex cursor-pointer items-start gap-2.5"
          onClick={() => onSelect(service)}
        >
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: category.bg, color: category.fg }}
          >
            <CategoryIcon size={15} strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold leading-5 tracking-tight text-slate-900">
              {service.name}
            </h2>
            <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">
              {service.description}
            </p>
          </div>
        </div>

        {/* Duration + Price */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={14} strokeWidth={1.7} />
            <span>{service.duration} min</span>
          </div>

          <span className="text-sm font-semibold text-slate-900">
            ₹{service.price}
          </span>
        </div>

        {/* Add / Added */}
        <button
          type="button"
          onClick={() => onSelect(service)}
          className={`mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
            selected
              ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
              : "border-black/10 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {selected ? (
            <>
              <Check size={16} />
              Added
            </>
          ) : (
            <>
              <Plus size={16} />
              Add
            </>
          )}
        </button>
      </div>
    </motion.article>
  );
}