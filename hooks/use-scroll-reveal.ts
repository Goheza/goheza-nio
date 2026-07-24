"use client"

import { useEffect, useRef } from "react";

/**
 * Marks the returned ref's element with data-reveal="in" once it scrolls into
 * view. Pair with the `.reveal` or `.reveal-scale` utility for the transition.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.reveal = "in";
          io.unobserve(entry.target);
        }
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}

/**
 * Returns a ref + applies a translateY parallax based on the element's
 * position in the viewport. `speed` is the multiplier (positive moves the
 * element up as the user scrolls down).
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(speed = 0.12) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const delta = (rect.top + rect.height / 2 - vh / 2) / vh;
      el.style.transform = `translate3d(0, ${(-delta * speed * 100).toFixed(2)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);

  return ref;
}

/**
 * Sets a `--p` CSS custom property on the element as the page scrolls.
 * Value goes from 0 (top of page) to 1 (after one viewport of scroll).
 * Use it to drive layered hero reveal animations.
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.style.setProperty("--p", "1");
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const y = window.scrollY || window.pageYOffset || 0;
      const p = Math.max(0, Math.min(1, y / (vh * 0.75)));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
