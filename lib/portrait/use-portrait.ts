'use client';

import {useEffect, useRef, useState} from 'react';
import type {Pose} from './scene';

type Status = 'loading' | 'ready' | 'reduced' | 'unavailable';

export function usePortrait(enabled: boolean, pose: Pose = 'Live') {
  const canvas = useRef<HTMLCanvasElement>(null);
  const choice = useRef(pose);
  const refresh = useRef<() => void>(undefined);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    choice.current = pose;
    refresh.current?.();
  }, [pose]);

  useEffect(() => {
    const surface = canvas.current;
    if (!surface || !enabled) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let near = false;
    let controller: AbortController | undefined;
    let dispose: (() => void) | undefined;

    function stop() {
      controller?.abort();
      controller = undefined;
      dispose?.();
      dispose = undefined;
      refresh.current = undefined;
    }

    async function start() {
      if (!surface || !near || motion.matches || controller) return;
      const request = new AbortController();
      controller = request;
      setStatus('loading');
      try {
        const {mount} = await import('./scene');
        if (request.signal.aborted) return;
        const viewer = await mount(surface, () => choice.current, request.signal, () => {
          if (!request.signal.aborted) setStatus('unavailable');
        });
        if (request.signal.aborted) { viewer.dispose(); return; }
        dispose = viewer.dispose;
        refresh.current = viewer.refresh;
        setStatus('ready');
      } catch {
        if (!request.signal.aborted) setStatus('unavailable');
      }
    }

    function motionChanged() {
      if (motion.matches) { stop(); setStatus('reduced'); }
      else void start();
    }
    const observer = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      if (near) void start();
    }, {rootMargin: '200px 0px'});
    observer.observe(surface);
    motionChanged();
    motion.addEventListener('change', motionChanged);
    return () => {
      observer.disconnect();
      motion.removeEventListener('change', motionChanged);
      stop();
    };
  }, [enabled]);

  return {canvas, status: enabled ? status : 'loading'};
}
