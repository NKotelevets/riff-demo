"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const VISIBLE_MS = 4000;

export function MobileLogo() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function show() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), VISIBLE_MS);
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="Show info"
        className="absolute top-[30px] right-[30px] z-20 block cursor-pointer"
      >
        <Image
          src="/logo.png"
          alt="Logo"
          width={1800}
          height={960}
          priority
          className="h-[45px] w-auto"
        />
      </button>

      {/* Short wide strip of curved trademark text. Anchored to the same
          top as the logo so the two always sit on the same level, with the
          text spanning to the left of the logo. */}
      <Image
        src="/mobile-info-shapes/logo-overlay.png"
        alt=""
        width={3120}
        height={373}
        unoptimized
        aria-hidden={!visible}
        className={`pointer-events-none absolute top-[18px] right-[130px] z-10 h-[60px] w-auto transition-opacity duration-500 ease-in-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
