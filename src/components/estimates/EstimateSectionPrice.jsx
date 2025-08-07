import PropTypes from "prop-types";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";

import { FACE_TYPES } from "../../utils/constants";
import { calculate5PieceHardwoodFacePrice, calculateBoxPrice, calculateSlabSheetFacePrice } from "../../utils/estimateHelpers";

const EstimateSectionPrice = ({ section }) => {
  // Get materials from Redux store
  const { boxMaterials, faceMaterials } = useSelector(
    (state) => state.materials
  );


  // Calculate the total price and face counts of all items in the section
  const sectionCalculations = useMemo(() => {
    if (!section) return { totalPrice: 0, faceCounts: {}, facePrices: {} };

    let sectionTotal = 0;
    const faceCounts = {};
    const facePrices = {}; // New object to track prices per face type

    // Initialize faceCounts and facePrices with all face types at 0
    FACE_TYPES.forEach(type => {
      faceCounts[type.value] = 0;
      facePrices[type.value] = 0;
    });

    // Calculate cabinet prices and face counts
    if (section.cabinets && Array.isArray(section.cabinets) && section.cabinets.length > 0) {
      sectionTotal += section.cabinets.reduce((total, cabinet) => {
        if (!cabinet) return total;
        
        const quantity = Number(cabinet.quantity) || 1;
        let cabinetPrice = 0;

        if (cabinet.face_config) {
          // Calculate box material price
          const boxPrice = calculateBoxPrice(cabinet, boxMaterials || [])(section) || 0;

          // Calculate face material price using existing functions - now with price breakdown
          let facePrice = 0;
          let facePriceByType = {};
          
          if (section.section_data && section.face_mat) {
            if (section.section_data.doorStyle === 'slab_sheet') {
              const result = calculateSlabSheetFacePrice(cabinet, faceMaterials || [])(section) || { totalPrice: 0, priceByType: {} };
              facePrice = result.totalPrice;
              facePriceByType = result.priceByType;
            } else if (section.section_data.doorStyle === '5_piece_hardwood') {
              const result = calculate5PieceHardwoodFacePrice(cabinet, faceMaterials || [])(section) || { totalPrice: 0, priceByType: {} };
              facePrice = result.totalPrice;
              facePriceByType = result.priceByType;
            }
          }

          cabinetPrice = (boxPrice + facePrice) * quantity;

          // Count faces and add face prices
          if (cabinet.face_config.faceSummary) {
            // Count faces and add prices for each type
            Object.entries(cabinet.face_config.faceSummary).forEach(([faceType, faceData]) => {
              if (Object.prototype.hasOwnProperty.call(faceCounts, faceType)) {
                // Count faces
                faceCounts[faceType] += (faceData.count || 0) * quantity;
                
                // Add prices directly from the breakdown
                if (facePriceByType[faceType]) {
                  facePrices[faceType] += facePriceByType[faceType] * quantity;
                }
              }
            });
          }
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

    return { totalPrice: sectionTotal, faceCounts, facePrices };
  }, [section, boxMaterials, faceMaterials]);

  // Format number as currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Get total count of faces
  const totalFaces = Object.values(sectionCalculations.faceCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-2 mb-2">
      <div className="flex justify-end items-center">
        <div className="text-slate-300">
          <span className="text-sm font-medium mr-2">Section Total Price:</span>
        </div>
        <div className="text-xl font-bold text-teal-400">
          {formatCurrency(sectionCalculations.totalPrice)}
        </div>
      </div>
      <div className="bg-gray-800 rounded-md p-2">
        {totalFaces > 0 ? (
          <div className="flex flex-wrap gap-6">
            {Object.entries(sectionCalculations.faceCounts).map(([type, count]) => (
              count > 0 ? (
                <div key={type} className="flex justify-between">
                  <span className="text-sm text-slate-400 mr-2">
                    {FACE_TYPES.find(t => t.value === type)?.label || type}s:
                  </span>
                  <span className="text-sm font-medium text-white">{count}</span>
                </div>
              ) : null
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400 italic">Add items below</div>
        )}
      </div>
    </div>
  );
};

EstimateSectionPrice.propTypes = {
  section: PropTypes.object,
};

export default EstimateSectionPrice;
