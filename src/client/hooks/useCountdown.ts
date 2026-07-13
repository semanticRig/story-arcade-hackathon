import { useEffect, useState } from 'react';

export function useCountdown(targetTime: Date) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = targetTime.getTime() - Date.now();
      if (diff <= 0) {
        setHours(0);
        setMinutes(0);
        setSeconds(0);
        setIsExpired(true);
        return;
      }
      setHours(Math.floor(diff / 3_600_000));
      setMinutes(Math.floor((diff % 3_600_000) / 60_000));
      setSeconds(Math.floor((diff % 60_000) / 1_000));
      setIsExpired(false);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  return { hours, minutes, seconds, isExpired };
}
