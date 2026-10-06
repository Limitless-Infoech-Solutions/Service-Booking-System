import Link from "next/link";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Users,
  UserRound,
  CreditCard,
  Clock3,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Appointments",
    href: "/admin/appointments",
    icon: CalendarDays,
  },
  {
    label: "Services",
    href: "/admin/services",
    icon: Scissors,
  },
  {
    label: "Staff",
    href: "/admin/staff",
    icon: Users,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: UserRound,
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    label: "Business Hours",
    href: "/admin/business-hours",
    icon: Clock3,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-slate-950 text-white">
        <div className="border-b border-slate-800 px-6 py-5">
          <h1 className="text-lg font-semibold">Service Booking</h1>
          <p className="text-sm text-slate-400">Admin Panel</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="rounded-lg bg-slate-900 px-4 py-3">
            <p className="text-sm font-medium">Glow Salon</p>
            <p className="mt-1 text-xs text-green-400">
              ● Business Active
            </p>
          </div>
        </div>
      </aside>

      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}