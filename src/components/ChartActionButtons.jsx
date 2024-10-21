import React from "react";

const ChartActionButtons = ({
  scrollToMonday,
  setIsJobModalOpen,
  setIsBuilderModalOpen,
  setIsHolidayModalOpen,
}) => {
  return (
    <div className="action-buttons">
      <button
        className="action-button scroll-to-today-button"
        onClick={() => scrollToMonday(new Date())}
      >
        Today
      </button>
      <button
        className="action-button add-job-button"
        onClick={() => setIsJobModalOpen(true)}
      >
        Add Job
      </button>
      <button
        className="action-button manage-builders-button"
        onClick={() => setIsBuilderModalOpen(true)}
      >
        Builders
      </button>
      <button
        className="action-button manage-holidays-button"
        onClick={() => {
          setIsHolidayModalOpen(true);
        }}
      >
        Holidays
      </button>
    </div>
  );
};

export default ChartActionButtons;
