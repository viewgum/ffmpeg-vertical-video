// Runs every snippet in recipes.mjs, word for word, on generated clips and checks what it made with ffprobe and decoded pixels.
// Usage: node test.mjs [snippet-id ...]   A named snippet also runs the snippets before it in its recipe, whose files it reads.
// Env: PREFLIGHT=<path to shortform-preflight's bin/shortform-preflight.mjs>, REQUIRE_PREFLIGHT=1 to fail when it is missing
// (CI sets both), KEEP=1 to keep the work folder.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recipes } from "./recipes.mjs";

const ids = recipes.flatMap((r) => r.snippets.map((s) => s.id));
const only = process.argv.slice(2);
const unknown = only.filter((id) => !ids.includes(id));
if (unknown.length) {
  console.error(`unknown snippet id: ${unknown.join(", ")}\nknown: ${ids.join(" ")}`);
  process.exit(2);
}

const root = mkdtempSync(join(tmpdir(), "ffmpeg-vertical-"));
const fixtures = join(root, "fixtures");
mkdirSync(fixtures);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: opts.encoding ?? "utf8", maxBuffer: 256 << 20, stdio: ["ignore", "pipe", "pipe"], timeout: 240_000, killSignal: "SIGKILL", ...opts });
  if (r.error) throw r.error;
  return r;
}
function ff(args) {
  const r = run("ffmpeg", ["-v", "error", "-y", ...args], { cwd: fixtures });
  if (r.status !== 0) throw new Error(`fixture failed: ffmpeg ${args.join(" ")}\n${r.stderr}`);
}

const version = run("ffmpeg", ["-version"]).stdout.split("\n")[0];
console.log(version);

// Fixtures: the files the snippets name, made from FFmpeg's own sources. Each check below relies on a feature of its fixture:
// a white stripe where a crop must or must not land, a brightness that rises with time, a square that must stay square.
const src = (graph) => ["-f", "lavfi", "-i", graph];
const sine = (f, d, rate = 48000) => src(`sine=f=${f}:r=${rate}:d=${d}`);
const ramp = (s, d) => src(`nullsrc=s=${s}:r=30:d=${d},format=yuv420p,geq=lum='16+50*T':cb=128:cr=128`);
const h264 = ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p"];
const stereoAac = ["-ac", "2", "-c:a", "aac"];
ff([...ramp("1920x1080", 4), ...sine(440, 4), ...h264, ...stereoAac, "-shortest", "input.mp4"]);
// wide.mp4: a white stripe at x 400 to 480 and a fine checkerboard in the middle, which a blur turns flat.
ff([...src("testsrc2=s=1920x1080:r=30:d=4,drawbox=x=400:y=0:w=80:h=ih:color=white:t=fill"),
  ...src("nullsrc=s=520x880:r=30:d=4,format=yuv420p,geq=lum='if(mod(floor(X/8)+floor(Y/8),2),235,16)':cb=128:cr=128"), ...sine(440, 4),
  "-filter_complex", "[0][1]overlay=700:100[v]", "-map", "[v]", "-map", "2:a", ...h264, ...stereoAac, "-shortest", "wide.mp4"]);
ff([...src("color=c=0x808080:s=1024x576:r=30:d=2,drawbox=x=412:y=188:w=200:h=200:color=white:t=fill,scale=720:576,setsar=64/45"), ...h264, "anamorphic.mp4"]);
// vertical.mov: interlaced, top field first, 25 fps from 50 fps motion. Left half: noise, to push the bitrate. Right half: a white bar
// moving 40 px a field, which shows as combing on every other line unless the export deinterlaces.
ff(["-filter_complex", "testsrc2=s=540x1920:r=50:d=6,noise=alls=60:allf=t+u[l];color=c=black:s=540x1920:r=50:d=6[k];" +
  "color=c=white:s=100x1920:r=50:d=6[b];[k][b]overlay=x='mod(t*2000,440)':shortest=1[r];[l][r]hstack,tinterlace=mode=interleave_top,setfield=tff[v]",
  ...sine(440, 6, 44100), "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
  "-pix_fmt", "yuv420p", "-flags", "+ildct+ilme", "-top", "1", ...stereoAac, "-shortest", "vertical.mov"]);
ff([...src("testsrc2=s=1920x1080:r=30:d=4,format=yuv420p10le"), ...sine(440, 4), "-c:v", "libx264", "-preset", "veryfast", ...stereoAac, "-shortest", "input-10bit.mp4"]);
ff([...src("color=c=0x202020:s=1080x1920:r=30:d=3"), ...sine(440, 3), ...h264, ...stereoAac, "-shortest", "vertical.mp4"]);
ff([...src("color=c=0x404040:s=1080x1920:r=30:d=5"), ...src("aevalsrc=0.5*sin(2*PI*1000*t):s=48000:d=2"), ...h264, ...stereoAac, "talk.mp4"]);
ff([...sine(150, 2, 44100), "-ac", "2", "-c:a", "libmp3lame", "-b:a", "128k", "music.mp3"]);
ff([...ramp("1080x1920", 3), ...sine(550, 3), ...h264, ...stereoAac, "-shortest", "clip.mp4"]);
ff([...sine(330, 3), "-c:a", "aac", "voice.m4a"]);
ff([...src("testsrc2=s=1080x1350:r=1:d=1"), "-frames:v", "1", "picture.jpg"]);
ff([...src("testsrc2=s=1920x1080:r=30:d=4"), ...sine(660, 4), ...h264, ...stereoAac, "-shortest", "top.mp4"]);
ff([...src("testsrc=s=1080x1080:r=30:d=3"), ...h264, "bottom.mp4"]);
ff([...src("color=c=0x606060:s=1920x1080:r=30:d=2,drawbox=x=0:y=0:w=200:h=ih:color=white:t=fill"), ...h264, "sideways.mp4"]);
for (const [name, c, f] of [["part1.mp4", "0x303030", 440], ["part2.mp4", "0xD0D0D0", 880]]) {
  ff([...src(`color=c=${c}:s=1080x1920:r=30:d=2`), ...sine(f, 2), ...h264, ...stereoAac, "-shortest", name]);
}
ff([...src("testsrc2=s=1080x1920:r=30:d=2,format=yuv420p10le"), "-c:v", "libx265",
  "-x265-params", "colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc:hdr10=1:max-cll=1000,400:" +
  "master-display=G(13250,34500)B(7500,3000)R(34000,16000)WP(15635,16450)L(10000000,1):log-level=error",
  "-color_primaries", "bt2020", "-color_trc", "smpte2084", "-colorspace", "bt2020nc", "-tag:v", "hvc1", "hdr.mov"]);
writeFileSync(join(fixtures, "captions.srt"), "1\n00:00:00,000 --> 00:00:01,500\nBread rises\n\n2\n00:00:01,500 --> 00:00:03,000\nbecause the yeast makes gas\n");
writeFileSync(join(fixtures, "captions-1080x1920.ass"), `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,300,300,700,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:01.50,Default,,0,0,0,,Bread rises
Dialogue: 0,0:00:01.50,0:00:03.00,Default,,0,0,0,,because the yeast makes gas
`);

// Helpers for the checks.
function probe(file) {
  const r = run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", file]);
  if (r.status !== 0) throw new Error(`ffprobe failed on ${file}: ${r.stderr}`);
  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s) => s.codec_type === "video");
  const a = j.streams.filter((s) => s.codec_type === "audio");
  return { v, a, duration: Number(j.format.duration), size: Number(j.format.size) };
}
// One frame as 8-bit luma, w x h. t = null reads the first frame (for pictures, or the start of a video).
function frame(file, t, w = 1080, h = 1920) {
  const seek = t == null ? [] : ["-ss", String(t)];
  const r = run("ffmpeg", ["-v", "error", ...seek, "-i", file, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { encoding: "buffer" });
  if (r.status !== 0) throw new Error(`frame grab failed: ${r.stderr}`);
  if (r.stdout.length !== w * h) throw new Error(`frame is ${r.stdout.length} bytes, want ${w} x ${h}`);
  return { buf: r.stdout, w, h };
}
function mean(f, x0, y0, x1, y1) {
  let s = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) s += f.buf[y * f.w + x];
  return s / ((x1 - x0) * (y1 - y0));
}
// Mean step between neighbouring pixels: high for detail, low for a blur.
function detail(f, x0, y0, x1, y1) {
  let s = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1 - 1; x++) { s += Math.abs(f.buf[y * f.w + x + 1] - f.buf[y * f.w + x]); n++; }
  return s / n;
}
// Mean step between neighbouring lines: high where two fields of an interlaced frame disagree (combing).
function combing(f, x0, y0, x1, y1) {
  let s = 0, n = 0;
  for (let y = y0; y < y1 - 1; y++) for (let x = x0; x < x1; x++) { s += Math.abs(f.buf[(y + 1) * f.w + x] - f.buf[y * f.w + x]); n++; }
  return s / n;
}
// Bounding box of the pixels for which hit(value) holds.
function bbox(f, hit) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (hit(f.buf[y * f.w + x])) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}
// All four apps' published 9:16 safe zones at once, from short-form-video-specs data/safe-zones.json:
// 288 px from the top, 672 from the bottom, 120 from the left, 192 from the right, and the right 300 px below y = 840.
function insideSafe(b) {
  if (!b) return "nothing drawn";
  if (b.x0 < 120 || b.x1 > 1080 - 192 - 1 || b.y0 < 288 || b.y1 > 1920 - 672 - 1) return `outside the box: ${JSON.stringify(b)}`;
  if (b.y1 >= 840 && b.x1 > 1080 - 300 - 1) return `in the right column below y 840: ${JSON.stringify(b)}`;
  return null;
}
const textBox = (file, t) => bbox(frame(file, t), (v) => Math.abs(v - 0x20) > 12);
function loudness(file) {
  const r = run("ffmpeg", ["-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const m = /Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/.exec(r.stderr);
  if (!m) throw new Error("no loudness summary");
  return Number(m[1]);
}
// Level in dB of the music alone (the 150 Hz tone; the 1 kHz voice is filtered out) from t for d seconds.
function musicLevel(file, t, d) {
  const r = run("ffmpeg", ["-nostats", "-ss", String(t), "-t", String(d), "-i", file, "-vn", "-af", "lowpass=f=300,lowpass=f=300,lowpass=f=300,volumedetect", "-f", "null", "-"]);
  const m = /mean_volume:\s+(-?[\d.]+|-inf) dB/.exec(r.stderr);
  if (!m) throw new Error("no volumedetect output");
  return m[1] === "-inf" ? -Infinity : Number(m[1]);
}
function videoPackets(file) {
  const r = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time,size,flags", "-of", "csv=p=0", file]);
  return r.stdout.trim().split("\n").map((l) => { const [t, size, flags] = l.split(","); return { t: Number(t), size: Number(size), key: flags.includes("K") }; })
    .sort((a, b) => a.t - b.t);
}
function sideData(file) {
  const r = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-read_intervals", "%+#1", "-show_streams", "-show_frames", "-of", "json", file]);
  const j = JSON.parse(r.stdout);
  return [...(j.streams?.[0]?.side_data_list ?? []), ...(j.frames?.[0]?.side_data_list ?? [])].map((s) => s.side_data_type);
}
const near = (got, want, tol, what) => (Math.abs(got - want) <= tol ? null : `${what} ${got}, want ${want} within ${tol}`);
const dims = (p, w = 1080, h = 1920) => (p.v.width === w && p.v.height === h ? null : `size ${p.v.width} x ${p.v.height}, want ${w} x ${h}`);
const sar1 = (p) => (!p.v.sample_aspect_ratio || p.v.sample_aspect_ratio === "1:1" ? null : `pixel shape ${p.v.sample_aspect_ratio}`);
const first = (...xs) => xs.find((x) => x) ?? null;
// input.mp4 and clip.mp4 brighten with time: luma 16 + 50 per second, which reads as 50 * 255/219 per second in full-range grey.
const rampAt = (t) => (50 * t * 255) / 219;
// Columns white from top to bottom: the stripe of wide.mp4, which no column of the test pattern itself is.
function whiteColumns(f) {
  let n = 0;
  for (let x = 0; x < f.w; x++) {
    let min = 255;
    for (let y = 0; y < f.h && min > 200; y++) min = Math.min(min, f.buf[y * f.w + x]);
    if (min > 200) n++;
  }
  return n;
}
// The white stripe of wide.mp4 (source x 400 to 480) lands at x 230 to 265 when the whole frame is fitted to 1080 wide.
const stripeFitted = (f) => (mean(f, 232, 700, 262, 1200) > 200 ? null : `the picture's white stripe is not at x 232 to 262 (mean ${mean(f, 232, 700, 262, 1200).toFixed(0)})`);
// The same snippet again on other inputs, for a case the main fixtures do not cover.
function rerun(s, dir, name, files) {
  const d = join(dir, name);
  mkdirSync(d);
  for (const [to, from] of files) copyFileSync(join(fixtures, from), join(d, to));
  const r = run("bash", ["-e", "-o", "pipefail", "-c", s.sh], { cwd: d });
  if (r.status !== 0) throw new Error(`${name}: exit ${r.status}\n${r.stderr.split("\n").slice(-6).join("\n")}`);
  return d;
}

const preflight = process.env.PREFLIGHT;
let skipped = 0;
const checks = {
  "crop-center": (d) => {
    const f = join(d, "vertical.mp4"); const p = probe(f);
    return first(dims(p), sar1(p), near(p.duration, 4, 0.1, "length"), whiteColumns(frame(f, 1)) ? "the white stripe from the left of the frame is in the middle crop" : null);
  },
  "crop-offset": (d) => {
    const f = join(d, "vertical-left.mp4"); const fr = frame(f, 1);
    return first(dims(probe(f)), mean(fr, 160, 0, 240, 1920) > 220 && whiteColumns(fr) > 100 ? null : "the white stripe left of centre is not at x 160 to 240, so the crop is not off-centre");
  },
  "blur-background": (d) => {
    const f = join(d, "vertical-blur.mp4"); const p = probe(f); const fr = frame(f, 1);
    const top = mean(fr, 0, 0, 1080, 600), bg = detail(fr, 0, 0, 1080, 600), fg = detail(fr, 0, 700, 1080, 1200);
    return first(dims(p), sar1(p), top > 20 ? null : `top of the frame is dark (${top.toFixed(1)}), no fill`,
      bg < 1 && fg > 5 ? null : `the fill is not blurred (detail ${bg.toFixed(2)} against ${fg.toFixed(2)} in the picture)`, stripeFitted(fr));
  },
  "letterbox": (d) => {
    const f = join(d, "vertical-bars.mp4"); const fr = frame(f, 1);
    const top = mean(fr, 0, 0, 1080, 600), bottom = mean(fr, 0, 1320, 1080, 1920), mid = mean(fr, 0, 700, 1080, 1200);
    return first(dims(probe(f)), top < 20 && bottom < 20 ? null : `bars are not black (${top.toFixed(1)}, ${bottom.toFixed(1)})`,
      mid > 40 ? null : `the picture is missing (${mid.toFixed(1)})`, stripeFitted(fr));
  },
  "square-pixels": (d) => {
    const f = join(d, "vertical-square.mp4"); const p = probe(f);
    const b = bbox(frame(f, 1), (v) => v > 200);
    if (!b) return "the white square is missing";
    const ratio = (b.x1 - b.x0 + 1) / (b.y1 - b.y0 + 1);
    return first(dims(p), sar1(p), ratio > 0.95 && ratio < 1.05 ? null : `the square came out ${b.x1 - b.x0 + 1} x ${b.y1 - b.y0 + 1}`);
  },
  "export-all-apps": (d) => {
    const f = join(d, "short.mp4"); const p = probe(f);
    const a = p.a[0];
    const err = first(dims(p), p.v.codec_name === "h264" && p.v.profile === "High" ? null : `codec ${p.v.codec_name} ${p.v.profile}`,
      p.v.pix_fmt === "yuv420p" ? null : `pix_fmt ${p.v.pix_fmt}`, p.v.r_frame_rate === "30/1" ? null : `fps ${p.v.r_frame_rate}`,
      !p.v.field_order || p.v.field_order === "progressive" ? null : `field_order ${p.v.field_order}`,
      a && a.codec_name === "aac" && a.sample_rate === "48000" && a.channels === 2 ? null : "audio is not 48 kHz stereo AAC");
    if (err) return err;
    const comb = Math.max(...[1, 2.3, 3.7].map((t) => combing(frame(f, t), 600, 100, 1000, 1800)));
    if (comb > 10) return `combing ${comb.toFixed(1)} on the moving bar: not deinterlaced`;
    const pk = videoPackets(f);
    const keys = pk.filter((x) => x.key).map((x) => x.t);
    const gaps = keys.slice(1).map((t, i) => t - keys[i]);
    if (keys[0] > pk[0].t + 0.001 || keys.length < 3 || gaps.some((g) => Math.abs(g - 2) > 0.02)) return `keyframes at ${keys.join(", ")}, want every 2 s`;
    let worst = 0;
    for (let i = 0; i < pk.length; i++) {
      let bits = 0;
      for (let j = i; j < pk.length && pk[j].t < pk[i].t + 1; j++) bits += pk[j].size * 8;
      worst = Math.max(worst, bits);
    }
    if (worst > 25e6) return `${(worst / 1e6).toFixed(2)} Mbit in one second of video, over 25`;
    if (worst < 8e6) return `only ${(worst / 1e6).toFixed(2)} Mbit in the busiest second: the fixture no longer tests the cap`;
    if (!preflight) {
      if (process.env.REQUIRE_PREFLIGHT) return "PREFLIGHT is not set";
      skipped++;
      console.log("    skipped the shortform-preflight check (set PREFLIGHT=...)");
      return null;
    }
    const r = run("node", [preflight, f, "--route", "api", "--json"]);
    const j = JSON.parse(r.stdout);
    const bad = j.platforms.filter((x) => x.status !== "pass").map((x) => `${x.id} ${x.status}`);
    return r.status === 0 && j.ok && j.complete && bad.length === 0 ? null : `shortform-preflight on the API route: ${bad.join(", ") || "exit " + r.status}`;
  },
  "check-file": (d, out) => {
    for (const want of ["codec_name=h264", "profile=High", "width=1080", "height=1920", "pix_fmt=yuv420p", "field_order=progressive", "r_frame_rate=30/1"]) {
      if (!out.split("\n").includes(want)) return `ffprobe output lacks ${want}`;
    }
    return null;
  },
  "compress-two-pass": (d) => {
    const p = probe(join(d, "small.mp4"));
    return first(p.size <= 1_000_000 ? null : `small.mp4 is ${p.size} bytes, over 1 MB`, p.size > 300_000 ? null : `small.mp4 is only ${p.size} bytes`,
      near(p.duration, 4, 0.1, "length"), p.v.pix_fmt === "yuv420p" ? null : `pix_fmt ${p.v.pix_fmt}`);
  },
  // A frame's brightness tells where in the source it came from.
  "trim-exact": (d) => {
    const f = join(d, "clip.mp4"); const p = probe(f);
    const start = mean(frame(f, null, 1920, 1080), 0, 0, 1920, 1080);
    return first(near(Number(p.v.duration), 2, 0.05, "video length"), near(start, rampAt(1), 4, "first frame's brightness (the source's at 1 s)"));
  },
  "trim-copy": (d) => {
    const f = join(d, "clip-fast.mp4"); const p = probe(f);
    const start = mean(frame(f, null, 1920, 1080), 0, 0, 1920, 1080);
    return first(p.duration >= 1.9 && p.duration <= 3.1 ? null : `length ${p.duration}`, start <= rampAt(1) + 4 ? null : `starts after second 1 (brightness ${start.toFixed(0)})`);
  },
  "speed-up": (d) => {
    const p = probe(join(d, "faster.mp4"));
    return first(near(p.duration, 4 / 1.5, 0.1, "length"), near(Number(p.a[0].duration), 4 / 1.5, 0.1, "sound length"));
  },
  "loop-to-length": (d) => {
    const f = join(d, "looped.mp4");
    return first(near(probe(f).duration, 10, 0.1, "length"), near(mean(frame(f, 4), 0, 0, 1080, 1920), rampAt(1), 4, "brightness at 4 s (the 3 s clip's at 1 s)"));
  },
  "burn-srt": (d) => first(...[0.5, 2].map((t) => insideSafe(textBox(join(d, "captioned.mp4"), t)))),
  "burn-ass": (d) => first(...[0.5, 2].map((t) => insideSafe(textBox(join(d, "captioned-ass.mp4"), t)))),
  "title-text": (d) => insideSafe(textBox(join(d, "titled.mp4"), 1)),
  "loudness-two-pass": (d) => { const p = probe(join(d, "loud.mp4")); return first(near(loudness(join(d, "loud.mp4")), -14, 0.5, "loudness"), p.a[0].sample_rate === "48000" ? null : `sample rate ${p.a[0].sample_rate}`); },
  "loudness-one-pass": (d) => near(loudness(join(d, "loud-quick.mp4")), -14, 2, "loudness"),
  "loudness-measure": (d, out) => {
    const m = /I:\s+(-?[\d.]+) LUFS/.exec(out);
    return first(m ? near(Number(m[1]), -14, 0.5, "printed loudness") : "no I: line printed", /Peak:\s+-?[\d.]+ dBFS/.test(out) ? null : "no Peak: line printed");
  },
  // talk.mp4: 5 s of picture, a 1 kHz voice for the first 2 s; music.mp3: a 2 s, 150 Hz tone that has to loop.
  "music-under-voice": (d) => {
    const f = join(d, "with-music.mp4"); const p = probe(f);
    const under = musicLevel(f, 0.5, 1), after = musicLevel(f, 3, 1.5);
    return first(near(p.duration, 5, 0.1, "length"), p.a.length === 1 ? null : `${p.a.length} audio streams`,
      under > -45 ? null : `no music under the voice (${under} dB)`, after > -45 ? null : `no music after the voice ends (${after} dB)`);
  },
  "music-ducking": (d) => {
    const f = join(d, "ducked.mp4"); const p = probe(f);
    const under = musicLevel(f, 0.5, 1), after = musicLevel(f, 3, 1.5);
    return first(near(p.duration, 5, 0.1, "length"), after > -40 ? null : `no music after the voice ends (${after} dB)`,
      under <= after - 6 ? null : `the music is not lower under the voice (${under} dB against ${after} dB)`);
  },
  "remove-audio": (d) => (probe(join(d, "silent.mp4")).a.length === 0 ? null : "silent.mp4 still has sound"),
  "frame-at-time": (d) => {
    const f = join(d, "cover.jpg");
    return first(dims(probe(f)), near(mean(frame(f, null), 0, 0, 1080, 1920), rampAt(1.5), 4, "brightness (the clip's at 1.5 s)"));
  },
  "frame-typical": (d) => dims(probe(join(d, "cover-auto.png"))),
  "image-plus-audio": (d) => { const p = probe(join(d, "picture-video.mp4")); return first(dims(p), near(p.duration, 3, 0.15, "length")); },
  "vstack": (d, out, s) => {
    const p = probe(join(d, "stacked.mp4"));
    const err = first(dims(p), near(p.duration, 3, 0.15, "length (top 4 s with sound, bottom 3 s)"));
    if (err) return err;
    const q = probe(join(rerun(s, d, "swapped", [["top.mp4", "bottom.mp4"], ["bottom.mp4", "top.mp4"]]), "stacked.mp4"));
    return first(near(q.duration, 3, 0.15, "length (top 3 s silent, bottom 4 s)"), q.a.length === 0 ? null : "a silent top clip gave a sound track");
  },
  "rotate-90": (d) => {
    const f = join(d, "upright.mp4"); const fr = frame(f, 1);
    const top = mean(fr, 0, 0, 1080, 150), bottom = mean(fr, 0, 1770, 1080, 1920);
    return first(dims(probe(f)), top > 200 && bottom < 150 ? null : `the white left edge is not at the top (top ${top.toFixed(0)}, bottom ${bottom.toFixed(0)})`);
  },
  "concat-filter": (d) => joined(join(d, "joined.mp4")),
  "concat-copy": (d) => joined(join(d, "joined-fast.mp4")),
  "hdr-probe": (d, out) => {
    for (const want of ["color_transfer=smpte2084", "color_primaries=bt2020", "color_space=bt2020nc"]) if (!out.split("\n").includes(want)) return `ffprobe output lacks ${want}`;
    return null;
  },
  "hdr-to-sdr": (d) => {
    const f = join(d, "sdr.mp4"); const p = probe(f);
    const left = sideData(f).filter((t) => /mastering|light level/i.test(t));
    return first(p.v.codec_name === "h264" && p.v.pix_fmt === "yuv420p" && p.v.color_transfer === "bt709" && p.v.color_primaries === "bt709" && p.v.color_space === "bt709"
      ? null : `sdr.mp4 is ${p.v.codec_name} ${p.v.pix_fmt} ${p.v.color_primaries}/${p.v.color_transfer}/${p.v.color_space}`,
    left.length ? `HDR metadata left in sdr.mp4: ${left.join(", ")}` : null);
  },
};
// part1 is dark and part2 light, so the frames on each side of the join show both parts are there, in order.
function joined(f) {
  const a = mean(frame(f, 0.5), 0, 0, 1080, 1920), b = mean(frame(f, 3), 0, 0, 1080, 1920);
  return first(near(probe(f).duration, 4, 0.15, "length"), a < 90 && b > 160 ? null : `not part1 then part2 (brightness ${a.toFixed(0)}, then ${b.toFixed(0)})`);
}

let failed = 0, ran = 0;
const fixtureOf = ([f, , fx]) => fx ?? f;
const named = new Set(recipes.flatMap((r) => r.inputs.map(fixtureOf)));
for (const f of readdirSync(fixtures)) if (!named.has(f)) { console.log(`not ok - fixture ${f} is no recipe's input`); failed++; }
for (const f of named) if (!readdirSync(fixtures).includes(f)) { console.log(`not ok - input ${f} has no fixture`); failed++; }
for (const id of ids) if (!checks[id]) { console.log(`not ok - ${id}: no check written`); failed++; }
for (const id of Object.keys(checks)) if (!ids.includes(id)) { console.log(`not ok - check ${id} has no snippet`); failed++; }
if (new Set(ids).size !== ids.length) { console.log("not ok - snippet ids repeat"); failed++; }

for (const recipe of recipes) {
  const last = only.length ? Math.max(...recipe.snippets.map((s, i) => (only.includes(s.id) ? i : -1))) : recipe.snippets.length - 1;
  if (last < 0) continue;
  const dir = join(root, recipe.slug);
  mkdirSync(dir);
  for (const input of recipe.inputs) copyFileSync(join(fixtures, fixtureOf(input)), join(dir, input[0]));
  for (const s of recipe.snippets.slice(0, last + 1)) {
    const tested = !only.length || only.includes(s.id);
    const t0 = Date.now();
    const r = run("bash", ["-e", "-o", "pipefail", "-c", s.sh], { cwd: dir });
    let err = r.status === 0 ? null : `exit ${r.status}\n${r.stderr.split("\n").slice(-8).join("\n")}`;
    if (!tested) {
      if (err) { failed++; console.log(`not ok - ${recipe.slug} / ${s.id} (run first, for the files it makes): ${err}`); }
      continue;
    }
    ran++;
    if (!err) { try { err = checks[s.id](dir, r.stdout, s); } catch (e) { err = String(e.message || e); } }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (err) { failed++; console.log(`not ok - ${recipe.slug} / ${s.id} (${secs} s): ${err}`); }
    else console.log(`ok - ${recipe.slug} / ${s.id} (${secs} s)`);
  }
}
if (!process.env.KEEP) rmSync(root, { recursive: true, force: true });
else console.log(`kept ${root}`);
const skip = skipped ? `, ${skipped} check${skipped === 1 ? "" : "s"} skipped` : "";
console.log(failed ? `${failed} failed of ${ran}${skip}` : `ok: ${ran} snippets ran and passed their checks${skip} (${version})`);
process.exit(failed ? 1 : 0);
