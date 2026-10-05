interface DuckAvatarProps {
  className?: string;
}

export default function DuckAvatar({ className }: DuckAvatarProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 160" className={className} focusable="false">
      <ellipse cx="80" cy="145" rx="46" ry="7" className="fill-base-content/10" />
      <path
        d="M35 117c-12-1-20-9-21-19 11 5 20 3 27-2h70c15 0 27 11 27 25 0 16-22 24-54 24-28 0-48-9-49-28Z"
        className="fill-primary"
      />
      <path
        d="M55 38c-3-8 0-15 5-20 0 9 5 13 10 14 1-8 6-13 13-15-4 7-3 13 1 18"
        className="fill-primary"
      />
      <path
        d="M80 31c-29 0-49 21-49 48 0 30 20 48 49 48s49-18 49-48c0-27-20-48-49-48Z"
        className="fill-primary"
      />
      <ellipse cx="54" cy="91" rx="10" ry="6" className="fill-accent/30" />
      <ellipse cx="106" cy="91" rx="10" ry="6" className="fill-accent/30" />
      <ellipse cx="61" cy="76" rx="4" ry="6" className="fill-base-content" />
      <ellipse cx="99" cy="76" rx="4" ry="6" className="fill-base-content" />
      <ellipse cx="80" cy="95" rx="20" ry="10" className="fill-accent" />
      <path
        d="M68 96c8 3 16 3 24 0"
        className="stroke-base-content/60"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M105 119c-3 9-12 14-24 14"
        className="stroke-primary-content/15"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
