import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { KpiCardProps } from "@/types";
import { cn } from "@/lib/utils";

export function KpiCard({ title, value, change, changeType = "neutral", description, icon: Icon }: KpiCardProps) {
  const changeColor = changeType === "positive" ? "text-green-600" : changeType === "negative" ? "text-red-600" : "text-muted-foreground";
  
  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {change && <p className={cn("text-xs mt-1", changeColor)}>{change}</p>}
        <p className="text-xs text-muted-foreground pt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
