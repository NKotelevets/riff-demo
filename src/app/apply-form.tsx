"use client";

import { useState } from "react";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mykryobk";
const MAX_WORDS = 150;

// The form is positioned in the same artboard space as the rest of shape-6's
// overlays (see main-screen-overlay.tsx). All coordinates below are artboard px
// and map to % of the overlay via the helpers.
const DESIGN_W = 1920;
const DESIGN_H = 5470;
const pctX = (v: number) => `${(v / DESIGN_W) * 100}%`;
const pctY = (v: number) => `${(v / DESIGN_H) * 100}%`;
const vw = (v: number) => `${(v / DESIGN_W) * 100}vw`;

const wordCount = (s: string) =>
  s.trim() === "" ? 0 : s.trim().split(/\s+/).length;

type Status = "idle" | "submitting" | "success" | "error";

type InputField = {
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  type?: string;
  required?: boolean;
  border?: boolean;
  placeholder?: string;
};

// Single-line inputs. Names carry the 2px black border; email/phone are plain
// white boxes with a separate label above them.
const INPUTS: InputField[] = [
  {
    name: "first name",
    required: true,
    border: true,
    left: 175,
    top: 3718,
    width: 347,
    height: 40,
  },
  {
    name: "last name",
    required: true,
    border: true,
    left: 175,
    top: 3838,
    width: 347,
    height: 40,
  },
  {
    name: "email",
    type: "email",
    required: true,
    left: 520,
    top: 4114,
    width: 500,
    height: 40,
  },
  {
    name: "phone",
    required: true,
    left: 520,
    top: 4234,
    width: 500,
    height: 40,
  },
];

// Positioned black labels above their fields. `align` matches the design.
const LABELS: {
  text: string;
  left: number;
  top: number;
  width: number;
  align: "left" | "right";
}[] = [
  // Labels above the name inputs (positions estimated; tune to design).
  { text: "first name", left: 175, top: 3674, width: 347, align: "left" },
  { text: "last name", left: 175, top: 3794, width: 347, align: "left" },
  // top:4078/left:518 sits directly above the email input — mapped here.
  { text: "email to contact", left: 518, top: 4078, width: 437, align: "left" },
  // Phone label position estimated above the phone input; tune to design.
  {
    text: "phone (for example +1-888-321-5678)",
    left: 518,
    top: 4198,
    width: 437,
    align: "left",
  },
  {
    text: "describe a favorite job or project something you read, saw or heard that stuck with you [maximum 150 words]",
    left: 376,
    top: 4491,
    width: 644,
    align: "right",
  },
  {
    text: "experience or portfolio [maximum 150 words]",
    left: 1120,
    top: 3968,
    width: 544,
    align: "left",
  },
];

const FAVORITE_BOX = { left: 200, top: 4608, width: 820, height: 661 };
const EXPERIENCE_BOX = { left: 1120, top: 4078, width: 600, height: 972 };
const UPLOAD_BOX = { left: 1120, top: 4018, width: 330, height: 40 };
const SUBMIT_BOX = { left: 1615, top: 5100, width: 105, height: 38 };

// Application form overlaid on shape-6, positioned in artboard px. Submits to
// Formspree over fetch so the page never navigates away; on success it notifies
// the parent (which swaps in the success artwork).
export function ApplyForm({ onSuccess }: { onSuccess?: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState("");
  const [experience, setExperience] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  // Names of required fields left empty after blur — drives the inline hint.
  const [emptyErrors, setEmptyErrors] = useState<Record<string, boolean>>({});

  const favoriteOver = wordCount(favorite) > MAX_WORDS;
  const experienceOver = wordCount(experience) > MAX_WORDS;

  const markEmpty = (name: string, value: string) =>
    setEmptyErrors((p) => ({ ...p, [name]: value.trim() === "" }));
  const clearEmpty = (name: string) =>
    setEmptyErrors((p) => (p[name] ? { ...p, [name]: false } : p));

  async function handleSubmit(form: HTMLFormElement) {
    if (favoriteOver || experienceOver) return;
    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      if (res.ok) {
        setStatus("success");
        onSuccess?.();
      } else {
        const data = (await res.json().catch(() => null)) as {
          errors?: { message: string }[];
        } | null;
        setError(data?.errors?.[0]?.message ?? "Something went wrong.");
        setStatus("error");
      }
    } catch {
      setError("Network error — please try again.");
      setStatus("error");
    }
  }

  const inputBase =
    "pointer-events-auto absolute box-border bg-white px-[0.3em] text-black outline-none placeholder:text-black";
  const errorStyle = {
    fontSize: vw(30),
    lineHeight: vw(40),
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(e.currentTarget);
      }}
      className="pointer-events-none absolute inset-0"
    >
      {/* Intro copy above the fields (two lines) */}
      <span
        className="pointer-events-none absolute whitespace-pre-line text-left text-black"
        style={{
          left: pctX(175),
          top: pctY(3563),
          width: pctX(447),
          fontSize: vw(30),
          lineHeight: vw(40),
        }}
      >
        {"to apply please fill out the below.\n[we accept <20 new members a year]"}
      </span>

      {/* Positioned black labels */}
      {LABELS.map((l) => (
        <span
          key={l.text}
          className="pointer-events-none absolute text-black"
          style={{
            left: pctX(l.left),
            top: pctY(l.top),
            width: pctX(l.width),
            fontSize: vw(30),
            lineHeight: vw(40),
            textAlign: l.align,
          }}
        >
          {l.text}
        </span>
      ))}

      {/* Single-line inputs */}
      {INPUTS.map((f) => (
        <div key={f.name}>
          <input
            name={f.name}
            type={f.type ?? "text"}
            required={f.required}
            placeholder={f.placeholder}
            onBlur={(e) => f.required && markEmpty(f.name, e.target.value)}
            onFocus={() => clearEmpty(f.name)}
            onChange={(e) => {
              if (e.target.value.trim() !== "") clearEmpty(f.name);
            }}
            className={inputBase}
            style={{
              left: pctX(f.left),
              top: pctY(f.top),
              width: pctX(f.width),
              height: pctY(f.height),
              fontSize: vw(30),
              lineHeight: vw(40),
              border: f.border ? `${vw(2)} solid #000000` : "none",
            }}
          />
          {emptyErrors[f.name] && (
            <span
              className="pointer-events-none absolute italic text-white"
              style={{
                ...errorStyle,
                left: pctX(f.left),
                top: pctY(f.top + f.height + 4),
                width: pctX(600),
              }}
            >
              please fill in all fields to proceed.
            </span>
          )}
        </div>
      ))}

      {/* describe-a-favorite-job textarea */}
      <textarea
        name="favorite job or project"
        required
        value={favorite}
        onBlur={(e) => markEmpty("favorite job or project", e.target.value)}
        onFocus={() => clearEmpty("favorite job or project")}
        onChange={(e) => {
          setFavorite(e.target.value);
          if (e.target.value.trim() !== "") clearEmpty("favorite job or project");
        }}
        className="pointer-events-auto absolute box-border resize-none bg-white px-[0.3em] py-[0.2em] text-black outline-none"
        style={{
          left: pctX(FAVORITE_BOX.left),
          top: pctY(FAVORITE_BOX.top),
          width: pctX(FAVORITE_BOX.width),
          height: pctY(FAVORITE_BOX.height),
          fontSize: vw(30),
          lineHeight: vw(40),
        }}
      />
      {emptyErrors["favorite job or project"] && (
        <span
          className="pointer-events-none absolute italic text-white"
          style={{
            ...errorStyle,
            left: pctX(FAVORITE_BOX.left),
            top: pctY(FAVORITE_BOX.top + FAVORITE_BOX.height + 4),
            width: pctX(FAVORITE_BOX.width),
          }}
        >
          please fill in all fields to proceed.
        </span>
      )}
      {favoriteOver && (
        <span
          className="pointer-events-none absolute italic text-white"
          style={{
            ...errorStyle,
            left: pctX(FAVORITE_BOX.left),
            top: pctY(FAVORITE_BOX.top + FAVORITE_BOX.height + 4),
            width: pctX(FAVORITE_BOX.width),
          }}
        >
          maximum 150 words exceeded.
        </span>
      )}

      {/* experience-or-portfolio textarea */}
      <textarea
        name="experience or portfolio"
        required
        value={experience}
        onBlur={(e) => markEmpty("experience or portfolio", e.target.value)}
        onFocus={() => clearEmpty("experience or portfolio")}
        onChange={(e) => {
          setExperience(e.target.value);
          if (e.target.value.trim() !== "") clearEmpty("experience or portfolio");
        }}
        className="pointer-events-auto absolute box-border resize-none bg-white px-[0.3em] py-[0.2em] text-black outline-none"
        style={{
          left: pctX(EXPERIENCE_BOX.left),
          top: pctY(EXPERIENCE_BOX.top),
          width: pctX(EXPERIENCE_BOX.width),
          height: pctY(EXPERIENCE_BOX.height),
          fontSize: vw(30),
          lineHeight: vw(40),
        }}
      />
      {emptyErrors["experience or portfolio"] && (
        <span
          className="pointer-events-none absolute italic text-white"
          style={{
            ...errorStyle,
            left: pctX(EXPERIENCE_BOX.left),
            top: pctY(EXPERIENCE_BOX.top + EXPERIENCE_BOX.height + 4),
            width: pctX(EXPERIENCE_BOX.width),
          }}
        >
          please fill in all fields to proceed.
        </span>
      )}
      {experienceOver && (
        <span
          className="pointer-events-none absolute italic text-white"
          style={{
            ...errorStyle,
            left: pctX(EXPERIENCE_BOX.left),
            top: pctY(EXPERIENCE_BOX.top + EXPERIENCE_BOX.height + 4),
            width: pctX(EXPERIENCE_BOX.width),
          }}
        >
          maximum 150 words exceeded.
        </span>
      )}

      {/* PDF upload — a white box acting as the file picker button */}
      <label
        className="pointer-events-auto absolute box-border flex cursor-pointer items-center overflow-hidden bg-white px-[0.3em] text-black"
        style={{
          left: pctX(UPLOAD_BOX.left),
          top: pctY(UPLOAD_BOX.top),
          width: pctX(UPLOAD_BOX.width),
          height: pctY(UPLOAD_BOX.height),
          fontSize: vw(30),
          lineHeight: vw(40),
        }}
      >
        <span className="truncate">
          {fileName ?? "portfolio upload [optional]"}
        </span>
        <input
          name="portfolio"
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      {status === "error" && error && (
        <span
          className="pointer-events-none absolute italic text-white"
          style={{
            left: pctX(SUBMIT_BOX.left),
            top: pctY(SUBMIT_BOX.top - 44),
            width: pctX(700),
            fontSize: vw(24),
            lineHeight: vw(30),
          }}
        >
          {error}
        </span>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || favoriteOver || experienceOver}
        className="pointer-events-auto absolute cursor-pointer bg-transparent text-left text-black transition-opacity hover:opacity-70 disabled:opacity-50"
        style={{
          left: pctX(SUBMIT_BOX.left),
          top: pctY(SUBMIT_BOX.top),
          width: pctX(SUBMIT_BOX.width),
          height: pctY(SUBMIT_BOX.height),
          fontSize: vw(38),
          lineHeight: vw(40),
        }}
      >
        {status === "submitting" ? "sending…" : "submit"}
      </button>
    </form>
  );
}
