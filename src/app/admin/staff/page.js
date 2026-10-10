"use client";

import { useRouter } from "next/navigation";
import { Users, UserPlus, ArrowRight, BriefcaseBusiness } from "lucide-react";

export default function StaffPage() {
  const router = useRouter();

  const options = [
    {
      title: "View All Staff",
      description:
        "View your team members, their roles, setup status, and assigned services.",
      icon: Users,
      buttonText: "View Staff",
      onClick: () => router.push("/admin/staff/staff-list"),
      iconBg: "bg-blue-50",
      iconColor: "text-[#1e9be0]",
    },
    {
      title: "Create New Staff",
      description:
        "Add a team member and optionally assign the services they can perform.",
      icon: UserPlus,
      buttonText: "Add Staff",
      onClick: () => router.push("/admin/staff/new"),
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fa] px-4 py-8 text-[#0b0e14] sm:px-8">
      {" "}
      <div className="mx-auto max-w-6xl">
        {/* Header */}{" "}
        <div className="mb-8">
          {" "}
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
            {" "}
            <BriefcaseBusiness size={24} className="text-[#1e9be0]" />{" "}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Staff Management
          </h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Manage your team members and their service assignments.
          </p>
        </div>
        {/* Navigation Cards */}
        <div className="grid gap-5 md:grid-cols-2">
          {options.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.title}
                type="button"
                onClick={option.onClick}
                className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg sm:p-8"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${option.iconBg} ${option.iconColor}`}
                  >
                    <Icon size={24} />
                  </div>

                  <ArrowRight
                    size={20}
                    className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#1e9be0]"
                  />
                </div>

                <h2 className="text-xl font-semibold">{option.title}</h2>

                <p className="mt-3 min-h-12 max-w-md text-sm leading-6 text-gray-500">
                  {option.description}
                </p>

                <div className="mt-6">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-[#0b0e14] px-5 py-3 text-sm font-medium text-white transition group-hover:bg-[#1e9be0]">
                    {option.buttonText}
                    <ArrowRight size={16} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
