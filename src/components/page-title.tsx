import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageTitleProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageTitle({ icon: Icon, title, description, className, children }: PageTitleProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-y-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-6 w-6 text-primary" />}
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </div>
  );
}
