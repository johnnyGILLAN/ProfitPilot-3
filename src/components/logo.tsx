import Link from 'next/link';
import { APP_NAME } from '@/config/site';
import { Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

export function Logo({ className, iconClassName, textClassName, showText = true }: LogoProps) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2", className)}>
      <Rocket className={cn("h-7 w-7 text-primary", iconClassName)} />
      {showText && <span className={cn("text-xl font-bold text-foreground whitespace-nowrap", textClassName)}>{APP_NAME}</span>}
    </Link>
  );
}
