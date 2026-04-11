import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

const STORAGE_KEY = "user_country_preference";

export function useCountryPreference(userId?: string) {
  const [country, setCountry] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Fallback to IP if nothing in storage or DB
  const fetchIpCountry = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        return data.country_code || "";
      }
    } catch (err) {
      console.error("Failed to fetch IP country:", err);
    }
    return "";
  };

  useEffect(() => {
    async function initCountry() {
      setLoading(true);
      
      // 1. Check local storage first (fastest)
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCountry(saved);
        setLoading(false);
        return;
      }

      // 2. Fetch from IP if not saved
      const ipCountry = await fetchIpCountry();
      if (ipCountry) {
        setCountry(ipCountry);
        localStorage.setItem(STORAGE_KEY, ipCountry);
      }
      
      setLoading(false);
    }

    initCountry();
  }, []);

  const updateCountry = async (newCountry: string) => {
    setCountry(newCountry);
    localStorage.setItem(STORAGE_KEY, newCountry);
  };

  return { country, updateCountry, loading };
}
