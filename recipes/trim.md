# Trim or cut a video with FFmpeg

Cut a part out of a longer video, or trim it under an app's length limit. Re-encoding cuts on the exact frame; copying the streams is instant but can only start on a keyframe.

You need: `input.mp4` (a video longer than the clip you want). Change the file names to yours.

## Cut on the exact frame

```sh
ffmpeg -ss 00:00:01 -i input.mp4 -t 2 \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k clip.mp4
```

| Part | What it does |
|---|---|
| `-ss 00:00:01 (before -i)` | start one second in; before the input it seeks fast and, with re-encoding, still lands on the exact frame |
| `-t 2` | keep two seconds. This is a length: to end at 3 seconds into the source, give -t as the end minus the start |

Result: clip.mp4, two seconds long, whose first frame is the source's frame at one second.

## Cut without re-encoding

```sh
ffmpeg -ss 00:00:01 -i input.mp4 -t 2 -c copy -avoid_negative_ts make_zero clip-fast.mp4
```

| Part | What it does |
|---|---|
| `-c copy` | no re-encoding, so it is instant and lossless, but the clip starts at the last keyframe at or before 00:00:01, so it can begin earlier and run longer than asked |
| `-avoid_negative_ts make_zero` | starts the timestamps at zero, which some players need |

Result: clip-fast.mp4, about two seconds; how much earlier it starts depends on where the source's keyframes are.

## Notes

- Length limits differ by app and by how you upload: [short-form-video-specs](https://github.com/viewgum/short-form-video-specs) lists them with their sources.

Without FFmpeg: ViewGum's free [Video trimmer](https://viewgum.com/tools/video-trimmer) trims a video in your browser, and the video stays on your device.

## Sources

- [FFmpeg documentation: main options (-ss, -t)](https://ffmpeg.org/ffmpeg.html#Main-options)

Tested: [test.mjs](../test.mjs) runs these 2 commands word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
