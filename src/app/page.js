'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Menu,
  X,
  Sparkles,
  Clock3,
  Award,
  Star,
  CalendarCheck,
  ShieldCheck,
  HeartHandshake,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { FaInstagram, FaFacebook, FaXTwitter } from 'react-icons/fa6';


/**
 * ────────────────────────────────────────────────────────────────
 * CUSTOMIZE HERE — everything a new business needs to change.
 * ────────────────────────────────────────────────────────────────
 */
const BUSINESS_NAME = 'Studio Name';

const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

const SERVICES = [
  {
    icon: Sparkles,
    name: 'Service One',
    description: 'A short, clear description of what this service includes and who it is best for.',
    duration: '45 min',
    price: '$65',
  },
  {
    icon: Clock3,
    name: 'Service Two',
    description: "Explain the value of this service in a sentence, written for a first-time visitor.",
    duration: '60 min',
    price: '$85',
  },
  {
    icon: Award,
    name: 'Service Three',
    description: 'A premium option — describe what makes it more thorough than the rest.',
    duration: '90 min',
    price: '$120',
  },
  {
    icon: Star,
    name: 'Service Four',
    description: 'A quick, popular option for people who want great results, fast.',
    duration: '30 min',
    price: '$45',
  },
];

const BENEFITS = [
  { icon: CalendarCheck, title: 'Easy booking', description: 'Reserve your spot online in under a minute, any time of day.' },
  { icon: ShieldCheck, title: 'Professional service', description: 'Every appointment is handled with care by trained professionals.' },
  { icon: Clock3, title: 'Flexible scheduling', description: 'Morning, evening, or weekend — find a time that actually fits.' },
  { icon: HeartHandshake, title: 'Trusted experience', description: 'Consistent quality that keeps clients coming back.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export default function Home() {
  const shouldReduceMotion = useReducedMotion();
  const initial = shouldReduceMotion ? 'visible' : 'hidden';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <div className="overflow-x-hidden bg-[#FAF8F4] font-sans text-[#181712] antialiased">
      {/* ─────────────────────────  NAVBAR  ───────────────────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled ? 'bg-[#FAF8F4]/90 shadow-[0_1px_0_rgba(24,23,18,0.08)] backdrop-blur-sm' : 'bg-transparent'
        }`}
      >
        <nav className="mx-auto flex h-19 max-w-6xl items-center justify-between px-6 lg:px-10">
          <Link href="/" className="font-serif text-xl tracking-tight text-[#181712] transition-colors hover:text-[#26361F]">
            {BUSINESS_NAME}
          </Link>

          <div className="hidden items-center gap-10 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-[15px] text-[#181712]/70 transition-colors hover:text-[#181712]">
                {link.label}
              </a>
            ))}
          </div>

          <Link
            href="/book"
            className="hidden rounded-full bg-[#26361F] px-6 py-3 text-[15px] font-medium text-[#FAF8F4] shadow-sm transition-colors hover:bg-[#1B2716] md:inline-flex"
          >
            Book Now
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-10 items-center justify-center rounded-full text-[#181712] md:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-[#181712]/10 bg-[#FAF8F4] md:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-6">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-3 text-[17px] text-[#181712]/85 transition-colors hover:bg-[#181712]/5"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  href="/book"
                  onClick={() => setMenuOpen(false)}
                  className="mt-3 rounded-full bg-[#26361F] px-6 py-3.5 text-center text-[15px] font-medium text-[#FAF8F4]"
                >
                  Book Now
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* ─────────────────────────  HERO  ───────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-34 lg:px-10 lg:pb-28 lg:pt-42">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            <motion.div initial={initial} animate="visible" variants={stagger}>
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-lg text-balance font-serif text-5xl leading-[1.08] sm:text-6xl lg:text-[3.5rem]"
              >
                Services designed around you.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 max-w-md text-lg leading-relaxed text-[#181712]/70"
              >
                Quality care, delivered on your schedule. Browse our services and reserve your appointment in a couple of clicks — no calls, no waiting.
              </motion.p>

              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center"
              >
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center rounded-full bg-[#26361F] px-8 py-4 text-base font-medium text-[#FAF8F4] shadow-sm transition-transform duration-200 hover:bg-[#1B2716] active:scale-[0.97]"
                >
                  Book Now
                </Link>
                <a
                  href="#services"
                  className="inline-flex items-center justify-center rounded-full border border-[#181712]/15 px-8 py-4 text-base font-medium text-[#181712] transition-colors hover:border-[#181712]/30 hover:bg-[#181712]/5"
                >
                  Explore Services
                </a>
              </motion.div>

              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mt-10 flex items-center gap-3 text-sm text-[#181712]/60"
              >
                <div className="flex -space-x-2">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-8 rounded-full border-2 border-[#FAF8F4] bg-[#D3DED0]" />
                  ))}
                </div>
                <span>Trusted by 500+ happy clients</span>
              </motion.div>
            </motion.div>

            {/* Visual area — swap for a real photo when customizing */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              className="relative"
            >
              <div className="relative aspect-4/5 w-full overflow-hidden rounded-[28px] border border-[#181712]/10 bg-linear-to-br from-[#4C6B4C] via-[#33492F] to-[#1B2716] shadow-2xl">
                <div
                  className="absolute inset-0 opacity-25 mix-blend-soft-light"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.9) 0, transparent 45%), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.5) 0, transparent 40%)',
                  }}
                />
                <div className="absolute inset-x-8 bottom-8 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xs">
                  <p className="font-serif text-lg italic text-[#FAF8F4]">&ldquo;Effortless to book, even easier to love.&rdquo;</p>
                </div>
              </div>

             
            </motion.div>
          </div>
        </section>

        {/* ─────────────────────  SERVICES PREVIEW  ────────────────── */}
        <motion.section
          id="services"
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mx-auto max-w-6xl px-6 py-20 lg:px-10 lg:py-28"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="max-w-lg">
            <h2 className="font-serif text-3xl sm:text-4xl">What we offer</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-[#181712]/65">
              A few of our most-booked services. Every listing shows exactly what to expect — duration, price, and what&apos;s included.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map(({ icon: Icon, name, description, duration, price }) => (
              <motion.div
                key={name}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="group flex h-full flex-col rounded-2xl border border-[#181712]/10 bg-white/60 p-7 shadow-sm transition-shadow duration-300 hover:shadow-xl"
              >
                <div className="mb-6 flex size-11 items-center justify-center rounded-full bg-[#EEF2EC] text-[#33492F] transition-colors duration-300 group-hover:bg-[#26361F] group-hover:text-[#FAF8F4]">
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <h3 className="font-serif text-xl">{name}</h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#181712]/65">{description}</p>
                <div className="mt-6 flex items-center justify-between border-t border-[#181712]/10 pt-5">
                  <div className="text-sm text-[#181712]/60">
                    <span>{duration}</span>
                    <span className="mx-2 text-[#181712]/20">|</span>
                    <span className="font-medium text-[#181712]">{price}</span>
                  </div>
                  <Link href="/book" className="text-sm font-medium text-[#181712] transition-colors hover:text-[#26361F]">
                    Book
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ───────────────────  WHY CHOOSE US  ─────────────────────── */}
        <motion.section
          id="about"
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="border-y border-[#181712]/10 bg-[#F3F0E9]/70"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
            <motion.h2 variants={fadeUp} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="max-w-md font-serif text-3xl sm:text-4xl">
              Why clients choose us
            </motion.h2>

            <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map(({ icon: Icon, title, description }, index) => (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={[
                    index % 2 !== 0 ? 'sm:border-l sm:border-[#181712]/10 sm:pl-6' : '',
                    index !== 0 ? 'lg:border-l lg:border-[#181712]/10 lg:pl-6' : 'lg:border-l-0 lg:pl-0',
                  ].join(' ')}
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#26361F] text-[#FAF8F4]">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#181712]/65">{description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ──────────────────────  BOOKING CTA  ────────────────────── */}
        <motion.section
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden bg-[#1B2716]"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 15% 30%, rgba(255,255,255,0.08) 0, transparent 40%), radial-gradient(circle at 85% 70%, rgba(199,161,90,0.18) 0, transparent 45%)',
            }}
          />
          <div className="relative mx-auto max-w-6xl px-6 py-20 text-center lg:px-10 lg:py-24">
            <h2 className="font-serif text-3xl text-[#FAF8F4] sm:text-4xl">Ready to get started?</h2>
            <p className="mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-[#FAF8F4]/70">
              Choose a service and book a time that works for you — it only takes a minute.
            </p>
            <div className="mt-9 flex justify-center">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 rounded-full bg-[#AD8642] px-8 py-4 text-base font-medium text-[#FAF8F4] shadow-sm transition-colors hover:bg-[#8F6C33] active:scale-[0.97]"
              >
                Book Now
                <ArrowRight size={18} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </motion.section>
      </main>

      {/* ─────────────────────────  FOOTER  ───────────────────────── */}
      <footer id="contact" className="border-t border-[#181712]/10 bg-[#FAF8F4]">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <p className="font-serif text-2xl">{BUSINESS_NAME}</p>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#181712]/60">
                A dedicated space for quality service, run by people who care about the details. Book online in a couple of minutes.
              </p>
              <div className="mt-6 flex items-center gap-3">
                {[FaInstagram, FaFacebook, FaXTwitter].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label="Social link"
                    className="flex size-9 items-center justify-center rounded-full border border-[#181712]/10 text-[#181712]/60 transition-colors hover:border-[#26361F] hover:text-[#26361F]"
                  >
                    <Icon size={16} strokeWidth={1.75} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">Navigate</p>
              <ul className="mt-4 space-y-3">
                {[...NAV_LINKS, { label: 'Book Now', href: '/book' }].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[15px] text-[#181712]/60 transition-colors hover:text-[#181712]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium">Contact</p>
              <ul className="mt-4 space-y-3 text-[15px] text-[#181712]/60">
                <li className="flex items-start gap-2.5">
                  <MapPin size={17} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                  <span>123 Main Street, Your City</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone size={17} strokeWidth={1.75} className="shrink-0" />
                  <span>(555) 010-2020</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail size={17} strokeWidth={1.75} className="shrink-0" />
                  <span>hello@studioname.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-col-reverse items-center justify-between gap-4 border-t border-[#181712]/10 pt-8 text-sm text-[#181712]/50 md:flex-row">
            <p>&copy; {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="transition-colors hover:text-[#181712]">Privacy</a>
              <a href="#" className="transition-colors hover:text-[#181712]">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}