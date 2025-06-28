import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiPlusCircle, FiEdit, FiCheckCircle } from "react-icons/fi";
import { fetchEstimates } from "../../redux/actions/estimates";
import { ESTIMATE_STATUS, PATHS } from "../../utils/constants";

const EstimateDashboard = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { estimates, loading, error } = useSelector(state => state.estimates);
    
    useEffect(() => {
        dispatch(fetchEstimates());
    }, []);

    const sections = [
        {
            id: "new",
            title: "New Estimates",
            description: "Create new estimates for upcoming projects. Start the estimation process by entering basic project details and requirements.",
            icon: FiPlusCircle,
            buttonText: "Create New Estimate",
            path: PATHS.NEW_ESTIMATE,
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
            iconColor: "text-blue-500",
            buttonColor: "bg-blue-500 hover:bg-blue-600",
            count: 0
        },
        {
            id: "inProgress",
            title: "Estimates In Progress",
            description: "Continue working on draft estimates. Review, modify, and complete estimates that have been started but not yet finalized.",
            icon: FiEdit,
            buttonText: "View In-Progress Estimates",
            path: PATHS.IN_PROGRESS_ESTIMATES,
            bgColor: "bg-amber-50",
            borderColor: "border-amber-200",
            iconColor: "text-amber-500",
            buttonColor: "bg-amber-500 hover:bg-amber-600",
            count: estimates ? estimates.filter(est => est.status === ESTIMATE_STATUS.DRAFT).length : 0
        },
        {
            id: "finalized",
            title: "Finalized Estimates",
            description: "View and manage completed estimates. Access finalized estimates that are ready to be presented to clients or converted to projects.",
            icon: FiCheckCircle,
            buttonText: "View Finalized Estimates",
            path: PATHS.FINALIZED_ESTIMATES,
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
            iconColor: "text-green-500",
            buttonColor: "bg-green-500 hover:bg-green-600",
            count: estimates ? estimates.filter(est => est.status === ESTIMATE_STATUS.FINALIZED).length : 0
        }
    ];

    return (
        <div className="bg-slate-800 h-screen">
        <div className="container mx-auto px-4 py-8">
            
            {error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                    Error loading estimates: {error}
                </div>
            )}
            
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
                        
                        <p className="text-slate-600 mb-4 flex-grow">{section.description}</p>
                        
                        {!loading && (
                            <div className="mb-4 text-slate-700">
                                <span className="font-semibold">{section.count}</span> estimate{section.count !== 1 ? 's' : ''}
                            </div>
                        )}
                        
                        <button
                            onClick={() => navigate(section.path)}
                            className={`${section.buttonColor} text-white py-3 px-4 rounded-md font-medium flex items-center justify-center transition-colors`}
                            disabled={loading && section.id !== 'new'} // Always allow creating new estimates
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
