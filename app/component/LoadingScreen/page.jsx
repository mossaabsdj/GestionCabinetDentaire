"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HeartPulse } from "lucide-react";
import Image from "next/image";

export default function LoadingScreen() {
  const [cabinet, setCabinet] = useState({
    title: "Cabinet Dentaire",
    doctorName: "Docteur",
  });

  useEffect(() => {
    fetch("/api/cabinet")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCabinet(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-[var(--color-900)]/50 text-white">
      {/* Flying & Pulsing Icon */}
      <motion.div
        animate={{ y: [0, 10, 0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="mb-6"
      >
        <Image src="/amel.png" alt="Cabinet Logo" width={60} height={60} />
      </motion.div>

      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-wide">
          {cabinet.title || cabinet.doctorName || "Cabinet Dentaire"}
        </h1>
        <HeartPulse
          size={30}
          className="text-[var(--color-300)] drop-shadow-lg"
        />
      </div>

      {/* Animated Loading Text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="mt-8 text-sm tracking-widest text-[var(--color-200)] uppercase"
      >
        Loading...
      </motion.p>
    </div>
  );
}
