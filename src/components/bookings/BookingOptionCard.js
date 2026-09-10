"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, UserRound, UsersRound } from "lucide-react";

const icons = {
  user: UserRound,
  users: UsersRound,
};

export default function BookingOptionCard({
  title,
  description,
  icon,
  image,
  href,
}) {
  const Icon = icons[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Link href={href} className="group block h-full">
        <motion.article
          whileHover={{ y: -5 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex h-full flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm transition-shadow duration-300 group-hover:shadow-lg"
        >
          {/* Image */}
          <div className="relative h-60 overflow-hidden sm:h-65">
            <motion.img
              src={image}
              alt=""
              className="h-full w-full object-cover"
              whileHover={{ scale: 1.04 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />

            {/* Image overlay */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/10 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative flex flex-1 flex-col p-6 sm:p-7">
            {/* Icon */}
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#f0efff]">
              <Icon
                size={20}
                strokeWidth={1.7}
                className="text-[#5751a8]"
              />
            </div>

            {/* Text */}
            <h2 className="pr-14 text-xl font-medium tracking-tight text-slate-900 sm:text-[22px]">
              {title}
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 sm:text-[15px]">
              {description}
            </p>

            {/* Arrow */}
            <motion.div
              whileHover={{ rotate: 45 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white transition-colors duration-300 group-hover:border-[#5751a8] group-hover:bg-[#5751a8] group-hover:text-white"
            >
              <ArrowUpRight size={19} strokeWidth={1.7} />
            </motion.div>
          </div>
        </motion.article>
      </Link>
    </motion.div>
  );
}