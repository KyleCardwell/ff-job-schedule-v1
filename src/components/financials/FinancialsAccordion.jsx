import React, { useState } from "react";
import FinancialsInputSection from "./FinancialsInputSection";

const FinancialsAccordion = ({ sections }) => {
  const [openSectionId, setOpenSectionId] = useState(null);

  const handleToggleSection = (sectionId) => {
    setOpenSectionId(openSectionId === sectionId ? null : sectionId);
  };

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <FinancialsInputSection
          key={section.id}
          {...section}
          isExpanded={openSectionId === section.id}
          onToggle={() => handleToggleSection(section.id)}
        />
      ))}
    </div>
  );
};

export default FinancialsAccordion;