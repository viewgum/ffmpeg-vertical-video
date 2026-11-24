# Rotate a sideways video with FFmpeg

Turn a video that plays on its side upright, by rotating the picture itself, so it looks right in every app and editor.

You need: `sideways.mp4` (a video that plays on its side). Change the file names to yours.

## A quarter turn clockwise

```sh
ffmpeg -i sideways.mp4 -vf "transpose=clock" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy upright.mp4
```

| Part | What it does |
|---|---|
| `transpose=clock` | 90 degrees clockwise, so the left edge becomes the top; cclock turns it the other way, and hflip,vflip turns it 180 degrees |

Result: upright.mp4: a 1920 x 1080 input comes out 1080 x 1920, its left side now at the top.

## Notes

- Phones often record upright video as a wide picture plus a rotation tag. FFmpeg applies the tag when it re-encodes, so such a file usually needs no transpose at all.

Without FFmpeg: ViewGum's free [Rotate and flip video](https://viewgum.com/tools/rotate-and-flip-video) rotates and flips a video in your browser, and the video stays on your device.

## Sources

- [FFmpeg filters: transpose](https://ffmpeg.org/ffmpeg-filters.html#transpose-1)

Tested: [test.mjs](../test.mjs) runs this command word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
