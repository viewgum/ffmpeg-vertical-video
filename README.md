# FFmpeg commands for vertical video: TikTok, Reels and Shorts

Tested FFmpeg commands for 9:16 short video: turn a 16:9 video into 9:16, export one file built to the published upload
specs of TikTok, YouTube Shorts, Instagram Reels and Facebook Reels, burn captions inside the safe zone, compress to a file
size, trim, loop, change speed, set the loudness, add music, and more. Each command comes with what every part of it does.
CI runs all 30 commands word for word on generated clips and checks what they made with ffprobe and the decoded pixels.

## Convert 16:9 to 9:16

Crop the middle of the frame:

```sh
ffmpeg -i input.mp4 \
  -vf "crop=ih*9/16:ih,scale=1080:1920,setsar=1" \
  -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p \
  -c:a copy vertical.mp4
```

Or keep the whole picture and fill the rest with a blurred copy of it:

```sh
ffmpeg -i input.mp4 -filter_complex \
  "[0:v]split=2[bg][fg];\
   [bg]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10,scale=1080:1920,setsar=1[bg];\
   [fg]scale=1080:1920:force_original_aspect_ratio=decrease,setsar=1[fg];\
   [bg][fg]overlay=(W-w)/2:(H-h)/2[v]" \
  -map "[v]" -map "0:a?" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy vertical-blur.mp4
```

Off-centre crops, black bars and what each flag does: [Convert a 16:9 video to 9:16](recipes/16x9-to-9x16.md).

## Export settings for TikTok, Reels and Shorts

```sh
ffmpeg -i vertical.mov \
  -vf "bwdif=deint=interlaced,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30" \
  -c:v libx264 -preset slow -crf 20 -profile:v high -pix_fmt yuv420p \
  -g 60 -keyint_min 60 -sc_threshold 0 -maxrate 12M -bufsize 12M \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart -use_editlist 0 short.mp4
```

H.264 High profile, 8-bit 4:2:0, progressive, 30 fps with a keyframe every 2 seconds, the bitrate capped, AAC at 48 kHz in
stereo, the moov atom at the front and no edit lists. It does not change the length, so trim first if an app's limit needs it.
For the test's clip, [shortform-preflight](https://github.com/viewgum/shortform-preflight) passes the result on the API route for all four apps, the route the apps
publish the most rules for. Why each flag: [Export settings](recipes/export-settings.md).

## Captions inside the safe zone

```sh
ffmpeg -i captions.srt captions.ass
sed -e 's/^PlayResX: .*/PlayResX: 1080/' -e 's/^PlayResY: .*/PlayResY: 1920/' captions.ass > captions-1080.ass
ffmpeg -i vertical.mp4 \
  -vf "subtitles=captions-1080.ass:force_style='FontName=Arial,FontSize=64,Bold=1,Alignment=2,MarginL=300,MarginR=300,MarginV=700,Outline=4,Shadow=0'" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy captioned.mp4
```

On a 1080 x 1920 frame the four apps' published safe zones leave clear the area at least 288 px from the top, 672 px from the
bottom, 120 px from the left and 192 px from the right, minus the right 300 px below y = 840. These are the presets in each app's 9:16 ad guidance, the only pixel figures the apps publish; they publish none for regular posts. The margins are
where lines wrap, so keep each cue to one or two short lines. The test finds the burned-in text in the frame and checks it is
inside. Figures and sources: [short-form-video-specs](https://github.com/viewgum/short-form-video-specs). More: [Captions and titles](recipes/captions.md).

## All recipes

| Task | Recipe | In a browser, no install |
|---|---|---|
| Turn a horizontal video into a vertical one | [Convert a 16:9 video to 9:16](recipes/16x9-to-9x16.md) | [Vertical video resizer](https://viewgum.com/tools/vertical-video-resizer) |
| Export one file for every app | [FFmpeg export settings for TikTok, Instagram Reels, YouTube Shorts and Facebook Reels](recipes/export-settings.md) | [Video spec checker](https://viewgum.com/tools/video-spec-checker) |
| Compress to a file size | [Compress a video to a target file size](recipes/compress-to-size.md) | [Video compressor](https://viewgum.com/tools/video-compressor) |
| Cut a clip or trim to a length | [Trim or cut a video](recipes/trim.md) | [Video trimmer](https://viewgum.com/tools/video-trimmer) |
| Change the speed | [Speed up or slow down a video](recipes/speed.md) | [Video speed changer](https://viewgum.com/tools/video-speed-changer) |
| Loop a clip | [Loop a video to a set length](recipes/loop.md) | [Loop video](https://viewgum.com/tools/loop-video) |
| Burn captions or a title into the picture | [Burn captions and text into a vertical video](recipes/captions.md) | [Safe zone checker](https://viewgum.com/safe-zones) |
| Set the loudness (LUFS) | [Normalize audio loudness to a LUFS target](recipes/loudness.md) | [Loudness meter](https://viewgum.com/tools/loudness-meter) |
| Add music under a voice, or remove the sound | [Add background music to a video](recipes/music.md) | [Add music to video](https://viewgum.com/tools/add-music-to-video) |
| Save a frame as a cover image | [Extract a cover frame or thumbnail from a video](recipes/cover-frame.md) | [Video frame extractor](https://viewgum.com/tools/video-frame-extractor) |
| Turn a picture and a sound into a video | [Make a video from an image and audio](recipes/still-image-video.md) | [Audiogram maker](https://viewgum.com/tools/audiogram-maker) |
| Stack two videos, top and bottom | [Stack two videos into a vertical split screen](recipes/split-screen.md) |  |
| Rotate a sideways video | [Rotate a sideways video](recipes/rotate.md) | [Rotate and flip video](https://viewgum.com/tools/rotate-and-flip-video) |
| Join clips end to end | [Join video clips into one](recipes/join-clips.md) | [Merge videos](https://viewgum.com/tools/merge-videos) |
| Convert HDR to SDR | [Convert an HDR iPhone video to SDR](recipes/hdr-to-sdr.md) |  |

## Use it from an AI agent

The same commands are an agent skill, so Claude Code, Codex, Gemini CLI and other agents that read skills use the tested
versions instead of writing their own:

```sh
npx skills add viewgum/ffmpeg-vertical-video
```

In Claude Code, as a plugin:

```sh
claude plugin marketplace add viewgum/ffmpeg-vertical-video
claude plugin install ffmpeg-vertical-video@viewgum-ffmpeg
```

Any chat assistant: paste [skills/ffmpeg-vertical-video/SKILL.md](skills/ffmpeg-vertical-video/SKILL.md) into the chat.

## How the commands are tested

[test.mjs](test.mjs) makes test clips with FFmpeg's own sources, each with a feature its checks can see: a white stripe where
a crop must or must not land, a checkerboard a blur must flatten, an interlaced moving bar that combs unless it is
deinterlaced, a brightness that rises with time to show which second a trim or a cover came from, a square that must stay
square, a dark clip joined to a light one, a voice and a music tone at different pitches. It copies each
recipe's inputs into a fresh folder, runs the recipe's commands exactly as written here and checks the result: size, pixel
shape, length, codecs, frame rate, field order, keyframe spacing, bitrate, file size, loudness, the music level under and after
the voice, where burned-in text lands, colour tags and HDR metadata, and for the export recipe every check of
shortform-preflight. CI runs it on every push on Ubuntu 24.04, whose FFmpeg is 6.1; it has also been run on FFmpeg 7.1. To run
it yourself you need Node 18 or newer and FFmpeg with libx264, libx265, libmp3lame, libass, freetype, fontconfig, harfbuzz
and zimg, as most full builds have:

```sh
node test.mjs
node test.mjs burn-srt export-all-apps   # some snippets only
```

The README, the recipe pages and the skill are written from [recipes.mjs](recipes.mjs) by `node scripts/build.mjs`, so they
show the tested text. To add a recipe: add it there with a check in test.mjs, run the build and the test, and open a pull request.

## Related

- [short-form-video-specs](https://github.com/viewgum/short-form-video-specs): safe zones in pixels, length and caption limits, with sources
- [shortform-preflight](https://github.com/viewgum/shortform-preflight): checks a file against each app's upload limits, as a CLI and a GitHub Action
- [awesome-short-form-video](https://github.com/viewgum/awesome-short-form-video): open tools for making vertical video with code

## License

MIT. See [LICENSE](LICENSE).

Maintained by [ViewGum](https://viewgum.com), which makes the free browser tools in the table above, and finished vertical shorts (script, voice, pictures, captions and sound) if you would rather not edit them yourself.
