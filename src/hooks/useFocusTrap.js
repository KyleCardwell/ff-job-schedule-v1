import { useEffect, useRef } from 'react';

export const useFocusTrap = (ref, isActive) => {
  const firstFocusableElement = useRef(null);
  const lastFocusableElement = useRef(null);

  useEffect(() => {
    if (isActive && ref.current) {
      const focusableElements = ref.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      firstFocusableElement.current = focusableElements[0];
      lastFocusableElement.current = focusableElements[focusableElements.length - 1];

      // Focus the first element when the trap becomes active
      firstFocusableElement.current.focus();
      
      // If the first element is an input, select its text for easy editing
      if (firstFocusableElement.current.tagName === 'INPUT' && 
          (firstFocusableElement.current.type === 'text' || 
           firstFocusableElement.current.type === 'number')) {
        firstFocusableElement.current.select();
      }

      const handleKeyDown = (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstFocusableElement.current) {
            e.preventDefault();
            lastFocusableElement.current.focus();
          }
        } else { // Tab
          if (document.activeElement === lastFocusableElement.current) {
            e.preventDefault();
            firstFocusableElement.current.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isActive, ref]);
};
