"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success" | "warning" | "info";
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = "error", duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-close after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for exit animation
  };

  const bgColors = {
    error: "bg-red-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  };

  const icons = {
    error: "⚠️",
    success: "✓",
    warning: "⚠️",
    info: "ℹ️",
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ease-out ${
        isVisible && !isLeaving
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-4"
      }`}
    >
      <div
        className={`${bgColors[type]} text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-[90vw] md:max-w-md`}
      >
        <span className="text-xl flex-shrink-0">{icons[type]}</span>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={handleClose}
          className="text-white/80 hover:text-white transition-colors flex-shrink-0 p-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
