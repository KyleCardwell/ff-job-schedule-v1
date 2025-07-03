import React from "react";

const EstimateDashboardCard = ({ section, loading, onNavigate }) => {
  return (
    <div
      key={section.id}
      className={`flex flex-col h-full rounded-lg shadow-md ${section.bgColor} border ${section.borderColor} p-6 transition-transform hover:scale-[1.01]`}
    >
      <div className="flex items-center mb-4">
        <section.icon className={`w-8 h-8 mr-3 ${section.iconColor}`} />
        <h2 className="text-2xl font-semibold text-slate-800">
          {section.title}
        </h2>
      </div>

      <p className="text-slate-600 mb-4 flex-grow">{section.description}</p>

      {!loading && section.id !== "new" && (
        <div className="mb-4 text-slate-700">
          <span className="font-semibold">{section.count}</span> estimate
          {section.count !== 1 ? "s" : ""}
        </div>
      )}

      <button
        onClick={() => onNavigate(section)}
        className={`${section.buttonColor} text-white py-3 px-4 rounded-md font-medium flex items-center justify-center transition-colors`}
        disabled={loading && section.id !== "new"} // Always allow creating new estimates
      >
        <section.icon className="w-5 h-5 mr-2" />
        {section.buttonText}
      </button>
    </div>
  );
};

export default EstimateDashboardCard;
