// components/SurveyForm.jsx
import React, { useState } from "react";
import { supabase } from "../hooks/useSupabase";
import { useAnonymousSession } from "../hooks/useAnonymousSession";
import imageCompression from "browser-image-compression";

const SurveyForm = ({
  currentStep,
  formData,
  handleChange,
  handleMachineChange,
  nextStep,
  prevStep,
  totalSteps,
  submitSurvey,
  submitting,
}) => {
  const [uploading, setUploading] = useState(false);
  const anonymousId = useAnonymousSession();

  const [machineCount, setMachineCount] = useState(0);

  const updateMachineCount = (count) => {
    setMachineCount(count);
    handleChange({
      target: {
        name: "mriCount",
        value: count,
      },
    });
  };

  const handleImageUpload = async (event, index) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      let file = event.target.files[0];

      // Compress image before upload
      const compressionOptions = {
        maxSizeMB: 0.5, // Compress to 500KB max
        maxWidthOrHeight: 800, // Resize to 800px max dimension
        useWebWorker: true, // Use web worker for better performance
        fileType: "image/jpeg", // Convert to JPEG for better compression
      };

      try {
        file = await imageCompression(file, compressionOptions);
      } catch (compressionError) {
        console.warn(
          "Compression failed, using original file:",
          compressionError
        );
        // Continue with original file if compression fails
      }

      const fileExt = "jpg"; // Use jpg after compression
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}.${fileExt}`;
      const filePath = `anonymous/${anonymousId}/mri/${fileName}`;

      // Create upload promise with timeout
      const uploadPromise = supabase.storage
        .from("facility_photos")
        .upload(filePath, file);

      // 45 second timeout (increased from 30)
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

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("facility_photos").getPublicUrl(filePath);

      // Update form data
      const machineKey = "mriMachines";
      const updatedMachines = [...(formData[machineKey] || [])];

      if (!updatedMachines[index]) {
        updatedMachines[index] = { machine_type: "mri" };
      }
      updatedMachines[index].photo_url = publicUrl;

      handleChange({
        target: {
          name: machineKey,
          value: updatedMachines,
        },
      });
    } catch (error) {
      console.error("Error uploading image:", error);

      if (
        error.message.includes("timed out") ||
        error.message.includes("timeout")
      ) {
        alert(
          "Upload timed out. The image might be too large. Please try with a smaller image or better internet connection."
        );
      } else if (
        error.message.includes("Network") ||
        error.message.includes("Failed to fetch")
      ) {
        alert(
          "Network error: Please check your internet connection and try again."
        );
      } else {
        alert("Error uploading image: " + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const calculatePoints = () => {
    let points = 50; // Base points

    points += (formData.mriCount || 0) * 10;

    if (formData.respondent_email) points += 5;
    if (formData.respondent_phone) points += 5;
    if (formData.challenges) points += 10;
    if (formData.solutions) points += 10;

    const referredBy = localStorage.getItem("referred_by");
    if (referredBy) points += 25;

    return points;
  };

  // ✅ USE IT (prevents ESLint error)
  const pointsPreview = calculatePoints();

    // Add 25 points if using a referral code
    const referredBy = localStorage.getItem("referred_by");
    if (referredBy) {
      points += 25;
    }

    return points;
  };

  const renderMachineSection = () => {
    const count = machineCount || 0;
    const machines = formData.mriMachines || [];

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Section {String.fromCharCode(65 + currentStep - 3)} - MRI Machines
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of MRI machines
          </label>
          <input
            type="number"
            min="0"
            name="mriCount"
            value={count}
            onChange={(e) =>
              updateMachineCount(parseInt(e.target.value) || 0)
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-3">
              MRI Machine #{index + 1}
            </h3>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {[
                { name: "manufacturer", label: "Manufacturer/Model", type: "text" },
                {
                  name: "field_strength",
                  label: "Field Strength",
                  type: "select",
                  options: [
                    { value: "3T", label: "3T" },
                    { value: "1.5T", label: "1.5T" },
                    { value: "1.0T", label: "1.0T" },
                    { value: "<1T", label: "<1T" },
                  ],
                },
                {
                  name: "year_installed",
                  label: "Year of Installation",
                  type: "number",
                },
                {
                  name: "status",
                  label: "Current Status",
                  type: "select",
                  options: [
                    { value: "working", label: "Working" },
                    { value: "occasionally_down", label: "Occasionally Down" },
                    { value: "not_functional", label: "Not Functional" },
                  ],
                },
                {
                  name: "patients_per_day",
                  label: "Average Patients per Day",
                  type: "number",
                },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  {field.type === "select" ? (
                    <select
                      name={`mri-${index}-${field.name}`}
                      value={machines[index]?.[field.name] || ""}
                      onChange={(e) =>
                        handleMachineChange(e, "mri", index, field.name)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-900"
                    >
                      <option value="">
                        Select {field.label.toLowerCase()}
                      </option>
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={`mri-${index}-${field.name}`}
                      value={machines[index]?.[field.name] || ""}
                      onChange={(e) =>
                        handleMachineChange(e, "mri", index, field.name)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    />
                  )}
                </div>
              ))}
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
              {machines[index]?.photo_url && (
                <div className="mt-2">
                  <img
                    src={machines[index].photo_url}
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
                {
                  value: "public_hospital",
                  label: "Public / Government Hospital",
                },
                {
                  value: "teaching_hospital",
                  label: "Teaching Hospital / University Hospital",
                },
                { value: "tertiary_hospital", label: "Tertiary Hospital" },
                {
                  value: "community_hospital",
                  label: "Community / General Hospital",
                },
                {
                  value: "private_clinic",
                  label: "Private Radiology Practice / Outpatient Clinic",
                },
                { value: "faith_based", label: "Faith-based / NGO Facility" },
                { value: "other", label: "Other (please specify)" },
              ].map((type) => (
                <div key={type.value} className="flex items-center">
                  <input
                    type="checkbox"
                    id={type.value}
                    name="facility_type"
                    value={type.value}
                    checked={(formData.facility_type || []).includes(
                      type.value
                    )}
                    onChange={(e) => {
                      const currentTypes = formData.facility_type || [];
                      if (e.target.checked) {
                        handleChange({
                          target: {
                            name: "facility_type",
                            value: [...currentTypes, type.value],
                          },
                        });
                      } else {
                        handleChange({
                          target: {
                            name: "facility_type",
                            value: currentTypes.filter((t) => t !== type.value),
                          },
                        });
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={type.value}
                    className="ml-2 block text-sm text-gray-700"
                  >
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
      return renderMachineSection();

    case 4:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Section D - Usage & Maintenance
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How often is power supply available at your facility?
            </label>
            <select
              name="power_availability"
              value={formData.power_availability || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Availability</option>
              <option value="100%">100% of the time</option>
              <option value="75%">75% of the time</option>
              <option value="50%">50% of the time</option>
              <option value="<50%">Less than 50%</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Do you have backup power (Generator, Solar, Inverter)?
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="has_backup_power"
                  value="true"
                  checked={formData.has_backup_power === true}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="has_backup_power"
                  value="false"
                  checked={formData.has_backup_power === false}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Do you have a service engineer for your MRI machine?
            </label>
            <select
              name="service_engineer_type"
              value={formData.service_engineer_type || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Option</option>
              <option value="in_house">In-house engineer</option>
              <option value="third_party">
                3rd-party vendor/service provider
              </option>
              <option value="none">None</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How often is preventive maintenance carried out?
            </label>
            <select
              name="maintenance_frequency"
              value={formData.maintenance_frequency || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Frequency</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
              <option value="breakdown">Only when machine breaks down</option>
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

    case 5:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Section E - Personnel & Training
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of MRI staff in your department:
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: "staff_radiologists", label: "Radiologists" },
                {
                  name: "staff_radiographers",
                  label: "Radiographers / Technologists",
                },
                { name: "staff_physicists", label: "Medical Physicists" },
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Do your MRI staff engage in Continuing Professional Development (CPD)?
            </label>
            <select
              name="cpd_participation"
              value={formData.cpd_participation || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Option</option>
              <option value="regularly">Yes, regularly</option>
              <option value="occasionally">Occasionally</option>
              <option value="rarely">Rarely</option>
              <option value="never">Never</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Would your staff be interested in attending MRI-specific training/workshops?
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="interest_in_training"
                  value="true"
                  checked={formData.interest_in_training === true}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="interest_in_training"
                  value="false"
                  checked={formData.interest_in_training === false}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">No</span>
              </label>
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
              onClick={nextStep}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700"
            >
              Next
            </button>
          </div>
        </div>
      );

    case 6:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Section F - Cost & Access
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What is the average cost of an MRI scan at your facility (in Naira)?
            </label>
            <input
              type="number"
              min="0"
              name="cost_mri"
              value={formData.cost_mri || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How are MRI costs usually covered? (check all that apply)
            </label>
            <div className="space-y-2">
              {[
                {
                  value: "out_of_pocket",
                  label: "Out-of-pocket (patients pay cash)",
                },
                { value: "private_insurance", label: "Private Insurance" },
                {
                  value: "nhis",
                  label: "NHIS (National Health Insurance Scheme)",
                },
                { value: "hospital_funded", label: "Hospital/Clinic Funded" },
                { value: "other", label: "Other (please specify)" },
              ].map((method) => (
                <div key={method.value} className="flex items-center">
                  <input
                    type="checkbox"
                    id={method.value}
                    name="payment_methods"
                    value={method.value}
                    checked={(formData.payment_methods || []).includes(
                      method.value
                    )}
                    onChange={(e) => {
                      const currentMethods = formData.payment_methods || [];
                      if (e.target.checked) {
                        handleChange({
                          target: {
                            name: "payment_methods",
                            value: [...currentMethods, method.value],
                          },
                        });
                      } else {
                        handleChange({
                          target: {
                            name: "payment_methods",
                            value: currentMethods.filter(
                              (m) => m !== method.value
                            ),
                          },
                        });
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={method.value}
                    className="ml-2 block text-sm text-gray-700"
                  >
                    {method.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {(formData.payment_methods || []).includes("other") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please specify other payment method
              </label>
              <input
                type="text"
                name="payment_methods_other"
                value={formData.payment_methods_other || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

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

    case 7:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Section G - Research & Collaboration
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Has your facility ever participated in MRI-related research?
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="research_participation"
                  value="true"
                  checked={formData.research_participation === true}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="research_participation"
                  value="false"
                  checked={formData.research_participation === false}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Do you have a Research Ethics Committee or Institutional Review
              Board?
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="has_ethics_committee"
                  value="true"
                  checked={formData.has_ethics_committee === true}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="has_ethics_committee"
                  value="false"
                  checked={formData.has_ethics_committee === false}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What challenges prevent your facility from participating in
              MRI research?
            </label>
            <textarea
              name="challenges"
              value={formData.challenges || ""}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Please describe any challenges..."
            />
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

    case 8:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Section H - Challenges & Solutions
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What are the biggest challenges your facility faces in running
              MRI services?
            </label>
            <textarea
              name="challenges"
              value={formData.challenges || ""}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Please describe the challenges..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What solutions do you recommend to improve MRI services in
              Nigeria?
            </label>
            <textarea
              name="solutions"
              value={formData.solutions || ""}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Please provide your recommendations..."
            />
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

    case 9:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Section I - Facility Contact Information (For Validation)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Please provide contact information for a staff member or HOD who can
            validate your facility's information if needed. This helps us verify
            the accuracy of the data provided.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person Name
            </label>
            <input
              type="text"
              name="contact_person"
              value={formData.contact_person || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role/Title
            </label>
            <input
              type="text"
              name="contact_role"
              value={formData.contact_role || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="contact_phone"
              value={formData.contact_phone || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="contact_email"
              value={formData.contact_email || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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

    case 10:
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
              Thank you for completing the Nigeria Medical Imaging Facility
              Survey. Your information is valuable for our research.
            </p>
            <p className="text-gray-700 mb-4">
              You've earned{" "}
              <span className="font-bold text-blue-600">
                {formData.points || 0} points
              </span>{" "}
              for the raffle draw.
            </p>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                Want to earn more points?
              </h3>
              <p className="text-blue-600 mb-3">
                Share your referral link with colleagues and earn 25 points for
                each person who completes the survey!
              </p>
              <button
                onClick={() => {
                  // You can implement a modal or navigation to referral dashboard
                  window.location.href = "/referrals";
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Referral Dashboard
              </button>
            </div>

            <p className="text-gray-600 mt-4">
              Winners will be contacted via email. Good luck!
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div>
          <h2>Complete</h2>
          <p>Thank you for completing the survey!</p>
          <button
            onClick={submitSurvey}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700"
          >
            Submit Survey
          </button>
        </div>
      );
  }
};

export default SurveyForm;
