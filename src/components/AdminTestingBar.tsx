
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.staging.profitpilot.com/v1';
const FRONTEND_ADMIN_TEST_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TESTING_TOKEN;

export function AdminTestingBar() {
  const { toast } = useToast();
  const { handleAuthSuccess, token: currentAuthToken } = useAuth(); // Added currentAuthToken to avoid calling bypass if already in a session
  const [isLoading, setIsLoading] = React.useState(false);

  const bypassAuth = async (mode: 'view' | 'edit') => {
    if (currentAuthToken) {
      // If there's already a token, we assume a session is active (either normal or test).
      // The user might want to switch modes within an existing test session,
      // or this implies the backend handles mode changes if needed.
      // For simplicity, we'll just toast if a token exists, assuming the session is already "bypassed" or admin.
      toast({
        title: "Session Active",
        description: `A user session is already active. Mode: ${mode}. Ensure backend handles mode if applicable.`,
      });
      // Potentially, you might still call the backend here if the 'mode' needs to be explicitly set server-side
      // even with an existing token. For now, this just logs.
      console.log("[AdminTestingBar] Bypass attempt with existing token. Mode:", mode);
      return;
    }

    if (!FRONTEND_ADMIN_TEST_TOKEN) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Frontend admin testing token (NEXT_PUBLIC_ADMIN_TESTING_TOKEN) is not configured.",
      });
      return;
    }

    if (!API_BASE_URL) {
        toast({ variant: "destructive", title: "API Error", description: "API Base URL is not configured."});
        return;
    }

    setIsLoading(true);
    let responseData;
    const bypassUrl = `${API_BASE_URL}/admin/bypass`; // Assuming /api is part of API_BASE_URL or handled by backend global prefix
    console.log("[AdminTestingBar] Attempting bypass to:", bypassUrl, "with mode:", mode);

    try {
      const response = await fetch(bypassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-test-token': FRONTEND_ADMIN_TEST_TOKEN,
        },
        body: JSON.stringify({ mode }),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Failed to activate admin testing session.';
        try {
            responseData = JSON.parse(responseText);
            errorMessage = responseData.message || responseData.details || responseData.error || errorMessage;
        } catch (e) {
            if (responseText && responseText.length > 0 && responseText.length < 300) {
                errorMessage = responseText;
            }
        }
        console.error("Admin testing session activation error from server:", errorMessage, "Status:", response.status);
        throw new Error(errorMessage);
      }
      
      responseData = JSON.parse(responseText);

      if (responseData.access_token && responseData.user) {
        handleAuthSuccess({
          access_token: responseData.access_token,
          user: responseData.user, // Backend should ensure user object includes testingSession: true
        });
        toast({
          title: "Admin Testing Mode Activated",
          description: `Switched to ${mode} mode. Session token refreshed.`,
        });
      } else {
        console.error("Invalid response from admin bypass endpoint:", responseData);
        throw new Error('Invalid response from admin bypass endpoint.');
      }
    } catch (error: any) {
      console.error("Admin testing session activation error:", error);
      toast({
        variant: "destructive",
        title: "Activation Error",
        description: error.message || "Could not activate admin testing session.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-destructive text-destructive-foreground p-2 text-center z-[100] flex items-center justify-center gap-4">
      <span className="font-semibold">ADMIN TESTING MODE ACTIVE</span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => bypassAuth('view')}
        disabled={isLoading}
        className="bg-yellow-500 hover:bg-yellow-600 text-black"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        View Mode
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => bypassAuth('edit')}
        disabled={isLoading}
        className="bg-orange-500 hover:bg-orange-600 text-black"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Edit Mode
      </Button>
    </div>
  );
}
