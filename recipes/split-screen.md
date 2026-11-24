# Stack two videos into a vertical split screen with FFmpeg

Put two videos one above the other in a 1080 x 1920 frame, each cropped to fill its half: a reaction over a clip, a before and after, gameplay under a talking head.

You need: `top.mp4` (the upper video, with the sound you keep), `bottom.mp4` (the lower video). Change the file names to yours.

## Top and bottom halves

```sh
ffmpeg -i top.mp4 -i bottom.mp4 -filter_complex \
  "[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[t];\
   [1:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[b];\
   [t][b]vstack=inputs=2:shortest=1[v]" \
  -map "[v]" -map "0:a?" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest stacked.mp4
```

| Part | What it does |
|---|---|
| `scale=1080:960:...increase,crop=1080:960` | each video fills a 1080 x 960 half, cropped to fit |
| `vstack=inputs=2:shortest=1` | one above the other, ending when the shorter video ends (without shortest=1 the shorter one freezes on its last frame) |
| `-map "0:a?"` | the top video's sound, if it has any |
| `-shortest` | cuts the sound to the picture's length |

Result: stacked.mp4, 1080 x 1920, as long as the shorter video.

## Notes

- For side by side halves, use 540 x 1920 halves and hstack.

## Sources

- [FFmpeg filters: vstack](https://ffmpeg.org/ffmpeg-filters.html#vstack)

Tested: [test.mjs](../test.mjs) runs this command word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
