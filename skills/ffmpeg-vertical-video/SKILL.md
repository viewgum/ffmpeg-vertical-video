---
name: ffmpeg-vertical-video
description: Use when the user wants an FFmpeg command for vertical (9:16) short video for TikTok, Instagram Reels, YouTube Shorts or Facebook Reels, such as turning 16:9 into 9:16, export settings built to the apps' published upload specs, burning captions or a title inside the safe zone, compressing to a file size, trimming, looping, changing speed, setting loudness in LUFS, adding music, saving a cover frame, a split screen, rotating, joining clips or HDR to SDR. Gives tested commands and what each part does.
---

# FFmpeg commands for vertical video

Every command in a code block under Commands runs in CI on generated clips and its result is checked (https://github.com/viewgum/ffmpeg-vertical-video). Use them as written: change the file
names, and only the values the notes say can change. Quote filter graphs and `-map "0:a?"` as shown, since some shells read
`?` and `[` as wildcards.

## Workflow

1. Find the task below. If FFmpeg is not installed, say so and point to the install page (https://ffmpeg.org/download.html).
2. Ask only for what the command needs: the file names, and for some the target (a size, a length, a loudness).
3. Run or give the command. Explain any part the user asks about from the table under it.
4. Check the result with `ffprobe` (the command under Export settings). For a file to upload, suggest
   `npx github:viewgum/shortform-preflight <file> --route api`, which checks it against each app's published limits (https://github.com/viewgum/shortform-preflight).
5. For text in the picture, keep it inside the safe zone: on 1080 x 1920, at least 288 px from the top, 672 px from the bottom,
   120 px from the left and 192 px from the right, and out of the right 300 px below y = 840, on all four apps at once
   (figures and sources: https://github.com/viewgum/short-form-video-specs). These are the presets in each app's 9:16 ad guidance, the only pixel figures the apps publish; they publish none for regular posts.
6. Before the user posts a file, have them check it: the commands keep the source's length, and an app's limits can change.

## Commands

### Turn a horizontal video into a vertical one

Needs: `input.mp4` (a wide (16:9) video), `anamorphic.mp4` (for the last command, a video with non-square pixels).

Crop the middle:

```sh
ffmpeg -i input.mp4 \
  -vf "crop=ih*9/16:ih,scale=1080:1920,setsar=1" \
  -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p \
  -c:a copy vertical.mp4
```

- `crop=ih*9/16:ih`: a box as tall as the video and 9/16 of its height wide; with no x and y it is centred
- `scale=1080:1920`: scale that box to the full vertical frame
- `setsar=1`: marks the pixels square
- `-crf 20 -preset medium`: x264 quality and speed; a lower CRF is higher quality and a bigger file
- `-pix_fmt yuv420p`: 8-bit 4:2:0, which every player and app reads
- `-c:a copy`: keep the sound as it is
- Result: vertical.mp4, 1080 x 1920, the middle of the picture, as long as the input.

Crop off-centre, when the subject is not in the middle:

```sh
ffmpeg -i input.mp4 \
  -vf "crop=ih*9/16:ih:(iw-ow)*0.25:0,scale=1080:1920,setsar=1" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy vertical-left.mp4
```

- `(iw-ow)*0.25`: the crop's left edge: 0 is the far left, 0.5 the middle, 1 the far right
- `:0`: start at the top
- Result: vertical-left.mp4, 1080 x 1920, cut from the left part of the frame.

Fit the whole frame over a blurred background:

```sh
ffmpeg -i input.mp4 -filter_complex \
  "[0:v]split=2[bg][fg];\
   [bg]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10,scale=1080:1920,setsar=1[bg];\
   [fg]scale=1080:1920:force_original_aspect_ratio=decrease,setsar=1[fg];\
   [bg][fg]overlay=(W-w)/2:(H-h)/2[v]" \
  -map "[v]" -map "0:a?" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy vertical-blur.mp4
```

- `split=2[bg][fg]`: two copies of the picture: one for the background, one for the front
- `scale=270:480:...,crop=270:480,boxblur=10,scale=1080:1920`: fill the frame, blur it small and scale it back up; blurring at a quarter of the size is much faster and looks the same
- `force_original_aspect_ratio=decrease`: the front copy fits inside 1080 x 1920 without being stretched
- `overlay=(W-w)/2:(H-h)/2`: centre the front copy on the background
- `-map "0:a?"`: keep the sound if there is any (quoted, because some shells read ? as a wildcard)
- Result: vertical-blur.mp4, 1080 x 1920: the whole wide picture in the middle, a blurred copy above and below.

Fit the whole frame between black bars:

```sh
ffmpeg -i input.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy vertical-bars.mp4
```

- `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`: grow the canvas to 1080 x 1920 and centre the picture on black
- Result: vertical-bars.mp4, 1080 x 1920 with black above and below the picture.

Non-square pixels first (DV, broadcast and some camera files):

```sh
ffmpeg -i anamorphic.mp4 \
  -vf "scale=trunc(iw*sar/2)*2:ih,setsar=1,crop=ih*9/16:ih,scale=1080:1920,setsar=1" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy vertical-square.mp4
```

- `scale=trunc(iw*sar/2)*2:ih,setsar=1`: stretches the stored width to the width the video is shown at, so every pixel is square before the crop
- Result: vertical-square.mp4, 1080 x 1920, with shapes as they looked in the original. The commands above assume square pixels, as phone videos, screen recordings and most editors' exports have; ffprobe shows sample_aspect_ratio=1:1 for those.

Note: A square (1:1) or 4:5 video works with the same commands.

Note: Keep text out of the parts each app covers with its buttons and captions: [short-form-video-specs](https://github.com/viewgum/short-form-video-specs) has the safe zones in pixels.

### Export one file for every app

Needs: `vertical.mov` (a vertical video in any format).

Export for every app:

```sh
ffmpeg -i vertical.mov \
  -vf "bwdif=deint=interlaced,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30" \
  -c:v libx264 -preset slow -crf 20 -profile:v high -pix_fmt yuv420p \
  -g 60 -keyint_min 60 -sc_threshold 0 -maxrate 12M -bufsize 12M \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart -use_editlist 0 short.mp4
```

- `bwdif=deint=interlaced`: deinterlaces only frames marked interlaced; progressive video passes through untouched
- `scale=...,pad=...`: 1080 x 1920; a file that is already that size passes through unchanged
- `fps=30`: 30 frames a second: Instagram's help page says reels should have at least 30, and the TikTok, Instagram and Facebook APIs take 23 or 24 up to 60
- `-profile:v high -pix_fmt yuv420p`: H.264 High profile at 8-bit 4:2:0: YouTube recommends both, Instagram's API requires 4:2:0
- `-g 60 -keyint_min 60 -sc_threshold 0`: a keyframe every 60 frames, so every GOP is 2 seconds, with no extra keyframes at scene changes; x264's GOPs are closed by default. Facebook's Reels page asks for closed GOPs of 2 to 5 seconds and Instagram's Reels API for closed GOPs
- `-maxrate 12M -bufsize 12M`: caps the video bitrate: no stretch of a second or more can go over 24 Mbps (12 for the rate plus 12 for the buffer), under the 25 Mbps maximum Instagram's Reels API lists; a larger buffer would let short bursts through
- `-c:a aac -ar 48000 -ac 2`: AAC-LC at 48 kHz in stereo, as YouTube, Instagram's API and Facebook's Reels API list (TikTok names no audio format)
- `-b:a 192k`: Facebook's Reels API asks for 128 kbps or more and YouTube recommends 384 kbps for stereo, so raise it for music
- `-movflags +faststart`: puts the moov atom at the front of the file
- `-use_editlist 0`: leaves out MP4 edit lists: Instagram's Reels specs say no edit lists
- Result: short.mp4. For the test's 6-second interlaced clip with sound it comes out progressive, with a keyframe every 2 seconds, no one-second stretch of the video over 25 Mbps, and it passes every check of shortform-preflight on the API route for all four apps. A source with no sound gives a file with no audio track, and silent audio encodes far below 192 kbps; check your own file before you post it.

Look at what a file is:

```sh
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,profile,width,height,pix_fmt,field_order,r_frame_rate \
  -of default=noprint_wrappers=1 short.mp4
```

- `-select_streams v:0`: the first video stream
- `-show_entries stream=...`: the video fields that most often cause a rejected upload; it does not show length, sound, size or the MP4 layout
- Result: codec_name=h264, profile=High, width=1080, height=1920, pix_fmt=yuv420p, field_order=progressive and r_frame_rate=30/1 for the file above.

Note: For a full check against each app's published limits, with the quoted source of each figure, run [shortform-preflight](https://github.com/viewgum/shortform-preflight): `npx github:viewgum/shortform-preflight short.mp4 --route api`. The API route is the one the apps publish the most rules for.

Note: HEVC (H.265) input from a phone works the same way; the output is H.264. An HDR phone video needs the HDR to SDR recipe first, or it can look washed out.

### Compress to a file size

Needs: `input.mp4` (the video to shrink).

Two-pass encode to a size in MB:

```sh
target_mb=1
seconds=$(ffprobe -v error -show_entries format=duration -of csv=p=0 input.mp4)
video_kbps=$(awk -v mb="$target_mb" -v s="$seconds" 'BEGIN { printf "%d", mb * 8000 * 0.97 / s - 128 }')
if [ "$video_kbps" -lt 150 ]; then echo "Too little bitrate for $seconds s in $target_mb MB: raise target_mb or trim the video." >&2; exit 1; fi
ffmpeg -y -i input.mp4 -c:v libx264 -preset medium -b:v "${video_kbps}k" -pix_fmt yuv420p -pass 1 -passlogfile small -an -f mp4 /dev/null
ffmpeg -i input.mp4 -c:v libx264 -preset medium -b:v "${video_kbps}k" -pix_fmt yuv420p -pass 2 -passlogfile small \
  -c:a aac -b:a 128k -movflags +faststart small.mp4
```

- `mb * 8000 / s`: megabytes to kilobits a second over the video's length (1 MB = 8,000 kilobits)
- `* 0.97`: leaves about 3% for the MP4 container
- `- 128`: what is left after 128 kbps of audio
- `-lt 150`: stops before encoding when the size leaves almost nothing for the picture
- `-pix_fmt yuv420p (both passes)`: the same 8-bit format in both passes; x264 refuses a second pass whose format differs from the first, which a 10-bit phone video would otherwise cause
- `-passlogfile small`: names the first pass's notes small-0.log, so two jobs in one folder do not mix them up
- `-pass 1 -an -f mp4 /dev/null`: the first pass only measures and writes no video
- Result: small.mp4, under 1 MB (1,000,000 bytes) for the test's 4-second 10-bit clip. Set target_mb to your limit.

Note: If the picture is poor at that size, shorten the video or scale it down in both passes (add `-vf scale=720:-2` to each).

Note: Two-pass leaves small-0.log and small-0.log.mbtree next to the video; delete them afterwards.

### Cut a clip or trim to a length

Needs: `input.mp4` (a video longer than the clip you want).

Cut on the exact frame:

```sh
ffmpeg -ss 00:00:01 -i input.mp4 -t 2 \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k clip.mp4
```

- `-ss 00:00:01 (before -i)`: start one second in; before the input it seeks fast and, with re-encoding, still lands on the exact frame
- `-t 2`: keep two seconds. This is a length: to end at 3 seconds into the source, give -t as the end minus the start
- Result: clip.mp4, two seconds long, whose first frame is the source's frame at one second.

Cut without re-encoding:

```sh
ffmpeg -ss 00:00:01 -i input.mp4 -t 2 -c copy -avoid_negative_ts make_zero clip-fast.mp4
```

- `-c copy`: no re-encoding, so it is instant and lossless, but the clip starts at the last keyframe at or before 00:00:01, so it can begin earlier and run longer than asked
- `-avoid_negative_ts make_zero`: starts the timestamps at zero, which some players need
- Result: clip-fast.mp4, about two seconds; how much earlier it starts depends on where the source's keyframes are.

Note: Length limits differ by app and by how you upload: [short-form-video-specs](https://github.com/viewgum/short-form-video-specs) lists them with their sources.

### Change the speed

Needs: `input.mp4` (a video with sound).

Play 1.5 times as fast:

```sh
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]setpts=PTS/1.5[v];[0:a]atempo=1.5[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k faster.mp4
```

- `setpts=PTS/1.5`: each frame shows 1.5 times sooner; for slow motion at half speed use PTS*2
- `atempo=1.5`: the sound at 1.5 times the speed, same pitch; for half speed use atempo=0.5
- Result: faster.mp4, two thirds as long as the input.

Note: atempo takes 0.5 to 100. For a video without sound, drop the [0:a] part and the second -map.

Note: This assumes the picture and the sound start together, as they do in most files. If the sound starts later, its delay is not sped up with it.

### Loop a clip

Needs: `clip.mp4` (a short clip).

Loop to 10 seconds:

```sh
ffmpeg -stream_loop -1 -i clip.mp4 -t 10 \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k looped.mp4
```

- `-stream_loop -1 (before -i)`: repeat the input without end; -stream_loop 3 would play it four times
- `-t 10`: stop at ten seconds
- Result: looped.mp4, ten seconds long.

### Burn captions or a title into the picture

Needs: `vertical.mp4` (a 1080 x 1920 video), `captions.srt` (subtitles in SRT), `captions-1080x1920.ass` (or an ASS file sized for 1080 x 1920).

Burn an SRT file inside the safe zone:

```sh
ffmpeg -i captions.srt captions.ass
sed -e 's/^PlayResX: .*/PlayResX: 1080/' -e 's/^PlayResY: .*/PlayResY: 1920/' captions.ass > captions-1080.ass
ffmpeg -i vertical.mp4 \
  -vf "subtitles=captions-1080.ass:force_style='FontName=Arial,FontSize=64,Bold=1,Alignment=2,MarginL=300,MarginR=300,MarginV=700,Outline=4,Shadow=0'" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy captioned.mp4
```

- `ffmpeg -i captions.srt captions.ass`: converts the SRT to an ASS script, which FFmpeg sizes for a 384 x 288 canvas
- `sed ... PlayResX: 1080 ... PlayResY: 1920`: sets that canvas to the video's size, so every number below is a pixel
- `Alignment=2`: bottom centre
- `MarginV=700`: the lowest line ends about 700 px above the bottom edge (y = 1220), clear of the 672 px the apps cover at the bottom
- `MarginL=300,MarginR=300`: lines wrap between x = 300 and x = 780, the widest centred box that low on the frame on all four apps
- `Outline=4,Shadow=0`: a 4 px dark outline keeps white text readable on any picture
- Result: captioned.mp4. The margins are where lines wrap, not a wall: a single word wider than 480 px, a cue of many lines, or a cue with its own position tag can still reach outside. Keep each cue to one or two short lines; for the test's two cues every pixel of text lands between x 300 and 780 and above y 1248.

Burn an ASS file made for 1080 x 1920:

```sh
ffmpeg -i vertical.mp4 -vf "ass=captions-1080x1920.ass" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy captioned-ass.mp4
```

- `ass=...`: renders an ASS file as it is, with its own fonts, sizes, colours and positions
- Result: captioned-ass.mp4, with the captions where the ASS file puts them.

Put a title at the top with drawtext:

```sh
ffmpeg -i vertical.mp4 \
  -vf "drawtext=font=Arial:text='Why bread rises':fontsize=72:fontcolor=white:borderw=4:bordercolor=black:x=(w-text_w)/2:y=320" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy titled.mp4
```

- `font=Arial`: the font by name; FFmpeg picks the closest installed font (or give fontfile=/path/to/font.ttf)
- `x=(w-text_w)/2:y=320`: centred, with its top 32 px below the 288 px the apps cover at the top
- `borderw=4:bordercolor=black`: a dark outline around each letter
- Result: titled.mp4. Above y = 840 a centred line can be up to 696 px wide on all four apps; this one is about 520.

Note: Text with an apostrophe or a colon is easier in a file: write it to title.txt and use textfile=title.txt instead of text=.

Note: For a 720 x 1280 video, scale every x by 720/1080 and every y by 1280/1920 (both two thirds): MarginL and MarginR 200, MarginV 467, the title at y = 213.

Note: The safe zone figures, each with its source, and a checker for any box: [short-form-video-specs](https://github.com/viewgum/short-form-video-specs).

### Set the loudness (LUFS)

Needs: `input.mp4` (a video with sound).

Two passes:

```sh
ffmpeg -i input.mp4 -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2> measure.txt
get() { sed -n "s/.*\"$1\" : \"\(.*\)\".*/\1/p" measure.txt; }
case "$(get input_i)" in ""|*inf*) echo "No loudness measured (silent or no audio); nothing to normalize." >&2; exit 1 ;; esac
ffmpeg -i input.mp4 -c:v copy -c:a aac -b:a 192k -ar 48000 \
  -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
  loud.mp4
```

- `I=-14`: the target integrated loudness in LUFS; loudnorm takes -70 to -5
- `TP=-1`: the highest true peak allowed, in dBTP
- `print_format=json ... 2> measure.txt`: the first pass writes what it measured to measure.txt
- `get()`: reads one measured value out of measure.txt
- `case ... *inf*`: stops when the first pass measured nothing, as on a silent track
- `linear=true`: with the measured values, the second pass applies one gain to the whole track; if that gain would break the peak limit or the range target, loudnorm falls back to adjusting as it goes
- `-ar 48000`: loudnorm can output 192 kHz; this sets the file back to 48 kHz
- Result: loud.mp4 at -14 LUFS integrated, within half a unit for the test clip.

One pass, quick:

```sh
ffmpeg -i input.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k -ar 48000 loud-quick.mp4
```

- `loudnorm=I=-14:TP=-1:LRA=11`: adjusts the level as it goes, so it lands near the target, not on it
- Result: loud-quick.mp4 near -14 LUFS.

Measure the loudness:

```sh
ffmpeg -nostats -i loud.mp4 -vn -af ebur128=peak=true -f null - 2>&1 | grep -A 13 "Summary:"
```

- `-vn`: skips the picture, which is faster
- `ebur128=peak=true`: prints the integrated loudness (I), the loudness range (LRA) and the true peak
- `grep -A 13 "Summary:"`: keeps only the summary at the end, through the Peak line
- Result: A summary whose I: line reads about -14.0 LUFS for loud.mp4, and whose Peak: line gives the true peak.

Note: Pick the target you use for your channel; the commands take any value of I from -70 to -5.

### Add music under a voice, or remove the sound

Needs: `vertical.mp4` (a video with a voice), `music.mp3` (a music track), `input.mp4` (for the last command, any video).

Music under the voice, at a lower level:

```sh
len=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 vertical.mp4)
ffmpeg -i vertical.mp4 -stream_loop -1 -i music.mp3 \
  -filter_complex "[0:a]apad[voice];[1:a]volume=0.15[m];[voice][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]" \
  -map 0:v -map "[a]" -t "$len" -c:v copy -c:a aac -b:a 192k with-music.mp4
```

- `-stream_loop -1 -i music.mp3`: repeats the music if it is shorter than the video
- `apad`: extends the voice with silence, so the music keeps playing after the voice ends
- `volume=0.15`: the music at 15% (about -16 dB); raise or lower to taste
- `normalize=0`: keeps the voice at its own level instead of lowering both
- `len=$(ffprobe ...) and -t "$len"`: ends the file at the picture's length: the padded voice and the looped music never end by themselves, so -shortest would not stop them when the picture is copied
- Result: with-music.mp4, as long as the picture, with the music still playing where the voice has stopped.

Music that ducks when someone speaks:

```sh
len=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 vertical.mp4)
ffmpeg -i vertical.mp4 -stream_loop -1 -i music.mp3 \
  -filter_complex "[0:a]apad,asplit=2[voice][key];[1:a]volume=0.4[m];\
[m][key]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[ducked];\
[voice][ducked]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]" \
  -map 0:v -map "[a]" -t "$len" -c:v copy -c:a aac -b:a 192k ducked.mp4
```

- `asplit=2[voice][key]`: two copies of the voice: one to hear, one to steer the compressor
- `sidechaincompress=threshold=0.05:ratio=8`: turns the music down while the voice is louder than the threshold
- `attack=20:release=400`: how fast, in milliseconds, the music dips and comes back
- Result: ducked.mp4, as long as the picture: the music lower under the voice and back up after it.

Remove the sound:

```sh
ffmpeg -i input.mp4 -c:v copy -an silent.mp4
```

- `-an`: no audio stream in the output
- `-c:v copy`: the picture is copied, not re-encoded
- Result: silent.mp4 with no audio stream.

Note: If ffprobe prints N/A for the length (some MKV and WebM files keep it only for the whole file), read format=duration instead of stream=duration.

Note: Use music you have the rights to use in the video, including in ads if the video becomes one.

### Save a frame as a cover image

Needs: `clip.mp4` (a video).

The frame at a set time:

```sh
ffmpeg -ss 1.5 -i clip.mp4 -frames:v 1 -q:v 2 cover.jpg
```

- `-ss 1.5`: 1.5 seconds in
- `-frames:v 1`: one frame
- `-q:v 2`: JPEG quality, 2 (best) to 31
- Result: cover.jpg, the frame at 1.5 seconds (1080 x 1920 for the test clip).

The most typical of the first 90 frames:

```sh
ffmpeg -i clip.mp4 -vf "thumbnail=90" -frames:v 1 cover-auto.png
```

- `thumbnail=90`: looks at each run of 90 frames (3 seconds at 30 fps, 1.5 at 60) and keeps the one whose colours are closest to the run's average
- Result: cover-auto.png, one frame from the first 90.

### Turn a picture and a sound into a video

Needs: `picture.jpg` (a picture of any size), `voice.m4a` (a sound file).

Picture plus sound:

```sh
ffmpeg -loop 1 -framerate 30 -i picture.jpg -i voice.m4a \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1" \
  -c:v libx264 -tune stillimage -pix_fmt yuv420p -c:a aac -b:a 192k -shortest picture-video.mp4
```

- `-loop 1 -framerate 30 -i picture.jpg`: repeats the picture as a 30 fps video
- `-tune stillimage`: x264 settings for a picture that does not move
- `-shortest`: ends with the sound
- Result: picture-video.mp4, 1080 x 1920, as long as voice.m4a (to within a frame or two).

### Stack two videos, top and bottom

Needs: `top.mp4` (the upper video, with the sound you keep), `bottom.mp4` (the lower video).

Top and bottom halves:

```sh
ffmpeg -i top.mp4 -i bottom.mp4 -filter_complex \
  "[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[t];\
   [1:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[b];\
   [t][b]vstack=inputs=2:shortest=1[v]" \
  -map "[v]" -map "0:a?" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest stacked.mp4
```

- `scale=1080:960:...increase,crop=1080:960`: each video fills a 1080 x 960 half, cropped to fit
- `vstack=inputs=2:shortest=1`: one above the other, ending when the shorter video ends (without shortest=1 the shorter one freezes on its last frame)
- `-map "0:a?"`: the top video's sound, if it has any
- `-shortest`: cuts the sound to the picture's length
- Result: stacked.mp4, 1080 x 1920, as long as the shorter video.

Note: For side by side halves, use 540 x 1920 halves and hstack.

### Rotate a sideways video

Needs: `sideways.mp4` (a video that plays on its side).

A quarter turn clockwise:

```sh
ffmpeg -i sideways.mp4 -vf "transpose=clock" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy upright.mp4
```

- `transpose=clock`: 90 degrees clockwise, so the left edge becomes the top; cclock turns it the other way, and hflip,vflip turns it 180 degrees
- Result: upright.mp4: a 1920 x 1080 input comes out 1080 x 1920, its left side now at the top.

Note: Phones often record upright video as a wide picture plus a rotation tag. FFmpeg applies the tag when it re-encodes, so such a file usually needs no transpose at all.

### Join clips end to end

Needs: `part1.mp4` (the first clip), `part2.mp4` (the second clip).

Join and re-encode:

```sh
ffmpeg -i part1.mp4 -i part2.mp4 \
  -filter_complex "[0:v]setsar=1[v0];[1:v]setsar=1[v1];[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k joined.mp4
```

- `concat=n=2:v=1:a=1`: two parts, each with one video and one audio stream
- `setsar=1`: the parts must have the same size and pixel shape; scale them first if they differ
- Result: joined.mp4: part1, then part2, as long as both together.

Join without re-encoding:

```sh
printf "file '%s'\n" part1.mp4 part2.mp4 > parts.txt
ffmpeg -f concat -safe 0 -i parts.txt -c copy joined-fast.mp4
```

- `parts.txt`: one line per clip, in order. A name with an apostrophe in it must be written as '\'' inside the quotes, for example file 'Sam'\''s clip.mp4'
- `-f concat -safe 0`: the concat demuxer; -safe 0 also allows absolute paths
- Result: joined-fast.mp4: part1, then part2; only for clips with the same codecs and settings.

### Convert HDR to SDR

Needs: `hdr.mov` (an HDR video, such as an iPhone recording with HDR on).

Check what the video is:

```sh
ffprobe -v error -select_streams v:0 \
  -show_entries stream=color_transfer,color_primaries,color_space -of default=noprint_wrappers=1 hdr.mov
```

- `color_transfer`: arib-std-b67 is HLG and smpte2084 is PQ (HDR10); bt709 is already SDR
- `color_space`: the matrix, usually bt2020nc for HDR
- Result: color_transfer, color_primaries and color_space of the video (smpte2084, bt2020 and bt2020nc for the test clip).

HDR (HLG or PQ) to SDR:

```sh
ffmpeg -i hdr.mov \
  -vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,sidedata=delete:type=MASTERING_DISPLAY_METADATA,sidedata=delete:type=CONTENT_LIGHT_LEVEL" \
  -c:v libx264 -crf 20 -preset medium -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a copy sdr.mp4
```

- `zscale=t=linear:npl=100`: undoes the HDR transfer curve into linear light (needs FFmpeg built with zimg)
- `zscale=p=bt709`: converts the BT.2020 colours to BT.709
- `tonemap=hable:desat=0`: squeezes the bright range into SDR; hable keeps highlights soft (also try mobius or reinhard)
- `zscale=t=bt709:m=bt709:r=tv,format=yuv420p`: SDR transfer, matrix and range, 8-bit 4:2:0
- `sidedata=delete:type=...`: drops the HDR mastering and light-level metadata, which no longer describes the picture
- `-color_primaries bt709 -color_trc bt709 -colorspace bt709`: tags the output as SDR
- Result: sdr.mp4, H.264, 8-bit 4:2:0, tagged BT.709, with no HDR metadata left.

Note: If the probe shows no color_space (unknown), the first zscale cannot tell how to read the colours: add min=bt2020nc to it (zscale=t=linear:npl=100:min=bt2020nc) when you know the video is BT.2020.

## Limits

- These commands target 1080 x 1920. For 720 x 1280, scale every x by 720/1080 and every y by 1280/1920 (both two thirds).
- The safe zones and upload limits are the apps' published figures, which change; the linked repositories date each one.
