// data/serviceData.js

export const services = [
  {
    id: "service-1",
    name: "Hair Cut & Style",
    description: "Fresh look, better mood.",
    category: "Hair",
    duration: 45,
    price: 800,
    badge: "Popular",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "service-2",
    name: "Facial Treatment",
    description: "Refresh and rejuvenate your skin.",
    category: "Skin & Beauty",
    duration: 60,
    price: 1200,
    badge: "Best value",
    image:
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "service-3",
    name: "Body Massage",
    description: "Relax your mind and body.",
    category: "Wellness",
    duration: 60,
    price: 1200,
    badge: "Relax",
    image:
      "https://images.unsplash.com/photo-1610992015836-7c249d75782d?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHBlZGljdXJlfGVufDB8fDB8fHww",
  },
  {
    id: "service-4",
    name: "Manicure",
    description: "Clean, shape and care.",
    category: "Nails",
    duration: 45,
    price: 700,
    badge: "Fast",
    image:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "service-5",
    name: "Pedicure",
    description: "Soft feet, happy you.",
    category: "Nails",
    duration: 45,
    price: 700,
    badge: null,
    image:
      "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cGVkaWN1cmV8ZW58MHx8MHx8fDA%3D",
  },
  {
    id: "service-6",
    name: "Hair Color",
    description: "Vibrant color, lasting shine.",
    category: "Hair",
    duration: 90,
    price: 1800,
    badge: "Trending",
    image:
      "https://images.unsplash.com/photo-1707812343087-c9ff9e5abb43?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8aGFpciUyMGNvbG9yfGVufDB8fDB8fHww",
      
  },
  {
    id: "service-7",
    name: "Skin Rejuvenation",
    description: "For healthy, glowing skin.",
    category: "Skin & Beauty",
    duration: 75,
    price: 1500,
    badge: "Premium",
    image:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "service-8",
    name: "Wellness Therapy",
    description: "Balance your energy.",
    category: "Wellness",
    duration: 60,
    price: 1200,
    badge: null,
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop",
  },
];

// Small metadata used to render the icon + tint for each category chip
// and for the little category icon shown on every service card.
export const categoryMeta = {
  All: { icon: "LayoutGrid", bg: "#EEF2FF", fg: "#4F46E5" },
  Hair: { icon: "Scissors", bg: "#FDE7EF", fg: "#DB2777" },
  "Skin & Beauty": { icon: "Sparkles", bg: "#F3E8FF", fg: "#7C3AED" },
  Wellness: { icon: "Leaf", bg: "#E7F7EE", fg: "#16A34A" },
  Nails: { icon: "Hand", bg: "#FCE9E4", fg: "#EA580C" },
  Others: { icon: "CircleEllipsis", bg: "#E8F0FE", fg: "#2563EB" },
};

// Visual treatment for each badge label shown on a service card.
export const badgeMeta = {
  Popular: { icon: "Flame", bg: "#FEE2E2", fg: "#DC2626" },
  "Best value": { icon: "Crown", bg: "#FEF3C7", fg: "#B45309" },
  Relax: { icon: "Leaf", bg: "#DCFCE7", fg: "#15803D" },
  Fast: { icon: "Zap", bg: "#DBEAFE", fg: "#2563EB" },
  Trending: { icon: "TrendingUp", bg: "#EDE9FE", fg: "#6D28D9" },
  Premium: { icon: "Gem", bg: "#E0E7FF", fg: "#4338CA" },
};