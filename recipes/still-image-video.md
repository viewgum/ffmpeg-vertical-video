# Make a video from an image and audio with FFmpeg

Turn a still picture and a sound file (a voice note, a podcast clip, a song) into a 1080 x 1920 MP4 as long as the sound.

You need: `picture.jpg` (a picture of any size), `voice.m4a` (a sound file). Change the file names to yours.

## Picture plus sound

```sh
ffmpeg -loop 1 -framerate 30 -i picture.jpg -i voice.m4a \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1" \
  -c:v libx264 -tune stillimage -pix_fmt yuv420p -c:a aac -b:a 192k -shortest picture-video.mp4
```

| Part | What it does |
|---|---|
| `-loop 1 -framerate 30 -i picture.jpg` | repeats the picture as a 30 fps video |
| `-tune stillimage` | x264 settings for a picture that does not move |
| `-shortest` | ends with the sound |

Result: picture-video.mp4, 1080 x 1920, as long as voice.m4a (to within a frame or two).

Without FFmpeg: ViewGum's free [Audiogram maker](https://viewgum.com/tools/audiogram-maker) turns a sound and a picture into a vertical video in your browser, and the video stays on your device.

## Sources

- [FFmpeg H.264 encoding guide (presets and tunes)](https://trac.ffmpeg.org/wiki/Encode/H.264)

Tested: [test.mjs](../test.mjs) runs this command word for word on generated clips in CI and checks each result as described above.

[All recipes](../README.md#all-recipes)
