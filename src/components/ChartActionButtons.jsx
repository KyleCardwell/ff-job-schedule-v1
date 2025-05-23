import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearAuth } from "../redux/authSlice";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { buttonClass } from "../assets/tailwindConstants";
import { usePermissions } from "../hooks/usePermissions";

const ChartActionButtons = ({
  scrollToMonday,
  setIsJobModalOpen,
  setIsBuilderModalOpen,
  setIsHolidayModalOpen,
  setIsSettingsModalOpen,
  leftColumnWidth,
}) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { canEditSchedule } = usePermissions();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const employeeTypes = useSelector((state) => state.chartConfig.employee_type);

  const employees = useSelector((state) => state.builders.employees);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      dispatch(clearAuth());
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  return (
    <div className="flex justify-end gap-2 mb-2 print:hidden">
      {/* Desktop View */}
      <div className="hidden mobLan:hidden flex-grow md:flex gap-2 justify-end">
        {location.pathname === "/" && (
          <div className="flex flex-grow gap-2 justify-end">
            <div
              className={`flex flex-start`}
              style={{ width: leftColumnWidth }}
            >
              {canEditSchedule && (
                <button
                  className={`${buttonClass} bg-blue-500 ml-2`}
                  onClick={() => setIsSettingsModalOpen(true)}
                >
                  Settings
                </button>
              )}
            </div>
            <button
              className={`${buttonClass} bg-orange-500 mr-auto`}
              onClick={() => scrollToMonday(new Date())}
            >
              Today
            </button>
            {employees.length > 0 && canEditSchedule && (
              <button
                className={`${buttonClass} bg-green-500`}
                onClick={() => setIsJobModalOpen(true)}
              >
                Add Job
              </button>
            )}
            {employeeTypes.length > 0 && canEditSchedule && (
              <button
                className={`${buttonClass} bg-blue-500`}
                onClick={() => setIsBuilderModalOpen(true)}
              >
                Employees
              </button>
            )}
            {canEditSchedule && (
            <button
              className={`${buttonClass} bg-purple-500`}
              onClick={() => {
                setIsHolidayModalOpen(true);
              }}
            >
              Holidays
            </button>
            )}
          </div>
        )}
        <Link to={`${location.pathname === "/" ? "/completed" : "/"}`}>
          <button className={`${buttonClass} bg-gray-800`}>
            {`${location.pathname === "/" ? "Completed Jobs" : "Job Schedule"}`}
          </button>
        </Link>
        <button
          className={`${buttonClass} bg-red-500 mr-2`}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden mobLan:block fixed top-0 right-0 z-50">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-gray-800 text-white px-4 py-2"
        >
          Menu
        </button>

        {/* Dropdown Menu */}
        <div
          className={`${
            isMenuOpen ? "flex" : "hidden"
          } flex-col gap-2 absolute top-12 right-0 bg-white p-4 rounded-md shadow-lg min-w-[200px]`}
        >
          {location.pathname === "/" && (
            <>
              {employees.length > 0 && canEditSchedule && (
                <button
                  className={`${buttonClass} bg-blue-500 w-full text-left`}
                  onClick={() => {
                    setIsSettingsModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  Settings
                </button>
              )}
              <button
                className={`${buttonClass} bg-orange-500 w-full text-left`}
                onClick={() => {
                  scrollToMonday(new Date());
                  setIsMenuOpen(false);
                }}
              >
                Today
              </button>
              {employees.length > 0 && canEditSchedule && (
                <button
                  className={`${buttonClass} bg-green-500 w-full text-left`}
                  onClick={() => {
                    setIsJobModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  Add Job
                </button>
              )}
              {canEditSchedule && (
                <button
                  className={`${buttonClass} bg-blue-500 w-full text-left`}
                  onClick={() => {
                    setIsBuilderModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  Employees
                </button>
              )}
              {canEditSchedule && (
                <button
                  className={`${buttonClass} bg-purple-500 w-full text-left`}
                  onClick={() => {
                    setIsHolidayModalOpen(true);
                    setIsMenuOpen(false);
                }}
              >
                Holidays
              </button>
              )}
            </>
          )}
          <Link
            to={`${location.pathname === "/" ? "/completed" : "/"}`}
            onClick={() => setIsMenuOpen(false)}
            className="w-full"
          >
            <button className={`${buttonClass} bg-gray-800 w-full text-left`}>
              {`${
                location.pathname === "/" ? "Completed Jobs" : "Job Schedule"
              }`}
            </button>
          </Link>
          <button
            className={`${buttonClass} bg-red-500 w-full text-left`}
            onClick={() => {
              handleLogout();
              setIsMenuOpen(false);
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChartActionButtons;
