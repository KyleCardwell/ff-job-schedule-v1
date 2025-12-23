import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";

import { 
  uploadTeamLogo, 
  deleteTeamLogo,
  getTeamLogoSignedUrl 
} from "../../redux/actions/teams";

const TeamLogo = ({ teamData }) => {
  const dispatch = useDispatch();
  const teamId = useSelector((state) => state.auth.teamId);
  const roleId = useSelector((state) => state.auth.roleId);
  const { uploadingLogo, error } = useSelector((state) => state.teams);
  const fileInputRef = useRef(null);

  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Check if user is admin (role_id = 1)
  const isAdmin = roleId === 1;

  // Update logo preview when team data changes
  useEffect(() => {
    const loadLogo = async () => {
      if (teamData?.logo_path && teamId) {
        // Use signed URL for private bucket (more secure)
        const url = await getTeamLogoSignedUrl(teamId, teamData.logo_path);
        setLogoPreview(url);
      } else {
        setLogoPreview(null);
      }
    };
    
    loadLogo();
  }, [teamData, teamId]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadError(null);

    // Validate file type
    const validTypes = ["image/svg+xml", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload an SVG, PNG, or JPG file");
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadError(null);
      await uploadTeamLogo(dispatch, teamId, selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Failed to upload logo:", err);
      setUploadError(err.message || "Failed to upload logo");
    }
  };

  const handleDelete = async () => {
    if (!teamData?.logo_path) return;

    if (!window.confirm("Are you sure you want to delete the company logo?")) {
      return;
    }

    try {
      setUploadError(null);
      await deleteTeamLogo(dispatch, teamId, teamData.logo_path);
      setLogoPreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Failed to delete logo:", err);
      setUploadError(err.message || "Failed to delete logo");
    }
  };

  const handleCancel = async () => {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    // Restore original preview
    if (teamData?.logo_path && teamId) {
      const url = await getTeamLogoSignedUrl(teamId, teamData.logo_path);
      setLogoPreview(url);
    } else {
      setLogoPreview(null);
    }
  };

  return (
    <div className="bg-slate-700 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-slate-200">Company Logo</h3>
      
      {(error || uploadError) && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          Error: {uploadError || error?.message || "An error occurred"}
        </div>
      )}

      <div className="space-y-4">
        {/* Logo Preview */}
        <div className="flex items-center justify-center p-6 bg-slate-600 rounded-lg border-2 border-dashed border-slate-500">
          {logoPreview ? (
            <div className="flex flex-col items-center">
              <img
                src={logoPreview}
                alt="Company Logo"
                className="max-h-48 max-w-full object-contain"
              />
              <p className="mt-2 text-xs text-slate-400">
                {selectedFile ? "New logo (not saved)" : "Current logo"}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-slate-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-slate-300">No logo uploaded</p>
            </div>
          )}
        </div>

        {/* File Upload - Admin Only */}
        {isAdmin ? (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Upload Logo
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="block w-full text-sm text-slate-300
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700
                  file:cursor-pointer cursor-pointer"
              />
              <p className="mt-2 text-xs text-slate-400">
                SVG, PNG, or JPG (recommended: SVG for best quality). Max 5MB.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-600">
              {selectedFile && (
                <>
                  <button
                    onClick={handleUpload}
                    disabled={uploadingLogo}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-500 text-white rounded font-medium transition-colors"
                  >
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={uploadingLogo}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-500 text-slate-200 rounded font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
              
              {!selectedFile && teamData?.logo_path && (
                <button
                  onClick={handleDelete}
                  disabled={uploadingLogo}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-500 text-white rounded font-medium transition-colors"
                >
                  Delete Logo
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="pt-4 border-t border-slate-600">
            <p className="text-sm text-slate-400">
              Only team administrators can upload or delete the company logo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamLogo;
