# Add background music to a video with FFmpeg

Mix a music track under a video's own sound at a lower level, loop it for the whole length of the picture, and optionally duck it when someone speaks. Or take the sound out altogether.

You need: `vertical.mp4` (a video with a voice), `music.mp3` (a music track), `input.mp4` (for the last command, any video). Change the file names to yours.

## Music under the voice, at a lower level

```sh
len=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 vertical.mp4)
ffmpeg -i vertical.mp4 -stream_loop -1 -i music.mp3 \
  -filter_complex "[0:a]apad[voice];[1:a]volume=0.15[m];[voice][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]" \
  -map 0:v -map "[a]" -t "$len" -c:v copy -c:a aac -b:a 192k with-music.mp4
```

| Part | What it does |
|---|---|
| `-stream_loop -1 -i music.mp3` | repeats the music if it is shorter than the video |
| `apad` | extends the voice with silence, so the music keeps playing after the voice ends |
| `volume=0.15` | the music at 15% (about -16 dB); raise or lower to taste |
| `normalize=0` | keeps the voice at its own level instead of lowering both |
| `len=$(ffprobe ...) and -t "$len"` | ends the file at the picture's length: the padded voice and the looped music never end by themselves, so -shortest would not stop them when the picture is copied |

Result: with-music.mp4, as long as the picture, with the music still playing where the voice has stopped.

## Music that ducks when someone speaks

```sh
len=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 vertical.mp4)
ffmpeg -i vertical.mp4 -stream_loop -1 -i music.mp3 \
  -filter_complex "[0:a]apad,asplit=2[voice][key];[1:a]volume=0.4[m];\
[m][key]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[ducked];\
[voice][ducked]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]" \
  -map 0:v -map "[a]" -t "$len" -c:v copy -c:a aac -b:a 192k ducked.mp4
```

| Part | What it does |
|---|---|
| `asplit=2[voice][key]` | two copies of the voice: one to hear, one to steer the compressor |
| `sidechaincompress=threshold=0.05:ratio=8` | turns the music down while the voice is louder than the threshold |
| `attack=20:release=400` | how fast, in milliseconds, the music dips and comes back |

Result: ducked.mp4, as long as the picture: the music lower under the voice and back up after it.

## Remove the sound

```sh
ffmpeg -i input.mp4 -c:v copy -an silent.mp4
```

| Part | What it does |
|---|---|
| `-an` | no audio stream in the output |
| `-c:v copy` | the picture is copied, not re-encoded |

Result: silent.mp4 with no audio stream.

## Notes

- If ffprobe prints N/A for the length (some MKV and WebM files keep it only for the whole file), read format=duration instead of stream=duration.
- Use music you have the rights to use in the video, including in ads if the video becomes one.

Without FFmpeg: ViewGum's free [Add music to video](https://viewgum.com/tools/add-music-to-video) adds a music track to a video in your browser, and the video stays on your device.

## Sources

- [FFmpeg filters: amix](https://ffmpeg.org/ffmpeg-filters.html#amix)
- [FFmpeg filters: apad](https://ffmpeg.org/ffmpeg-filters.html#apad)
- [FFmpeg filters: sidechaincompress](https://ffmpeg.org/ffmpeg-filters.html#sidechaincompress)

Tested: [test.mjs](../test.mjs) runs these 3 commands word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
