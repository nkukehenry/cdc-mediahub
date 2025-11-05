import * as React from "react"
import { cn } from "@/utils/fileUtils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "default" | "primary" | "secondary";
  size?: "icon" | "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variant === "ghost" && "hover:bg-gray-100 hover:text-gray-900",
          variant === "default" && "bg-blue-600 text-white hover:bg-blue-700",
          variant === "primary" && "bg-au-corporate-green text-white hover:bg-au-corporate-green/90",
          variant === "secondary" && "bg-gray-200 text-gray-900 hover:bg-gray-300",
          size === "sm" && "h-9 px-3",
          size === "md" && "h-10 px-4 py-2",
          size === "lg" && "h-11 px-8",
          size === "icon" && (variant === "ghost" ? "h-10 w-10" : "h-10 w-10"),
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

