
"use client";

import * as React from "react";
import type { AdminSimulatedTier } from "@/types";
import { LOCAL_STORAGE_KEY_SIMULATED_TIER, ALL_TIERS } from "@/types";

const DEFAULT_TIER: AdminSimulatedTier = "Free";

export function useSimulatedTier(): AdminSimulatedTier {
  const [simulatedTier, setSimulatedTier] = React.useState<AdminSimulatedTier>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedTier = localStorage.getItem(LOCAL_STORAGE_KEY_SIMULATED_TIER) as AdminSimulatedTier | null;
        if (storedTier && ALL_TIERS.includes(storedTier)) {
          return storedTier;
        }
      } catch (error) {
        console.error("Error reading simulated tier from localStorage on init:", error);
      }
    }
    return DEFAULT_TIER;
  });

  React.useEffect(() => {
    let storedTierInEffect: AdminSimulatedTier | null = null;
    try {
      storedTierInEffect = localStorage.getItem(LOCAL_STORAGE_KEY_SIMULATED_TIER) as AdminSimulatedTier | null;
    } catch (error) {
      console.error("Error reading simulated tier from localStorage in effect:", error);
    }
    
    if (storedTierInEffect && ALL_TIERS.includes(storedTierInEffect)) {
      if (simulatedTier !== storedTierInEffect) { 
        setSimulatedTier(storedTierInEffect);
      }
    } else {
       if (simulatedTier !== DEFAULT_TIER) { 
         setSimulatedTier(DEFAULT_TIER);
         try {
            localStorage.setItem(LOCAL_STORAGE_KEY_SIMULATED_TIER, DEFAULT_TIER);
         } catch (error) {
            console.error("Error setting default simulated tier to localStorage:", error);
         }
       }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_KEY_SIMULATED_TIER) {
        const newTier = event.newValue as AdminSimulatedTier | null;
        if (newTier && ALL_TIERS.includes(newTier)) {
          setSimulatedTier(newTier);
        } else {
          setSimulatedTier(DEFAULT_TIER);
           try { // ensure localStorage is updated if event.newValue is invalid
            localStorage.setItem(LOCAL_STORAGE_KEY_SIMULATED_TIER, DEFAULT_TIER);
          } catch (error) {
            console.error("Error resetting simulated tier in localStorage due to invalid event:", error);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [simulatedTier]); 

  return simulatedTier;
}

export function hasAccess(
  simulatedTier: AdminSimulatedTier,
  requiredTiers: AdminSimulatedTier[]
): boolean {
  if (simulatedTier === "Creator") return true; 
  return requiredTiers.includes(simulatedTier);
}
