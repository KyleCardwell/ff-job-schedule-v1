import PropTypes from "prop-types";

const EstimateSectionPriceGroup = ({title, titleAction, children}) => {
    return (
        <div>
            <div className="bg-slate-700 pt-1 px-3 rounded-t-md mb-0 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">{title}</h3>
            {titleAction && <div>{titleAction}</div>}
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
    titleAction: PropTypes.node,
    children: PropTypes.node,
}

export default EstimateSectionPriceGroup