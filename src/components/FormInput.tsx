import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectOption {
  label: string;
  value: string;
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  as?: "input" | "textarea" | "select";
  error?: string;
  helpText?: string;
  options?: SelectOption[];
  textareaRows?: number;
}

export function FormInput({
  label,
  as = "input",
  error,
  helpText,
  options = [],
  textareaRows = 4,
  className,
  id,
  ...props
}: FormInputProps) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const baseInputStyles = cn(
    "w-full rounded-lg border px-4 py-2.5 text-sm transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
    "disabled:cursor-not-allowed disabled:bg-slate-100",
    error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-slate-300 hover:border-slate-400",
    className,
  );

  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      {as === "textarea" ? (
        <textarea
          id={fieldId}
          rows={textareaRows}
          className={cn(baseInputStyles, "resize-none")}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : as === "select" ? (
        <select
          id={fieldId}
          className={baseInputStyles}
          {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          <option value="">Pilih {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input id={fieldId} className={baseInputStyles} {...props} />
      )}

      {helpText && !error && <p className="text-xs text-slate-500">{helpText}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
