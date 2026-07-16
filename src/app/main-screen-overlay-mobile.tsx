"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type MobileRegion = {
  id: string;
  number: string;
  d: string;
  fillRule: "evenodd" | "nonzero";
};

// Matches the viewBox of public/shapes-mobile.svg. Unlike the desktop overlay,
// this SVG is authored in standard top-left orientation, so no y-axis flip.
const VIEWBOX_WIDTH = 2597;
const VIEWBOX_HEIGHT = 8000;

// Region number → full-page info image shown on tap. Note the deliberate
// cross-mapping: region 4 shows shape-5. Regions without an entry (e.g. 5) do
// nothing on tap.
const SHAPE_BY_NUMBER: Record<string, string> = {
  "1": "shape-1",
  "2": "shape-2",
  "3": "shape-3",
  "4": "shape-4",
  "5": "shape-5",
  "6": "shape-6",
  "7": "shape-7",
};

// TEMP: approximate hotspot over the diagonal "Privacy Policy" text near the
// bottom of the page. Traced from a screenshot, so it does NOT yet match the
// artwork exactly — replace this `d` with the real outline (viewBox is
// 2597×8000, top-left origin). Turn STROKE debug on below to see/adjust it.
const PRIVACY_PATH_D = "M1705 7621 L1664 7508 L1194 7679 L1236 7792 Z";

export function MobileScreenOverlay({ regions }: { regions: MobileRegion[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  // The full-page shape image currently shown (its file base), or null.
  const [shape, setShape] = useState<string | null>(null);
  // Drives the fade; separate from `shape` so we can fade out before unmounting.
  const [visible, setVisible] = useState(false);
  // The (long, scrollable) Privacy Policy document. Same show/hide + fade
  // lifecycle as the shapes above: `privacyOpen` keeps it mounted while
  // `privacyVisible` drives the opacity transition.
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  // Warm the HTTP cache for every tap-target shape once the browser is idle, so
  // a tap doesn't wait on the download.
  //
  // Deliberately `rel="prefetch"` and NOT `img.decode()`: each shape is a
  // 3125×9625 artwork, i.e. ~115 MB once expanded to RGBA. Decoding all seven up
  // front allocated ~800 MB of bitmaps and reliably OOM-killed the tab on mobile
  // Safari/Chrome. A prefetch stores the compressed bytes only; the decode then
  // happens once, for the single shape actually being shown.
  useEffect(() => {
    const files = [...new Set(Object.values(SHAPE_BY_NUMBER))];
    const links: HTMLLinkElement[] = [];
    const run = () => {
      for (const file of files) {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = `/mobile-info-shapes/${file}.webp`;
        document.head.append(link);
        links.push(link);
      }
    };
    const hasRIC = typeof window.requestIdleCallback === "function";
    const id = hasRIC ? window.requestIdleCallback(run) : window.setTimeout(run, 1200);
    return () => {
      if (hasRIC) window.cancelIdleCallback(id as number);
      else window.clearTimeout(id as number);
      for (const link of links) link.remove();
    };
  }, []);

  function openPrivacy() {
    setPrivacyOpen(true);
    // Smoothly return to the top so the document opens from its start.
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => setPrivacyVisible(true));
  }

  function closePrivacy() {
    setPrivacyVisible(false);
  }

  // Flip to true to see the Privacy Policy hotspot outline while adjusting it.
  const DEBUG_PRIVACY = false;

  function show(number: string) {
    const file = SHAPE_BY_NUMBER[number];
    if (!file) return;
    setShape(file);
    // Flip opacity on the next frame so the transition runs from 0 → 1.
    requestAnimationFrame(() => setVisible(true));
  }

  function hide() {
    setVisible(false);
  }

  return (
    <>
      {shape !== null && (
        <Image
          src={`/mobile-info-shapes/${shape}.webp`}
          alt=""
          width={3125}
          height={9625}
          unoptimized
          aria-hidden={!visible}
          onTransitionEnd={() => {
            if (!visible) setShape(null);
          }}
          className={`pointer-events-none absolute inset-0 z-30 h-auto w-full transition-opacity duration-1000 ease-in-out ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* While a shape is shown, a tap anywhere on screen dismisses it. */}
      {shape !== null && (
        <div className="fixed inset-0 z-40" onClick={hide} aria-hidden />
      )}

      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full pointer-events-none"
      >
        {regions.map((r) => (
          <path
            key={r.id}
            d={r.d}
            fillRule={r.fillRule}
            fill="#ffffff"
            fillOpacity={0}
            stroke="#ffffff"
            strokeWidth={16}
            strokeOpacity={0}
            className="pointer-events-auto cursor-pointer transition-opacity"
            onMouseEnter={() => setHovered(r.id)}
            onMouseLeave={() =>
              setHovered((prev) => (prev === r.id ? null : prev))
            }
            onClick={() => show(r.number)}
          />
        ))}

        {/* Privacy Policy hotspot — opens the long privacy document. */}
        <path
          d={PRIVACY_PATH_D}
          fill="#ffffff"
          fillOpacity={DEBUG_PRIVACY ? 0.4 : 0}
          stroke="#ff0000"
          strokeWidth={16}
          strokeOpacity={DEBUG_PRIVACY ? 1 : 0}
          className="pointer-events-auto cursor-pointer"
          onClick={openPrivacy}
        />
      </svg>

      {/* Privacy Policy document — a tall, scrollable overlay over the whole
          page with a transparent background. Tap to dismiss. */}
      {privacyOpen && (
        <div
          className={`absolute top-[-140px] left-0 z-50 w-full transition-opacity duration-1000 ease-in-out ${
            privacyVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closePrivacy}
          onTransitionEnd={() => {
            if (!privacyVisible) setPrivacyOpen(false);
          }}
        >
          <Image
            src="/mobile-info-shapes/privacy.webp"
            alt="Privacy Policy"
            width={3125}
            height={40532}
            unoptimized
            priority
            className="block h-auto w-full"
          />
        </div>
      )}
    </>
  );
}
