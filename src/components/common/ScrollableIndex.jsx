import PropTypes from "prop-types";
import { useEffect, useState } from "react";

/**
 * Reusable scrollable index navigation component with automatic section highlighting
 * 
 * @param {Object[]} items - Array of items to display in the index (legacy, flat list)
 * @param {Object[]} groups - Array of grouped items with headers
 * @param {string} groups[].label - Group header label
 * @param {Object[]} groups[].items - Array of items in the group
 * @param {string} title - Title displayed at the top of the index
 * @param {Object} scrollContainerRef - Ref to the scrollable container element
 * @param {Object} sectionRefs - Ref object containing refs to all section elements
 * @param {number} scrollOffset - Offset in pixels when scrolling to sections (default: 80)
 * @param {string} className - Additional CSS classes for the outer container
 * @param {Function} onItemClick - Callback when an item is clicked, receives item id
 */
const ScrollableIndex = ({
  items = [],
  groups = [],
  title = "Navigation",
  scrollContainerRef,
  sectionRefs,
  scrollOffset = 80,
  className = "",
  onItemClick,
}) => {
  const [activeItemId, setActiveItemId] = useState(null);

  // Intersection Observer to track visible sections
  useEffect(() => {
    if (!scrollContainerRef?.current || !sectionRefs?.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with highest intersection ratio
        let maxRatio = 0;
        let mostVisibleEntry = null;

        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });

        if (mostVisibleEntry && mostVisibleEntry.isIntersecting) {
          setActiveItemId(mostVisibleEntry.target.dataset.sectionId);
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: "-100px 0px -50% 0px",
      }
    );

    // Observe all section elements
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [items, groups, scrollContainerRef, sectionRefs]);

  const scrollToSection = (itemId) => {
    const element = sectionRefs.current?.[itemId];
    if (element && scrollContainerRef?.current) {
      const container = scrollContainerRef.current;
      const elementTop = element.offsetTop;

      container.scrollTo({
        top: elementTop - scrollOffset,
        behavior: "smooth",
      });
      
      // Notify parent component for highlight effect
      if (onItemClick) {
        onItemClick(itemId);
      }
    }
  };

  // Determine which mode to use
  const hasGroups = groups && groups.length > 0;
  const hasItems = items && items.length > 0;
  
  if (!hasGroups && !hasItems) return null;

  return (
    <div className={`w-64 flex-none ${className}`}>
      <div className="sticky top-8 p-3 max-h-[calc(100vh-200px)] overflow-y-auto border-r border-slate-200">
        <h3 className="text-xs font-semibold text-slate-300 uppercase mb-3 px-2">
          {title}
        </h3>
        <nav className="space-y-1">
          {hasGroups ? (
            // Render grouped items with headers
            groups.map((group) => (
              <div key={group.label} className="mb-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2 px-2">
                  {group.label}
                </h4>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`
                        w-full text-left px-3 py-2 rounded text-sm transition-all
                        ${
                          activeItemId === item.id
                            ? "bg-teal-600 text-white font-medium shadow-md"
                            : "text-slate-300 hover:bg-slate-600 hover:text-white"
                        }
                      `}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Render flat list (backward compatibility)
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`
                  w-full text-left px-3 py-2 rounded text-sm transition-all
                  ${
                    activeItemId === item.id
                      ? "bg-teal-600 text-white font-medium shadow-md"
                      : "text-slate-300 hover:bg-slate-600 hover:text-white"
                  }
                `}
              >
                {item.label}
              </button>
            ))
          )}
        </nav>
      </div>
    </div>
  );
};

ScrollableIndex.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      items: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          name: PropTypes.string.isRequired,
        })
      ).isRequired,
    })
  ),
  title: PropTypes.string,
  scrollContainerRef: PropTypes.object.isRequired,
  sectionRefs: PropTypes.object.isRequired,
  scrollOffset: PropTypes.number,
  className: PropTypes.string,
  onItemClick: PropTypes.func,
};

export default ScrollableIndex;
