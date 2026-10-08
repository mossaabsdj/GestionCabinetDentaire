"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import param from "@/param.json";
import Image from "next/image";
import LoadingScreen from "@/app/component/LoadingScreen/page";

import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Stethoscope,
  Users,
  FileText,
  Pill,
  TestTube,
  Syringe,
  Menu,
  LogOut,
  Settings,
  Calendar,
  Sparkles,
  DollarSign,
} from "lucide-react";
import app from "@/param.json";
const Sidebar = ({
  items = [],
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  userInfo = { name: app.title, role: "Médecin" },
  handleparam,
}) => {
  const [activeItem, setActiveItem] = useState(items[0]?.url || "");
  const [hoveredItem, setHoveredItem] = useState(null);
  const handleExit = () => {
    if (typeof window !== "undefined" && window?.electron?.exit) {
      window.electron.exit();
    } else if (typeof window !== "undefined") {
      const confirmClose = window.confirm(
        "Voulez-vous quitter l'application ?",
      );
      if (confirmClose) {
        window.close();
      }
    }
  };
  const handleItemClick = (item) => {
    setActiveItem(item.url);
    if (onNavigate) {
      onNavigate(item);
    }
  };

  return (
    <motion.div
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-screen bg-gradient-to-b from-[var(--color-600)] via-[var(--color-700)] to-[var(--color-900)] text-white shadow-2xl flex flex-col relative overflow-x-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-[var(--color-700)]">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3"
              >
                <Image
                  src="/amel.png"
                  alt="Cabinet Logo"
                  width={45}
                  height={45}
                />
                <div>
                  <h1 className="text-xl font-bold">{param.title}</h1>
                  <p className="text-xs text-[var(--color-300)]">
                    Health System
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-[var(--color-700)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4  overflow-hidden">
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.url;
            const isHovered = hoveredItem === item.url;

            return (
              <button
                key={item.url}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setHoveredItem(item.url)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3 rounded-xl
                  transition-all duration-200 relative
                  ${
                    isActive
                      ? "bg-gradient-to-r from-[var(--color-600)] to-[var(--color-500)] shadow-lg"
                      : "hover:bg-white/10"
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full" />
                )}

                {/* Icon */}
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-white/70 group-hover:text-white"
                  }`}
                />

                {/* Title */}
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex-1 text-left font-medium transition-colors ${
                        isActive ? "text-white font-semibold" : "text-white/80"
                      }`}
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip for collapsed state */}
                {collapsed && isHovered && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-[var(--color-800)] rounded-lg shadow-xl whitespace-nowrap z-50">
                    {item.title}
                    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-[var(--color-800)] rotate-45" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-[var(--color-700)]">
        {/* Settings & Logout */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleparam}
            className="flex-1 p-3 rounded-lg bg-[var(--color-700)] hover:bg-[var(--color-700)] transition-colors"
          >
            <Settings className="w-5 h-5 mx-auto" />
          </button>

          {!collapsed && (
            <motion.button
              onClick={handleExit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 p-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors text-red-300 hover:text-red-200"
            >
              <LogOut className="w-5 h-5 mx-auto" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Demo App
export default function App() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window?.electron) {
      setIsElectron(true);
    }
  }, []);

  // Do not render sidebar on /Apropos or on web landing page /
  if (pathname === "/Apropos" || (pathname === "/" && !isElectron)) {
    return null;
  }

  const items = [
    { title: "Tableau de bord", url: "Accueill", icon: Home },
    { title: "Consulter", url: "Consulter", icon: Stethoscope },
    { title: "Patients", url: "Patients", icon: Users },
    { title: "Finances", url: "Finance", icon: DollarSign },
    { title: "Predifined", url: "Predifined", icon: FileText },
    { title: "Médicaments", url: "Medicament", icon: Pill },
    { title: "Bilans", url: "Bilans", icon: TestTube },
    { title: "Vaccine", url: "Vaccinations", icon: Syringe },
  ];

  const handleNavigate = (item) => {
    setLoading(true);
    router.push(`/${item.url}`);
    setLoading(false);
    // Auto-close sidebar after navigation
    setCollapsed(true);
  };
  const handleParam = () => {
    setLoading(true);
    router.push(`/Params`);
    setLoading(false);
    // Auto-close sidebar after navigation
    setCollapsed(true);
  };
  return (
    <div className="flex h-screen bg-gradient-to-br from-[var(--color-50)] to-white overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-900)]/80 z-50">
          <LoadingScreen />
        </div>
      )}
      <Sidebar
        items={items}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onNavigate={handleNavigate}
        handleparam={handleParam}
        userInfo={{
          name: param.title,
          role: param.specialty || "Chirurgien Dentiste",
        }}
      />
    </div>
  );
}
