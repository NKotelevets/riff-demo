import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { MainScreenOverlay, type Region } from "./main-screen-overlay";
import {
  MobileScreenOverlay,
  type MobileRegion,
} from "./main-screen-overlay-mobile";
import { MobileLogo } from "./mobile-logo";
import { DesktopOnly, MobileOnly } from "./viewport-gate";

const attr = (src: string, name: string) =>
  // (?:^|\s) so e.g. `d` doesn't match inside `id="..."` / `data-number="..."`.
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(src)?.[1];

function loadRegions(): Region[] {
  const file = path.join(process.cwd(), "public", "svg_main_screen.svg");
  const raw = fs.readFileSync(file, "utf8");
  const regions: Region[] = [];
  const pathRe = /<path\b([^/]*?)\/>/g;

  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pathRe.exec(raw)) !== null) {
    const body = match[1];
    const d = attr(body, "d");
    if (!d) continue;
    regions.push({
      id: `region-${++i}`,
      d,
      fill: attr(body, "fill") ?? "currentColor",
      fillOpacity: Number(attr(body, "fill-opacity") ?? "1"),
      fillRule: (attr(body, "fill-rule") as Region["fillRule"]) ?? "nonzero",
    });
  }
  return regions;
}

function loadMobileRegions(): MobileRegion[] {
  const file = path.join(process.cwd(), "public", "shapes-mobile.svg");
  const raw = fs.readFileSync(file, "utf8");
  const regions: MobileRegion[] = [];
  const pathRe = /<path\b([^>]*?)\/>/g;

  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pathRe.exec(raw)) !== null) {
    const body = match[1];
    const d = attr(body, "d");
    if (!d) continue;
    i += 1;
    regions.push({
      id: attr(body, "id") ?? `segment-${i}`,
      number: attr(body, "data-number") ?? String(i),
      d,
      fillRule:
        (attr(body, "fill-rule") as MobileRegion["fillRule"]) ?? "nonzero",
    });
  }
  return regions;
}

export default function Home() {
  const regions = loadRegions();
  const mobileRegions = loadMobileRegions();
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <Image
          src="/logo.png"
          alt="Logo"
          width={1800}
          height={960}
          priority
          className="  h-[100px] w-[188px] absolute top-[75px] left-[75px]"
        />
        <div className="relative w-full overflow-hidden">
          <Image
            src="/desktop-info-shapes/main-background.webp"
            alt=""
            width={8000}
            height={22792}
            unoptimized
            priority
            className="block h-auto w-full"
          />
          <DesktopOnly>
            <MainScreenOverlay regions={regions} />
          </DesktopOnly>
        </div>
      </div>

      {/* Mobile */}
      <div className="relative block lg:hidden">
        <MobileLogo />
        <div className="relative w-full">
          <Image
            src="/background-mobile.webp"
            alt=""
            width={3125}
            height={9625}
            unoptimized
            priority
            className="block h-auto w-full"
          />
          <MobileOnly>
            <MobileScreenOverlay regions={mobileRegions} />
          </MobileOnly>
        </div>
      </div>
    </>
  );
}
