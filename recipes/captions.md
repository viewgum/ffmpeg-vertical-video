# Burn captions and text into a vertical video with FFmpeg

Burn subtitles (SRT or ASS) and a title into a 1080 x 1920 video, inside the safe zone: on a 1080 x 1920 frame, the four apps' published safe zones (TikTok, YouTube Shorts, Instagram Reels and Facebook Reels) all leave clear the area at least 288 px from the top, 672 px from the bottom, 120 px from the left and 192 px from the right, minus the right 300 px below y = 840. These are the presets in each app's 9:16 ad guidance, the only pixel figures the apps publish; they publish none for regular posts.

You need: `vertical.mp4` (a 1080 x 1920 video), `captions.srt` (subtitles in SRT), `captions-1080x1920.ass` (or an ASS file sized for 1080 x 1920). Change the file names to yours.

## Burn an SRT file inside the safe zone

```sh
ffmpeg -i captions.srt captions.ass
sed -e 's/^PlayResX: .*/PlayResX: 1080/' -e 's/^PlayResY: .*/PlayResY: 1920/' captions.ass > captions-1080.ass
ffmpeg -i vertical.mp4 \
  -vf "subtitles=captions-1080.ass:force_style='FontName=Arial,FontSize=64,Bold=1,Alignment=2,MarginL=300,MarginR=300,MarginV=700,Outline=4,Shadow=0'" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy captioned.mp4
```

| Part | What it does |
|---|---|
| `ffmpeg -i captions.srt captions.ass` | converts the SRT to an ASS script, which FFmpeg sizes for a 384 x 288 canvas |
| `sed ... PlayResX: 1080 ... PlayResY: 1920` | sets that canvas to the video's size, so every number below is a pixel |
| `Alignment=2` | bottom centre |
| `MarginV=700` | the lowest line ends about 700 px above the bottom edge (y = 1220), clear of the 672 px the apps cover at the bottom |
| `MarginL=300,MarginR=300` | lines wrap between x = 300 and x = 780, the widest centred box that low on the frame on all four apps |
| `Outline=4,Shadow=0` | a 4 px dark outline keeps white text readable on any picture |

Result: captioned.mp4. The margins are where lines wrap, not a wall: a single word wider than 480 px, a cue of many lines, or a cue with its own position tag can still reach outside. Keep each cue to one or two short lines; for the test's two cues every pixel of text lands between x 300 and 780 and above y 1248.

## Burn an ASS file made for 1080 x 1920

```sh
ffmpeg -i vertical.mp4 -vf "ass=captions-1080x1920.ass" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy captioned-ass.mp4
```

| Part | What it does |
|---|---|
| `ass=...` | renders an ASS file as it is, with its own fonts, sizes, colours and positions |

Result: captioned-ass.mp4, with the captions where the ASS file puts them.

## Put a title at the top with drawtext

```sh
ffmpeg -i vertical.mp4 \
  -vf "drawtext=font=Arial:text='Why bread rises':fontsize=72:fontcolor=white:borderw=4:bordercolor=black:x=(w-text_w)/2:y=320" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy titled.mp4
```

| Part | What it does |
|---|---|
| `font=Arial` | the font by name; FFmpeg picks the closest installed font (or give fontfile=/path/to/font.ttf) |
| `x=(w-text_w)/2:y=320` | centred, with its top 32 px below the 288 px the apps cover at the top |
| `borderw=4:bordercolor=black` | a dark outline around each letter |

Result: titled.mp4. Above y = 840 a centred line can be up to 696 px wide on all four apps; this one is about 520.

## Notes

- Text with an apostrophe or a colon is easier in a file: write it to title.txt and use textfile=title.txt instead of text=.
- For a 720 x 1280 video, scale every x by 720/1080 and every y by 1280/1920 (both two thirds): MarginL and MarginR 200, MarginV 467, the title at y = 213.
- The safe zone figures, each with its source, and a checker for any box: [short-form-video-specs](https://github.com/viewgum/short-form-video-specs).

Without FFmpeg: ViewGum's free [Safe zone checker](https://viewgum.com/safe-zones) shows where a frame of yours meets each app's safe zone in your browser, and the video stays on your device.

## Sources

- [FFmpeg filters: subtitles](https://ffmpeg.org/ffmpeg-filters.html#subtitles-1)
- [FFmpeg filters: ass](https://ffmpeg.org/ffmpeg-filters.html#ass)
- [FFmpeg filters: drawtext](https://ffmpeg.org/ffmpeg-filters.html#drawtext-1)
- [Safe zones with sources: short-form-video-specs data/safe-zones.json](https://github.com/viewgum/short-form-video-specs/blob/main/data/safe-zones.json)

Tested: [test.mjs](../test.mjs) runs these 3 commands word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
