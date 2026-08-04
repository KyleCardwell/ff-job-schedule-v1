import PropTypes from "prop-types";
import { useState } from "react";

import FinancialsInputSection from "./FinancialsInputSection.jsx";

const FinancialsAccordion = ({
  sections,
  employees,
  services,
  onSectionUpdate,
  onCompletionChange,
}) => {
  const [openSectionId, setOpenSectionId] = useState(null);

  const handleToggleSection = (sectionId) => {
    setOpenSectionId(openSectionId === sectionId ? null : sectionId);
  };

  const handleCompletionChange = (sectionId, isCompleted) => {
    onCompletionChange?.(sectionId, isCompleted);

    if (isCompleted && openSectionId === sectionId) {
      setOpenSectionId(null);
    }
  };

  return (
    <div>
      {sections.map((section) => (
        <FinancialsInputSection
          key={section.id}
          {...section}
          sectionId={section.id}
          employees={employees}
          services={services}
          isExpanded={openSectionId === section.id}
          onToggle={() => handleToggleSection(section.id)}
          onUpdate={(updates) => onSectionUpdate(section.id, updates)}
          onCompletionChange={handleCompletionChange}
        />
      ))}
    </div>
  );
};

FinancialsAccordion.propTypes = {
  sections: PropTypes.array,
  employees: PropTypes.array,
  onSectionUpdate: PropTypes.func,
  services: PropTypes.array,
  onCompletionChange: PropTypes.func,
};

export default FinancialsAccordion;