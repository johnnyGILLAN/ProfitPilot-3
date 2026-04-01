
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  // SidebarMenuButton, // Not used directly here
  SidebarTrigger,
  SidebarInset,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { UserNav } from "@/components/user-nav";
import { mainNavItems, secondaryNavItems, NavItem } from "@/config/site";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { AIChatWidget } from "@/components/ai-chat-widget";
import { AdminTestingBar } from "@/components/AdminTestingBar";

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

  // const translatedTitle = t(item.translationKey as any); // Reverted i18n
  const translatedTitle = item.title;


  const linkContent = (
    <>
      <item.icon className={cn("h-5 w-5", isActive ? "text-sidebar-primary" : "")} />
      <span className={cn(state === "collapsed" && !isMobile && "sr-only")}>{translatedTitle}</span>
    </>
  );

  if (state === "collapsed" && !isMobile) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "h-10 w-full justify-start gap-2 px-2.5",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            asChild
            disabled={item.disabled}
          >
            <Link href={item.href}>{linkContent}</Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {translatedTitle}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={cn(
        "h-10 w-full justify-start gap-2 px-2.5",
         isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
      )}
      asChild
      disabled={item.disabled}
    >
      <Link href={item.href}>{linkContent}</Link>
    </Button>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, isTestingModeActive } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // React.useEffect(() => {
  //   console.log('[AppLayout] Auth state: isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'Path:', pathname);
  //   const authFlowPages = ['/login', '/register', '/forgot-password', '/reset-password', '/admin-unlock'];
    
  //   if (!isLoading && !isAuthenticated && !authFlowPages.includes(pathname)) {
  //     console.log('[AppLayout] User not authenticated. Redirecting to /login. Path:', pathname);
  //     router.push("/login?redirect=" + pathname);
  //   }
  // }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading application state...</p>
      </div>
    );
  }
  
  // if (!isLoading && !isAuthenticated) {
  //   // This check is primarily for development if the useEffect above isn't catching all cases quickly enough
  //   // or if pages are accessed directly before AuthContext initializes fully on client.
  //   // For production, middleware or more robust routing rules are better.
  //   const authFlowPages = ['/login', '/register', '/forgot-password', '/reset-password', '/admin-unlock'];
  //   if (!authFlowPages.includes(pathname)) {
  //       // router.push("/login?redirect=" + pathname); // Temporarily disabled for development
  //       // return (
  //       //    <div className="flex min-h-screen items-center justify-center bg-background">
  //       //     <Loader2 className="h-12 w-12 animate-spin text-primary" />
  //       //     <p className="ml-3 text-lg text-muted-foreground">Redirecting to login (AppLayout)...</p>
  //       //   </div>
  //       // );
  //   }
  // }


  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
          <SidebarHeader className={cn(
            "flex items-center",
            "group-data-[state=expanded]:p-4 group-data-[state=expanded]:justify-start",
            "group-data-[state=collapsed]:p-2 group-data-[state=collapsed]:justify-start" 
          )}>
             <Logo
               className="group-data-[state=collapsed]:gap-1"
               iconClassName={cn(
                 "text-primary",
                 "group-data-[state=collapsed]:h-5 group-data-[state=collapsed]:w-5"
               )}
               textClassName={cn(
                 "text-primary", // Ensure text color matches icon
                 "group-data-[state=collapsed]:text-xs group-data-[state=collapsed]:whitespace-nowrap"
               )}
             />
          </SidebarHeader>
          <TooltipProvider delayDuration={0}>
            <ScrollArea className="flex-1">
              <SidebarContent className="p-2">
                <SidebarMenu>
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <NavLink item={item} />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>
            </ScrollArea>
          </TooltipProvider>
          <SidebarSeparator />
          <SidebarFooter className="p-2">
             <TooltipProvider delayDuration={0}>
              <SidebarMenu>
                {secondaryNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <NavLink item={item} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </TooltipProvider>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <Logo
                iconClassName="h-6 w-6 text-primary"
                textClassName="text-lg text-primary" 
                className="flex" 
              />
            </div>
            <div className="flex-1">
              {isTestingModeActive && ( 
                <div className="flex justify-center">
                  <div className="bg-yellow-400 text-yellow-900 px-3 py-1 text-xs font-semibold rounded-md shadow">
                    Creator Access Mode (Admin Override Active)
                  </div>
                </div>
              )}
            </div>
            <UserNav />
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
          <AIChatWidget
            prompts={{
              errorHelp: "Paste any error message for instant analysis",
              quickGuides: ["/manual-auth", "/manual-invoices", "/manual-troubleshooting"],
              contactHuman: "Type 'human' to connect with our team"
            }}
            apiEndpoint="/api/ai-support"
          />
          {process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_TESTING_MODE === 'true' && (
            <AdminTestingBar />
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
