"use client";

import Image from "next/image";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ApplyForm } from "./apply-form";

// Full-page info shapes shown when a numbered region is clicked. Keyed by
// region index (index 0 → digit "1", index 2 → digit "3"). `from` picks the
// slide-in direction; `cx`/`cy` are the fractional center of the artwork,
// used to place the close button inside the shape.
// The design artboard the shape/text/arrow coordinates are authored in.
const DESIGN_W = 1920;
const DESIGN_H = 5470;

type ShapeConfig = {
  file: string;
  from: "right" | "left" | "top-right" | "fade";
  // Fractional center of the artwork; also the fallback close-button position.
  cx: number;
  cy: number;
  // Optional design-specified close-button (arrow) rectangle, in artboard px.
  // Falls back to a default box centered on cx/cy when omitted.
  arrow?: { left: number; top: number; width: number; height: number };
  // When set, a semi-transparent scrim is painted behind the shape artwork.
  backdrop?: boolean;
  // Scrim color; defaults to black when omitted.
  backdropColor?: "black" | "white";
  // Optional hint shown to the left of the close arrow while it is hovered.
  // Positioned in artboard px; line breaks in `body` are preserved.
  closeHint?: {
    body: string;
    left: number;
    top: number;
    width: number;
    color?: string;
  };
  // Stroke color for the close arrow while it is hovered (defaults to white).
  arrowHoverColor?: string;
  // Optional white text overlay, positioned in artboard px. Line breaks in
  // `body` are preserved (whitespace-pre-line); long lines wrap within `width`.
  text?: {
    body: string;
    left: number;
    top: number;
    width: number;
    weight?: number;
  };
  // Additional close controls beyond the primary one (e.g. a second arrow at
  // the bottom of a long shape), each with its own hover hint/color.
  extraCloses?: CloseControl[];
  // When set, the application form is overlaid on the shape (positioned in
  // artboard px inside ApplyForm itself).
  form?: boolean;
};

type CloseControl = {
  arrow: { left: number; top: number; width: number; height: number };
  hint?: {
    body: string;
    left: number;
    top: number;
    width: number;
    color?: string;
  };
  hoverColor?: string;
};

const SHAPE_BY_INDEX: Record<number, ShapeConfig> = {
  0: {
    file: "shape-1",
    from: "right",
    cx: 0.616,
    cy: 0.22,
    arrow: { left: 1600, top: 1051, width: 35, height: 83 },
  },
  1: {
    file: "shape-2",
    from: "fade",
    cx: 0.6,
    cy: 0.32,
    arrow: { left: 1712, top: 1810, width: 35, height: 83 },
    backdrop: true,
  },
  2: {
    file: "shape-3",
    from: "top-right",
    cx: 0.593,
    cy: 0.422,
    arrow: { left: 1721, top: 2555, width: 35, height: 83 },
  },
  3: {
    file: "shape-4",
    from: "fade",
    cx: 0.386,
    cy: 0.611,
    arrow: { left: 900, top: 3496, width: 35, height: 83 },
  },
  4: {
    file: "shape-5",
    from: "fade",
    cx: 0.575,
    cy: 0.78,
    arrow: { left: 1104, top: 4290, width: 35, height: 83 },
    backdrop: true,
  },
  5: {
    file: "shape-6",
    from: "fade",
    cx: 0.6,
    cy: 0.67,
    arrow: { left: 1685, top: 3653, width: 35, height: 83 },
    backdrop: true,
    backdropColor: "white",
    arrowHoverColor: "#000",
    closeHint: {
      left: 1178,
      top: 3658,
      width: 469,
      color: "#000000",
      body: `leave site?
changes that you made may not be saved.`,
    },
    form: true,
    extraCloses: [
      {
        arrow: { left: 1668, top: 5184, width: 70, height: 90 },
        hoverColor: "#000",
        hint: {
          left: 1178,
          top: 5192,
          width: 469,
          color: "#000000",
          body: `leave page?
changes that you made may not be saved.`,
        },
      },
    ],
  },
  6: {
    file: "shape-7",
    from: "left",
    cx: 0.464,
    cy: 0.907,
    arrow: { left: 1249, top: 5217, width: 35, height: 83 },
    text: {
      left: 556,
      top: 5086,
      width: 555,
      weight: 300,
      body: `contact us at 818-963-2116

while we are all about human touch, due to high volume we may not able to answer every inquiry.`,
    },
  },
};

// Close control — the arrow from arrow.svg, inlined without its white artboard
// background. viewBox is a tight crop around the arrow in the design canvas.
function CloseArrow({ stroke = "#fff" }: { stroke?: string }) {
  return (
    <svg
      viewBox="1599 1050 37 85"
      fill="none"
      stroke={stroke}
      strokeLinecap="round"
      strokeWidth={3}
      className="h-full w-full transition-colors duration-200"
    >
      <path
        d="M7805.326-1728.011s77.974-38.142,0-83.069"
        transform="translate(-6205 2862.5)"
      />
      <line x1="1610.5" y1="1076" x2="1600.5" y2="1051" />
      <line x1="1625.5" y1="1053" x2="1600.5" y2="1051" />
    </svg>
  );
}

export type Region = {
  id: string;
  fill: string;
  fillOpacity: number;
  fillRule: "evenodd" | "nonzero";
  d: string;
};

const VIEWBOX_HEIGHT = 22792;

type BBox = { x: number; y: number; width: number; height: number };

export type Override = { dx: number; dy: number; scale: number };
export const DEFAULT_OVERRIDE: Override = { dx: 0, dy: 0, scale: 1 };
export const OVERRIDES_STORAGE_KEY = "main-screen-overlay:number-overrides";

export const INITIAL_OVERRIDES: Record<number, Override> = {
  0: { dx: -160, dy: -955, scale: 0.58 },
  1: { dx: 1190, dy: 415, scale: 0.48 },
  2: { dx: 0, dy: -275, scale: 0.61 },
  3: { dx: 55, dy: -115, scale: 0.57 },
  4: { dx: 0, dy: -70, scale: 0.81 },
  5: { dx: -115, dy: -255, scale: 0.56 },
  6: { dx: 540, dy: 445, scale: 0.62 },
};

const NUMBER_GLYPHS: { viewBox: string; d: string }[] = [
  {
    viewBox: "42.65 -763.35 425.70 799.70",
    d: "M124 14H235V648Q220 637 201 626L87 561L79 574Q145 611 199.0 645.0Q253 679 301 727H321V14H432V0H124Z",
  },
  {
    viewBox: "-24.35 -763.35 529.70 799.70",
    d: "M469 0H12V14Q51 47 83.5 75.0Q116 103 144.5 130.0Q173 157 199.0 185.0Q225 213 252 245Q316 323 339.5 396.0Q363 469 363 531Q363 621 332.5 667.0Q302 713 236 713Q185 713 152.0 690.5Q119 668 119 628Q119 614 125.5 599.5Q132 585 132 570Q132 553 120.0 544.5Q108 536 92 536Q71 536 56.0 547.0Q41 558 41 587Q41 613 56.0 638.5Q71 664 97.0 683.5Q123 703 159.0 715.0Q195 727 236 727Q294 727 335.5 710.0Q377 693 404.0 665.5Q431 638 444.0 603.0Q457 568 457 531Q457 486 444.0 447.5Q431 409 408.5 375.0Q386 341 357.0 310.0Q328 279 296 248Q251 203 207.5 162.0Q164 121 112 74H341Q400 74 426.0 102.5Q452 131 458 181H469Z",
  },
  {
    viewBox: "-9.05 -764.05 512.10 815.10",
    d: "M108 372Q116 376 124.0 380.0Q132 384 142.5 388.0Q153 392 167.5 396.5Q182 401 202 406Q246 418 275.0 436.0Q304 454 320.5 478.0Q337 502 343.5 531.0Q350 560 350 594Q350 618 345.0 639.5Q340 661 328.0 677.5Q316 694 296.5 703.5Q277 713 247 713Q214 713 193.0 704.5Q172 696 160.5 684.5Q149 673 145.0 661.5Q141 650 141 643Q141 616 149.5 602.0Q158 588 158 577Q158 559 145.5 552.0Q133 545 116 545Q72 545 72 588Q72 601 80.5 624.5Q89 648 110.0 671.0Q131 694 166.5 710.5Q202 727 255 727Q303 727 338.5 712.0Q374 697 397.0 674.5Q420 652 431.0 625.5Q442 599 442 575Q442 533 417.5 503.0Q393 473 360.5 453.0Q328 433 295.0 422.0Q262 411 245 408V406Q288 404 328.0 389.0Q368 374 399.0 347.5Q430 321 448.0 285.0Q466 249 466 204Q466 164 448.5 125.0Q431 86 399.5 55.0Q368 24 323.5 5.0Q279 -14 225 -14Q175 -14 140.0 -0.5Q105 13 82.0 35.5Q59 58 46.0 85.5Q33 113 28 142L42 145Q44 131 52.0 107.0Q60 83 79.5 59.0Q99 35 133.5 17.5Q168 0 223 0Q254 0 281.0 9.0Q308 18 327.5 42.0Q347 66 358.0 107.5Q369 149 369 214Q369 247 364.0 279.5Q359 312 344.0 337.5Q329 363 303.0 379.0Q277 395 235 395Q200 395 171.0 384.5Q142 374 117 356Z",
  },
  {
    viewBox: "-5.35 -763.35 532.70 799.70",
    d: "M227 14H316V175H31Q68 255 101.5 322.0Q135 389 162.5 439.5Q190 490 209.5 523.0Q229 556 237 568Q273 625 295.5 656.5Q318 688 334.0 704.0Q350 720 361.5 723.5Q373 727 388 727Q414 727 421.5 719.5Q429 712 429 703Q429 698 423.5 691.0Q418 684 396 663Q373 641 353.5 621.0Q334 601 317.0 581.5Q300 562 283.5 542.5Q267 523 250 503Q190 432 142.5 349.5Q95 267 53 192H316V459H402V192H491V175H402V14H491V0H227Z",
  },
  {
    viewBox: "5.95 -764.05 493.10 815.10",
    d: "M120 727H153Q168 712 183.5 697.0Q199 682 217.5 670.0Q236 658 259.0 651.0Q282 644 312 644Q332 644 349.0 647.5Q366 651 382.0 660.5Q398 670 414.5 686.0Q431 702 451 727L462 720Q435 683 413.0 655.0Q391 627 369.5 608.5Q348 590 324.0 581.0Q300 572 269 572Q251 572 235.5 574.5Q220 577 202.5 583.0Q185 589 165.0 597.5Q145 606 119 618L81 375L83 373Q106 406 146.0 425.0Q186 444 240 444Q294 444 335.5 425.5Q377 407 405.0 377.0Q433 347 447.0 308.5Q461 270 461 230Q461 200 449.5 158.5Q438 117 410.5 78.5Q383 40 336.0 13.0Q289 -14 218 -14Q165 -14 131.5 -0.5Q98 13 78.0 31.5Q58 50 50.5 69.5Q43 89 43 102Q43 125 58.5 134.5Q74 144 94 144Q115 144 127.5 134.0Q140 124 140 104Q140 97 139.5 88.0Q139 79 139 73Q139 28 164.0 14.0Q189 0 231 0Q264 0 288.5 11.0Q313 22 330.0 50.0Q347 78 355.5 125.5Q364 173 364 246Q364 288 358.0 322.0Q352 356 337.5 380.0Q323 404 298.0 417.0Q273 430 234 430Q189 430 159.0 416.5Q129 403 110.0 384.0Q91 365 81.5 344.0Q72 323 68 308L57 311Z",
  },
  {
    viewBox: "-5.05 -764.05 530.10 815.10",
    d: "M388 222Q388 285 378.5 325.0Q369 365 356.0 385.0Q343 405 320.5 417.5Q298 430 266 430Q216 430 185.5 408.5Q155 387 141 362Q132 345 129.0 325.0Q126 305 126 280Q126 203 131.5 151.5Q137 100 157 57Q168 32 192.5 16.0Q217 0 263 0Q302 0 326.0 15.5Q350 31 363 58Q377 87 382.5 124.5Q388 162 388 222ZM488 219Q488 174 470.0 132.0Q452 90 421.5 57.5Q391 25 350.0 5.5Q309 -14 263 -14Q218 -14 176.5 3.0Q135 20 103.0 57.5Q71 95 51.5 155.0Q32 215 32 301Q32 390 54.5 467.5Q77 545 117.0 603.0Q157 661 210.5 694.0Q264 727 327 727Q365 727 390.5 715.5Q416 704 431.5 686.5Q447 669 453.5 648.5Q460 628 460 610Q460 588 445.5 573.0Q431 558 406 558Q360 558 360 592Q360 601 363.5 608.0Q367 615 371.5 623.0Q376 631 380.0 641.0Q384 651 384 666Q384 692 367.0 702.5Q350 713 321 713Q283 713 254.0 695.0Q225 677 204.0 647.5Q183 618 169.0 580.5Q155 543 146.0 504.5Q137 466 131.5 430.0Q126 394 122 367L124 365Q144 401 182.5 422.5Q221 444 268 444Q322 444 363.0 423.5Q404 403 431.5 370.5Q459 338 473.5 298.0Q488 258 488 219Z",
  },
  {
    viewBox: "31.70 -748.30 461.60 798.60",
    d: "M68 712H457Q452 625 431.0 537.0Q410 449 385.0 374.0Q360 299 337.0 245.5Q314 192 306 175Q274 106 252.0 67.5Q230 29 213.5 11.0Q197 -7 183.5 -10.5Q170 -14 156 -14Q142 -14 126.0 -6.0Q110 2 110 19Q110 38 122.5 49.5Q135 61 153 79Q196 121 225.0 154.5Q254 188 275.0 218.5Q296 249 312.0 279.0Q328 309 345 344Q371 398 388.0 447.0Q405 496 414.5 534.5Q424 573 428.0 598.5Q432 624 433 632H186Q135 632 110.0 603.5Q85 575 79 527H68Z",
  },
  {
    viewBox: "0.95 -764.05 518.10 815.10",
    d: "M139 580Q139 548 148.5 525.0Q158 502 176 485Q183 478 197.0 469.0Q211 460 228.0 450.5Q245 441 264.5 431.5Q284 422 303 413Q315 420 327.5 431.5Q340 443 351.0 460.5Q362 478 369.0 502.0Q376 526 376 557Q376 587 372.0 615.0Q368 643 357.0 665.0Q346 687 324.5 700.0Q303 713 269 713Q209 713 174.0 676.0Q139 639 139 580ZM120 167Q120 134 127.5 104.0Q135 74 151.5 50.5Q168 27 194.5 13.5Q221 0 259 0Q292 0 318.0 16.5Q344 33 363.0 57.5Q382 82 392.0 112.0Q402 142 402 169Q402 212 386.5 240.5Q371 269 345.5 289.5Q320 310 287.5 326.0Q255 342 222 359Q189 343 169.0 322.5Q149 302 138.0 278.0Q127 254 123.5 226.0Q120 198 120 167ZM38 174Q38 217 56.5 249.0Q75 281 101.5 304.0Q128 327 157.5 342.0Q187 357 208 366Q179 379 153.5 394.5Q128 410 109.5 430.5Q91 451 80.5 479.0Q70 507 70 547Q70 586 87.5 619.0Q105 652 133.0 676.0Q161 700 196.5 713.5Q232 727 269 727Q303 727 336.0 716.5Q369 706 394.5 686.5Q420 667 435.5 639.5Q451 612 451 578Q451 546 440.0 521.5Q429 497 410.0 476.5Q391 456 367.0 439.0Q343 422 317 406Q346 392 375.5 374.5Q405 357 428.5 333.0Q452 309 467.0 278.0Q482 247 482 208Q482 164 466.0 124.0Q450 84 419.5 53.5Q389 23 345.5 4.5Q302 -14 247 -14Q203 -14 164.5 0.0Q126 14 98.0 39.0Q70 64 54.0 98.5Q38 133 38 174Z",
  },
  {
    viewBox: "-13.05 -764.05 529.10 815.10",
    d: "M124 495Q124 455 127.5 417.0Q131 379 143.5 349.0Q156 319 181.0 300.5Q206 282 249 282Q260 282 282.5 286.5Q305 291 328.0 306.0Q351 321 368.0 350.5Q385 380 385 430Q385 459 383.0 493.5Q381 528 377.0 560.5Q373 593 366.5 620.5Q360 648 350 664Q341 680 320.0 696.5Q299 713 253 713Q214 713 189.0 698.0Q164 683 149.5 655.0Q135 627 129.5 586.5Q124 546 124 495ZM24 494Q24 542 44.5 584.5Q65 627 97.5 658.5Q130 690 170.5 708.5Q211 727 252 727Q293 727 333.5 712.0Q374 697 406.5 659.5Q439 622 459.0 558.5Q479 495 479 398Q479 306 465.0 239.5Q451 173 428.5 127.0Q406 81 377.5 53.5Q349 26 320.0 11.0Q291 -4 264.5 -9.0Q238 -14 219 -14Q189 -14 159.0 -5.5Q129 3 105.0 18.0Q81 33 66.5 55.0Q52 77 52 104Q52 138 69.0 150.5Q86 163 108 163Q132 163 142.0 151.5Q152 140 152 128Q152 120 148.0 113.0Q144 106 139.5 98.0Q135 90 131.5 79.5Q128 69 128 54Q128 31 149.5 15.5Q171 0 214 0Q254 0 285.5 16.5Q317 33 339.0 73.0Q361 113 372.5 180.0Q384 247 384 348H382Q377 338 366.5 324.5Q356 311 339.0 298.5Q322 286 298.0 277.0Q274 268 242 268Q191 268 150.5 288.5Q110 309 82.0 341.5Q54 374 39.0 414.5Q24 455 24 494Z",
  },
];

export function MainScreenOverlay({ regions }: { regions: Region[] }) {
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [bboxes, setBboxes] = useState<BBox[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  // Active info shape overlay. `slidIn` drives the slide-in transform; `closing`
  // drives the fade-out before unmounting.
  const [active, setActive] = useState<ShapeConfig | null>(null);
  const [slidIn, setSlidIn] = useState(false);
  const [closing, setClosing] = useState(false);
  // Index of the hovered close control (0 = primary) — drives its close hint.
  const [hoveredClose, setHoveredClose] = useState<number | null>(null);
  // Set once the form submits successfully — swaps in the success artwork and
  // hides the form/text/close arrows, then auto-closes after 3s.
  const [submitted, setSubmitted] = useState(false);

  function openShape(cfg: ShapeConfig) {
    // Only one section open at a time — ignore clicks until the active one is
    // fully closed (active stays set through the close animation).
    if (active) return;
    setClosing(false);
    setSlidIn(false);
    setHoveredClose(null);
    setSubmitted(false);
    setActive(cfg);
    // Slide from the offscreen start to its place on the next frame.
    requestAnimationFrame(() => setSlidIn(true));
  }

  // Warm the HTTP cache for every shape (and the success image) once the browser
  // is idle after first paint, so a click doesn't wait on the download.
  //
  // Deliberately `rel="prefetch"` and NOT `img.decode()`: each shape is a
  // 4000×11396 artwork, i.e. ~174 MB once expanded to RGBA. Decoding all eight
  // up front allocated ~1.4 GB of bitmaps — survivable on desktop, but this
  // component used to mount on mobile too (behind `hidden lg:block`, which stops
  // painting but not effects) and OOM-killed the tab there. A prefetch stores the
  // compressed bytes only; the decode happens once, for the shape being shown.
  useEffect(() => {
    const files = [
      ...new Set(Object.values(SHAPE_BY_INDEX).map((c) => c.file)),
      "submit-succes",
    ];
    const links: HTMLLinkElement[] = [];
    const run = () => {
      for (const file of files) {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = `/desktop-info-shapes/${file}.webp`;
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

  // Auto-close the success screen after 5 seconds.
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => setClosing(true), 5000);
    return () => clearTimeout(t);
  }, [submitted]);

  function closeShape() {
    setClosing(true);
  }

  // Full-page Privacy Policy overlay (privacy.avif), opened from the hotspot over
  // the "Privacy Policy" text at the bottom of the page. Fades in/out.
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  function openPrivacy() {
    setPrivacyOpen(true);
    // Smoothly return to the top so the document opens from its start.
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => setPrivacyVisible(true));
  }

  function closePrivacy() {
    setPrivacyVisible(false);
  }

  const [overrides] = useState<Record<number, Override>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = window.localStorage.getItem(OVERRIDES_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Record<number, Override>) : {};
    } catch {
      return {};
    }
  });

  useLayoutEffect(() => {
    const next = pathRefs.current.map((el) =>
      el
        ? (() => {
            const b = el.getBBox();
            return { x: b.x, y: b.y, width: b.width, height: b.height };
          })()
        : { x: 0, y: 0, width: 0, height: 0 },
    );
    setBboxes(next);
  }, [regions]);

  const adjustmentFor = (i: number): Override =>
    overrides[i] ?? INITIAL_OVERRIDES[i] ?? DEFAULT_OVERRIDE;

  const hoveredBox = hovered !== null ? bboxes[hovered] : null;

  // Starting (offscreen / pre-fade) transform for the active shape. `fade`
  // stays in place and only animates opacity.
  const isFade = active?.from === "fade";
  const offscreen =
    active?.from === "top-right"
      ? "translate(100%, -100vh)"
      : active?.from === "left"
        ? "translateX(-100%)"
        : isFade
          ? "translate(0, 0)"
          : "translateX(100%)";

  // Every close control for the active shape: the primary one (from
  // active.arrow / closeHint / arrowHoverColor) plus any extras.
  const closeControls: CloseControl[] = active
    ? [
        ...(active.arrow
          ? [
              {
                arrow: active.arrow,
                hint: active.closeHint,
                hoverColor: active.arrowHoverColor,
              },
            ]
          : []),
        ...(active.extraCloses ?? []),
      ]
    : [];

  return (
    <>
    <svg
      viewBox={`0 0 8000 ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
      className="absolute inset-0 h-full w-full pointer-events-none"
    >
      <g transform={`translate(0,${VIEWBOX_HEIGHT}) scale(1,-1)`}>
        {regions.map((r, i) => (
          <path
            key={r.id}
            ref={(el) => {
              pathRefs.current[i] = el;
            }}
            d={r.d}
            fill={r.fill}
            fillOpacity={r.fillOpacity}
            fillRule={r.fillRule}
            className="pointer-events-auto cursor-pointer"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() =>
              setHovered((prev) => (prev === i ? null : prev))
            }
            onClick={() => {
              const cfg = SHAPE_BY_INDEX[i];
              if (cfg) openShape(cfg);
            }}
          />
        ))}
      </g>
      {/* Numbers are only painted for the hovered region (below); the clip
          paths they rely on are defined here for every region. */}
      <defs>
        {regions.map((r) => (
          <clipPath key={`clip-${r.id}`} id={`region-clip-${r.id}`}>
            <path
              d={r.d}
              transform={`translate(0,${VIEWBOX_HEIGHT}) scale(1,-1)`}
            />
          </clipPath>
        ))}
      </defs>
      {active === null &&
        hovered !== null &&
        hoveredBox &&
        hoveredBox.width > 0 &&
        NUMBER_GLYPHS[hovered] &&
        (() => {
          const glyph = NUMBER_GLYPHS[hovered]!;
          const adj = adjustmentFor(hovered);
          const cx = hoveredBox.x + hoveredBox.width / 2 + adj.dx;
          const cy =
            VIEWBOX_HEIGHT - (hoveredBox.y + hoveredBox.height / 2) + adj.dy;
          const size =
            Math.min(hoveredBox.width, hoveredBox.height) * 0.75 * adj.scale;
          const clipId = `region-clip-${regions[hovered].id}`;
          return (
            <g
              clipPath={`url(#${clipId})`}
              style={{ pointerEvents: "none", color: "#fff", opacity: 0.25 }}
            >
              <svg
                x={cx - size / 2}
                y={cy - size / 2}
                width={size}
                height={size}
                viewBox={glyph.viewBox}
                preserveAspectRatio="xMidYMid meet"
              >
                <g transform="scale(1, -1)">
                  <path d={glyph.d} fill="currentColor" />
                </g>
              </svg>
            </g>
          );
        })()}
      {/* {hovered !== null &&
        hoveredBox &&
        hoveredBox.width > 0 &&
        (() => {
          const cx = hoveredBox.x + hoveredBox.width / 2;
          const cy = VIEWBOX_HEIGHT - (hoveredBox.y + hoveredBox.height / 2);
          const fontSize = Math.min(hoveredBox.width, hoveredBox.height) * 0.75;
          const clipId = `region-clip-${regions[hovered].id}`;
          return (
            <>
              <defs>
                <clipPath id={clipId}>
                  <path
                    d={regions[hovered].d}
                    transform={`translate(0,${VIEWBOX_HEIGHT}) scale(1,-1)`}
                  />
                </clipPath>
              </defs>
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontStyle="normal"
                fontWeight={400}
                fill="#fff"
                fillOpacity={0.25}
                clipPath={`url(#${clipId})`}
                style={{
                  pointerEvents: "none",
                  fontFamily: '"mr-eaves-xl-modern-ot", "mr-eaves-xl-modern", sans-serif',
                }}
              >
                {hovered + 1}
              </text>
            </>
          );
        })()} */}
    </svg>

    {active && (
      <div
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          // Only the opacity (open/close fade) lives on this outer layer; the
          // slide lives on the inner layer below so the text can stay put.
          opacity: closing ? 0 : isFade && !slidIn ? 0 : 1,
          transition: "opacity 0.2s ease-in",
          willChange: "opacity",
        }}
        onTransitionEnd={(e) => {
          if (closing && e.propertyName === "opacity") {
            setActive(null);
            setClosing(false);
            setSlidIn(false);
            setSubmitted(false);
          }
        }}
      >
        {/* Sliding layer — artwork, form and close arrows move with the slide.
            The stationary text (rendered after this div) does NOT slide, so a
            slide-in shape is progressively revealed under it. */}
        <div
          className="absolute inset-0"
          style={{
            transform: slidIn ? "translate(0, 0)" : offscreen,
            // Frames 1/3/7 ease in over 1s; fades don't move.
            transition: "transform 1s ease-out",
            // Promote to its own compositor layer so the slide stays on the GPU
            // and doesn't repaint the huge PNG each frame.
            willChange: "transform",
          }}
        >
          {active.backdrop && (
            <div
              className={`absolute inset-0 ${
                active.backdropColor === "white" ? "bg-white/60" : "bg-black/60"
              }`}
            />
          )}
          <Image
            src={`/desktop-info-shapes/${submitted ? "submit-succes" : active.file}.webp`}
            alt=""
            width={4000}
            height={11396}
            unoptimized
            priority
            className="relative block h-auto w-full"
          />
          {!submitted && active.form && (
            <ApplyForm onSuccess={() => setSubmitted(true)} />
          )}
          {!submitted &&
            closeControls.map((ctrl, idx) => (
          <Fragment key={idx}>
            {ctrl.hint && (
              <div
                className="pointer-events-none absolute whitespace-pre-line text-right italic transition-opacity duration-200"
                style={{
                  left: `${(ctrl.hint.left / DESIGN_W) * 100}%`,
                  top: `${(ctrl.hint.top / DESIGN_H) * 100}%`,
                  width: `${(ctrl.hint.width / DESIGN_W) * 100}%`,
                  fontSize: `${(30 / DESIGN_W) * 100}vw`,
                  lineHeight: `${(40 / DESIGN_W) * 100}vw`,
                  color: ctrl.hint.color ?? "#4781A0",
                  opacity: hoveredClose === idx ? 1 : 0,
                }}
              >
                {ctrl.hint.body}
              </div>
            )}
            <button
              type="button"
              onClick={closeShape}
              onMouseEnter={() => setHoveredClose(idx)}
              onMouseLeave={() =>
                setHoveredClose((prev) => (prev === idx ? null : prev))
              }
              aria-label="Close"
              style={{
                left: `${(ctrl.arrow.left / DESIGN_W) * 100}%`,
                top: `${(ctrl.arrow.top / DESIGN_H) * 100}%`,
                width: `${(ctrl.arrow.width / DESIGN_W) * 100}vw`,
                height: `${(ctrl.arrow.height / DESIGN_W) * 100}vw`,
              }}
              className="group pointer-events-auto absolute cursor-pointer"
            >
              <span className="block h-full w-full origin-center transition-transform duration-200 group-hover:-rotate-[20deg]">
                <CloseArrow
                  stroke={
                    hoveredClose === idx && ctrl.hoverColor
                      ? ctrl.hoverColor
                      : "#fff"
                  }
                />
              </span>
            </button>
          </Fragment>
        ))}
        </div>

        {/* Stationary text — does NOT slide. It stays put while the dark shape
            slides in underneath, so the white copy is invisible on the light
            background until the silhouette is behind it, then reads as visible. */}
        {!submitted && active.text && (
          <div
            className="pointer-events-none absolute whitespace-pre-line text-left text-white"
            style={{
              left: `${(active.text.left / DESIGN_W) * 100}%`,
              top: `${(active.text.top / DESIGN_H) * 100}%`,
              width: `${(active.text.width / DESIGN_W) * 100}%`,
              fontSize: `${(30 / DESIGN_W) * 100}vw`,
              lineHeight: `${(40 / DESIGN_W) * 100}vw`,
              fontWeight: active.text.weight ?? 100,
              // Stay hidden while the shape slides in, then reveal near the end
              // (~last 0.4s of the 1s slide) — so the text only appears once the
              // dark silhouette has flowed underneath it.
              opacity: slidIn && !closing ? 1 : 0,
              transition: "opacity 0.4s ease-in 0.6s",
            }}
          >
            {active.text.body}
          </div>
        )}
      </div>
    )}

    {/* Clickable "Privacy Policy" text at the bottom of the page. */}
    <button
      type="button"
      onClick={openPrivacy}
      aria-label="Privacy Policy"
      style={{
        left: `${(960 / DESIGN_W) * 100}%`,
        top: `${(5114 / DESIGN_H) * 100}%`,
        width: `${(191 / DESIGN_W) * 100}%`,
        height: `${(202 / DESIGN_H) * 100}%`,
      }}
      className="pointer-events-auto absolute z-20 cursor-pointer"
    />

    {/* Full-page Privacy Policy overlay: privacy.avif backing shape + the text
        rendered on top + a close arrow near the bottom (fades in/out). */}
    {privacyOpen && (
      <div
        className="pointer-events-auto absolute inset-0 z-40 transition-opacity duration-200 ease-in-out"
        style={{ opacity: privacyVisible ? 1 : 0 }}
        onTransitionEnd={() => {
          if (!privacyVisible) setPrivacyOpen(false);
        }}
      >
        <Image
          src="/desktop-info-shapes/privacy.avif"
          alt=""
          width={8000}
          height={22792}
          unoptimized
          priority
          className="block h-auto w-full"
        />
        <button
          type="button"
          onClick={closePrivacy}
          aria-label="Close"
          style={{
            left: `${(528 / DESIGN_W) * 100}%`,
            top: `${(5224 / DESIGN_H) * 100}%`,
            width: `${(35 / DESIGN_W) * 100}vw`,
            height: `${(83 / DESIGN_W) * 100}vw`,
          }}
          className="group absolute cursor-pointer"
        >
          <span className="block h-full w-full origin-center transition-transform duration-200 group-hover:-rotate-[20deg]">
            <CloseArrow />
          </span>
        </button>
      </div>
    )}
    </>
  );
}
