import React, { useEffect, useState } from "react";
import { FiArrowLeft, FiEdit, FiTrash2, FiSearch, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { fetchEstimates, deleteEstimate, setCurrentEstimate } from "../../redux/actions/estimates";
import { PATHS, ESTIMATE_STATUS } from "../../utils/constants";

const InProgressEstimates = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { estimates, loading, error } = useSelector((state) => state.estimates);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  useEffect(() => {
    // Only fetch if estimates array is empty
    if (!estimates || estimates.length === 0) {
      dispatch(fetchEstimates({ status: ESTIMATE_STATUS.DRAFT }));
    }
  }, []);

  // Filter for draft estimates only
  const draftEstimates = estimates.filter(
    (estimate) => estimate.status === ESTIMATE_STATUS.DRAFT
  );

  // Apply search filter
  const filteredEstimates = draftEstimates.filter((estimate) => {
    const projectName = estimate.est_project_name || "";
    const clientName = estimate.est_client_name || "";
    const searchLower = searchTerm.toLowerCase();
    
    return (
      projectName.toLowerCase().includes(searchLower) ||
      clientName.toLowerCase().includes(searchLower)
    );
  });

  const handleEditEstimate = (estimate) => {
    dispatch(setCurrentEstimate(estimate));
    navigate(`${PATHS.IN_PROGRESS_ESTIMATES}/${estimate.estimate_id}`);
  };

  const handleDeleteEstimate = async (estimateId) => {
    try {
      await dispatch(deleteEstimate(estimateId));
      setShowConfirmDelete(null);
    } catch (error) {
      console.error("Failed to delete estimate:", error);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="bg-slate-800 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-5xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate(PATHS.ESTIMATES)}
              className="mr-4 text-slate-600 hover:text-slate-800"
              aria-label="Go back"
            >
              <FiArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">
              Estimates In Progress
            </h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by project or client name..."
                className="w-full px-10 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <FiSearch className="absolute left-3 top-3 text-slate-400" />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredEstimates.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-8 text-center">
              <p className="text-slate-500 mb-4">
                {searchTerm
                  ? "No estimates found matching your search"
                  : "No draft estimates found"}
              </p>
              <button
                onClick={() => navigate(PATHS.NEW_ESTIMATE)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                Create New Estimate
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <div className="grid grid-cols-5 gap-4 bg-slate-50 py-3 px-6 border-b border-slate-200">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Project</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Client</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Created</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Last Updated</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Actions</div>
                </div>
                <div className="bg-white divide-y divide-slate-200">
                  {filteredEstimates.map((estimate) => (
                    <div
                      key={estimate.estimate_id}
                      className="grid grid-cols-5 gap-4 py-4 px-6 hover:bg-slate-50 transition-colors items-center"
                    >
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {estimate.est_project_name || "Unknown Project"}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {estimate.est_client_name || "N/A"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(estimate.created_at)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(estimate.updated_at)}
                      </div>
                      <div className="text-sm font-medium text-right">
                        <button
                          onClick={() => handleEditEstimate(estimate)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                          aria-label="Edit estimate"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => setShowConfirmDelete(estimate.estimate_id)}
                          className="text-red-600 hover:text-red-900"
                          aria-label="Delete estimate"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-slate-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-slate-500 mb-6">
              Are you sure you want to delete this estimate? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEstimate(showConfirmDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InProgressEstimates;
