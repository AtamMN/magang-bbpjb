import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    const id = React.useId();

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#1F2937]">
            {label}
          </label>
        )}

        <input
          id={id}
          ref={ref}
          className={cn(
            "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition-colors",
            "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00509D] focus:border-transparent",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
            error && "border-red-500 focus:ring-red-500",
            className,
          )}
          {...props}
        />

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
