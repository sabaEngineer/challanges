"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface FilterTabsProps {
  activeFilter: string;
  counts: {
    all: number;
    active: number;
    upcoming: number;
    ended: number;
  };
}

export function FilterTabs({ activeFilter, counts }: FilterTabsProps) {
  const router = useRouter();

  const tabs = [
    {
      id: "all",
      label: "All",
      count: counts.all,
      icon: "🎯",
      color: "amber",
      href: "/challenges",
    },
    {
      id: "active",
      label: "Active",
      count: counts.active,
      icon: "🟢",
      color: "emerald",
      href: "/challenges?filter=active",
    },
    {
      id: "upcoming",
      label: "Upcoming",
      count: counts.upcoming,
      icon: "🔵",
      color: "blue",
      href: "/challenges?filter=upcoming",
    },
    {
      id: "ended",
      label: "Ended",
      count: counts.ended,
      icon: "⚫",
      color: "slate",
      href: "/challenges?filter=ended",
    },
  ];

  const getTabStyles = (tab: typeof tabs[0], isActive: boolean) => {
    const baseStyles = "relative flex flex-col items-center gap-1 px-6 py-4 rounded-xl transition-all duration-200 cursor-pointer";
    
    if (isActive) {
      switch (tab.color) {
        case "emerald":
          return `${baseStyles} bg-emerald-500/20 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20`;
        case "blue":
          return `${baseStyles} bg-blue-500/20 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20`;
        case "slate":
          return `${baseStyles} bg-slate-500/20 border-2 border-slate-500/50 shadow-lg shadow-slate-500/20`;
        default:
          return `${baseStyles} bg-amber-500/20 border-2 border-amber-500/50 shadow-lg shadow-amber-500/20`;
      }
    }
    
    return `${baseStyles} bg-slate-800/50 border-2 border-transparent hover:border-slate-700 hover:bg-slate-800`;
  };

  const getCountStyles = (tab: typeof tabs[0], isActive: boolean) => {
    if (isActive) {
      switch (tab.color) {
        case "emerald":
          return "text-emerald-400";
        case "blue":
          return "text-blue-400";
        case "slate":
          return "text-slate-400";
        default:
          return "text-amber-400";
      }
    }
    return "text-white";
  };

  const getLabelStyles = (tab: typeof tabs[0], isActive: boolean) => {
    if (isActive) {
      switch (tab.color) {
        case "emerald":
          return "text-emerald-400/80";
        case "blue":
          return "text-blue-400/80";
        case "slate":
          return "text-slate-400/80";
        default:
          return "text-amber-400/80";
      }
    }
    return "text-slate-400";
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={getTabStyles(tab, isActive)}
          >
            {isActive && tab.id === "active" && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <span className="text-2xl">{tab.icon}</span>
            <span className={`text-2xl font-bold ${getCountStyles(tab, isActive)}`}>
              {tab.count}
            </span>
            <span className={`text-sm font-medium ${getLabelStyles(tab, isActive)}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

