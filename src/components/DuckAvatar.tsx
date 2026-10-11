import { useEffect, useRef, useState } from 'react';

interface DuckAvatarProps {
  className?: string;
  followPointer?: boolean;
  smilePeriodically?: boolean;
}

export default function DuckAvatar({
  className,
  followPointer = false,
  smilePeriodically = false,
}: DuckAvatarProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const [isSmiling, setIsSmiling] = useState(false);

  useEffect(() => {
    if (!smilePeriodically) return;

    let smileTimer: ReturnType<typeof setTimeout> | undefined;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleSmile = () => {
      const delay = 5000 + Math.random() * 25000;

      smileTimer = setTimeout(() => {
        setIsSmiling(true);
        resetTimer = setTimeout(() => setIsSmiling(false), 750);
        scheduleSmile();
      }, delay);
    };

    scheduleSmile();

    return () => {
      clearTimeout(smileTimer);
      clearTimeout(resetTimer);
    };
  }, [smilePeriodically]);

  useEffect(() => {
    const eyes = eyesRef.current;

    if (!followPointer || !eyes) return;

    const resetEyes = () => {
      eyes.style.transform = 'translate(0px, 0px)';
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;

      const matrix = svgRef.current?.getScreenCTM?.();

      if (!matrix) return;

      const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const dx = cursor.x - 80;
      const dy = cursor.y - 76;
      const angle = Math.atan2(dy, dx);
      const distance = Math.min(4, Math.hypot(dx, dy) / 12);

      eyes.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) resetEyes();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerout', handlePointerOut);
    window.addEventListener('blur', resetEyes);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('blur', resetEyes);
      resetEyes();
    };
  }, [followPointer]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      viewBox="0 0 160 160"
      className={className}
      focusable="false"
    >
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
      <g
        ref={eyesRef}
        className={
          followPointer
            ? 'transition-transform duration-100 ease-out motion-reduce:transition-none'
            : undefined
        }
      >
        {smilePeriodically && isSmiling ? (
          <>
            <path
              d="M53 78A8 8.5 0 0 1 69 78"
              className="stroke-base-content"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M91 78A8 8.5 0 0 1 107 78"
              className="stroke-base-content"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <ellipse cx="61" cy="76" rx="4" ry="6" className="fill-base-content" />
            <ellipse cx="99" cy="76" rx="4" ry="6" className="fill-base-content" />
          </>
        )}
      </g>
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
