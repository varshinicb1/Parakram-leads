"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

import SectionLabel from "../components/SectionLabel";
import GridBg from "../components/GridBg";
import Panel from "../components/Panel";
import Scanlines from "../components/Scanlines";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import {
  ArrowRight, ChevronRight, ExternalLink,
  Globe, Star, Smartphone, Bot, Cpu, Microscope,
  BarChart3, MessageCircle, Github, Linkedin,
} from "lucide-react";
import GoldButton from "../components/GoldButton";
import varshiniImg from "../../imports/varshini.png";
import { type Page } from "../types";

function navTo(setPage: (p: Page) => void, p: Page) { setPage(p); window.scrollTo({ top: 0, behavior: "instant" }); }

function HeroParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 8,
    duration: Math.random() * 10 + 12,
    drift: (Math.random() - 0.5) * 60,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: "-10px",
            width: p.size,
            height: p.size,
            background: p.size > 2 ? "radial-gradient(circle,rgba(201,169,110,0.8),rgba(201,169,110,0))" : "rgba(201,169,110,0.5)",
            boxShadow: p.size > 2 ? "0 0 6px rgba(201,169,110,0.3)" : "none",
          }}
          animate={{
            y: [0, -window.innerHeight * 0.8 - Math.random() * 200],
            x: [0, p.drift],
            opacity: [0, 0.7, 0.7, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function SectionFade({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function StaggerChildren({ children, className, staggerDelay = 0.06 }: { children: React.ReactNode; className?: string; staggerDelay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ visible: { transition: { staggerChildren: staggerDelay } } }}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } } }}
    >
      {children}
    </motion.div>
  );
}

const SERVICES_PREVIEW = [
  { name: "Custom Websites", icon: Globe, desc: "Blazing-fast, beautifully crafted web experiences for businesses, agencies, and creators.", diff: "★★☆☆☆" },
  { name: "Portfolio Sites", icon: Star, desc: "Standout personal portfolios that get you noticed, hired, and remembered.", diff: "★☆☆☆☆" },
  { name: "Cross-Platform Apps", icon: Smartphone, desc: "Android, iOS, Windows — one codebase. ESC/POS, CRM, IoT integrations built in.", diff: "★★★★☆" },
  { name: "AI Agents & Workflows", icon: Bot, desc: "Intelligent automation, AI pipelines, WhatsApp triggers, and custom CRM workflows.", diff: "★★★★★" },
  { name: "IoT & Hardware", icon: Cpu, desc: "Full-stack IoT: sensor firmware, cloud dashboards, edge AI. Custom hardware design.", diff: "★★★★☆" },
  { name: "Research Automation", icon: Microscope, desc: "Automate systematic review, data scraping, PDF parsing, and publication-ready reports.", diff: "★★★☆☆" },
];

const CLIENT_SITES = [
  { domain: "cokakaalan.in", name: "Coka Kaalan", desc: "Full-featured business website with CMS, SEO optimization, and mobile-first design.", tag: "Web" },
  { domain: "vidyuthlabs.co.in", name: "Vidyuth Labs", desc: "Corporate site for a technology lab — clean, fast, and professional.", tag: "Web" },
  { domain: "pubrealty.in", name: "PubRealty", desc: "Real estate platform with property listings, search filters, and lead capture.", tag: "Web + App" },
  { domain: "leads.getparakram.in", name: "Parakram Leads", desc: "AI-powered B2B lead intelligence platform — live in production with 34K+ leads.", tag: "SaaS" },
];

function HomePage({ setPage }: { setPage: (p: Page) => void }) {
  const go = (p: Page) => navTo(setPage, p);
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 30 });

  const handleMouse = useCallback((e: MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouse);
    return () => el.removeEventListener("mousemove", handleMouse);
  }, [handleMouse]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <GridBg />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_46%,rgba(201,169,110,0.08),transparent_70%)] animate-glow-pulse" />
        <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(201,169,110,0.15)_2px,rgba(201,169,110,0.15)_3px)]" />
        <HeroParticles />
        <div className="relative z-10 flex flex-col items-center text-center px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ x: useSpring(useMotionValue(0), { stiffness: 30, damping: 20 }), y: useSpring(useMotionValue(0), { stiffness: 30, damping: 20 }) }}
          >
            <motion.img
              src="/parakram_logo.png" alt="Parakram"
              className="w-48 h-48 md:w-64 md:h-64 object-contain"
              style={{
                x: useSpring(useMotionValue(0), { stiffness: 15, damping: 20 }),
                y: useSpring(useMotionValue(0), { stiffness: 15, damping: 20 }),
              }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex items-center gap-3 mt-8 mb-6"
          >
            <div className="w-12 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(201,169,110,0.5))" }} />
            <span className="text-[10px] tracking-[0.38em] text-[#c9a96e] uppercase font-mono">Digital Ecosystem</span>
            <div className="w-12 h-px" style={{ background: "linear-gradient(90deg,rgba(201,169,110,0.5),transparent)" }} />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-[40px] md:text-[68px] font-semibold tracking-[-0.03em] text-[#e8e6e3] mb-5 leading-[1.04] max-w-[860px]"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            We Build{" "}
            <span className="text-transparent bg-clip-text animate-shimmer" style={{ backgroundImage: "linear-gradient(125deg,#8a6030 0%,#c9a96e 30%,#f5e4a8 52%,#c9a96e 70%,#7a5020 100%)" }}>
              Everything Digital
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-[15px] md:text-[17px] text-[#c8c6c3] max-w-[540px] mb-4 leading-relaxed"
          >
            Custom websites · Cross-platform apps · AI workflows · IoT solutions · Research tools — tell us, we will build it.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex items-center gap-3 flex-wrap justify-center"
          >
            <GoldButton onClick={() => go("services")} className="px-7 py-[13px] text-[13px]">View Services <ArrowRight size={13} /></GoldButton>
            <motion.button onClick={() => go("work")} className="flex items-center gap-2 px-7 py-[13px] text-[13px] border border-[#c9a96e]/25 text-[#c9a96e] hover:border-[#c9a96e]/50 hover:bg-[#c9a96e]/[0.04] transition-all tracking-[0.04em]" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>See Our Work <ArrowRight size={13} /></motion.button>
          </motion.div>
        </div>
      </section>

      {/* Services preview */}
      <SectionFade>
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <SectionLabel>Services</SectionLabel>
              <h2 className="text-[30px] md:text-[40px] font-semibold text-[#e8e6e3] tracking-[-0.02em]" style={{ fontFamily: "Sora, sans-serif" }}>What we build for you.</h2>
            </div>
            <button onClick={() => go("services")} className="hidden md:flex items-center gap-2 text-[12px] font-mono text-[#a8a8a8] hover:text-[#c9a96e] transition-colors">All Services <ArrowRight size={12} /></button>
          </div>
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={0.05}>
            {SERVICES_PREVIEW.map(({ name, icon: Icon, desc, diff }) => (
              <StaggerItem key={name}>
                <motion.div onClick={() => go("services")} className="relative p-6 cursor-pointer group" style={{ border: "1px solid rgba(201,169,110,0.1)", background: "#0a0a0a" }} whileHover={{ y: -4, borderColor: "rgba(201,169,110,0.35)" }} transition={{ duration: 0.2 }}>
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#c9a96e]/40" /><div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#c9a96e]/40" /><div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#c9a96e]/40" /><div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#c9a96e]/40" />
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-9 h-9 flex items-center justify-center border border-white/[0.07] group-hover:border-[#c9a96e]/30 transition-colors bg-white/[0.02]"><Icon size={16} className="text-[#a8a8a8] group-hover:text-[#c9a96e] transition-colors" /></div>
                    <span className="text-[9px] font-mono text-[#a8a8a8] group-hover:text-[#c9a96e]/50">{diff}</span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#c8c6c3] mb-2 group-hover:text-[#e8e6e3] transition-colors">{name}</h3>
                  <p className="text-[12px] text-[#a8a8a8] leading-relaxed mb-5">{desc}</p>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#a8a8a8] group-hover:text-[#c9a96e] transition-colors">Get Started <ChevronRight size={10} /></div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerChildren>
          <motion.div
            className="mt-6 border border-dashed border-[#c9a96e]/10 p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p className="text-[12px] text-[#a8a8a8] mb-2">Need something not listed?</p>
            <p className="text-[11px] font-mono text-[#c9a96e]">Tell us — no request is too ambitious.</p>
            <button onClick={() => go("contact")} className="mt-4 text-[12px] px-5 py-2 border border-[#c9a96e]/25 text-[#c9a96e] hover:bg-[#c9a96e]/[0.05] transition-colors font-mono">[ REACH OUT ]</button>
          </motion.div>
        </section>
      </SectionFade>

      {/* Client websites */}
      <SectionFade>
        <section className="border-y border-white/[0.06] bg-[#0a0a0a] py-20">
          <div className="max-w-7xl mx-auto px-6">
            <SectionLabel>Live Deployments</SectionLabel>
            <h2 className="text-[28px] md:text-[38px] font-semibold text-[#e8e6e3] tracking-[-0.02em] mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Shipped and live.</h2>
            <p className="text-[14px] text-[#c8c6c3] mb-10 max-w-lg">Real products, real clients, live in production.</p>
            <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" staggerDelay={0.08}>
              {CLIENT_SITES.map(({ domain, name, desc, tag }) => (
                <StaggerItem key={domain}>
                  <motion.a href={`https://${domain}`} target="_blank" rel="noopener noreferrer"
                    className="relative p-6 group block" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "#070707" }}
                    whileHover={{ y: -4, borderColor: "rgba(201,169,110,0.25)" }} transition={{ duration: 0.2 }}>
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#c9a96e]/30 group-hover:border-[#c9a96e]/60 transition-colors" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#c9a96e]/30 group-hover:border-[#c9a96e]/60 transition-colors" />
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-mono text-[#c9a96e]/40 uppercase tracking-[0.2em] border border-[#c9a96e]/15 px-2 py-0.5">{tag}</span>
                      <ExternalLink size={11} className="text-[#a8a8a8] group-hover:text-[#c9a96e] transition-colors" />
                    </div>
                    <h3 className="text-[14px] font-semibold text-[#c8c6c3] mb-1 group-hover:text-[#e8e6e3] transition-colors">{name}</h3>
                    <p className="text-[11px] font-mono text-[#c9a96e]/50 mb-3">{domain}</p>
                    <p className="text-[12px] text-[#a8a8a8] leading-relaxed">{desc}</p>
                  </motion.a>
                </StaggerItem>
              ))}
            </StaggerChildren>
            <motion.button
              onClick={() => navTo(setPage, "work")}
              className="flex items-center gap-2 text-[13px] font-mono text-[#c9a96e] hover:gap-3 transition-all"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >See all client work <ArrowRight size={13} /></motion.button>
          </div>
        </section>
      </SectionFade>

      {/* Products preview */}
      <SectionFade>
        <section className="max-w-7xl mx-auto px-6 py-24">
          <SectionLabel>Parakram Products</SectionLabel>
          <h2 className="text-[28px] md:text-[38px] font-semibold text-[#e8e6e3] tracking-[-0.02em] mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Our own software, now shipping.</h2>
          <p className="text-[14px] text-[#a8a8a8] mb-10 max-w-xl leading-relaxed">Beyond client work, we build independent products. <a href="https://leads.getparakram.in" target="_blank" rel="noopener noreferrer" className="text-[#c9a96e] hover:underline">Try Parakram Leads</a> — our AI-powered lead intelligence platform.</p>
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" staggerDelay={0.08}>
            {[
              { name: "Parakram Edge", tag: "Mobile Computing", desc: "Turn your Android phone into a high-performance edge server with a secure REST API for desktop AI agents and IoT orchestration.", pct: 72, icon: Cpu, live: false },
              { name: "Parakram Leads", tag: "AI Lead Intelligence", desc: "Find every Indian SMB without a website, audit their digital gaps, score opportunities, and send personalized outreach automatically.", pct: 100, icon: BarChart3, live: true },
              { name: "Parakram Research", tag: "Research Automation", desc: "Scrape hundreds of academic papers, build a searchable database, and extract insights with AI-powered analysis.", pct: 35, icon: Microscope, live: false },
            ].map(({ name, tag, desc, pct, icon: Icon, live }) => (
              <StaggerItem key={name}>
                <Panel className="p-6" onClick={() => go("products")}>
                  <div className="flex items-center gap-3 mb-4"><Icon size={16} className="text-[#c9a96e]" /><div><p className="text-[9px] font-mono text-[#c9a96e]/50 uppercase tracking-[0.15em]">{tag}</p><h3 className="text-[14px] font-semibold text-[#e8e6e3]" style={{ fontFamily: "Sora, sans-serif" }}>{name}</h3></div></div>
                  <p className="text-[12px] text-[#a8a8a8] leading-relaxed mb-5">{desc}</p>
                  <div className="h-[3px] bg-white/[0.04]"><motion.div className="h-full" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }} style={{ background: pct >= 100 ? "linear-gradient(90deg,#c9a96e,#a88740)" : "linear-gradient(90deg,#7a5020,#c9a96e)" }} /></div>
                  <p className="text-[10px] font-mono mt-2 text-[#a8a8a8]">{pct}% complete</p>
                </Panel>
              </StaggerItem>
            ))}
          </StaggerChildren>
          <motion.button
            onClick={() => go("products")}
            className="flex items-center gap-2 text-[13px] font-mono text-[#c9a96e] hover:gap-3 transition-all"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >Explore all products <ArrowRight size={13} /></motion.button>
        </section>
      </SectionFade>

      {/* Founder teaser */}
      <SectionFade>
        <section className="border-y border-white/[0.06] bg-[#0a0a0a] py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <SectionLabel>Founder</SectionLabel>
                <h2 className="text-[28px] md:text-[38px] font-semibold text-[#e8e6e3] tracking-[-0.02em] mb-5" style={{ fontFamily: "Sora, sans-serif" }}>Built by a builder,<br />for builders.</h2>
                <p className="text-[14px] text-[#a8a8a8] leading-relaxed mb-8 max-w-md">Parakram is founded by Varshini CB — developer, designer, and systems thinker. Every product carries the same obsessive attention to craft.</p>
                <button onClick={() => go("about")} className="flex items-center gap-2 text-[13px] font-mono text-[#c9a96e] hover:gap-3 transition-all">Meet the Founder <ArrowRight size={13} /></button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Panel title="character.profile" className="p-8" onClick={() => go("about")}>
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 overflow-hidden border-2 border-[#c9a96e]/30 flex-shrink-0" style={{ borderRadius: "4px" }}>
                      <ImageWithFallback src={varshiniImg} alt="Varshini CB" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-[#c9a96e]/60 uppercase tracking-[0.2em] mb-1">[FOUNDER]</p>
                      <h3 className="text-[17px] font-semibold text-[#e8e6e3] mb-0.5" style={{ fontFamily: "Sora, sans-serif" }}>Varshini CB</h3>
                      <p className="text-[11px] text-[#a8a8a8]">Full-Stack Developer & Systems Architect</p>
                      <div className="flex items-center gap-3 mt-3">
                        <a href="https://www.linkedin.com/in/varshini-cb-821176360/" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[#a8a8a8] hover:text-[#c9a96e] transition-colors"><Linkedin size={14} /></a>
                        <a href="https://github.com/varshinicb1" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[#a8a8a8] hover:text-[#c9a96e] transition-colors"><Github size={14} /></a>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-white/[0.05]">
                    {[["DEV", 98], ["DESIGN", 92], ["AI / ML", 88], ["SYSTEMS", 95]].map(([k, v]) => (
                      <div key={String(k)} className="flex items-center gap-3 mb-2">
                        <span className="text-[9px] font-mono text-[#a8a8a8] w-16">{k}</span>
                        <div className="flex-1 h-[3px] bg-white/[0.04]"><motion.div className="h-full" initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }} style={{ background: "linear-gradient(90deg,#7a5020,#c9a96e)" }} /></div>
                        <span className="text-[9px] font-mono text-[#c9a96e]/60">{v}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </motion.div>
            </div>
          </div>
        </section>
      </SectionFade>

      {/* Final CTA */}
      <SectionFade>
        <section className="max-w-7xl mx-auto px-6 py-24">
          <Panel className="p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_50%,rgba(201,169,110,0.06),transparent_70%)] animate-glow-pulse" />
            <Scanlines />
            <div className="relative z-10">
              <SectionLabel>Ready?</SectionLabel>
              <h2 className="text-[34px] md:text-[50px] font-semibold text-[#e8e6e3] tracking-[-0.025em] mb-5 leading-tight" style={{ fontFamily: "Sora, sans-serif" }}>Have a project in mind?</h2>
              <p className="text-[14px] text-[#a8a8a8] mb-10 max-w-md mx-auto leading-relaxed">Tell us what you want to build. We will figure out the rest together — from concept to shipped product.</p>
              <div className="flex items-center gap-3 justify-center flex-wrap">
                <GoldButton onClick={() => go("contact")} className="px-8 py-[13px] text-[13px]">Start a Conversation</GoldButton>
                <a href="https://wa.me/919901823011" target="_blank" rel="noopener noreferrer">
                  <motion.button className="flex items-center gap-2 px-8 py-[13px] text-[13px] border border-[#25D366]/30 text-[#25D366] hover:border-[#25D366]/60 hover:bg-[#25D366]/[0.04] transition-all" whileHover={{ scale: 1.04 }}><MessageCircle size={14} /> Chat on WhatsApp</motion.button>
                </a>
              </div>
            </div>
          </Panel>
        </section>
      </SectionFade>
    </div>
  );
}

export default HomePage;
