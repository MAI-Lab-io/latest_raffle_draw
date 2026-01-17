// ===== FILE: hooks/useSupabase.js =====
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect, useCallback } from "react";

/* ================= SUPABASE CLIENT ================= */
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ================= STATE → COORDINATES ================= */
const stateCoordinates = {
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Abuja: { lat: 9.0765, lng: 7.3986 },
  Kano: { lat: 12.0022, lng: 8.5919 },
  Abia: { lat: 5.4527, lng: 7.5248 },
  Adamawa: { lat: 9.3265, lng: 12.3984 },
  AkwaIbom: { lat: 4.9057, lng: 7.8537 },
  "Akwa Ibom": { lat: 4.9057, lng: 7.8537 },
  Anambra: { lat: 6.2209, lng: 7.0722 },
  Bauchi: { lat: 10.3103, lng: 9.8439 },
  Bayelsa: { lat: 4.9267, lng: 6.2676 },
  Benue: { lat: 7.3369, lng: 8.7404 },
  Borno: { lat: 11.8333, lng: 13.15 },
  CrossRiver: { lat: 5.8702, lng: 8.5988 },
  "Cross River": { lat: 5.8702, lng: 8.5988 },
  Delta: { lat: 5.704, lng: 5.9339 },
  Ebonyi: { lat: 6.2649, lng: 8.0137 },
  Edo: { lat: 6.6342, lng: 5.9304 },
  Ekiti: { lat: 7.673, lng: 5.25 },
  Enugu: { lat: 6.4584, lng: 7.5464 },
  Gombe: { lat: 10.2897, lng: 11.1673 },
  Imo: { lat: 5.4836, lng: 7.0333 },
  Jigawa: { lat: 12.57, lng: 9.78 },
  Kaduna: { lat: 10.5167, lng: 7.4333 },
  Katsina: { lat: 12.9908, lng: 7.6 },
  Kebbi: { lat: 12.45, lng: 4.1999 },
  Kogi: { lat: 7.8, lng: 6.7333 },
  Kwara: { lat: 8.5, lng: 4.55 },
  Nasarawa: { lat: 8.5, lng: 8.25 },
  Niger: { lat: 9.6, lng: 6.55 },
  Ogun: { lat: 7, lng: 3.35 },
  Ondo: { lat: 7.25, lng: 5.2 },
  Osun: { lat: 7.75, lng: 4.5667 },
  Oyo: { lat: 7.85, lng: 3.9333 },
  Plateau: { lat: 9.9333, lng: 8.8833 },
  Rivers: { lat: 4.75, lng: 7 },
  Sokoto: { lat: 13.0667, lng: 5.2333 },
  Taraba: { lat: 8.8833, lng: 11.3667 },
  Yobe: { lat: 12, lng: 11.5 },
  Zamfara: { lat: 12.1667, lng: 6.25 },
  FCT: { lat: 9.0765, lng: 7.3986 },
};

/* ================= POINTS CALCULATOR ================= */
const calculatePoints = (facility) => {
  let points = 50;
  points += (facility.machines?.length || 0) * 10;
  if (facility.respondent_email) points += 5;
  if (facility.respondent_phone) points += 5;
  if (facility.challenges) points += 10;
  if (facility.solutions) points += 10;
  if (facility.referred_by) points += 25;
  return points;
};

/* ================= FACILITIES HOOK ================= */
export const useFacilities = (approvedOnly = false) => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------- Fetch Facilities ---------- */
  const fetchFacilities = useCallback(async () => {
    try {
      let query = supabase.from("facilities").select(`
        *,
        machines (*)
      `);

      if (approvedOnly) {
        query = query.eq("approved", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      const processed = (data || []).map((facility) => {
        let updated = { ...facility };

        // Coordinates
        if (!updated.latitude || !updated.longitude) {
          const coord = stateCoordinates[facility.state];
          if (coord) {
            updated.latitude = coord.lat;
            updated.longitude = coord.lng;
          }
        }

        // Points
        updated.points = calculatePoints(updated);
        return updated;
      });

      setFacilities(processed);
    } catch (error) {
      console.error("Error fetching facilities:", error);
    } finally {
      setLoading(false);
    }
  }, [approvedOnly]);

  /* ---------- Initial load + Realtime ---------- */
  useEffect(() => {
    fetchFacilities();

    const channel = supabase
      .channel("facilities-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        (payload) => {
          setFacilities((current) => {
            if (payload.eventType === "DELETE") {
              return current.filter((f) => f.id !== payload.old.id);
            }

            const incoming = payload.new;
            const index = current.findIndex((f) => f.id === incoming.id);

            const merged = {
              ...(index >= 0 ? current[index] : {}),
              ...incoming,
            };

            merged.points = calculatePoints(merged);

            if (index >= 0) {
              const copy = [...current];
              copy[index] = merged;
              return copy;
            }

            return [...current, merged];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchFacilities]);

  return { facilities, loading, refetch: fetchFacilities };
};

/* ================= AUTH HOOK ================= */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { user, loading, signUp, signIn, signOut };
};

