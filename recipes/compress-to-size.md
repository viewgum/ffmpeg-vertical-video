# Compress a video to a target file size with FFmpeg

To get a video under a size limit (for an email, a chat app or an upload form), work out the bitrate the size allows and encode in two passes, which spends that bitrate where the picture needs it. The commands are for a POSIX shell (bash or zsh on macOS and Linux, or WSL and Git Bash on Windows).

You need: `input.mp4` (the video to shrink). Change the file names to yours.

## Two-pass encode to a size in MB

```sh
target_mb=1
seconds=$(ffprobe -v error -show_entries format=duration -of csv=p=0 input.mp4)
video_kbps=$(awk -v mb="$target_mb" -v s="$seconds" 'BEGIN { printf "%d", mb * 8000 * 0.97 / s - 128 }')
if [ "$video_kbps" -lt 150 ]; then echo "Too little bitrate for $seconds s in $target_mb MB: raise target_mb or trim the video." >&2; exit 1; fi
ffmpeg -y -i input.mp4 -c:v libx264 -preset medium -b:v "${video_kbps}k" -pix_fmt yuv420p -pass 1 -passlogfile small -an -f mp4 /dev/null
ffmpeg -i input.mp4 -c:v libx264 -preset medium -b:v "${video_kbps}k" -pix_fmt yuv420p -pass 2 -passlogfile small \
  -c:a aac -b:a 128k -movflags +faststart small.mp4
```

| Part | What it does |
|---|---|
| `mb * 8000 / s` | megabytes to kilobits a second over the video's length (1 MB = 8,000 kilobits) |
| `* 0.97` | leaves about 3% for the MP4 container |
| `- 128` | what is left after 128 kbps of audio |
| `-lt 150` | stops before encoding when the size leaves almost nothing for the picture |
| `-pix_fmt yuv420p (both passes)` | the same 8-bit format in both passes; x264 refuses a second pass whose format differs from the first, which a 10-bit phone video would otherwise cause |
| `-passlogfile small` | names the first pass's notes small-0.log, so two jobs in one folder do not mix them up |
| `-pass 1 -an -f mp4 /dev/null` | the first pass only measures and writes no video |

Result: small.mp4, under 1 MB (1,000,000 bytes) for the test's 4-second 10-bit clip. Set target_mb to your limit.

## Notes

- If the picture is poor at that size, shorten the video or scale it down in both passes (add `-vf scale=720:-2` to each).
- Two-pass leaves small-0.log and small-0.log.mbtree next to the video; delete them afterwards.

Without FFmpeg: ViewGum's free [Video compressor](https://viewgum.com/tools/video-compressor) compresses a video to a size you pick in your browser, and the video stays on your device.

## Sources

- [FFmpeg H.264 encoding guide: two-pass](https://trac.ffmpeg.org/wiki/Encode/H.264#twopass)
- [FFmpeg documentation: -pass and -passlogfile](https://ffmpeg.org/ffmpeg.html#Video-Options)

Tested: [test.mjs](../test.mjs) runs this command word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
