import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

import { updateTeamContactInfo } from "../../redux/actions/teams";

const TeamContactInfo = ({ teamData }) => {
  const dispatch = useDispatch();
  const teamId = useSelector((state) => state.auth.teamId);
  const roleId = useSelector((state) => state.auth.roleId);
  const { loading, error } = useSelector((state) => state.teams);

  // Check if user is admin (role_id = 1)
  const isAdmin = roleId === 1;

  const [formData, setFormData] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    phone: "",
    fax: "",
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Update form when team data loads
  useEffect(() => {
    if (teamData?.contact_info) {
      setFormData({
        street: teamData.contact_info.street || "",
        city: teamData.contact_info.city || "",
        state: teamData.contact_info.state || "",
        zip: teamData.contact_info.zip || "",
        email: teamData.contact_info.email || "",
        phone: teamData.contact_info.phone || "",
        fax: teamData.contact_info.fax || "",
      });
    }
  }, [teamData]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      await updateTeamContactInfo(dispatch, teamId, formData);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save contact info:", err);
    }
  };

  const handleCancel = () => {
    if (teamData?.contact_info) {
      setFormData({
        street: teamData.contact_info.street || "",
        city: teamData.contact_info.city || "",
        state: teamData.contact_info.state || "",
        zip: teamData.contact_info.zip || "",
        email: teamData.contact_info.email || "",
        phone: teamData.contact_info.phone || "",
        fax: teamData.contact_info.fax || "",
      });
    }
    setHasChanges(false);
  };

  if (loading && !teamData) {
    return <div className="p-4 text-slate-300">Loading contact information...</div>;
  }

  return (
    <div className="bg-slate-700 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-slate-200">Company Contact Information</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          Error: {error.message || "Failed to load contact information"}
        </div>
      )}

      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded text-green-200 text-sm">
          Contact information saved successfully!
        </div>
      )}

      <div className="space-y-4">
        {/* Address Section */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Street Address
          </label>
          <input
            type="text"
            value={formData.street}
            onChange={(e) => handleInputChange("street", e.target.value)}
            disabled={!isAdmin}
            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="123 Main St"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              City
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
              disabled={!isAdmin}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="City"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              State
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => handleInputChange("state", e.target.value)}
              disabled={!isAdmin}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="State"
              maxLength={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              value={formData.zip}
              onChange={(e) => handleInputChange("zip", e.target.value)}
              disabled={!isAdmin}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="12345"
            />
          </div>
        </div>

        {/* Contact Details Section */}
        <div className="pt-4 border-t border-slate-600">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="contact@company.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Fax <span className="text-slate-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.fax}
                  onChange={(e) => handleInputChange("fax", e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="(555) 123-4568"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Admin Only */}
        {isAdmin && hasChanges && (
          <div className="flex gap-3 pt-4 border-t border-slate-600">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-500 text-white rounded font-medium transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-500 text-slate-200 rounded font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Non-Admin Message */}
        {!isAdmin && (
          <div className="pt-4 border-t border-slate-600">
            <p className="text-sm text-slate-400">
              Only team administrators can edit company contact information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamContactInfo;
