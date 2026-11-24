# Speed up or slow down a video with FFmpeg

Change a video's speed with its sound in step: setpts changes the picture's timing and atempo the sound's, without changing the pitch.

You need: `input.mp4` (a video with sound). Change the file names to yours.

## Play 1.5 times as fast

```sh
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]setpts=PTS/1.5[v];[0:a]atempo=1.5[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k faster.mp4
```

| Part | What it does |
|---|---|
| `setpts=PTS/1.5` | each frame shows 1.5 times sooner; for slow motion at half speed use PTS*2 |
| `atempo=1.5` | the sound at 1.5 times the speed, same pitch; for half speed use atempo=0.5 |

Result: faster.mp4, two thirds as long as the input.

## Notes

- atempo takes 0.5 to 100. For a video without sound, drop the [0:a] part and the second -map.
- This assumes the picture and the sound start together, as they do in most files. If the sound starts later, its delay is not sped up with it.

Without FFmpeg: ViewGum's free [Video speed changer](https://viewgum.com/tools/video-speed-changer) speeds a video up or slows it down in your browser, and the video stays on your device.

## Sources

- [FFmpeg filters: setpts](https://ffmpeg.org/ffmpeg-filters.html#setpts_002c-asetpts)
- [FFmpeg filters: atempo](https://ffmpeg.org/ffmpeg-filters.html#atempo)

Tested: [test.mjs](../test.mjs) runs this command word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
