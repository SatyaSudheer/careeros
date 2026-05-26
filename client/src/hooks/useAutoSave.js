import { useCallback, useRef, useState } from 'react';

export function useAutoSave(saveFn, delay = 700) {
  const [state, setState] = useState('idle'); // idle | pending | saving | saved | error
  const timerRef = useRef(null);
  const latestFn = useRef(saveFn);
  latestFn.current = saveFn;

  const schedule = useCallback((data) => {
    setState('pending');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setState('saving');
      try {
        await latestFn.current(data);
        setState('saved');
        setTimeout(() => setState('idle'), 2500);
      } catch {
        setState('error');
      }
    }, delay);
  }, [delay]);

  const flush = useCallback(async (data) => {
    clearTimeout(timerRef.current);
    setState('saving');
    try {
      await latestFn.current(data);
      setState('saved');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('error');
    }
  }, []);

  return { schedule, flush, state };
}
