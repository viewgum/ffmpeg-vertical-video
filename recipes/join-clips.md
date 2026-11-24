# Join video clips into one with FFmpeg

Put clips end to end in one video. The concat filter re-encodes, so it joins clips with different settings once they are the same size; the concat demuxer copies, so it is instant but needs clips made the same way.

You need: `part1.mp4` (the first clip), `part2.mp4` (the second clip). Change the file names to yours.

## Join and re-encode

```sh
ffmpeg -i part1.mp4 -i part2.mp4 \
  -filter_complex "[0:v]setsar=1[v0];[1:v]setsar=1[v1];[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k joined.mp4
```

| Part | What it does |
|---|---|
| `concat=n=2:v=1:a=1` | two parts, each with one video and one audio stream |
| `setsar=1` | the parts must have the same size and pixel shape; scale them first if they differ |

Result: joined.mp4: part1, then part2, as long as both together.

## Join without re-encoding

```sh
printf "file '%s'\n" part1.mp4 part2.mp4 > parts.txt
ffmpeg -f concat -safe 0 -i parts.txt -c copy joined-fast.mp4
```

| Part | What it does |
|---|---|
| `parts.txt` | one line per clip, in order. A name with an apostrophe in it must be written as '\'' inside the quotes, for example file 'Sam'\''s clip.mp4' |
| `-f concat -safe 0` | the concat demuxer; -safe 0 also allows absolute paths |

Result: joined-fast.mp4: part1, then part2; only for clips with the same codecs and settings.

Without FFmpeg: ViewGum's free [Merge videos](https://viewgum.com/tools/merge-videos) joins clips into one video in your browser, and the video stays on your device.

## Sources

- [FFmpeg filters: concat](https://ffmpeg.org/ffmpeg-filters.html#concat)
- [FFmpeg formats: concat demuxer](https://ffmpeg.org/ffmpeg-formats.html#concat-1)

Tested: [test.mjs](../test.mjs) runs these 2 commands word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
