import React, { useState } from "react";

import FinancialsInputSection from "./FinancialsInputSection.jsx";

const FinancialsAccordion = ({ sections, employees, onSectionUpdate }) => {
  const [openSectionId, setOpenSectionId] = useState(null);

  const handleToggleSection = (sectionId) => {
    setOpenSectionId(openSectionId === sectionId ? null : sectionId);
  };

  return (
    <div>
      {sections.map((section) => (
        <FinancialsInputSection
          key={section.id}
          {...section}
          sectionId={section.id}
          employees={employees}
          isExpanded={openSectionId === section.id}
          onToggle={() => handleToggleSection(section.id)}
          onUpdate={(updates) => onSectionUpdate(section.id, updates)}
        />
      ))}
    </div>
  );
};

export default FinancialsAccordion;