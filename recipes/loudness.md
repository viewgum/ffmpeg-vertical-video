# Normalize audio loudness to a LUFS target with FFmpeg

Set a video's sound to a target loudness, measured in LUFS, with FFmpeg's loudnorm filter (EBU R128). Two passes measure first and then correct; one pass is quicker and less exact. The commands are for a POSIX shell (bash or zsh).

You need: `input.mp4` (a video with sound). Change the file names to yours.

## Two passes

```sh
ffmpeg -i input.mp4 -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2> measure.txt
get() { sed -n "s/.*\"$1\" : \"\(.*\)\".*/\1/p" measure.txt; }
case "$(get input_i)" in ""|*inf*) echo "No loudness measured (silent or no audio); nothing to normalize." >&2; exit 1 ;; esac
ffmpeg -i input.mp4 -c:v copy -c:a aac -b:a 192k -ar 48000 \
  -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
  loud.mp4
```

| Part | What it does |
|---|---|
| `I=-14` | the target integrated loudness in LUFS; loudnorm takes -70 to -5 |
| `TP=-1` | the highest true peak allowed, in dBTP |
| `print_format=json ... 2> measure.txt` | the first pass writes what it measured to measure.txt |
| `get()` | reads one measured value out of measure.txt |
| `case ... *inf*` | stops when the first pass measured nothing, as on a silent track |
| `linear=true` | with the measured values, the second pass applies one gain to the whole track; if that gain would break the peak limit or the range target, loudnorm falls back to adjusting as it goes |
| `-ar 48000` | loudnorm can output 192 kHz; this sets the file back to 48 kHz |

Result: loud.mp4 at -14 LUFS integrated, within half a unit for the test clip.

## One pass, quick

```sh
ffmpeg -i input.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k -ar 48000 loud-quick.mp4
```

| Part | What it does |
|---|---|
| `loudnorm=I=-14:TP=-1:LRA=11` | adjusts the level as it goes, so it lands near the target, not on it |

Result: loud-quick.mp4 near -14 LUFS.

## Measure the loudness

```sh
ffmpeg -nostats -i loud.mp4 -vn -af ebur128=peak=true -f null - 2>&1 | grep -A 13 "Summary:"
```

| Part | What it does |
|---|---|
| `-vn` | skips the picture, which is faster |
| `ebur128=peak=true` | prints the integrated loudness (I), the loudness range (LRA) and the true peak |
| `grep -A 13 "Summary:"` | keeps only the summary at the end, through the Peak line |

Result: A summary whose I: line reads about -14.0 LUFS for loud.mp4, and whose Peak: line gives the true peak.

## Notes

- Pick the target you use for your channel; the commands take any value of I from -70 to -5.

Without FFmpeg: ViewGum's free [Loudness meter](https://viewgum.com/tools/loudness-meter) measures a file's loudness in your browser, and the video stays on your device.

## Sources

- [FFmpeg filters: loudnorm](https://ffmpeg.org/ffmpeg-filters.html#loudnorm)
- [FFmpeg filters: ebur128](https://ffmpeg.org/ffmpeg-filters.html#ebur128-1)
- [EBU R 128 loudness recommendation](https://tech.ebu.ch/publications/r128)

Tested: [test.mjs](../test.mjs) runs these 3 commands word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
