const PaidLogo = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="24" height="24" rx="6" fill="hsl(var(--primary))" />
    <text
      x="12"
      y="16.5"
      textAnchor="middle"
      fill="hsl(var(--primary-foreground))"
      fontSize="10"
      fontWeight="700"
      fontFamily="system-ui, sans-serif"
    >
      P
    </text>
  </svg>
);

export default PaidLogo;
