// components/Navbar.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useSupabase";

// Import your logo - adjust the path as needed
import logo from "../assets/logo.png";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [surveyType, setSurveyType] = useState("short");

  const isAdmin =
    user &&
    (user.email === process.env.REACT_APP_ADMIN_EMAIL ||
      user.email?.endsWith("@admin.com"));

  const handleSurveyTypeChange = (e) => {
    const newType = e.target.value;
    setSurveyType(newType);
    navigate(`/survey?type=${newType}`);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left side with logo and text */}
          <div className="flex items-center flex-shrink-0">
            <div className="flex items-center">
              <img
                src={logo}
                alt="MAI Lab Logo"
                className="h-32 w-auto mr-2"
              />
              <div className="flex flex-col">
                <span className="text-blue-900 font-bold text-xl leading-tight">
                  Medical Artificial Intelligence Laboratory
                </span>
                <span className="text-blue-700 text-sm leading-tight">
                  (MAI Lab)
                </span>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-900 hover:bg-blue-100 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop Navigation links */}
          <div className="hidden md:flex space-x-1 md:space-x-4">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-700 hover:bg-blue-100 hover:text-blue-900"
              }`}
            >
              Home
            </Link>

            {/* Survey Dropdown */}
            <div className="relative group">
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                  location.pathname === "/survey"
                    ? "bg-blue-100 text-blue-900"
                    : "text-gray-700 hover:bg-blue-100 hover:text-blue-900"
                }`}
              >
                Survey
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute left-0 mt-2 w-80 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase border-b border-gray-100">
                    Select Survey Type
                  </div>
                  
                  <Link
                    to="/survey?type=short"
                    className="block px-4 py-3 text-sm hover:bg-blue-50 border-l-4 border-transparent hover:border-blue-500 transition-colors"
                    onClick={() => setSurveyType("short")}
                  >
                    <div className="font-medium text-blue-900">Quick Survey</div>
                    <div className="text-xs text-gray-600 mt-1">
                      MRI Equipment & Staff Only
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">4 steps</span>
                      <span className="text-xs text-blue-600">⏱️ 5-8 minutes</span>
                    </div>
                  </Link>

                  <Link
                    to="/survey?type=full"
                    className="block px-4 py-3 text-sm hover:bg-blue-50 border-l-4 border-transparent hover:border-blue-500 transition-colors"
                    onClick={() => setSurveyType("full")}
                  >
                    <div className="font-medium text-blue-900">Complete Survey</div>
                    <div className="text-xs text-gray-600 mt-1">
                      All Equipment & Detailed Information
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">12 steps</span>
                      <span className="text-xs text-blue-600">⏱️ 15-20 minutes</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <Link
              to="/raffle"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/raffle"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-700 hover:bg-blue-100 hover:text-blue-900"
              }`}
            >
              Raffle
            </Link>

            <Link
              to="/map"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/map"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-700 hover:bg-blue-100 hover:text-blue-900"
              }`}
            >
              Map
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === "/admin"
                    ? "bg-blue-100 text-blue-900"
                    : "text-gray-700 hover:bg-blue-100 hover:text-blue-900"
                }`}
              >
                Admin
              </Link>
            )}

            {!user && (
              <Link
                to="/login"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-blue-100 hover:text-blue-900"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === "/"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-700 hover:bg-blue-100 hover:text-blue-900"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>

            {/* Mobile Survey Type Selector */}
            <div className="px-3 py-2">
              <label className="block text-xs text-gray-600 font-semibold mb-2 uppercase">
                Survey Type
              </label>
              <select
                value={surveyType}
                onChange={handleSurveyTypeChange}
                className="w-full px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="short">Quick Survey (4 steps, 5-8 min)</option>
                <option value="full">Complete Survey (12 steps, 15-20 min)</option>
              </select>
            </div>

            <Link
              to="/raffle"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === "/raffle"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-700 hover:bg-blue-100 hover:text-blue-900"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Raffle
            </Link>

            <Link
              to="/map"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === "/map"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-700 hover:bg-blue-100 hover:text-blue-900"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Map
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === "/admin"
                    ? "bg-blue-100 text-blue-900"
                    : "text-gray-700 hover:bg-blue-100 hover:text-blue-900"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link>
            )}

            {!user && (
              <Link
                to="/login"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-blue-100 hover:text-blue-900"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
