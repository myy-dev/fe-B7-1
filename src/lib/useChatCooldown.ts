import { useEffect, useRef, useState } from 'react';

export default function useChatCooldown() {
  const deadline = useRef(0);
  const [until, setUntil] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!until) return;
    function updateRemaining() {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (!remaining) setUntil(0);
    }
    const timer = setInterval(updateRemaining, 250);
    window.addEventListener('focus', updateRemaining);
    document.addEventListener('visibilitychange', updateRemaining);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', updateRemaining);
      document.removeEventListener('visibilitychange', updateRemaining);
    };
  }, [until]);

  function startCooldown() {
    const seconds = 5 + Math.floor(Math.random() * 6);
    deadline.current = Date.now() + seconds * 1000;
    setUntil(deadline.current);
    setRemainingSeconds(seconds);
  }

  return {
    remainingSeconds,
    startCooldown,
    isCoolingDown: () => Date.now() < deadline.current,
  };
}
