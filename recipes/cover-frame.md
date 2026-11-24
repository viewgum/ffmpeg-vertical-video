# Extract a cover frame or thumbnail from a video with FFmpeg

Save one frame of a video as a picture, for a cover, a thumbnail or a still: at a time you pick, or the frame FFmpeg judges most typical of a run of frames. The picture comes out at the video's own size.

You need: `clip.mp4` (a video). Change the file names to yours.

## The frame at a set time

```sh
ffmpeg -ss 1.5 -i clip.mp4 -frames:v 1 -q:v 2 cover.jpg
```

| Part | What it does |
|---|---|
| `-ss 1.5` | 1.5 seconds in |
| `-frames:v 1` | one frame |
| `-q:v 2` | JPEG quality, 2 (best) to 31 |

Result: cover.jpg, the frame at 1.5 seconds (1080 x 1920 for the test clip).

## The most typical of the first 90 frames

```sh
ffmpeg -i clip.mp4 -vf "thumbnail=90" -frames:v 1 cover-auto.png
```

| Part | What it does |
|---|---|
| `thumbnail=90` | looks at each run of 90 frames (3 seconds at 30 fps, 1.5 at 60) and keeps the one whose colours are closest to the run's average |

Result: cover-auto.png, one frame from the first 90.

Without FFmpeg: ViewGum's free [Video frame extractor](https://viewgum.com/tools/video-frame-extractor) saves frames from a video in your browser, and the video stays on your device.

## Sources

- [FFmpeg filters: thumbnail](https://ffmpeg.org/ffmpeg-filters.html#thumbnail)

Tested: [test.mjs](../test.mjs) runs these 2 commands word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
