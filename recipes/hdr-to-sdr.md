# Convert an HDR iPhone video to SDR with FFmpeg

An HDR video (an iPhone's HLG recording, or HDR10) can look grey and washed out after an upload or an edit that expects SDR. This converts it to standard BT.709 colour with tone mapping and drops the HDR metadata.

You need: `hdr.mov` (an HDR video, such as an iPhone recording with HDR on). Change the file names to yours.

## Check what the video is

```sh
ffprobe -v error -select_streams v:0 \
  -show_entries stream=color_transfer,color_primaries,color_space -of default=noprint_wrappers=1 hdr.mov
```

| Part | What it does |
|---|---|
| `color_transfer` | arib-std-b67 is HLG and smpte2084 is PQ (HDR10); bt709 is already SDR |
| `color_space` | the matrix, usually bt2020nc for HDR |

Result: color_transfer, color_primaries and color_space of the video (smpte2084, bt2020 and bt2020nc for the test clip).

## HDR (HLG or PQ) to SDR

```sh
ffmpeg -i hdr.mov \
  -vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,sidedata=delete:type=MASTERING_DISPLAY_METADATA,sidedata=delete:type=CONTENT_LIGHT_LEVEL" \
  -c:v libx264 -crf 20 -preset medium -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a copy sdr.mp4
```

| Part | What it does |
|---|---|
| `zscale=t=linear:npl=100` | undoes the HDR transfer curve into linear light (needs FFmpeg built with zimg) |
| `zscale=p=bt709` | converts the BT.2020 colours to BT.709 |
| `tonemap=hable:desat=0` | squeezes the bright range into SDR; hable keeps highlights soft (also try mobius or reinhard) |
| `zscale=t=bt709:m=bt709:r=tv,format=yuv420p` | SDR transfer, matrix and range, 8-bit 4:2:0 |
| `sidedata=delete:type=...` | drops the HDR mastering and light-level metadata, which no longer describes the picture |
| `-color_primaries bt709 -color_trc bt709 -colorspace bt709` | tags the output as SDR |

Result: sdr.mp4, H.264, 8-bit 4:2:0, tagged BT.709, with no HDR metadata left.

## Notes

- If the probe shows no color_space (unknown), the first zscale cannot tell how to read the colours: add min=bt2020nc to it (zscale=t=linear:npl=100:min=bt2020nc) when you know the video is BT.2020.

## Sources

- [FFmpeg filters: zscale](https://ffmpeg.org/ffmpeg-filters.html#zscale)
- [FFmpeg filters: tonemap](https://ffmpeg.org/ffmpeg-filters.html#tonemap-1)
- [FFmpeg filters: sidedata](https://ffmpeg.org/ffmpeg-filters.html#sidedata_002c-asidedata)

Tested: [test.mjs](../test.mjs) runs these 2 commands word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
