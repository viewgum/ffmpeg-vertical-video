# FFmpeg export settings for TikTok, Instagram Reels, YouTube Shorts and Facebook Reels

One FFmpeg command that turns a vertical video (an iPhone .mov, a screen recording, an editor's export) into an MP4 built to the published upload specs of TikTok, YouTube Shorts, Instagram Reels and Facebook Reels at once: H.264 High profile, 8-bit 4:2:0, progressive, 30 fps with a keyframe every 2 seconds, AAC at 48 kHz in stereo, the moov atom at the front and no edit lists. Length is the one thing it cannot fix: Facebook's Reels API takes 3 to 90 seconds and YouTube Shorts up to 3 minutes, so trim first if you need to.

You need: `vertical.mov` (a vertical video in any format). Change the file names to yours.

## Export for every app

```sh
ffmpeg -i vertical.mov \
  -vf "bwdif=deint=interlaced,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30" \
  -c:v libx264 -preset slow -crf 20 -profile:v high -pix_fmt yuv420p \
  -g 60 -keyint_min 60 -sc_threshold 0 -maxrate 12M -bufsize 12M \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart -use_editlist 0 short.mp4
```

| Part | What it does |
|---|---|
| `bwdif=deint=interlaced` | deinterlaces only frames marked interlaced; progressive video passes through untouched |
| `scale=...,pad=...` | 1080 x 1920; a file that is already that size passes through unchanged |
| `fps=30` | 30 frames a second: Instagram's help page says reels should have at least 30, and the TikTok, Instagram and Facebook APIs take 23 or 24 up to 60 |
| `-profile:v high -pix_fmt yuv420p` | H.264 High profile at 8-bit 4:2:0: YouTube recommends both, Instagram's API requires 4:2:0 |
| `-g 60 -keyint_min 60 -sc_threshold 0` | a keyframe every 60 frames, so every GOP is 2 seconds, with no extra keyframes at scene changes; x264's GOPs are closed by default. Facebook's Reels page asks for closed GOPs of 2 to 5 seconds and Instagram's Reels API for closed GOPs |
| `-maxrate 12M -bufsize 12M` | caps the video bitrate: no stretch of a second or more can go over 24 Mbps (12 for the rate plus 12 for the buffer), under the 25 Mbps maximum Instagram's Reels API lists; a larger buffer would let short bursts through |
| `-c:a aac -ar 48000 -ac 2` | AAC-LC at 48 kHz in stereo, as YouTube, Instagram's API and Facebook's Reels API list (TikTok names no audio format) |
| `-b:a 192k` | Facebook's Reels API asks for 128 kbps or more and YouTube recommends 384 kbps for stereo, so raise it for music |
| `-movflags +faststart` | puts the moov atom at the front of the file |
| `-use_editlist 0` | leaves out MP4 edit lists: Instagram's Reels specs say no edit lists |

Result: short.mp4. For the test's 6-second interlaced clip with sound it comes out progressive, with a keyframe every 2 seconds, no one-second stretch of the video over 25 Mbps, and it passes every check of shortform-preflight on the API route for all four apps. A source with no sound gives a file with no audio track, and silent audio encodes far below 192 kbps; check your own file before you post it.

## Look at what a file is

```sh
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,profile,width,height,pix_fmt,field_order,r_frame_rate \
  -of default=noprint_wrappers=1 short.mp4
```

| Part | What it does |
|---|---|
| `-select_streams v:0` | the first video stream |
| `-show_entries stream=...` | the video fields that most often cause a rejected upload; it does not show length, sound, size or the MP4 layout |

Result: codec_name=h264, profile=High, width=1080, height=1920, pix_fmt=yuv420p, field_order=progressive and r_frame_rate=30/1 for the file above.

## Notes

- For a full check against each app's published limits, with the quoted source of each figure, run [shortform-preflight](https://github.com/viewgum/shortform-preflight): `npx github:viewgum/shortform-preflight short.mp4 --route api`. The API route is the one the apps publish the most rules for.
- HEVC (H.265) input from a phone works the same way; the output is H.264. An HDR phone video needs the HDR to SDR recipe first, or it can look washed out.

Without FFmpeg: ViewGum's free [Video spec checker](https://viewgum.com/tools/video-spec-checker) checks a finished file against each app's published specs in your browser, and the video stays on your device.

## Sources

- [The upload specs and their quotes: shortform-preflight data/upload-specs.json](https://github.com/viewgum/shortform-preflight/blob/main/data/upload-specs.json)
- [YouTube recommended upload encoding settings](https://support.google.com/youtube/answer/1722171)
- [FFmpeg filters: bwdif](https://ffmpeg.org/ffmpeg-filters.html#bwdif)
- [FFmpeg H.264 encoding guide (CRF, presets, VBV)](https://trac.ffmpeg.org/wiki/Encode/H.264)

Tested: [test.mjs](../test.mjs) runs these 2 commands word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
