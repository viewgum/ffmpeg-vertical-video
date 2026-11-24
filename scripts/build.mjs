// Writes README.md, recipes/*.md, skills/ffmpeg-vertical-video/SKILL.md and llms.txt from recipes.mjs.
// node scripts/build.mjs         write the files
// node scripts/build.mjs --check exit 1 if any file differs from what recipes.mjs makes
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { recipes, VIEWGUM, SPECS, PREFLIGHT, SAFE_SCOPE } from "../recipes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/viewgum/ffmpeg-vertical-video";
const AWESOME = "https://github.com/viewgum/awesome-short-form-video";
const check = process.argv.includes("--check");
const find = (id) => recipes.flatMap((r) => r.snippets).find((s) => s.id === id);
const code = (sh) => "```sh\n" + sh + "\n```";
const cell = (t) => t.replace(/\|/g, "\\|");
const flagTable = (flags) => ["| Part | What it does |", "|---|---|", ...flags.map(([f, w]) => `| \`${cell(f)}\` | ${cell(w)} |`)].join("\n");
const total = recipes.reduce((n, r) => n + r.snippets.length, 0);
const toolLine = (t) => (t ? `Without FFmpeg: ViewGum's free [${t.label}](${t.url}) ${t.does} in your browser, and the video stays on your device.` : null);
const oneLine = (sh) => sh.replace(/ \\\n\s*/g, " ");

function recipePage(r) {
  const out = [`# ${r.title}`, "", r.lede, ""];
  out.push(`You need: ${r.inputs.map(([f, w]) => `\`${f}\` (${w})`).join(", ")}. Change the file names to yours.`, "");
  for (const s of r.snippets) {
    out.push(`## ${s.title}`, "", code(s.sh), "", flagTable(s.flags), "", `Result: ${s.result}`, "");
  }
  if (r.notes.length) out.push("## Notes", "", ...r.notes.map((n) => `- ${n}`), "");
  const t = toolLine(r.tool);
  if (t) out.push(t, "");
  out.push("## Sources", "", ...r.sources.map(([label, url]) => `- [${label}](${url})`), "");
  out.push(
    `Tested: [test.mjs](../test.mjs) runs ${r.snippets.length === 1 ? "this command" : `these ${r.snippets.length} commands`} word for word on generated clips in CI and checks each result as described above.`,
    "",
    `[All recipes](../README.md#all-recipes)`,
    "",
  );
  return out.join("\n");
}

function readme() {
  const crop = find("crop-center"), blur = find("blur-background"), exp = find("export-all-apps"), srt = find("burn-srt");
  return [
    "# FFmpeg commands for vertical video: TikTok, Reels and Shorts",
    "",
    "Tested FFmpeg commands for 9:16 short video: turn a 16:9 video into 9:16, export one file built to the published upload",
    "specs of TikTok, YouTube Shorts, Instagram Reels and Facebook Reels, burn captions inside the safe zone, compress to a file",
    "size, trim, loop, change speed, set the loudness, add music, and more. Each command comes with what every part of it does.",
    `CI runs all ${total} commands word for word on generated clips and checks what they made with ffprobe and the decoded pixels.`,
    "",
    "## Convert 16:9 to 9:16",
    "",
    "Crop the middle of the frame:",
    "",
    code(crop.sh),
    "",
    "Or keep the whole picture and fill the rest with a blurred copy of it:",
    "",
    code(blur.sh),
    "",
    `Off-centre crops, black bars and what each flag does: [Convert a 16:9 video to 9:16](recipes/16x9-to-9x16.md).`,
    "",
    "## Export settings for TikTok, Reels and Shorts",
    "",
    code(exp.sh),
    "",
    "H.264 High profile, 8-bit 4:2:0, progressive, 30 fps with a keyframe every 2 seconds, the bitrate capped, AAC at 48 kHz in",
    "stereo, the moov atom at the front and no edit lists. It does not change the length, so trim first if an app's limit needs it.",
    `For the test's clip, [shortform-preflight](${PREFLIGHT}) passes the result on the API route for all four apps, the route the apps`,
    `publish the most rules for. Why each flag: [Export settings](recipes/export-settings.md).`,
    "",
    "## Captions inside the safe zone",
    "",
    code(srt.sh),
    "",
    "On a 1080 x 1920 frame the four apps' published safe zones leave clear the area at least 288 px from the top, 672 px from the",
    `bottom, 120 px from the left and 192 px from the right, minus the right 300 px below y = 840. ${SAFE_SCOPE} The margins are`,
    "where lines wrap, so keep each cue to one or two short lines. The test finds the burned-in text in the frame and checks it is",
    `inside. Figures and sources: [short-form-video-specs](${SPECS}). More: [Captions and titles](recipes/captions.md).`,
    "",
    "## All recipes",
    "",
    "| Task | Recipe | In a browser, no install |",
    "|---|---|---|",
    ...recipes.map((r) => `| ${r.task} | [${r.title.replace(/ with FFmpeg$/, "")}](recipes/${r.slug}.md) | ${r.tool ? `[${r.tool.label}](${r.tool.url})` : ""} |`),
    "",
    "## Use it from an AI agent",
    "",
    "The same commands are an agent skill, so Claude Code, Codex, Gemini CLI and other agents that read skills use the tested",
    "versions instead of writing their own:",
    "",
    code("npx skills add viewgum/ffmpeg-vertical-video"),
    "",
    "In Claude Code, as a plugin:",
    "",
    code("claude plugin marketplace add viewgum/ffmpeg-vertical-video\nclaude plugin install ffmpeg-vertical-video@viewgum-ffmpeg"),
    "",
    "Any chat assistant: paste [skills/ffmpeg-vertical-video/SKILL.md](skills/ffmpeg-vertical-video/SKILL.md) into the chat.",
    "",
    "## How the commands are tested",
    "",
    "[test.mjs](test.mjs) makes test clips with FFmpeg's own sources, each with a feature its checks can see: a white stripe where",
    "a crop must or must not land, a checkerboard a blur must flatten, an interlaced moving bar that combs unless it is",
    "deinterlaced, a brightness that rises with time to show which second a trim or a cover came from, a square that must stay",
    "square, a dark clip joined to a light one, a voice and a music tone at different pitches. It copies each",
    "recipe's inputs into a fresh folder, runs the recipe's commands exactly as written here and checks the result: size, pixel",
    "shape, length, codecs, frame rate, field order, keyframe spacing, bitrate, file size, loudness, the music level under and after",
    "the voice, where burned-in text lands, colour tags and HDR metadata, and for the export recipe every check of",
    "shortform-preflight. CI runs it on every push on Ubuntu 24.04, whose FFmpeg is 6.1; it has also been run on FFmpeg 7.1. To run",
    "it yourself you need Node 18 or newer and FFmpeg with libx264, libx265, libmp3lame, libass, freetype, fontconfig, harfbuzz",
    "and zimg, as most full builds have:",
    "",
    code("node test.mjs\nnode test.mjs burn-srt export-all-apps   # some snippets only"),
    "",
    "The README, the recipe pages and the skill are written from [recipes.mjs](recipes.mjs) by `node scripts/build.mjs`, so they",
    "show the tested text. To add a recipe: add it there with a check in test.mjs, run the build and the test, and open a pull request.",
    "",
    "## Related",
    "",
    `- [short-form-video-specs](${SPECS}): safe zones in pixels, length and caption limits, with sources`,
    `- [shortform-preflight](${PREFLIGHT}): checks a file against each app's upload limits, as a CLI and a GitHub Action`,
    `- [awesome-short-form-video](${AWESOME}): open tools for making vertical video with code`,
    "",
    "## License",
    "",
    "MIT. See [LICENSE](LICENSE).",
    "",
    `Maintained by [ViewGum](${VIEWGUM}), which makes the free browser tools in the table above, and finished vertical shorts (script, voice, pictures, captions and sound) if you would rather not edit them yourself.`,
    "",
  ].join("\n");
}

function skill() {
  const out = [
    "---",
    "name: ffmpeg-vertical-video",
    "description: Use when the user wants an FFmpeg command for vertical (9:16) short video for TikTok, Instagram Reels, YouTube Shorts or Facebook Reels, such as turning 16:9 into 9:16, export settings built to the apps' published upload specs, burning captions or a title inside the safe zone, compressing to a file size, trimming, looping, changing speed, setting loudness in LUFS, adding music, saving a cover frame, a split screen, rotating, joining clips or HDR to SDR. Gives tested commands and what each part does.",
    "---",
    "",
    "# FFmpeg commands for vertical video",
    "",
    `Every command in a code block under Commands runs in CI on generated clips and its result is checked (${REPO}). Use them as written: change the file`,
    "names, and only the values the notes say can change. Quote filter graphs and `-map \"0:a?\"` as shown, since some shells read",
    "`?` and `[` as wildcards.",
    "",
    "## Workflow",
    "",
    "1. Find the task below. If FFmpeg is not installed, say so and point to the install page (https://ffmpeg.org/download.html).",
    "2. Ask only for what the command needs: the file names, and for some the target (a size, a length, a loudness).",
    "3. Run or give the command. Explain any part the user asks about from the table under it.",
    "4. Check the result with `ffprobe` (the command under Export settings). For a file to upload, suggest",
    `   \`npx github:viewgum/shortform-preflight <file> --route api\`, which checks it against each app's published limits (${PREFLIGHT}).`,
    "5. For text in the picture, keep it inside the safe zone: on 1080 x 1920, at least 288 px from the top, 672 px from the bottom,",
    "   120 px from the left and 192 px from the right, and out of the right 300 px below y = 840, on all four apps at once",
    `   (figures and sources: ${SPECS}). ${SAFE_SCOPE}`,
    "6. Before the user posts a file, have them check it: the commands keep the source's length, and an app's limits can change.",
    "",
    "## Commands",
    "",
  ];
  for (const r of recipes) {
    out.push(`### ${r.task}`, "", `Needs: ${r.inputs.map(([f, w]) => `\`${f}\` (${w})`).join(", ")}.`, "");
    for (const s of r.snippets) {
      out.push(`${s.title}:`, "", code(s.sh), "", ...s.flags.map(([f, w]) => `- \`${f}\`: ${w}`), `- Result: ${s.result}`, "");
    }
    for (const n of r.notes) out.push(`Note: ${n}`, "");
  }
  out.push("## Limits", "", "- These commands target 1080 x 1920. For 720 x 1280, scale every x by 720/1080 and every y by 1280/1920 (both two thirds).",
    "- The safe zones and upload limits are the apps' published figures, which change; the linked repositories date each one.", "");
  return out.join("\n");
}

function llms() {
  return [
    "# ffmpeg-vertical-video",
    "",
    `> Tested FFmpeg commands for vertical (9:16) short video for TikTok, YouTube Shorts, Instagram Reels and Facebook Reels: ${total}`,
    `> commands in ${recipes.length} recipes, each run in CI on generated clips and checked with ffprobe and the decoded pixels. Also an agent skill. MIT.`,
    "",
    "Short answers:",
    `- 16:9 to 9:16 by cropping the middle: ${oneLine(find("crop-center").sh)}`,
    "- One file built to all four apps' upload specs: H.264 High profile, yuv420p, progressive, 30 fps, a 2 s closed GOP, a capped bitrate, AAC 48 kHz stereo, -movflags +faststart, -use_editlist 0 (see Export settings). It keeps the source's length.",
    "",
    "## Recipes",
    "",
    ...recipes.map((r) => `- [${r.title}](${REPO}/blob/main/recipes/${r.slug}.md): ${r.task.toLowerCase()}`),
    "",
    "## Related",
    "",
    `- [Agent skill](${REPO}/blob/main/skills/ffmpeg-vertical-video/SKILL.md): npx skills add viewgum/ffmpeg-vertical-video`,
    `- [short-form-video-specs](${SPECS}): the safe zones and limits these commands use`,
    `- [Free browser tools](${VIEWGUM}/tools): the same jobs without installing FFmpeg`,
    "",
  ].join("\n");
}

const files = new Map();
files.set("README.md", readme());
for (const r of recipes) files.set(`recipes/${r.slug}.md`, recipePage(r));
files.set("skills/ffmpeg-vertical-video/SKILL.md", skill());
files.set("llms.txt", llms());

const bad = [];
for (const [rel, text] of files) {
  if (/\u2014|\u2013/.test(text)) bad.push(`${rel}: has a long dash`);
  const p = join(root, rel);
  if (check) {
    if (!existsSync(p) || readFileSync(p, "utf8") !== text) bad.push(`${rel}: out of date (run node scripts/build.mjs)`);
  } else {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
}
const pages = existsSync(join(root, "recipes")) ? readdirSync(join(root, "recipes")) : [];
for (const f of pages) if (!files.has(`recipes/${f}`)) bad.push(`recipes/${f}: no recipe makes it`);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(check ? `ok: ${files.size} files up to date` : `wrote ${files.size} files`);
