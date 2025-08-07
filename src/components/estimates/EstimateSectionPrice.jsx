import PropTypes from "prop-types";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";

import { calculate5PieceHardwoodFacePrice, calculateBoxPrice, calculateSlabSheetFacePrice } from "../../utils/estimateHelpers";

const EstimateSectionPrice = ({ section }) => {
  // Get materials from Redux store
  const { boxMaterials, faceMaterials } = useSelector(
    (state) => state.materials
  );


  // Calculate the total price of all items in the section
  const totalPrice = useMemo(() => {
    if (!section) return 0;

    let sectionTotal = 0;

    // Calculate cabinet prices
    if (section.cabinets && Array.isArray(section.cabinets) && section.cabinets.length > 0) {
      sectionTotal += section.cabinets.reduce((total, cabinet) => {
        if (!cabinet) return total;
        
        const quantity = Number(cabinet.quantity) || 1;
        let cabinetPrice = 0;

        if (cabinet.face_config) {
          // Calculate box material price
          const boxPrice = calculateBoxPrice(cabinet, boxMaterials || [])(section) || 0;

          // Calculate face material price
          let facePrice = 0;
          if (section.section_data && cabinet.face_mat) {
            if (section.section_data.doorStyle === 'slab_sheet') {
              facePrice = calculateSlabSheetFacePrice(cabinet, faceMaterials || [])(section) || 0;
            } else if (section.section_data.doorStyle === '5_piece_hardwood') {
              facePrice = calculate5PieceHardwoodFacePrice(cabinet, faceMaterials || [])(section) || 0;
            }
          }

          cabinetPrice = (boxPrice + facePrice) * quantity;
        } else {
          // Fallback to direct price if no face configuration
          cabinetPrice = (Number(cabinet.price) || 0) * quantity;
        }

        return total + cabinetPrice;
      }, 0);
    }

    // Calculate length items prices
    if (section.lengths && Array.isArray(section.lengths) && section.lengths.length > 0) {
      sectionTotal += section.lengths.reduce((total, item) => {
        if (!item) return total;
        
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        return total + price * quantity;
      }, 0);
    }

    // Calculate accessories prices
    if (section.accessories && Array.isArray(section.accessories) && section.accessories.length > 0) {
      sectionTotal += section.accessories.reduce((total, item) => {
        if (!item) return total;
        
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        return total + price * quantity;
      }, 0);
    }

    // Calculate other item prices
    if (section.other && Array.isArray(section.other) && section.other.length > 0) {
      sectionTotal += section.other.reduce((total, item) => {
        if (!item) return total;
        
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        return total + price * quantity;
      }, 0);
    }

    return sectionTotal;
  }, [section, boxMaterials, faceMaterials]);

  // Format number as currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-2 mb-2">
      <div className="flex justify-between items-center">
        <div className="text-slate-300">
          <span className="text-sm font-medium">Section Total:</span>
        </div>
        <div className="text-xl font-semibold text-teal-400">
          {formatCurrency(totalPrice)}
        </div>
      </div>
    </div>
  );
};

EstimateSectionPrice.propTypes = {
  section: PropTypes.object,
};

export default EstimateSectionPrice;
