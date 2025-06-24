import React from "react";
import { useNavigate } from "react-router-dom";
import { FiPlusCircle, FiEdit, FiCheckCircle } from "react-icons/fi";

const EstimateDashboard = () => {
    const navigate = useNavigate();

    // Section data
    const sections = [
        {
            id: "new",
            title: "New Estimates",
            description: "Create new estimates for upcoming projects. Start the estimation process by entering basic project details and requirements.",
            icon: FiPlusCircle,
            buttonText: "Create New Estimate",
            path: "/estimates/new",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
            iconColor: "text-blue-500",
            buttonColor: "bg-blue-500 hover:bg-blue-600"
        },
        {
            id: "inProgress",
            title: "Estimates In Progress",
            description: "Continue working on draft estimates. Review, modify, and complete estimates that have been started but not yet finalized.",
            icon: FiEdit,
            buttonText: "View In-Progress Estimates",
            path: "/estimates/in-progress",
            bgColor: "bg-amber-50",
            borderColor: "border-amber-200",
            iconColor: "text-amber-500",
            buttonColor: "bg-amber-500 hover:bg-amber-600"
        },
        {
            id: "finalized",
            title: "Finalized Estimates",
            description: "View and manage completed estimates. Access finalized estimates that are ready to be presented to clients or converted to projects.",
            icon: FiCheckCircle,
            buttonText: "View Finalized Estimates",
            path: "/estimates/finalized",
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
            iconColor: "text-green-500",
            buttonColor: "bg-green-500 hover:bg-green-600"
        }
    ];

    return (
        <div className="bg-slate-800 h-screen">
        <div className="container mx-auto px-4 py-8">
            
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {sections.map((section) => (
                    <div 
                        key={section.id}
                        className={`flex flex-col h-full rounded-lg shadow-md ${section.bgColor} border ${section.borderColor} p-6 transition-transform hover:scale-[1.01]`}
                    >
                        <div className="flex items-center mb-4">
                            <section.icon className={`w-8 h-8 mr-3 ${section.iconColor}`} />
                            <h2 className="text-2xl font-semibold text-slate-800">{section.title}</h2>
                        </div>
                        
                        <p className="text-slate-600 mb-8 flex-grow">{section.description}</p>
                        
                        <button
                            onClick={() => navigate(section.path)}
                            className={`${section.buttonColor} text-white py-3 px-4 rounded-md font-medium flex items-center justify-center transition-colors`}
                        >
                            <section.icon className="w-5 h-5 mr-2" />
                            {section.buttonText}
                        </button>
                    </div>
                ))}
            </div>
        </div>
        </div>
    );
};

export default EstimateDashboard;
