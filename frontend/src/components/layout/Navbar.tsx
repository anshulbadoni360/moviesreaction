"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  FileText,
  Search,
  Plus,
  Command,
} from "lucide-react";
import { AnalyzeVideoModal } from "@/components/ui/AnalyzeVideoModal";

const NAV_LINKS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "All Videos", href: "/videos", icon: Film },
  { label: "Reports", href: "/reports", icon: FileText },
];

export function Navbar() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 h-14 bg-surface/90 backdrop-blur-md border-b border-border transition-all">
        <div className="max-w-[1280px] h-full mx-auto px-6 flex items-center justify-between gap-6">
          {/* Left: Brand Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-[6px] bg-primary flex items-center justify-center text-white font-display font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
                M
              </div>
              <span className="font-display font-bold text-text-primary text-base tracking-tight">
                Monet Labs
              </span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-[6px] text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-bg text-primary font-semibold"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Analyze CTA, User */}
          <div className="flex items-center gap-3">
            {/* Global Search Bar with ⌘K */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-bg border border-border rounded-[8px] text-xs text-text-secondary w-48 hover:border-[#D1D1D6] transition-colors cursor-pointer">
              <Search className="w-3.5 h-3.5 text-neutral" />
              <span className="flex-1 text-[13px]">Search videos...</span>
              <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 bg-surface border border-border rounded-[4px] text-[10px] font-mono text-neutral font-medium shadow-2xs">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="genesis-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Analyze Video</span>
            </button>

            {/* User Avatar */}
            <div className="w-7 h-7 rounded-full bg-text-primary text-surface flex items-center justify-center text-[11px] font-semibold tracking-wider cursor-pointer">
              AB
            </div>
          </div>
        </div>
      </header>

      <AnalyzeVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
