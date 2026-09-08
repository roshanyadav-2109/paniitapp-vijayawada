// SMS-style chat bubble glyph: rounded rectangle bubble with a tail and
// two short message lines inside. Tuned to feel handmade vs the stock
// lucide MessageSquare.
export function ChatBubbleGlyph({
  className,
  strokeWidth = 1.6,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M4 8.4C4 6.5 5.5 5 7.4 5h9.2C18.5 5 20 6.5 20 8.4v6c0 1.9-1.5 3.4-3.4 3.4h-6L6 21v-3.2C4.8 17.4 4 16 4 14.4V8.4z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </svg>
  );
}
