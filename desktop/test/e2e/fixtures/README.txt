The four second HLS test stream is a generated color pattern with no third party media.

Regenerate with FFmpeg:
ffmpeg -f lavfi -i testsrc2=size=320x180:rate=24 -t 4 -an -c:v libx264 -pix_fmt yuv420p -profile:v baseline -g 24 -hls_time 1 -hls_list_size 0 -hls_playlist_type vod stream.m3u8
