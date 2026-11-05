// Support chat icon: a rounded speech bubble with three "typing" dots.
// The dots bounce when a parent with .support-icon-host is hovered.
export default function SupportIcon({ size = 24, className = "" }) {
  return (
    <svg
      className={`support-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3.2c5 0 9 3.6 9 8s-4 8-9 8c-1.1 0-2.1-.2-3.1-.5L4.4 20.8l1.3-3.9C4 15.4 3 13.4 3 11.2c0-4.4 4-8 9-8Z" />
      <circle className="support-icon-dot" cx="8" cy="11.3" r="1.2" fill="currentColor" stroke="none" />
      <circle className="support-icon-dot" cx="12" cy="11.3" r="1.2" fill="currentColor" stroke="none" />
      <circle className="support-icon-dot" cx="16" cy="11.3" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
