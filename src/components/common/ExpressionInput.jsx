import PropTypes from "prop-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const EXPRESSION_TOOLTIP_HIDE_DELAY_MS = 120;

const formatExpressionForTooltip = (value) =>
  value
    .replace(/\s*([+\-*/])\s*/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();

const ExpressionInput = ({
  expression,
  className,
  onChange,
  onFocus,
  onBlur,
  onCommit,
  ...inputProps
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const copiedTimeoutRef = useRef(null);
  const focusValueRef = useRef("");
  const didEditSinceFocusRef = useRef(false);

  const normalizedExpression =
    typeof expression === "string" ? expression.trim() : "";
  const hasExpression = normalizedExpression.length > 0;
  const displayExpression = hasExpression
    ? formatExpressionForTooltip(normalizedExpression)
    : "";

  const clearHideTimeout = useCallback(() => {
    if (!hideTimeoutRef.current) return;
    clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = null;
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, EXPRESSION_TOOLTIP_HIDE_DELAY_MS);
  }, [clearHideTimeout]);

  const showTooltip = useCallback(() => {
    if (!hasExpression) return;
    clearHideTimeout();
    setVisible(true);
  }, [clearHideTimeout, hasExpression]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = triggerRect.top - tooltipRect.height - gap;
    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

    if (top < 6) {
      top = triggerRect.bottom + gap;
    }

    left = Math.max(6, Math.min(left, window.innerWidth - tooltipRect.width - 6));
    top = Math.max(6, Math.min(top, window.innerHeight - tooltipRect.height - 6));

    setCoords({ top, left });
  }, []);

  const handleCopyExpression = useCallback(async () => {
    if (!hasExpression) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedExpression);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = normalizedExpression;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [hasExpression, normalizedExpression]);

  useEffect(() => {
    if (!visible) return;
    updatePosition();
  }, [updatePosition, visible]);

  useEffect(() => {
    if (!visible) return undefined;

    const handleWindowChanges = () => updatePosition();
    window.addEventListener("scroll", handleWindowChanges, true);
    window.addEventListener("resize", handleWindowChanges);

    return () => {
      window.removeEventListener("scroll", handleWindowChanges, true);
      window.removeEventListener("resize", handleWindowChanges);
    };
  }, [updatePosition, visible]);

  useEffect(() => {
    if (!copied) return undefined;

    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 1200);

    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
        copiedTimeoutRef.current = null;
      }
    };
  }, [copied]);

  useEffect(() => {
    if (hasExpression) return;
    setVisible(false);
    setCopied(false);
  }, [hasExpression]);

  useEffect(
    () => () => {
      clearHideTimeout();
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    },
    [clearHideTimeout],
  );

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-block w-full"
        onMouseEnter={showTooltip}
        onMouseLeave={scheduleHide}
      >
        <input
          {...inputProps}
          className={className}
          onChange={(event) => {
            if (event.target.value !== focusValueRef.current) {
              didEditSinceFocusRef.current = true;
            }
            onChange?.(event);
          }}
          onFocus={(event) => {
            focusValueRef.current = event.target.value;
            didEditSinceFocusRef.current = false;
            showTooltip();
            onFocus?.(event);
          }}
          onBlur={(event) => {
            scheduleHide();
            onCommit?.({
              value: event.target.value,
              didEdit: didEditSinceFocusRef.current,
            });
            onBlur?.(event);
          }}
        />
      </span>

      {visible && hasExpression &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{ top: coords.top, left: coords.left }}
            onMouseEnter={showTooltip}
            onMouseLeave={scheduleHide}
            className="fixed z-[10000] max-w-[320px] rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
          >
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
              Expression
            </div>
            <div className="break-all font-mono text-slate-100">{displayExpression}</div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleCopyExpression}
                className="rounded border border-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-800"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

ExpressionInput.propTypes = {
  expression: PropTypes.string,
  className: PropTypes.string,
  onChange: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  onCommit: PropTypes.func,
};

export default ExpressionInput;
