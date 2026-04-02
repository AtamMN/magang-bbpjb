declare module "sonner" {
  import * as React from "react";

  export interface ToasterProps {
    richColors?: boolean;
    position?:
      | "top-left"
      | "top-center"
      | "top-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right";
    duration?: number;
  }

  export function Toaster(props: ToasterProps): React.JSX.Element;

  export const toast: {
    success: (message: string, options?: Record<string, unknown>) => string | number;
    error: (message: string, options?: Record<string, unknown>) => string | number;
    info: (message: string, options?: Record<string, unknown>) => string | number;
    warning: (message: string, options?: Record<string, unknown>) => string | number;
    message: (message: string, options?: Record<string, unknown>) => string | number;
    dismiss: (id?: string | number) => void;
  };
}
