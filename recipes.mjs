// The one source for every recipe: scripts/build.mjs writes the README, recipes/*.md and the agent skill from it, and test.mjs
// runs every snippet's exact text on generated clips and checks the result.
// inputs: [file name in the commands, what it is, fixture the test copies in under that name (when it differs)].

export const VIEWGUM = "https://viewgum.com";
export const SPECS = "https://github.com/viewgum/short-form-video-specs";
export const PREFLIGHT = "https://github.com/viewgum/shortform-preflight";
const FILTERS = "https://ffmpeg.org/ffmpeg-filters.html";
const H264 = "https://trac.ffmpeg.org/wiki/Encode/H.264";
export const SAFE_SCOPE = "These are the presets in each app's 9:16 ad guidance, the only pixel figures the apps publish; they publish none for regular posts.";

export const recipes = [
  {
    slug: "16x9-to-9x16",
    inputs: [["input.mp4", "a wide (16:9) video", "wide.mp4"], ["anamorphic.mp4", "for the last command, a video with non-square pixels"]],
    title: "Convert a 16:9 video to 9:16 with FFmpeg",
    task: "Turn a horizontal video into a vertical one",
    lede: "Three ways to turn a wide 16:9 video into a 1080 x 1920 vertical video for TikTok, Reels and Shorts: crop the middle, fit the whole frame over a blurred copy of itself, or fit it between black bars. Cropping fills the screen but loses the sides; the other two keep the whole picture.",
    tool: { url: `${VIEWGUM}/tools/vertical-video-resizer`, label: "Vertical video resizer", does: "crops a video to 9:16 or fits it over a blurred fill" },
    snippets: [
      {
        id: "crop-center",
        title: "Crop the middle",
        sh: `ffmpeg -i input.mp4 \\
  -vf "crop=ih*9/16:ih,scale=1080:1920,setsar=1" \\
  -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p \\
  -c:a copy vertical.mp4`,
        flags: [
          ["crop=ih*9/16:ih", "a box as tall as the video and 9/16 of its height wide; with no x and y it is centred"],
          ["scale=1080:1920", "scale that box to the full vertical frame"],
          ["setsar=1", "marks the pixels square"],
          ["-crf 20 -preset medium", "x264 quality and speed; a lower CRF is higher quality and a bigger file"],
          ["-pix_fmt yuv420p", "8-bit 4:2:0, which every player and app reads"],
          ["-c:a copy", "keep the sound as it is"],
        ],
        result: "vertical.mp4, 1080 x 1920, the middle of the picture, as long as the input.",
      },
      {
        id: "crop-offset",
        title: "Crop off-centre, when the subject is not in the middle",
        sh: `ffmpeg -i input.mp4 \\
  -vf "crop=ih*9/16:ih:(iw-ow)*0.25:0,scale=1080:1920,setsar=1" \\
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy vertical-left.mp4`,
        flags: [
          ["(iw-ow)*0.25", "the crop's left edge: 0 is the far left, 0.5 the middle, 1 the far right"],
          [":0", "start at the top"],
        ],
        result: "vertical-left.mp4, 1080 x 1920, cut from the left part of the frame.",
      },
      {
        id: "blur-background",
        title: "Fit the whole frame over a blurred background",
        sh: `ffmpeg -i input.mp4 -filter_complex \\
  "[0:v]split=2[bg][fg];\\
   [bg]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10,scale=1080:1920,setsar=1[bg];\\
   [fg]scale=1080:1920:force_original_aspect_ratio=decrease,setsar=1[fg];\\
   [bg][fg]overlay=(W-w)/2:(H-h)/2[v]" \\
  -map "[v]" -map "0:a?" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy vertical-blur.mp4`,
        flags: [
          ["split=2[bg][fg]", "two copies of the picture: one for the background, one for the front"],
          ["scale=270:480:...,crop=270:480,boxblur=10,scale=1080:1920", "fill the frame, blur it small and scale it back up; blurring at a quarter of the size is much faster and looks the same"],
          ["force_original_aspect_ratio=decrease", "the front copy fits inside 1080 x 1920 without being stretched"],
          ["overlay=(W-w)/2:(H-h)/2", "centre the front copy on the background"],
          ["-map \"0:a?\"", "keep the sound if there is any (quoted, because some shells read ? as a wildcard)"],
        ],
        result: "vertical-blur.mp4, 1080 x 1920: the whole wide picture in the middle, a blurred copy above and below.",
      },
      {
        id: "letterbox",
        title: "Fit the whole frame between black bars",
        sh: `ffmpeg -i input.mp4 \\
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \\
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy vertical-bars.mp4`,
        flags: [
          ["pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black", "grow the canvas to 1080 x 1920 and centre the picture on black"],
        ],
        result: "vertical-bars.mp4, 1080 x 1920 with black above and below the picture.",
      },
      {
        id: "square-pixels",
        title: "Non-square pixels first (DV, broadcast and some camera files)",
        sh: `ffmpeg -i anamorphic.mp4 \\
  -vf "scale=trunc(iw*sar/2)*2:ih,setsar=1,crop=ih*9/16:ih,scale=1080:1920,setsar=1" \\
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy vertical-square.mp4`,
        flags: [
          ["scale=trunc(iw*sar/2)*2:ih,setsar=1", "stretches the stored width to the width the video is shown at, so every pixel is square before the crop"],
        ],
        result: "vertical-square.mp4, 1080 x 1920, with shapes as they looked in the original. The commands above assume square pixels, as phone videos, screen recordings and most editors' exports have; ffprobe shows sample_aspect_ratio=1:1 for those.",
      },
    ],
    notes: [
      "A square (1:1) or 4:5 video works with the same commands.",
      `Keep text out of the parts each app covers with its buttons and captions: [short-form-video-specs](${SPECS}) has the safe zones in pixels.`,
    ],
    sources: [
      ["FFmpeg filters: crop", `${FILTERS}#crop`],
      ["FFmpeg filters: scale", `${FILTERS}#scale-1`],
      ["FFmpeg filters: pad", `${FILTERS}#pad-1`],
      ["FFmpeg filters: overlay", `${FILTERS}#overlay-1`],
    ],
  },
  {
    slug: "export-settings",
    inputs: [["vertical.mov", "a vertical video in any format"]],
    title: "FFmpeg export settings for TikTok, Instagram Reels, YouTube Shorts and Facebook Reels",
    task: "Export one file for every app",
    lede: "One FFmpeg command that turns a vertical video (an iPhone .mov, a screen recording, an editor's export) into an MP4 built to the published upload specs of TikTok, YouTube Shorts, Instagram Reels and Facebook Reels at once: H.264 High profile, 8-bit 4:2:0, progressive, 30 fps with a keyframe every 2 seconds, AAC at 48 kHz in stereo, the moov atom at the front and no edit lists. Length is the one thing it cannot fix: Facebook's Reels API takes 3 to 90 seconds and YouTube Shorts up to 3 minutes, so trim first if you need to.",
    tool: { url: `${VIEWGUM}/tools/video-spec-checker`, label: "Video spec checker", does: "checks a finished file against each app's published specs" },
    snippets: [
      {
        id: "export-all-apps",
        title: "Export for every app",
        sh: `ffmpeg -i vertical.mov \\
  -vf "bwdif=deint=interlaced,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30" \\
  -c:v libx264 -preset slow -crf 20 -profile:v high -pix_fmt yuv420p \\
  -g 60 -keyint_min 60 -sc_threshold 0 -maxrate 12M -bufsize 12M \\
  -c:a aac -b:a 192k -ar 48000 -ac 2 \\
  -movflags +faststart -use_editlist 0 short.mp4`,
        flags: [
          ["bwdif=deint=interlaced", "deinterlaces only frames marked interlaced; progressive video passes through untouched"],
          ["scale=...,pad=...", "1080 x 1920; a file that is already that size passes through unchanged"],
          ["fps=30", "30 frames a second: Instagram's help page says reels should have at least 30, and the TikTok, Instagram and Facebook APIs take 23 or 24 up to 60"],
          ["-profile:v high -pix_fmt yuv420p", "H.264 High profile at 8-bit 4:2:0: YouTube recommends both, Instagram's API requires 4:2:0"],
          ["-g 60 -keyint_min 60 -sc_threshold 0", "a keyframe every 60 frames, so every GOP is 2 seconds, with no extra keyframes at scene changes; x264's GOPs are closed by default. Facebook's Reels page asks for closed GOPs of 2 to 5 seconds and Instagram's Reels API for closed GOPs"],
          ["-maxrate 12M -bufsize 12M", "caps the video bitrate: no stretch of a second or more can go over 24 Mbps (12 for the rate plus 12 for the buffer), under the 25 Mbps maximum Instagram's Reels API lists; a larger buffer would let short bursts through"],
          ["-c:a aac -ar 48000 -ac 2", "AAC-LC at 48 kHz in stereo, as YouTube, Instagram's API and Facebook's Reels API list (TikTok names no audio format)"],
          ["-b:a 192k", "Facebook's Reels API asks for 128 kbps or more and YouTube recommends 384 kbps for stereo, so raise it for music"],
          ["-movflags +faststart", "puts the moov atom at the front of the file"],
          ["-use_editlist 0", "leaves out MP4 edit lists: Instagram's Reels specs say no edit lists"],
        ],
        result: "short.mp4. For the test's 6-second interlaced clip with sound it comes out progressive, with a keyframe every 2 seconds, no one-second stretch of the video over 25 Mbps, and it passes every check of shortform-preflight on the API route for all four apps. A source with no sound gives a file with no audio track, and silent audio encodes far below 192 kbps; check your own file before you post it.",
      },
      {
        id: "check-file",
        title: "Look at what a file is",
        sh: `ffprobe -v error -select_streams v:0 \\
  -show_entries stream=codec_name,profile,width,height,pix_fmt,field_order,r_frame_rate \\
  -of default=noprint_wrappers=1 short.mp4`,
        flags: [
          ["-select_streams v:0", "the first video stream"],
          ["-show_entries stream=...", "the video fields that most often cause a rejected upload; it does not show length, sound, size or the MP4 layout"],
        ],
        result: "codec_name=h264, profile=High, width=1080, height=1920, pix_fmt=yuv420p, field_order=progressive and r_frame_rate=30/1 for the file above.",
      },
    ],
    notes: [
      `For a full check against each app's published limits, with the quoted source of each figure, run [shortform-preflight](${PREFLIGHT}): \`npx github:viewgum/shortform-preflight short.mp4 --route api\`. The API route is the one the apps publish the most rules for.`,
      "HEVC (H.265) input from a phone works the same way; the output is H.264. An HDR phone video needs the HDR to SDR recipe first, or it can look washed out.",
    ],
    sources: [
      ["The upload specs and their quotes: shortform-preflight data/upload-specs.json", `${PREFLIGHT}/blob/main/data/upload-specs.json`],
      ["YouTube recommended upload encoding settings", "https://support.google.com/youtube/answer/1722171"],
      ["FFmpeg filters: bwdif", `${FILTERS}#bwdif`],
      ["FFmpeg H.264 encoding guide (CRF, presets, VBV)", H264],
    ],
  },
  {
    slug: "compress-to-size",
    inputs: [["input.mp4", "the video to shrink", "input-10bit.mp4"]],
    title: "Compress a video to a target file size with FFmpeg",
    task: "Compress to a file size",
    lede: "To get a video under a size limit (for an email, a chat app or an upload form), work out the bitrate the size allows and encode in two passes, which spends that bitrate where the picture needs it. The commands are for a POSIX shell (bash or zsh on macOS and Linux, or WSL and Git Bash on Windows).",
    tool: { url: `${VIEWGUM}/tools/video-compressor`, label: "Video compressor", does: "compresses a video to a size you pick" },
    snippets: [
      {
        id: "compress-two-pass",
        title: "Two-pass encode to a size in MB",
        sh: `target_mb=1
seconds=$(ffprobe -v error -show_entries format=duration -of csv=p=0 input.mp4)
video_kbps=$(awk -v mb="$target_mb" -v s="$seconds" 'BEGIN { printf "%d", mb * 8000 * 0.92 / s - 128 }')
if [ "$video_kbps" -lt 150 ]; then echo "Too little bitrate for $seconds s in $target_mb MB: raise target_mb or trim the video." >&2; exit 1; fi
ffmpeg -y -i input.mp4 -c:v libx264 -preset medium -b:v "\${video_kbps}k" -pix_fmt yuv420p -pass 1 -passlogfile small -an -f mp4 /dev/null
ffmpeg -i input.mp4 -c:v libx264 -preset medium -b:v "\${video_kbps}k" -pix_fmt yuv420p -pass 2 -passlogfile small \\
  -c:a aac -b:a 128k -movflags +faststart small.mp4
limit=$(awk -v mb="$target_mb" 'BEGIN { printf "%d", mb * 1000000 }')
if [ "$(wc -c < small.mp4)" -gt "$limit" ]; then echo "small.mp4 is over $target_mb MB: lower target_mb a little and run again." >&2; exit 1; fi`,
        flags: [
          ["mb * 8000 / s", "megabytes to kilobits a second over the video's length (1 MB = 8,000 kilobits)"],
          ["* 0.92", "leaves about 8% for the MP4 container and for the encoder going over its target, which two-pass x264 does by a few percent on short clips"],
          ["- 128", "what is left after 128 kbps of audio"],
          ["-lt 150", "stops before encoding when the size leaves almost nothing for the picture"],
          ["-pix_fmt yuv420p (both passes)", "the same 8-bit format in both passes; x264 refuses a second pass whose format differs from the first, which a 10-bit phone video would otherwise cause"],
          ["-passlogfile small", "names the first pass's notes small-0.log, so two jobs in one folder do not mix them up"],
          ["-pass 1 -an -f mp4 /dev/null", "the first pass only measures and writes no video"],
          ["wc -c < small.mp4", "the finished file's size in bytes, checked against the limit, since the bitrate is a target and not a promise"],
        ],
        result: "small.mp4, under 1 MB (1,000,000 bytes) for the test's 4-second 10-bit clip. Set target_mb to your limit.",
      },
    ],
    notes: [
      "If the picture is poor at that size, shorten the video or scale it down in both passes (add `-vf scale=720:-2` to each).",
      "Two-pass leaves small-0.log and small-0.log.mbtree next to the video; delete them afterwards.",
    ],
    sources: [
      ["FFmpeg H.264 encoding guide: two-pass", `${H264}#twopass`],
      ["FFmpeg documentation: -pass and -passlogfile", "https://ffmpeg.org/ffmpeg.html#Video-Options"],
    ],
  },
  {
    slug: "trim",
    inputs: [["input.mp4", "a video longer than the clip you want"]],
    title: "Trim or cut a video with FFmpeg",
    task: "Cut a clip or trim to a length",
    lede: "Cut a part out of a longer video, or trim it under an app's length limit. Re-encoding cuts on the exact frame; copying the streams is instant but can only start on a keyframe.",
    tool: { url: `${VIEWGUM}/tools/video-trimmer`, label: "Video trimmer", does: "trims a video" },
    snippets: [
      {
        id: "trim-exact",
        title: "Cut on the exact frame",
        sh: `ffmpeg -ss 00:00:01 -i input.mp4 -t 2 \\
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k clip.mp4`,
        flags: [
          ["-ss 00:00:01 (before -i)", "start one second in; before the input it seeks fast and, with re-encoding, still lands on the exact frame"],
          ["-t 2", "keep two seconds. This is a length: to end at 3 seconds into the source, give -t as the end minus the start"],
        ],
        result: "clip.mp4, two seconds long, whose first frame is the source's frame at one second.",
      },
      {
        id: "trim-copy",
        title: "Cut without re-encoding",
        sh: `ffmpeg -ss 00:00:01 -i input.mp4 -t 2 -c copy -avoid_negative_ts make_zero clip-fast.mp4`,
        flags: [
          ["-c copy", "no re-encoding, so it is instant and lossless, but the clip starts at the last keyframe at or before 00:00:01, so it can begin earlier and run longer than asked"],
          ["-avoid_negative_ts make_zero", "starts the timestamps at zero, which some players need"],
        ],
        result: "clip-fast.mp4, about two seconds; how much earlier it starts depends on where the source's keyframes are.",
      },
    ],
    notes: [
      `Length limits differ by app and by how you upload: [short-form-video-specs](${SPECS}) lists them with their sources.`,
    ],
    sources: [["FFmpeg documentation: main options (-ss, -t)", "https://ffmpeg.org/ffmpeg.html#Main-options"]],
  },
  {
    slug: "speed",
    inputs: [["input.mp4", "a video with sound"]],
    title: "Speed up or slow down a video with FFmpeg",
    task: "Change the speed",
    lede: "Change a video's speed with its sound in step: setpts changes the picture's timing and atempo the sound's, without changing the pitch.",
    tool: { url: `${VIEWGUM}/tools/video-speed-changer`, label: "Video speed changer", does: "speeds a video up or slows it down" },
    snippets: [
      {
        id: "speed-up",
        title: "Play 1.5 times as fast",
        sh: `ffmpeg -i input.mp4 \\
  -filter_complex "[0:v]setpts=PTS/1.5[v];[0:a]atempo=1.5[a]" \\
  -map "[v]" -map "[a]" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k faster.mp4`,
        flags: [
          ["setpts=PTS/1.5", "each frame shows 1.5 times sooner; for slow motion at half speed use PTS*2"],
          ["atempo=1.5", "the sound at 1.5 times the speed, same pitch; for half speed use atempo=0.5"],
        ],
        result: "faster.mp4, two thirds as long as the input.",
      },
    ],
    notes: [
      "atempo takes 0.5 to 100. For a video without sound, drop the [0:a] part and the second -map.",
      "This assumes the picture and the sound start together, as they do in most files. If the sound starts later, its delay is not sped up with it.",
    ],
    sources: [
      ["FFmpeg filters: setpts", `${FILTERS}#setpts_002c-asetpts`],
      ["FFmpeg filters: atempo", `${FILTERS}#atempo`],
    ],
  },
  {
    slug: "loop",
    inputs: [["clip.mp4", "a short clip"]],
    title: "Loop a video to a set length with FFmpeg",
    task: "Loop a clip",
    lede: "Repeat a short clip until it reaches a length, for a background, a seamless loop or a video that needs a minimum length.",
    tool: { url: `${VIEWGUM}/tools/loop-video`, label: "Loop video", does: "loops a clip" },
    snippets: [
      {
        id: "loop-to-length",
        title: "Loop to 10 seconds",
        sh: `ffmpeg -stream_loop -1 -i clip.mp4 -t 10 \\
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k looped.mp4`,
        flags: [
          ["-stream_loop -1 (before -i)", "repeat the input without end; -stream_loop 3 would play it four times"],
          ["-t 10", "stop at ten seconds"],
        ],
        result: "looped.mp4, ten seconds long.",
      },
    ],
    notes: [],
    sources: [["FFmpeg documentation: -stream_loop", "https://ffmpeg.org/ffmpeg.html#Main-options"]],
  },
  {
    slug: "captions",
    inputs: [["vertical.mp4", "a 1080 x 1920 video"], ["captions.srt", "subtitles in SRT"], ["captions-1080x1920.ass", "or an ASS file sized for 1080 x 1920"]],
    title: "Burn captions and text into a vertical video with FFmpeg",
    task: "Burn captions or a title into the picture",
    lede: `Burn subtitles (SRT or ASS) and a title into a 1080 x 1920 video, inside the safe zone: on a 1080 x 1920 frame, the four apps' published safe zones (TikTok, YouTube Shorts, Instagram Reels and Facebook Reels) all leave clear the area at least 288 px from the top, 672 px from the bottom, 120 px from the left and 192 px from the right, minus the right 300 px below y = 840. ${SAFE_SCOPE}`,
    tool: { url: `${VIEWGUM}/safe-zones`, label: "Safe zone checker", does: "shows where a frame of yours meets each app's safe zone" },
    snippets: [
      {
        id: "burn-srt",
        title: "Burn an SRT file inside the safe zone",
        sh: `ffmpeg -i captions.srt captions.ass
sed -e 's/^PlayResX: .*/PlayResX: 1080/' -e 's/^PlayResY: .*/PlayResY: 1920/' captions.ass > captions-1080.ass
ffmpeg -i vertical.mp4 \\
  -vf "subtitles=captions-1080.ass:force_style='FontName=Arial,FontSize=64,Bold=1,Alignment=2,MarginL=300,MarginR=300,MarginV=700,Outline=4,Shadow=0'" \\
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy captioned.mp4`,
        flags: [
          ["ffmpeg -i captions.srt captions.ass", "converts the SRT to an ASS script, which FFmpeg sizes for a 384 x 288 canvas"],
          ["sed ... PlayResX: 1080 ... PlayResY: 1920", "sets that canvas to the video's size, so every number below is a pixel"],
          ["Alignment=2", "bottom centre"],
          ["MarginV=700", "the lowest line ends about 700 px above the bottom edge (y = 1220), clear of the 672 px the apps cover at the bottom"],
          ["MarginL=300,MarginR=300", "lines wrap between x = 300 and x = 780, the widest centred box that low on the frame on all four apps"],
          ["Outline=4,Shadow=0", "a 4 px dark outline keeps white text readable on any picture"],
        ],
        result: "captioned.mp4. The margins are where lines wrap, not a wall: a single word wider than 480 px, a cue of many lines, or a cue with its own position tag can still reach outside. Keep each cue to one or two short lines; for the test's two cues every pixel of text lands between x 300 and 780 and above y 1248.",
      },
      {
        id: "burn-ass",
        title: "Burn an ASS file made for 1080 x 1920",
        sh: `ffmpeg -i vertical.mp4 -vf "ass=captions-1080x1920.ass" \\
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy captioned-ass.mp4`,
        flags: [
          ["ass=...", "renders an ASS file as it is, with its own fonts, sizes, colours and positions"],
        ],
        result: "captioned-ass.mp4, with the captions where the ASS file puts them.",
      },
      {
        id: "title-text",
        title: "Put a title at the top with drawtext",
        sh: `ffmpeg -i vertical.mp4 \\
  -vf "drawtext=font=Arial:text='Why bread rises':fontsize=72:fontcolor=white:borderw=4:bordercolor=black:x=(w-text_w)/2:y=320" \\
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy titled.mp4`,
        flags: [
          ["font=Arial", "the font by name; FFmpeg picks the closest installed font (or give fontfile=/path/to/font.ttf)"],
          ["x=(w-text_w)/2:y=320", "centred, with its top 32 px below the 288 px the apps cover at the top"],
          ["borderw=4:bordercolor=black", "a dark outline around each letter"],
        ],
        result: "titled.mp4. Above y = 840 a centred line can be up to 696 px wide on all four apps; this one is about 520.",
      },
    ],
    notes: [
      "Text with an apostrophe or a colon is easier in a file: write it to title.txt and use textfile=title.txt instead of text=.",
      "For a 720 x 1280 video, scale every x by 720/1080 and every y by 1280/1920 (both two thirds): MarginL and MarginR 200, MarginV 467, the title at y = 213.",
      `The safe zone figures, each with its source, and a checker for any box: [short-form-video-specs](${SPECS}).`,
    ],
    sources: [
      ["FFmpeg filters: subtitles", `${FILTERS}#subtitles-1`],
      ["FFmpeg filters: ass", `${FILTERS}#ass`],
      ["FFmpeg filters: drawtext", `${FILTERS}#drawtext-1`],
      ["Safe zones with sources: short-form-video-specs data/safe-zones.json", `${SPECS}/blob/main/data/safe-zones.json`],
    ],
  },
  {
    slug: "loudness",
    inputs: [["input.mp4", "a video with sound"]],
    title: "Normalize audio loudness to a LUFS target with FFmpeg",
    task: "Set the loudness (LUFS)",
    lede: "Set a video's sound to a target loudness, measured in LUFS, with FFmpeg's loudnorm filter (EBU R128). Two passes measure first and then correct; one pass is quicker and less exact. The commands are for a POSIX shell (bash or zsh).",
    tool: { url: `${VIEWGUM}/tools/loudness-meter`, label: "Loudness meter", does: "measures a file's loudness" },
    snippets: [
      {
        id: "loudness-two-pass",
        title: "Two passes",
        sh: `ffmpeg -i input.mp4 -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2> measure.txt
get() { sed -n "s/.*\\"$1\\" : \\"\\(.*\\)\\".*/\\1/p" measure.txt; }
case "$(get input_i)" in ""|*inf*) echo "No loudness measured (silent or no audio); nothing to normalize." >&2; exit 1 ;; esac
ffmpeg -i input.mp4 -c:v copy -c:a aac -b:a 192k -ar 48000 \\
  -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \\
  loud.mp4`,
        flags: [
          ["I=-14", "the target integrated loudness in LUFS; loudnorm takes -70 to -5"],
          ["TP=-1", "the highest true peak allowed, in dBTP"],
          ["print_format=json ... 2> measure.txt", "the first pass writes what it measured to measure.txt"],
          ["get()", "reads one measured value out of measure.txt"],
          ["case ... *inf*", "stops when the first pass measured nothing, as on a silent track"],
          ["linear=true", "with the measured values, the second pass applies one gain to the whole track; if that gain would break the peak limit or the range target, loudnorm falls back to adjusting as it goes"],
          ["-ar 48000", "loudnorm can output 192 kHz; this sets the file back to 48 kHz"],
        ],
        result: "loud.mp4 at -14 LUFS integrated, within half a unit for the test clip.",
      },
      {
        id: "loudness-one-pass",
        title: "One pass, quick",
        sh: `ffmpeg -i input.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k -ar 48000 loud-quick.mp4`,
        flags: [["loudnorm=I=-14:TP=-1:LRA=11", "adjusts the level as it goes, so it lands near the target, not on it"]],
        result: "loud-quick.mp4 near -14 LUFS.",
      },
      {
        id: "loudness-measure",
        title: "Measure the loudness",
        sh: `ffmpeg -nostats -i loud.mp4 -vn -af ebur128=peak=true -f null - 2>&1 | grep -A 13 "Summary:"`,
        flags: [
          ["-vn", "skips the picture, which is faster"],
          ["ebur128=peak=true", "prints the integrated loudness (I), the loudness range (LRA) and the true peak"],
          ["grep -A 13 \"Summary:\"", "keeps only the summary at the end, through the Peak line"],
        ],
        result: "A summary whose I: line reads about -14.0 LUFS for loud.mp4, and whose Peak: line gives the true peak.",
      },
    ],
    notes: ["Pick the target you use for your channel; the commands take any value of I from -70 to -5."],
    sources: [
      ["FFmpeg filters: loudnorm", `${FILTERS}#loudnorm`],
      ["FFmpeg filters: ebur128", `${FILTERS}#ebur128-1`],
      ["EBU R 128 loudness recommendation", "https://tech.ebu.ch/publications/r128"],
    ],
  },
  {
    slug: "music",
    inputs: [["vertical.mp4", "a video with a voice", "talk.mp4"], ["music.mp3", "a music track"], ["input.mp4", "for the last command, any video"]],
    title: "Add background music to a video with FFmpeg",
    task: "Add music under a voice, or remove the sound",
    lede: "Mix a music track under a video's own sound at a lower level, loop it for the whole length of the picture, and optionally duck it when someone speaks. Or take the sound out altogether.",
    tool: { url: `${VIEWGUM}/tools/add-music-to-video`, label: "Add music to video", does: "adds a music track to a video" },
    snippets: [
      {
        id: "music-under-voice",
        title: "Music under the voice, at a lower level",
        sh: `len=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 vertical.mp4)
ffmpeg -i vertical.mp4 -stream_loop -1 -i music.mp3 \\
  -filter_complex "[0:a]apad[voice];[1:a]volume=0.15[m];[voice][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]" \\
  -map 0:v -map "[a]" -t "$len" -c:v copy -c:a aac -b:a 192k with-music.mp4`,
        flags: [
          ["-stream_loop -1 -i music.mp3", "repeats the music if it is shorter than the video"],
          ["apad", "extends the voice with silence, so the music keeps playing after the voice ends"],
          ["volume=0.15", "the music at 15% (about -16 dB); raise or lower to taste"],
          ["normalize=0", "keeps the voice at its own level instead of lowering both"],
          ["len=$(ffprobe ...) and -t \"$len\"", "ends the file at the picture's length: the padded voice and the looped music never end by themselves, so -shortest would not stop them when the picture is copied"],
        ],
        result: "with-music.mp4, as long as the picture, with the music still playing where the voice has stopped.",
      },
      {
        id: "music-ducking",
        title: "Music that ducks when someone speaks",
        sh: `len=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 vertical.mp4)
ffmpeg -i vertical.mp4 -stream_loop -1 -i music.mp3 \\
  -filter_complex "[0:a]apad,asplit=2[voice][key];[1:a]volume=0.4[m];\\
[m][key]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[ducked];\\
[voice][ducked]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]" \\
  -map 0:v -map "[a]" -t "$len" -c:v copy -c:a aac -b:a 192k ducked.mp4`,
        flags: [
          ["asplit=2[voice][key]", "two copies of the voice: one to hear, one to steer the compressor"],
          ["sidechaincompress=threshold=0.05:ratio=8", "turns the music down while the voice is louder than the threshold"],
          ["attack=20:release=400", "how fast, in milliseconds, the music dips and comes back"],
        ],
        result: "ducked.mp4, as long as the picture: the music lower under the voice and back up after it.",
      },
      {
        id: "remove-audio",
        title: "Remove the sound",
        sh: `ffmpeg -i input.mp4 -c:v copy -an silent.mp4`,
        flags: [["-an", "no audio stream in the output"], ["-c:v copy", "the picture is copied, not re-encoded"]],
        result: "silent.mp4 with no audio stream.",
      },
    ],
    notes: [
      "If ffprobe prints N/A for the length (some MKV and WebM files keep it only for the whole file), read format=duration instead of stream=duration.",
      "Use music you have the rights to use in the video, including in ads if the video becomes one.",
    ],
    sources: [
      ["FFmpeg filters: amix", `${FILTERS}#amix`],
      ["FFmpeg filters: apad", `${FILTERS}#apad`],
      ["FFmpeg filters: sidechaincompress", `${FILTERS}#sidechaincompress`],
    ],
  },
  {
    slug: "cover-frame",
    inputs: [["clip.mp4", "a video"]],
    title: "Extract a cover frame or thumbnail from a video with FFmpeg",
    task: "Save a frame as a cover image",
    lede: "Save one frame of a video as a picture, for a cover, a thumbnail or a still: at a time you pick, or the frame FFmpeg judges most typical of a run of frames. The picture comes out at the video's own size.",
    tool: { url: `${VIEWGUM}/tools/video-frame-extractor`, label: "Video frame extractor", does: "saves frames from a video" },
    snippets: [
      {
        id: "frame-at-time",
        title: "The frame at a set time",
        sh: `ffmpeg -ss 1.5 -i clip.mp4 -frames:v 1 -q:v 2 cover.jpg`,
        flags: [["-ss 1.5", "1.5 seconds in"], ["-frames:v 1", "one frame"], ["-q:v 2", "JPEG quality, 2 (best) to 31"]],
        result: "cover.jpg, the frame at 1.5 seconds (1080 x 1920 for the test clip).",
      },
      {
        id: "frame-typical",
        title: "The most typical of the first 90 frames",
        sh: `ffmpeg -i clip.mp4 -vf "thumbnail=90" -frames:v 1 cover-auto.png`,
        flags: [["thumbnail=90", "looks at each run of 90 frames (3 seconds at 30 fps, 1.5 at 60) and keeps the one whose colours are closest to the run's average"]],
        result: "cover-auto.png, one frame from the first 90.",
      },
    ],
    notes: [],
    sources: [["FFmpeg filters: thumbnail", `${FILTERS}#thumbnail`]],
  },
  {
    slug: "still-image-video",
    inputs: [["picture.jpg", "a picture of any size"], ["voice.m4a", "a sound file"]],
    title: "Make a video from an image and audio with FFmpeg",
    task: "Turn a picture and a sound into a video",
    lede: "Turn a still picture and a sound file (a voice note, a podcast clip, a song) into a 1080 x 1920 MP4 as long as the sound.",
    tool: { url: `${VIEWGUM}/tools/audiogram-maker`, label: "Audiogram maker", does: "turns a sound and a picture into a vertical video" },
    snippets: [
      {
        id: "image-plus-audio",
        title: "Picture plus sound",
        sh: `ffmpeg -loop 1 -framerate 30 -i picture.jpg -i voice.m4a \\
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1" \\
  -c:v libx264 -tune stillimage -pix_fmt yuv420p -c:a aac -b:a 192k -shortest picture-video.mp4`,
        flags: [
          ["-loop 1 -framerate 30 -i picture.jpg", "repeats the picture as a 30 fps video"],
          ["-tune stillimage", "x264 settings for a picture that does not move"],
          ["-shortest", "ends with the sound"],
        ],
        result: "picture-video.mp4, 1080 x 1920, as long as voice.m4a (to within a frame or two).",
      },
    ],
    notes: [],
    sources: [["FFmpeg H.264 encoding guide (presets and tunes)", H264]],
  },
  {
    slug: "split-screen",
    inputs: [["top.mp4", "the upper video, with the sound you keep"], ["bottom.mp4", "the lower video"]],
    title: "Stack two videos into a vertical split screen with FFmpeg",
    task: "Stack two videos, top and bottom",
    lede: "Put two videos one above the other in a 1080 x 1920 frame, each cropped to fill its half: a reaction over a clip, a before and after, gameplay under a talking head.",
    tool: null,
    snippets: [
      {
        id: "vstack",
        title: "Top and bottom halves",
        sh: `ffmpeg -i top.mp4 -i bottom.mp4 -filter_complex \\
  "[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[t];\\
   [1:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[b];\\
   [t][b]vstack=inputs=2:shortest=1[v]" \\
  -map "[v]" -map "0:a?" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest stacked.mp4`,
        flags: [
          ["scale=1080:960:...increase,crop=1080:960", "each video fills a 1080 x 960 half, cropped to fit"],
          ["vstack=inputs=2:shortest=1", "one above the other, ending when the shorter video ends (without shortest=1 the shorter one freezes on its last frame)"],
          ["-map \"0:a?\"", "the top video's sound, if it has any"],
          ["-shortest", "cuts the sound to the picture's length"],
        ],
        result: "stacked.mp4, 1080 x 1920, as long as the shorter video.",
      },
    ],
    notes: ["For side by side halves, use 540 x 1920 halves and hstack."],
    sources: [["FFmpeg filters: vstack", `${FILTERS}#vstack`]],
  },
  {
    slug: "rotate",
    inputs: [["sideways.mp4", "a video that plays on its side"]],
    title: "Rotate a sideways video with FFmpeg",
    task: "Rotate a sideways video",
    lede: "Turn a video that plays on its side upright, by rotating the picture itself, so it looks right in every app and editor.",
    tool: { url: `${VIEWGUM}/tools/rotate-and-flip-video`, label: "Rotate and flip video", does: "rotates and flips a video" },
    snippets: [
      {
        id: "rotate-90",
        title: "A quarter turn clockwise",
        sh: `ffmpeg -i sideways.mp4 -vf "transpose=clock" \\
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy upright.mp4`,
        flags: [
          ["transpose=clock", "90 degrees clockwise, so the left edge becomes the top; cclock turns it the other way, and hflip,vflip turns it 180 degrees"],
        ],
        result: "upright.mp4: a 1920 x 1080 input comes out 1080 x 1920, its left side now at the top.",
      },
    ],
    notes: [
      "Phones often record upright video as a wide picture plus a rotation tag. FFmpeg applies the tag when it re-encodes, so such a file usually needs no transpose at all.",
    ],
    sources: [["FFmpeg filters: transpose", `${FILTERS}#transpose-1`]],
  },
  {
    slug: "join-clips",
    inputs: [["part1.mp4", "the first clip"], ["part2.mp4", "the second clip"]],
    title: "Join video clips into one with FFmpeg",
    task: "Join clips end to end",
    lede: "Put clips end to end in one video. The concat filter re-encodes, so it joins clips with different settings once they are the same size; the concat demuxer copies, so it is instant but needs clips made the same way.",
    tool: { url: `${VIEWGUM}/tools/merge-videos`, label: "Merge videos", does: "joins clips into one video" },
    snippets: [
      {
        id: "concat-filter",
        title: "Join and re-encode",
        sh: `ffmpeg -i part1.mp4 -i part2.mp4 \\
  -filter_complex "[0:v]setsar=1[v0];[1:v]setsar=1[v1];[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]" \\
  -map "[v]" -map "[a]" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k joined.mp4`,
        flags: [
          ["concat=n=2:v=1:a=1", "two parts, each with one video and one audio stream"],
          ["setsar=1", "the parts must have the same size and pixel shape; scale them first if they differ"],
        ],
        result: "joined.mp4: part1, then part2, as long as both together.",
      },
      {
        id: "concat-copy",
        title: "Join without re-encoding",
        sh: `printf "file '%s'\\n" part1.mp4 part2.mp4 > parts.txt
ffmpeg -f concat -safe 0 -i parts.txt -c copy joined-fast.mp4`,
        flags: [
          ["parts.txt", "one line per clip, in order. A name with an apostrophe in it must be written as '\\'' inside the quotes, for example file 'Sam'\\''s clip.mp4'"],
          ["-f concat -safe 0", "the concat demuxer; -safe 0 also allows absolute paths"],
        ],
        result: "joined-fast.mp4: part1, then part2; only for clips with the same codecs and settings.",
      },
    ],
    notes: [],
    sources: [
      ["FFmpeg filters: concat", `${FILTERS}#concat`],
      ["FFmpeg formats: concat demuxer", "https://ffmpeg.org/ffmpeg-formats.html#concat-1"],
    ],
  },
  {
    slug: "hdr-to-sdr",
    inputs: [["hdr.mov", "an HDR video, such as an iPhone recording with HDR on"]],
    title: "Convert an HDR iPhone video to SDR with FFmpeg",
    task: "Convert HDR to SDR",
    lede: "An HDR video (an iPhone's HLG recording, or HDR10) can look grey and washed out after an upload or an edit that expects SDR. This converts it to standard BT.709 colour with tone mapping and drops the HDR metadata.",
    tool: null,
    snippets: [
      {
        id: "hdr-probe",
        title: "Check what the video is",
        sh: `ffprobe -v error -select_streams v:0 \\
  -show_entries stream=color_transfer,color_primaries,color_space -of default=noprint_wrappers=1 hdr.mov`,
        flags: [["color_transfer", "arib-std-b67 is HLG and smpte2084 is PQ (HDR10); bt709 is already SDR"], ["color_space", "the matrix, usually bt2020nc for HDR"]],
        result: "color_transfer, color_primaries and color_space of the video (smpte2084, bt2020 and bt2020nc for the test clip).",
      },
      {
        id: "hdr-to-sdr",
        title: "HDR (HLG or PQ) to SDR",
        sh: `ffmpeg -i hdr.mov \\
  -vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,sidedata=delete:type=MASTERING_DISPLAY_METADATA,sidedata=delete:type=CONTENT_LIGHT_LEVEL" \\
  -c:v libx264 -crf 20 -preset medium -color_primaries bt709 -color_trc bt709 -colorspace bt709 \\
  -c:a copy sdr.mp4`,
        flags: [
          ["zscale=t=linear:npl=100", "undoes the HDR transfer curve into linear light (needs FFmpeg built with zimg)"],
          ["zscale=p=bt709", "converts the BT.2020 colours to BT.709"],
          ["tonemap=hable:desat=0", "squeezes the bright range into SDR; hable keeps highlights soft (also try mobius or reinhard)"],
          ["zscale=t=bt709:m=bt709:r=tv,format=yuv420p", "SDR transfer, matrix and range, 8-bit 4:2:0"],
          ["sidedata=delete:type=...", "drops the HDR mastering and light-level metadata, which no longer describes the picture"],
          ["-color_primaries bt709 -color_trc bt709 -colorspace bt709", "tags the output as SDR"],
        ],
        result: "sdr.mp4, H.264, 8-bit 4:2:0, tagged BT.709, with no HDR metadata left.",
      },
    ],
    notes: [
      "If the probe shows no color_space (unknown), the first zscale cannot tell how to read the colours: add min=bt2020nc to it (zscale=t=linear:npl=100:min=bt2020nc) when you know the video is BT.2020.",
    ],
    sources: [
      ["FFmpeg filters: zscale", `${FILTERS}#zscale`],
      ["FFmpeg filters: tonemap", `${FILTERS}#tonemap-1`],
      ["FFmpeg filters: sidedata", `${FILTERS}#sidedata_002c-asidedata`],
    ],
  },
];
