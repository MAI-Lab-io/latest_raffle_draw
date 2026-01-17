// pages/SurveyPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import SurveyForm from "../components/SurveyForm";
import SurveyForm2 from "../components/SurveyForm2";
import { useSearchParams } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import ReferralSystem from "../components/ReferralSystem";
import { supabase } from "../hooks/useSupabase";
import { useAnonymousSession } from "../hooks/useAnonymousSession";

const SurveyPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchParams] = useSearchParams();
  const surveyType = searchParams.get("type") || "short"; // Default to short survey
  const [referralCode, setReferralCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const anonymousId = useAnonymousSession();
  
  // FIXED: Only declare totalSteps once
  const totalSteps = surveyType === "short" ? 5 : 13;

  const [formData, setFormData] = useState({
    respondent_name: "",
    respondent_email: "",
    respondent_phone: "",
    designation: "",
    designation_other: "",
    name: "",
    address: "",
    state: "",
    facility_type: [],
    facility_type_other: "",
    ownership: "",
    contact_person: "",
    contact_role: "",
    contact_phone: "",
    contact_email: "",
    mriCount: 0,
    mriMachines: [],
    power_availability: "",
    has_backup_power: null,
    service_engineer_type: "",
    maintenance_frequency: "",
    staff_radiologists: 0,
    staff_radiographers: 0,
    staff_physicists: 0,
    cpd_participation: "",
    interest_in_training: null,
    cost_mri: "",
    payment_methods: [],
    payment_methods_other: "",
    research_participation: null,
    has_ethics_committee: null,
    challenges: "",
    solutions: "",
    points: 0,
    referred_by: "",
  });

  // Check for referral code in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");
    if (refCode) {
      localStorage.setItem("referred_by", refCode);
      setReferralCode(refCode);
      // Update formData with referral
      setFormData((prev) => ({ ...prev, referred_by: refCode }));
    }
  }, []);

  // Use useCallback to memoize calculatePoints
  const calculatePoints = useCallback(() => {
    let points = 50; // Base points for completing the survey

    // Points for each MRI machine reported
    points += (formData.mriCount || 0) * 10;

    // Points for detailed information
    if (formData.respondent_email) points += 5;
    if (formData.respondent_phone) points += 5;
    if (formData.challenges) points += 10;
    if (formData.solutions) points += 10;

    // Add 25 points if using a referral code
    if (formData.referred_by) {
      points += 25;
    }

    return points;
  }, [formData]);

  const awardReferralPoints = async (referrerAnonymousId) => {
    try {
      // Find the referrer's facility
      const { data: referrerFacility, error } = await supabase
        .from("facilities")
        .select("id, points")
        .eq("anonymous_id", referrerAnonymousId)
        .single();

      if (error) throw error;

      if (referrerFacility) {
        // Add 25 points for successful referral
        const newPoints = (referrerFacility.points || 0) + 25;

        await supabase
          .from("facilities")
          .update({ points: newPoints })
          .eq("id", referrerFacility.id);
      }
    } catch (error) {
      console.error("Error awarding referral points:", error);
    }
  };

  const submitSurvey = async () => {
    try {
      setSubmitting(true);

      if (!anonymousId) {
        alert("Please refresh the page and try again.");
        return;
      }

      const points = calculatePoints();
      const referredBy =
        formData.referred_by || localStorage.getItem("referred_by");

      // Save facility with referral information
      const { data: facility, error: facilityError } = await supabase
        .from("facilities")
        .insert([
          {
            respondent_name: formData.respondent_name,
            respondent_email: formData.respondent_email,
            respondent_phone: formData.respondent_phone,
            designation: formData.designation,
            designation_other: formData.designation_other,
            name: formData.name,
            address: formData.address,
            state: formData.state,
            facility_type: formData.facility_type,
            facility_type_other: formData.facility_type_other,
            ownership: formData.ownership,
            contact_person: formData.contact_person,
            contact_role: formData.contact_role,
            contact_phone: formData.contact_phone,
            contact_email: formData.contact_email,
            power_availability: formData.power_availability,
            has_backup_power: formData.has_backup_power,
            service_engineer_type: formData.service_engineer_type,
            maintenance_frequency: formData.maintenance_frequency,
            staff_radiologists: formData.staff_radiologists,
            staff_radiographers: formData.staff_radiographers,
            staff_physicists: formData.staff_physicists,
            cpd_participation: formData.cpd_participation,
            interest_in_training: formData.interest_in_training,
            cost_mri: formData.cost_mri,
            payment_methods: formData.payment_methods,
            payment_methods_other: formData.payment_methods_other,
            research_participation: formData.research_participation,
            has_ethics_committee: formData.has_ethics_committee,
            challenges: formData.challenges,
            solutions: formData.solutions,
            points: points,
            anonymous_id: anonymousId,
            approved: false,
            referred_by: referredBy,
            referral_code: anonymousId,
          },
        ])
        .select()
        .single();

      if (facilityError) throw facilityError;

      // Save MRI machines
      const allMachines = [
        ...formData.mriMachines.map((machine) => ({
          ...machine,
          facility_id: facility.id,
          anonymous_id: anonymousId,
        })),
      ];

      if (allMachines.length > 0) {
        const { error: machinesError } = await supabase
          .from("machines")
          .insert(allMachines);

        if (machinesError) throw machinesError;
      }

      // Award referral points to the referrer if applicable
      if (referredBy) {
        await awardReferralPoints(referredBy);
      }

      // Update points in form data for confirmation display
      setFormData((prev) => ({ ...prev, points }));

      // FIXED: Use dynamic confirmation step based on survey type
      const confirmationStep = surveyType === "short" ? 6 : 14; // Step 6 for short (5+1), Step 14 for long (13+1)
      setCurrentStep(confirmationStep);
    } catch (error) {
      console.error("Error submitting survey:", error);
      alert("Error submitting survey. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      if (name === "facility_type" || name === "payment_methods") {
        const currentValues = formData[name] || [];
        if (checked) {
          setFormData((prev) => ({
            ...prev,
            [name]: [...currentValues, value],
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            [name]: currentValues.filter((item) => item !== value),
          }));
        }
      }
    } else if (type === "radio") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "true",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleMachineChange = (e, machineType, index, fieldName) => {
    const { value } = e.target;
    const machineKey = "mriMachines";
    const updatedMachines = [...(formData[machineKey] || [])];

    if (!updatedMachines[index]) {
      updatedMachines[index] = { machine_type: "mri" };
    }

    updatedMachines[index][fieldName] = value;

    setFormData((prev) => ({
      ...prev,
      [machineKey]: updatedMachines,
    }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-2 bg-gradient-to-r from-blue-900 to-cyan-600">
          <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
            Nigeria MRI Facility Survey
          </h1>
        </div>

        <div className="p-6 md:p-8">
          {/* FIXED: Show progress bar only for form steps, not confirmation */}
          {currentStep <= totalSteps && (
            <>
              <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

              {/* Add Referral System Component */}
              {currentStep === 1 && (
                <ReferralSystem
                  onReferralSuccess={(code) => {
                    setReferralCode(code);
                    setFormData((prev) => ({ ...prev, referred_by: code }));
                  }}
                />
              )}

              <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-800">
                  <strong>Raffle Points:</strong> Complete the survey to earn
                  raffle tickets. You currently have{" "}
                  <span className="font-bold text-blue-900">
                    {calculatePoints()} points
                  </span>
                  .
                  {referralCode && (
                    <span className="text-green-600 ml-2">
                      +25 points for using referral code!
                    </span>
                  )}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (calculatePoints() / 200) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </>
          )}

          {/* Render appropriate survey form based on type and step */}
          {currentStep <= totalSteps ? (
            surveyType === "short" ? (
              <SurveyForm2
                currentStep={currentStep}
                formData={formData}
                handleChange={handleChange}
                handleMachineChange={handleMachineChange}
                nextStep={nextStep}
                prevStep={prevStep}
                totalSteps={totalSteps}
                submitSurvey={submitSurvey}
                submitting={submitting}
                setFormData={setFormData}
              />
            ) : (
              <SurveyForm
                currentStep={currentStep}
                formData={formData}
                handleChange={handleChange}
                handleMachineChange={handleMachineChange}
                nextStep={nextStep}
                prevStep={prevStep}
                totalSteps={totalSteps}
                submitSurvey={submitSurvey}
                submitting={submitting}
              />
            )
          ) : (
            // Confirmation step
            <div className="text-center py-12">
              <h2 className="text-3xl font-bold text-green-600 mb-4">
                Survey Submitted Successfully!
              </h2>
              <p className="text-xl mb-4">
                You have earned <strong>{formData.points} points</strong>.
              </p>
              <p className="text-lg mb-4">
                Your referral code is: <strong>{anonymousId}</strong>
              </p>
              <p className="text-gray-600">
                Share this code with others to earn bonus points!
              </p>
              <div className="mt-8">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Submit Another Response
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyPage;