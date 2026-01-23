import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hover" | "glass";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const variants = {
      default:
        "bg-slate-900/60 border border-slate-800 backdrop-blur-sm",
      hover:
        "bg-slate-900/60 border border-slate-800 backdrop-blur-sm hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300",
      glass:
        "bg-white/5 border border-white/10 backdrop-blur-md",
    };

    return (
      <div
        ref={ref}
        className={`rounded-xl p-6 ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

