import { useEffect } from "react";
import { FiPlusCircle, FiEdit, FiCheckCircle } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { fetchCabinetTypes } from "../../redux/actions/cabinetTypes.js";
import { fetchEstimates, clearCurrentEstimate } from "../../redux/actions/estimates";
import { fetchSheetGoods } from "../../redux/actions/materials";
import { ESTIMATE_STATUS, PATHS } from "../../utils/constants";

import EstimateDashboardCard from "./EstimateDashboardCard.jsx";

const EstimateDashboard = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { estimates, loading, error } = useSelector(state => state.estimates);
    
    useEffect(() => {
        dispatch(fetchCabinetTypes());
        dispatch(fetchEstimates());
        dispatch(fetchSheetGoods());
    }, []);

    const handleStartNewEstimate = () => {
        dispatch(clearCurrentEstimate());
        navigate(PATHS.NEW_ESTIMATE);
    };

    const handleNavigate = (section) => {
        if (section.action) {
            section.action();
        } else {
            navigate(section.path);
        }
    };

    const sections = [
        {
            id: "new",
            title: "New Estimates",
            description: "Create new estimates for upcoming projects. Start the estimation process by entering basic project details and requirements.",
            icon: FiPlusCircle,
            buttonText: "Create New Estimate",
            action: handleStartNewEstimate,
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
            iconColor: "text-blue-500",
            buttonColor: "bg-blue-500 hover:bg-blue-600",
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
                    <EstimateDashboardCard 
                        key={section.id} 
                        section={section} 
                        loading={loading}
                        onNavigate={handleNavigate}
                    />
                ))}
            </div>
        </div>
        </div>
    );
};

export default EstimateDashboard;
