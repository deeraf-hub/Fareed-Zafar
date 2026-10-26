import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const FIXTURE_DIR = join(process.cwd(), 'e2e', '.fixtures');

export interface Fixtures {
  video: string; // 6 s 1280x720 VP9 + Opus (decodable by open-source Chromium)
  video2: string; // 4 s 640x360 VP8, different colour
  audio: string; // 5 s WAV tone
  image: string; // PNG logo-ish overlay
}

/** Generate real media with the system ffmpeg (idempotent). */
export function ensureFixtures(): Fixtures {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  const f: Fixtures = {
    video: join(FIXTURE_DIR, 'clip-a.webm'),
    video2: join(FIXTURE_DIR, 'clip-b.webm'),
    audio: join(FIXTURE_DIR, 'tone.wav'),
    image: join(FIXTURE_DIR, 'overlay.png'),
  };
  const run = (args: string[]) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (!existsSync(f.video)) {
    run([
      '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30:duration=6',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=6',
      '-c:v', 'libvpx-vp9', '-b:v', '1M', '-deadline', 'realtime', '-cpu-used', '8',
      '-c:a', 'libopus', '-b:a', '96k', '-shortest', f.video,
    ]);
  }
  if (!existsSync(f.video2)) {
    run([
      '-f', 'lavfi', '-i', 'color=c=0x2060c0:size=640x360:rate=30:duration=4,drawbox=x=100:y=100:w=200:h=120:color=orange:t=fill',
      '-c:v', 'libvpx', '-b:v', '600k', '-deadline', 'realtime', '-cpu-used', '8', '-an', f.video2,
    ]);
  }
  if (!existsSync(f.audio)) {
    run(['-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=44100:duration=5', '-ac', '2', '-c:a', 'pcm_s16le', f.audio]);
  }
  if (!existsSync(f.image)) {
    run(['-f', 'lavfi', '-i', 'color=c=0xff4080@0.9:size=400x200,format=rgba', '-frames:v', '1', f.image]);
  }
  return f;
}

export interface ProbeStream {
  codec_type: string;
  codec_name: string;
  width?: number;
  height?: number;
  duration?: string;
  nb_frames?: string;
  r_frame_rate?: string;
}
export interface ProbeResult {
  streams: ProbeStream[];
  format: { duration: string; format_name: string; size: string };
}

export function ffprobe(file: string): ProbeResult {
  const out = execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { encoding: 'utf8' });
  return JSON.parse(out) as ProbeResult;
}
