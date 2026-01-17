import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../hooks/useSupabase";
import { useAnonymousSession } from "../hooks/useAnonymousSession";

const ReferralDashboard = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const anonymousId = useAnonymousSession();

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("facilities")
        .select("respondent_name, respondent_email, points, challenges, solutions, created_at")
        .eq("referred_by", anonymousId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate dynamic points for each referral
      const dataWithPoints = (data || []).map((ref) => {
        let pts = 50;
        if (ref.challenges) pts += 10;
        if (ref.solutions) pts += 10;
        if (ref.respondent_email) pts += 5;
        pts += ref.points || 0; // keep stored points
        return { ...ref, points: pts };
      });

      setReferrals(dataWithPoints);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      setError("Failed to load referrals. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [anonymousId]);

  useEffect(() => {
    if (anonymousId) fetchReferrals();
    else setLoading(false);
  }, [anonymousId, fetchReferrals]);

  const generateReferralLink = () => {
    if (!anonymousId) return "Please complete the survey first";
    return `${window.location.origin}/survey?ref=${anonymousId}`;
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(generateReferralLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textArea = document.createElement("textarea");
      textArea.value = generateReferralLink();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalPoints = referrals.reduce((sum, r) => sum + (r.points || 0), 0);

  if (!anonymousId) return <p className="text-center py-8">Please complete the survey first.</p>;

  if (loading) return <p className="text-center py-8">Loading referrals...</p>;

  if (error) return (
    <div className="text-center py-8">
      <p className="text-red-600">{error}</p>
      <button onClick={fetchReferrals} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Try Again</button>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Your Referrals</h2>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Referral Link</h3>
        <div className="flex items-center gap-2">
          <input type="text" value={generateReferralLink()} readOnly className="flex-1 px-3 py-2 border rounded text-sm" />
          <button onClick={copyReferralLink} className="px-4 py-2 bg-blue-600 text-white rounded">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-sm text-blue-600 mt-2">Share this link to earn 25 points per completed survey!</p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-700 mb-3">Your Referrals ({referrals.length})</h3>
        {referrals.length === 0 ? (
          <p className="text-gray-500">No referrals yet. Share your link to get started!</p>
        ) : (
          <div className="space-y-4">
            {referrals.map((ref, i) => (
              <div key={i} className="border-b border-gray-200 pb-4 last:border-b-0">
                <p className="font-medium">{ref.respondent_name || "Anonymous User"}</p>
                {ref.respondent_email && <p className="text-sm text-gray-600">{ref.respondent_email}</p>}
                <p className="text-sm text-green-600 font-medium">+{ref.points || 25} points awarded</p>
                <p className="text-xs text-gray-500">Joined: {new Date(ref.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-green-50 rounded-lg">
        <h4 className="font-semibold text-green-800 mb-2">Total Points Earned</h4>
        <p className="text-2xl font-bold text-green-700">{totalPoints} points</p>
        <p className="text-sm text-green-600">From {referrals.length} successful referral{referrals.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
};

export default ReferralDashboard;
