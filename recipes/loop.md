# Loop a video to a set length with FFmpeg

Repeat a short clip until it reaches a length, for a background, a seamless loop or a video that needs a minimum length.

You need: `clip.mp4` (a short clip). Change the file names to yours.

## Loop to 10 seconds

```sh
ffmpeg -stream_loop -1 -i clip.mp4 -t 10 \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k looped.mp4
```

| Part | What it does |
|---|---|
| `-stream_loop -1 (before -i)` | repeat the input without end; -stream_loop 3 would play it four times |
| `-t 10` | stop at ten seconds |

Result: looped.mp4, ten seconds long.

Without FFmpeg: ViewGum's free [Loop video](https://viewgum.com/tools/loop-video) loops a clip in your browser, and the video stays on your device.

## Sources

- [FFmpeg documentation: -stream_loop](https://ffmpeg.org/ffmpeg.html#Main-options)

Tested: [test.mjs](../test.mjs) runs this command word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
