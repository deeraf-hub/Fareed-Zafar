// Synthetic footage generator (used by `npm run demo` and the test suite).
// Builds short clips out of moving test patterns and static colour cards so
// scene detection, motion scoring and the offline tagger have something real
// to chew on without shipping video files in the repository.

import fs from "node:fs";
import path from "node:path";
import { run, FFMPEG } from "../src/ffmpeg.js";

/**
 * @param {string} out destination .mp4
 * @param {{kind:'motion'|'static', seconds:number, color?:string, hue?:number}[]} segments
 */
export async function makeClip(out, segments, { width = 640, height = 360, fps = 30, audio = true, tone = 440 } = {}) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  const labels = [];
  const filters = [];
  segments.forEach((seg, i) => {
    if (seg.kind === "static") {
      args.push("-f", "lavfi", "-i", `color=c=${seg.color ?? "gray"}:s=${width}x${height}:r=${fps}:d=${seg.seconds}`);
      filters.push(`[${i}:v]format=yuv420p[v${i}]`);
    } else {
      args.push("-f", "lavfi", "-i", `testsrc2=s=${width}x${height}:r=${fps}:d=${seg.seconds}`);
      filters.push(`[${i}:v]hue=h=${seg.hue ?? i * 90},format=yuv420p[v${i}]`);
    }
    labels.push(`[v${i}]`);
  });
  const total = segments.reduce((a, s) => a + s.seconds, 0);
  let filterComplex = `${filters.join(";")};${labels.join("")}concat=n=${segments.length}:v=1:a=0[vout]`;
  if (audio) {
    args.push("-f", "lavfi", "-i", `sine=frequency=${tone}:sample_rate=48000:duration=${total}`);
    filterComplex += `;[${segments.length}:a]volume=0.2[aout]`;
  }
  args.push("-filter_complex", filterComplex, "-map", "[vout]");
  if (audio) args.push("-map", "[aout]", "-c:a", "aac", "-b:a", "96k");
  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p", "-t", String(total), out);
  await run(FFMPEG, args);
  return out;
}

/** A small but realistic-looking library that follows the naming convention. */
export const DEMO_LIBRARY = [
  {
    session: "2026-09-10_grilled-chicken-bowl",
    clips: [
      { name: "20260910_grilled-chicken-bowl_ingredients_chicken-rice-broccoli_overhead-flatlay_t01.mp4", segments: [{ kind: "motion", seconds: 5, hue: 20 }, { kind: "static", seconds: 2, color: "0x334455" }] },
      { name: "20260910_grilled-chicken-bowl_ingredients_spices-paprika-cumin_closeup_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 35 }] },
      { name: "20260910_grilled-chicken-bowl_prep_chicken-slicing_closeup_t01.mp4", segments: [{ kind: "motion", seconds: 6, hue: 60 }] },
      { name: "20260910_grilled-chicken-bowl_prep_garlic-mincing_overhead_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 75 }] },
      { name: "20260910_grilled-chicken-bowl_prep_chicken-seasoning_closeup_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 90 }] },
      { name: "20260910_grilled-chicken-bowl_cooking_chicken-grilling_closeup_t02.mp4", segments: [{ kind: "motion", seconds: 4, hue: 100 }, { kind: "motion", seconds: 4, hue: 200 }, { kind: "static", seconds: 3, color: "0x552211" }] },
      { name: "20260910_grilled-chicken-bowl_cooking_chicken-flipping_closeup-handheld_t01.mp4", segments: [{ kind: "motion", seconds: 5, hue: 120 }] },
      { name: "20260910_grilled-chicken-bowl_cooking_broccoli-roasting_medium_t01.mp4", segments: [{ kind: "motion", seconds: 5, hue: 150 }] },
      { name: "20260910_grilled-chicken-bowl_cooking_sauce-whisking_overhead_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 170 }] },
      { name: "20260910_grilled-chicken-bowl_cooking_sauce-pouring_closeup-pushin_t01.mp4", segments: [{ kind: "motion", seconds: 5, hue: 300 }] },
      { name: "20260910_grilled-chicken-bowl_cooking_rice-stirring_medium_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 140 }] },
      { name: "20260910_grilled-chicken-bowl_plating_assembling_overhead_t01.mp4", segments: [{ kind: "motion", seconds: 5, hue: 240 }] },
      { name: "20260910_grilled-chicken-bowl_plating_garnishing-cilantro_closeup_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 260 }] },
      { name: "20260910_grilled-chicken-bowl_hero_final-dish_closeup-orbit_t01.mp4", segments: [{ kind: "motion", seconds: 6, hue: 40 }] },
      { name: "20260910_grilled-chicken-bowl_serving_bowl-lifting_medium_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 50 }] },
      { name: "20260910_grilled-chicken-bowl_eating_first-bite_medium_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 80 }] },
    ],
  },
  {
    session: "2026-09-12_salmon-teriyaki-mealprep",
    clips: [
      { name: "20260912_salmon-teriyaki-mealprep_ingredients_salmon-soy-sauce_overhead_t01.mp4", segments: [{ kind: "motion", seconds: 5, hue: 10 }] },
      { name: "20260912_salmon-teriyaki-mealprep_prep_ginger-grating_closeup_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 45 }] },
      { name: "20260912_salmon-teriyaki-mealprep_cooking_salmon-searing_closeup_t01.mp4", segments: [{ kind: "motion", seconds: 7, hue: 120 }] },
      { name: "20260912_salmon-teriyaki-mealprep_cooking_teriyaki-drizzling_closeup_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 180 }] },
      { name: "20260912_salmon-teriyaki-mealprep_cooking_rice-steaming_medium_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 210 }] },
      { name: "20260912_salmon-teriyaki-mealprep_cooking_broccoli-tossing_overhead_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 230 }] },
      { name: "20260912_salmon-teriyaki-mealprep_plating_assembling-bowl_overhead_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 250 }] },
      { name: "20260912_salmon-teriyaki-mealprep_meal-prep_packing-containers_overhead_t01.mp4", segments: [{ kind: "motion", seconds: 7, hue: 260 }, { kind: "static", seconds: 4, color: "0x223344" }] },
      { name: "20260912_salmon-teriyaki-mealprep_meal-prep_scooping-rice_closeup_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 280 }] },
      { name: "20260912_salmon-teriyaki-mealprep_hero_final-dish_closeup_t01.mp4", segments: [{ kind: "motion", seconds: 5, hue: 30 }] },
      { name: "20260912_salmon-teriyaki-mealprep_hero_containers-stacked_medium-pushin_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 15 }] },
      { name: "20260912_salmon-teriyaki-mealprep_eating_first-bite_medium_t01.mp4", segments: [{ kind: "motion", seconds: 4, hue: 70 }] },
    ],
  },
];

export async function buildDemoLibrary(libraryRoot, opts = {}) {
  const made = [];
  for (const session of DEMO_LIBRARY) {
    for (const clip of session.clips) {
      const out = path.join(libraryRoot, "01_raw", session.session, clip.name);
      if (!fs.existsSync(out)) await makeClip(out, clip.segments, opts);
      made.push(out);
    }
  }
  return made;
}
