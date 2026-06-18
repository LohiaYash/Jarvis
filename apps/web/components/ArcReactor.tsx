"use client";

import { motion } from "framer-motion";

export function ArcReactor() {
  return (
    <div className="relative grid h-52 w-52 place-items-center">
      <motion.div
        className="absolute h-full w-full rounded-full border border-reactor/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute h-40 w-40 rounded-full border-2 border-dashed border-ember/60"
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute h-24 w-24 rounded-full bg-reactor/20 blur-xl" />
      <div className="grid h-28 w-28 place-items-center rounded-full border border-reactor bg-panel shadow-hud">
        <span className="text-sm font-semibold tracking-[0.28em] text-reactor">JARVIS</span>
      </div>
    </div>
  );
}
