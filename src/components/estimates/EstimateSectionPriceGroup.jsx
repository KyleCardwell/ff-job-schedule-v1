import PropTypes from "prop-types";

const EstimateSectionPriceGroup = ({title, children}) => {
    return (
        <div>
            <div className="bg-slate-700 pt-1 rounded-t-md mb-0">
            <h3 className="text-sm font-medium text-white">{title}</h3>
          </div>

          {/* Price Breakdown - Content - Grid Layout */}
          <div className="bg-gray-900 rounded-b-md px-3 pt-1 pb-2">
            {children}
          </div>
        </div>
    )
}

EstimateSectionPriceGroup.propTypes = {
    title: PropTypes.string,
    children: PropTypes.node,
}

export default EstimateSectionPriceGroup