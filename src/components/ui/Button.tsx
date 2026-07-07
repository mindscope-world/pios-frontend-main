import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "ghost";
}

const variants = {
  primary: "bg-accent text-surface-base hover:bg-accent-muted",
  danger: "bg-decision-block text-white hover:opacity-90",
  ghost: "border border-surface-border text-text-primary hover:bg-surface-raised",
};

export function Button({ variant = "primary", className = "", disabled, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...rest}
    />
  );
}
