import {neutral, pointerGaze, scrollFadeEndMs, scrollGaze, swipeTravel, settled, smoothGaze} from './gaze';
import {createRelief} from './relief';

export function mountPortrait(canvas: HTMLCanvasElement, host: HTMLElement, artwork: HTMLImageElement) {
  const relief = createRelief(canvas, artwork);
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let touch = !fine.matches;
  let visible = false;
  let lost = false;
  let frame = 0;
  let previousFrame = 0;
  let current = neutral;
  let pointer: {x: number; y: number} | null = null;
  let travel = 0;
  let lastScroll = performance.now();
  let scrollPosition = window.scrollY;

  function blocked() {
    return lost || !visible || document.hidden || Boolean(document.querySelector('dialog[open]'));
  }

  function targetAt(now: number) {
    const bounds = host.getBoundingClientRect();
    const centreY = bounds.top + bounds.height / 2;
    if (touch) return scrollGaze(centreY, innerHeight, travel, now - lastScroll);
    if (!pointer) return neutral;
    // The painted eyes sit above the centre of the circular crop.
    const eyesY = bounds.top + bounds.height * (240.5 / 640);
    return pointerGaze(pointer.x, pointer.y, bounds.left + bounds.width / 2, eyesY, bounds.width, bounds.height);
  }

  function paint(now: number) {
    frame = 0;
    if (blocked()) return;

    const target = targetAt(now);
    const dt = previousFrame ? Math.min((now - previousFrame) / 1000, 0.05) : 1 / 60;
    previousFrame = now;
    current = smoothGaze(current, target, dt, touch);
    const atTarget = settled(current, target);
    if (atTarget) current = target;

    // At rest the original image is the displayed surface, including on high-DPI screens.
    if (settled(current, neutral)) {
      delete canvas.dataset.moving;
    } else {
      relief.render(current);
      canvas.dataset.moving = 'true';
    }

    const scrollIsDecaying = touch && travel !== 0 && now - lastScroll < scrollFadeEndMs;
    if (!atTarget || scrollIsDecaying) frame = requestAnimationFrame(paint);
  }

  function wake() {
    if (frame || blocked()) return;
    previousFrame = 0;
    frame = requestAnimationFrame(paint);
  }

  function pause() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function sync() {
    if (blocked()) pause();
    else wake();
  }

  function touchStart(event: PointerEvent) {
    if (event.pointerType !== 'touch') return;
    touch = true;
    pointer = null;
    travel = 0;
    wake();
  }

  function move(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    touch = false;
    pointer = {x: event.clientX, y: event.clientY};
    wake();
  }

  function leave() {
    pointer = null;
    wake();
  }

  function scroll() {
    const now = performance.now();
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    const position = Math.max(0, Math.min(window.scrollY, maxScroll));
    const delta = position - scrollPosition;
    if (Math.abs(delta) >= 1) {
      travel = swipeTravel(travel, delta, now - lastScroll);
      lastScroll = now;
      scrollPosition = position;
    }
    wake();
  }

  function resize() {
    // The supplied clay artwork has 640 pixels per side.
    relief.resize(host.clientWidth, host.clientHeight, Math.min(devicePixelRatio, 2));
    wake();
  }

  function pointerCapabilityChanged() {
    touch = !fine.matches;
    pointer = null;
    travel = 0;
    wake();
  }

  function contextLost() {
    lost = true;
    pause();
    delete canvas.dataset.moving;
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(host);
  const sizes = new ResizeObserver(resize);
  sizes.observe(host);
  const dialogs = new MutationObserver(sync);
  dialogs.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['open']});

  window.addEventListener('pointerdown', touchStart, {passive: true});
  window.addEventListener('pointermove', move, {passive: true});
  document.documentElement.addEventListener('pointerleave', leave);
  window.addEventListener('scroll', scroll, {passive: true});
  window.addEventListener('resize', resize, {passive: true});
  document.addEventListener('visibilitychange', sync);
  fine.addEventListener('change', pointerCapabilityChanged);
  canvas.addEventListener('webglcontextlost', contextLost);
  resize();

  return () => {
    pause();
    observer.disconnect();
    sizes.disconnect();
    dialogs.disconnect();
    window.removeEventListener('pointerdown', touchStart);
    window.removeEventListener('pointermove', move);
    document.documentElement.removeEventListener('pointerleave', leave);
    window.removeEventListener('scroll', scroll);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', sync);
    fine.removeEventListener('change', pointerCapabilityChanged);
    canvas.removeEventListener('webglcontextlost', contextLost);
    delete canvas.dataset.moving;
    relief.dispose();
  };
}
