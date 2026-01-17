// components/SurveyFormShort.jsx
import React, { useState } from "react";
import { supabase } from "../hooks/useSupabase";
import { useAnonymousSession } from "../hooks/useAnonymousSession";
import imageCompression from "browser-image-compression";

const SurveyFormShort = ({
  currentStep,
  formData,
  handleChange,
  handleMachineChange,
  nextStep,
  prevStep,
  totalSteps,
  submitSurvey,
  submitting,
  setFormData,
}) => {
  const [uploading, setUploading] = useState(false);
  const anonymousId = useAnonymousSession();

  const handleImageUpload = async (event, index) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      let file = event.target.files[0];

      // Compress image before upload
      const compressionOptions = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: "image/jpeg",
      };

      try {
        file = await imageCompression(file, compressionOptions);
      } catch (compressionError) {
        console.warn("Compression failed, using original file:", compressionError);
      }

      const fileExt = "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `anonymous/${anonymousId}/mri/${fileName}`;

      const uploadPromise = supabase.storage
        .from("facility_photos")
        .upload(filePath, file);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                "Upload timed out. Please try again with a smaller image or better connection."
              )
            ),
          45000
        );
      });

      const { error: uploadError } = await Promise.race([
        uploadPromise,
        timeoutPromise,
      ]);

      if (uploadError) {
        if (
          uploadError.message.includes("Failed to fetch") ||
          uploadError.message.includes("NetworkError")
        ) {
          throw new Error(
            "Network connection failed. Please check your internet connection and try again."
          );
        }
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("facility_photos").getPublicUrl(filePath);

      const updatedMachines = [...(formData.mriMachines || [])];

      if (!updatedMachines[index]) {
        updatedMachines[index] = { machine_type: "mri" };
      }
      updatedMachines[index].photo_url = publicUrl;

      setFormData((prev) => ({
        ...prev,
        mriMachines: updatedMachines,
      }));
    } catch (error) {
      console.error("Error uploading image:", error);

      if (error.message.includes("timed out") || error.message.includes("timeout")) {
        alert(
          "Upload timed out. The image might be too large. Please try with a smaller image or better internet connection."
        );
      } else if (
        error.message.includes("Network") ||
        error.message.includes("Failed to fetch")
      ) {
        alert("Network error: Please check your internet connection and try again.");
      } else {
        alert("Error uploading image: " + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const updateMriCount = (count) => {
    setFormData((prev) => ({
      ...prev,
      mriCount: count,
    }));
  };

  // Render different form sections based on currentStep
  switch (currentStep) {
    case 1:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Section A - Respondent Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Full Name *
            </label>
            <input
              type="text"
              name="respondent_name"
              value={formData.respondent_name || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Email Address *
            </label>
            <input
              type="email"
              name="respondent_email"
              value={formData.respondent_email || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Phone Number
            </label>
            <input
              type="tel"
              name="respondent_phone"
              value={formData.respondent_phone || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Please indicate your designation/role
            </label>
            <select
              name="designation"
              value={formData.designation || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select your designation</option>
              <option value="radiologist">Radiologist</option>
              <option value="radiographer">Radiographer / Technologist</option>
              <option value="physicist">Medical Physicist</option>
              <option value="scientist">Scientist / Engineer</option>
              <option value="manager">Facility Manager</option>
              <option value="other">Other (please specify)</option>
            </select>
          </div>

          {formData.designation === "other" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please specify your designation
              </label>
              <input
                type="text"
                name="designation_other"
                value={formData.designation_other || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div className="flex justify-between mt-10">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-2 rounded-lg ${
                currentStep === 1
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Previous
            </button>

            <button
              onClick={nextStep}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700"
            >
              Next
            </button>
          </div>
        </div>
      );

    case 2:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Section B - Facility Information
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility Address (Street No., Street Name, LGA, City/Town, State)
            </label>
            <textarea
              name="address"
              value={formData.address || ""}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Which State is your facility located in?
            </label>
            <select
              name="state"
              value={formData.state || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select State</option>
              <option value="Abia">Abia</option>
              <option value="Adamawa">Adamawa</option>
              <option value="Akwa Ibom">Akwa Ibom</option>
              <option value="Anambra">Anambra</option>
              <option value="Bauchi">Bauchi</option>
              <option value="Bayelsa">Bayelsa</option>
              <option value="Benue">Benue</option>
              <option value="Borno">Borno</option>
              <option value="Cross River">Cross River</option>
              <option value="Delta">Delta</option>
              <option value="Ebonyi">Ebonyi</option>
              <option value="Edo">Edo</option>
              <option value="Ekiti">Ekiti</option>
              <option value="Enugu">Enugu</option>
              <option value="FCT – Abuja">FCT – Abuja</option>
              <option value="Gombe">Gombe</option>
              <option value="Imo">Imo</option>
              <option value="Jigawa">Jigawa</option>
              <option value="Kaduna">Kaduna</option>
              <option value="Kano">Kano</option>
              <option value="Katsina">Katsina</option>
              <option value="Kebbi">Kebbi</option>
              <option value="Kogi">Kogi</option>
              <option value="Kwara">Kwara</option>
              <option value="Lagos">Lagos</option>
              <option value="Nasarawa">Nasarawa</option>
              <option value="Niger">Niger</option>
              <option value="Ogun">Ogun</option>
              <option value="Ondo">Ondo</option>
              <option value="Osun">Osun</option>
              <option value="Oyo">Oyo</option>
              <option value="Plateau">Plateau</option>
              <option value="Rivers">Rivers</option>
              <option value="Sokoto">Sokoto</option>
              <option value="Taraba">Taraba</option>
              <option value="Yobe">Yobe</option>
              <option value="Zamfara">Zamfara</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility Type (check all that apply)
            </label>
            <div className="space-y-2">
              {[
                { value: "public_hospital", label: "Public / Government Hospital" },
                { value: "teaching_hospital", label: "Teaching Hospital / University Hospital" },
                { value: "tertiary_hospital", label: "Tertiary Hospital" },
                { value: "community_hospital", label: "Community / General Hospital" },
                { value: "private_clinic", label: "Private Radiology Practice / Outpatient Clinic" },
                { value: "faith_based", label: "Faith-based / NGO Facility" },
                { value: "other", label: "Other (please specify)" },
              ].map((type) => (
                <div key={type.value} className="flex items-center">
                  <input
                    type="checkbox"
                    id={type.value}
                    name="facility_type"
                    value={type.value}
                    checked={(formData.facility_type || []).includes(type.value)}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={type.value} className="ml-2 block text-sm text-gray-700">
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {(formData.facility_type || []).includes("other") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please specify facility type
              </label>
              <input
                type="text"
                name="facility_type_other"
                value={formData.facility_type_other || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facility Ownership
            </label>
            <select
              name="ownership"
              value={formData.ownership || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Ownership</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="mixed">Mixed (Public-Private Partnership)</option>
            </select>
          </div>

          <div className="flex justify-between mt-10">
            <button
              onClick={prevStep}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Previous
            </button>

            <button
              onClick={nextStep}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700"
            >
              Next
            </button>
          </div>
        </div>
      );

    case 3:
      const mriCount = formData.mriCount || 0;
      const mriMachines = formData.mriMachines || [];

      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Section C - MRI Equipment
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of MRI machines
            </label>
            <input
              type="number"
              min="0"
              name="mriCount"
              value={mriCount}
              onChange={(e) => updateMriCount(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {Array.from({ length: mriCount }).map((_, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-3">
                MRI Machine #{index + 1}
              </h3>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer/Model
                  </label>
                  <input
                    type="text"
                    value={mriMachines[index]?.manufacturer || ""}
                    onChange={(e) => handleMachineChange(e, "mri", index, "manufacturer")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Strength
                  </label>
                  <select
                    value={mriMachines[index]?.field_strength || ""}
                    onChange={(e) => handleMachineChange(e, "mri", index, "field_strength")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-900"
                  >
                    <option value="">Select field strength</option>
                    <option value="3T">3T</option>
                    <option value="1.5T">1.5T</option>
                    <option value="1.0T">1.0T</option>
                    <option value="<1T">&lt;1T</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year of Installation
                  </label>
                  <input
                    type="number"
                    value={mriMachines[index]?.year_installed || ""}
                    onChange={(e) => handleMachineChange(e, "mri", index, "year_installed")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Status
                  </label>
                  <select
                    value={mriMachines[index]?.status || ""}
                    onChange={(e) => handleMachineChange(e, "mri", index, "status")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-900"
                  >
                    <option value="">Select status</option>
                    <option value="working">Working</option>
                    <option value="occasionally_down">Occasionally Down</option>
                    <option value="not_functional">Not Functional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Average Patients per Day
                  </label>
                  <input
                    type="number"
                    value={mriMachines[index]?.patients_per_day || ""}
                    onChange={(e) => handleMachineChange(e, "mri", index, "patients_per_day")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, index)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  disabled={uploading}
                />
                {uploading && (
                  <p className="text-sm text-gray-900 mt-1">Uploading...</p>
                )}
                {mriMachines[index]?.photo_url && (
                  <div className="mt-2">
                    <img
                      src={mriMachines[index].photo_url}
                      alt="MRI Machine"
                      className="h-20 rounded object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-between mt-10">
            <button
              onClick={prevStep}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Previous
            </button>

            <button
              onClick={nextStep}
              className="px-6 py-2 bg-gradient-to-r from-cyan-900 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700"
            >
              Next
            </button>
          </div>
        </div>
      );

    case 4:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Section D - Technical Staff
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of staff supporting MRI operations:
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: "staff_radiologists", label: "Radiologists" },
                { name: "staff_radiographers", label: "Radiographers / Technologists" },
                { name: "staff_physicists", label: "Medical Physicists" },
                { name: "staff_nurses", label: "Nurses" },
                { name: "staff_admin", label: "Admin/Support staff" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    name={field.name}
                    value={formData[field.name] || 0}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between mt-10">
            <button
              onClick={prevStep}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Previous
            </button>

            <button
              onClick={submitSurvey}
              disabled={submitting}
              className={`px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 ${
                submitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {submitting ? "Submitting..." : "Submit Survey"}
            </button>
          </div>
        </div>
      );

    case 5:
      return (
        <div className="text-center py-12">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 max-w-2xl mx-auto">
            <svg
              className="w-16 h-16 text-green-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              Survey Submitted Successfully!
            </h2>
            <p className="text-green-600 mb-6">
              Thank you for completing the MRI Facility Survey. Your information is
              valuable for our research.
            </p>
            <p className="text-gray-700 mb-4">
              You've earned{" "}
              <span className="font-bold text-blue-600">
                {formData.points || 0} points
              </span>{" "}
              for the raffle draw.
            </p>
            <p className="text-gray-600">
              Winners will be contacted via email. Good luck!
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default SurveyFormShort;