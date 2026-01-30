"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "./ui/card";

interface CheckinItem {
  id: string;
  value: string | null;
  isDone: boolean;
  requirement: {
    id: string;
    title: string | null;
    type: string;
    targetValue: string | null;
    unit: string;
  };
}

interface CheckinActivity {
  id: string;
  checkinDate: string;
  isDone: boolean;
  note: string | null;
  imageUrl: string | null;
  createdAt: string;
  challenge: {
    id: string;
    title: string;
    imageUrl: string | null;
  };
  items: CheckinItem[];
}

interface ActivityCalendarProps {
  activities: CheckinActivity[];
  compact?: boolean;
}

// Creative icons based on completed count
const getActivityIcon = (completedCount: number, totalCount: number): string => {
  if (totalCount === 0) return "";
  if (completedCount === 0) return "🌱"; // Started but not completed
  if (completedCount === 1) return "⭐"; // 1 completed
  if (completedCount === 2) return "🔥"; // 2 completed
  return "👑"; // 3+ completed (2+ as requested means more than 2)
};

export function ActivityCalendar({ activities, compact = false }: ActivityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Group activities by date
  const activitiesByDate = activities.reduce((acc, activity) => {
    const dateKey = activity.checkinDate.split("T")[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(activity);
    return acc;
  }, {} as Record<string, CheckinActivity[]>);

  // Get calendar days for current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const getDateKey = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    return `${year}-${month}-${dayStr}`;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isFuture = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const selectedActivities = selectedDate ? activitiesByDate[selectedDate] || [] : [];

  // Calculate monthly stats
  const currentMonthDates = days.filter(d => d !== null).map(d => getDateKey(d as number));
  const monthlyStats = currentMonthDates.reduce((acc, dateKey) => {
    const dayActivities = activitiesByDate[dateKey] || [];
    acc.totalCheckins += dayActivities.length;
    acc.completedCheckins += dayActivities.filter(a => a.isDone).length;
    acc.activeDays += dayActivities.length > 0 ? 1 : 0;
    return acc;
  }, { totalCheckins: 0, completedCheckins: 0, activeDays: 0 });

  const formatUnit = (unit: string) => {
    const unitMap: Record<string, string> = {
      reps: "reps", steps: "steps", km: "km", meters: "m",
      minutes: "min", hours: "hrs", pages: "pages",
      calories: "cal", liters: "L", workouts: "workouts", none: "",
    };
    return unitMap[unit] || unit;
  };

  return (
    <>
      <Card className={compact ? "p-4" : ""}>
        {/* Header */}
        <div className={`flex items-center justify-between ${compact ? "mb-3" : "mb-6"}`}>
          <div>
            <h2 className={`font-bold text-white ${compact ? "text-base" : "text-xl"}`}>Activity Calendar</h2>
            {!compact && <p className="text-sm text-slate-400">Your check-in history</p>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousMonth}
              className={`rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${compact ? "p-1" : "p-2"}`}
            >
              <svg className={compact ? "w-4 h-4" : "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className={`font-medium text-white text-center ${compact ? "text-sm min-w-[100px]" : "text-base min-w-[120px]"}`}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              onClick={goToNextMonth}
              className={`rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${compact ? "p-1" : "p-2"}`}
            >
              <svg className={compact ? "w-4 h-4" : "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {!compact && (
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors ml-2"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Monthly Stats - Only show in full mode */}
        {!compact && (
          <div className="grid grid-cols-3 gap-3 mb-6 p-3 bg-slate-800/50 rounded-xl">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{monthlyStats.activeDays}</div>
              <div className="text-xs text-slate-400">Active Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{monthlyStats.completedCheckins}</div>
              <div className="text-xs text-slate-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{monthlyStats.totalCheckins}</div>
              <div className="text-xs text-slate-400">Total Check-ins</div>
            </div>
          </div>
        )}

        {/* Day names header */}
        <div className={`grid grid-cols-7 ${compact ? "gap-0.5 mb-1" : "gap-1 mb-2"}`}>
          {dayNames.map((name) => (
            <div key={name} className={`text-center font-medium text-slate-500 ${compact ? "text-[10px] py-1" : "text-xs py-2"}`}>
              {compact ? name.charAt(0) : name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className={`grid grid-cols-7 ${compact ? "gap-0.5" : "gap-1"}`}>
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dateKey = getDateKey(day);
            const dayActivities = activitiesByDate[dateKey] || [];
            const completedCount = dayActivities.filter(a => a.isDone).length;
            const dayIsToday = isToday(day);
            const dayIsFuture = isFuture(day);
            const hasActivity = dayActivities.length > 0;
            const icon = getActivityIcon(completedCount, dayActivities.length);

            return (
              <button
                key={day}
                onClick={() => hasActivity && setSelectedDate(dateKey)}
                disabled={!hasActivity}
                className={`
                  aspect-square flex flex-col items-center justify-center transition-all relative overflow-hidden
                  ${compact ? "rounded-lg" : "rounded-xl"}
                  ${dayIsToday ? (compact ? "ring-1 ring-amber-500" : "ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900") : ""}
                  ${dayIsFuture ? "opacity-30" : ""}
                  ${hasActivity ? "cursor-pointer" : "cursor-default"}
                  ${!hasActivity ? "bg-slate-800/20 hover:bg-slate-800/30" : ""}
                  ${hasActivity && completedCount === dayActivities.length ? "bg-gradient-to-br from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30 border border-emerald-500/30" : ""}
                  ${hasActivity && completedCount < dayActivities.length && completedCount > 0 ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30" : ""}
                  ${hasActivity && completedCount === 0 ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-500/30" : ""}
                `}
              >
                {/* Day number */}
                <span className={`font-medium ${compact ? "text-[10px]" : "text-sm"} ${
                  hasActivity ? "text-white" : dayIsFuture ? "text-slate-600" : "text-slate-500"
                }`}>
                  {day}
                </span>
                
                {/* Activity icon */}
                {hasActivity && (
                  <span className={`leading-none ${compact ? "text-xs" : "text-lg mt-0.5"}`}>{icon}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className={`flex flex-wrap items-center justify-center gap-3 border-t border-slate-800 ${compact ? "mt-3 pt-3 gap-2" : "mt-6 pt-4 gap-4"}`}>
          <div className={`flex items-center gap-1 text-slate-400 ${compact ? "text-[10px]" : "text-xs"}`}>
            <span className={compact ? "text-xs" : ""}>🌱</span><span>In Progress</span>
          </div>
          <div className={`flex items-center gap-1 text-slate-400 ${compact ? "text-[10px]" : "text-xs"}`}>
            <span className={compact ? "text-xs" : ""}>⭐</span><span>1 Done</span>
          </div>
          <div className={`flex items-center gap-1 text-slate-400 ${compact ? "text-[10px]" : "text-xs"}`}>
            <span className={compact ? "text-xs" : ""}>🔥</span><span>2 Done</span>
          </div>
          <div className={`flex items-center gap-1 text-slate-400 ${compact ? "text-[10px]" : "text-xs"}`}>
            <span className={compact ? "text-xs" : ""}>👑</span><span>3+</span>
          </div>
        </div>
      </Card>

      {/* Modal for selected date */}
      {selectedDate && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDate(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {selectedActivities.length} check-in{selectedActivities.length !== 1 ? "s" : ""} 
                    {" • "}
                    {selectedActivities.filter(a => a.isDone).length} completed
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-100px)]">
              {selectedActivities.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No check-ins for this day
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {selectedActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`rounded-xl border overflow-hidden ${
                        activity.isDone 
                          ? "bg-emerald-500/5 border-emerald-500/30" 
                          : "bg-blue-500/5 border-blue-500/30"
                      }`}
                    >
                      {/* Challenge Header */}
                      <Link
                        href={`/challenges/${activity.challenge.id}`}
                        onClick={() => setSelectedDate(null)}
                        className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors"
                      >
                        {activity.challenge.imageUrl ? (
                          <img
                            src={activity.challenge.imageUrl}
                            alt={activity.challenge.title}
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">🎯</span>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-white truncate">
                              {activity.challenge.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                activity.isDone
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-blue-500/20 text-blue-400"
                              }`}
                            >
                              {activity.isDone ? "✓ Completed" : "◐ In Progress"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(activity.createdAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        
                        <svg className="w-5 h-5 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>

                      {/* Requirements Progress */}
                      {activity.items.length > 0 && (
                        <div className="px-4 pb-3 space-y-2">
                          <div className="text-xs font-medium text-slate-400 mb-2">Requirements:</div>
                          {activity.items.map((item) => {
                            const progress = item.requirement.targetValue && item.value
                              ? Math.min((parseFloat(item.value) / parseFloat(item.requirement.targetValue)) * 100, 100)
                              : item.isDone ? 100 : 0;

                            return (
                              <div key={item.id} className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                                  item.isDone 
                                    ? "bg-emerald-500 text-white" 
                                    : progress > 0 
                                      ? "bg-blue-500 text-white"
                                      : "bg-red-500/20 text-red-400"
                                }`}>
                                  {item.isDone ? "✓" : progress > 0 ? "◐" : "✗"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className={item.isDone ? "text-white" : "text-slate-400"}>
                                      {item.requirement.title || item.requirement.type}
                                    </span>
                                    {item.requirement.type !== "yes_no" && (
                                      <span className="text-slate-400 text-xs">
                                        {item.value ?? 0}{item.requirement.targetValue ? `/${item.requirement.targetValue}` : ""} {formatUnit(item.requirement.unit)}
                                      </span>
                                    )}
                                  </div>
                                  {item.requirement.type !== "yes_no" && item.requirement.targetValue && (
                                    <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all ${
                                          item.isDone ? "bg-emerald-500" : "bg-blue-500"
                                        }`}
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Note */}
                      {activity.note && (
                        <div className="px-4 pb-3">
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="text-xs font-medium text-slate-400 mb-1">Note:</div>
                            <p className="text-sm text-slate-300">{activity.note}</p>
                          </div>
                        </div>
                      )}

                      {/* Image */}
                      {activity.imageUrl && (
                        <div className="px-4 pb-4">
                          <div className="rounded-xl overflow-hidden">
                            <img
                              src={activity.imageUrl}
                              alt="Check-in"
                              className="w-full max-h-48 object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
