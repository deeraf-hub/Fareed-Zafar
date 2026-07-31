import { useEffect, useRef, useState } from 'react';
import { assets } from '../content';

const LERP = 0.12;
const MAX_FRAMES = 90;
const MIN_FRAMES = 24;
const FRAMES_PER_SECOND = 12;
const MAX_FRAME_WIDTH = 960;

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = (targetWidth - drawWidth) / 2;
  const dy = (targetHeight - drawHeight) / 2;
  ctx.drawImage(source, dx, dy, drawWidth, drawHeight);
}

export default function ScrollVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<ImageBitmap[]>([]);
  const targetRef = useRef(0);
  const smoothedRef = useRef(0);
  const framesReadyRef = useRef(false);

  const [videoHasFrame, setVideoHasFrame] = useState(false);
  const [framesReady, setFramesReady] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  // Map page scroll to 0-1 progress.
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      targetRef.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // rAF loop: smooth progress, then draw cached frames or seek the video.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      smoothedRef.current += (targetRef.current - smoothedRef.current) * LERP;
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (framesReadyRef.current && canvas) {
        const frames = framesRef.current;
        if (frames.length > 0) {
          const index = Math.min(
            frames.length - 1,
            Math.max(0, Math.round(smoothedRef.current * (frames.length - 1))),
          );
          const frame = frames[index];
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const width = Math.round(canvas.clientWidth * dpr);
          const height = Math.round(canvas.clientHeight * dpr);
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          const ctx = canvas.getContext('2d');
          if (ctx && width > 0 && height > 0) {
            drawCover(ctx, frame, frame.width, frame.height, width, height);
          }
        }
      } else if (video && Number.isFinite(video.duration) && video.duration > 0) {
        const time = smoothedRef.current * Math.max(0, video.duration - 0.05);
        if (Math.abs(video.currentTime - time) > 0.04) {
          try {
            video.currentTime = time;
          } catch {
            // Ignore seek errors while the video is still buffering.
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Build the frame cache from an offscreen video for smooth scrubbing.
  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;

    const extract = async () => {
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve();
        } else {
          video.addEventListener('loadeddata', () => resolve(), { once: true });
        }
      });
      if (cancelled) return;
      setVideoHasFrame(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (cancelled) return;

      const offscreen = document.createElement('video');
      offscreen.crossOrigin = 'anonymous';
      offscreen.muted = true;
      offscreen.playsInline = true;
      offscreen.preload = 'auto';
      offscreen.src = assets.heroVideo;

      await new Promise<void>((resolve, reject) => {
        offscreen.addEventListener('loadeddata', () => resolve(), { once: true });
        offscreen.addEventListener('error', () => reject(new Error('offscreen video failed')), {
          once: true,
        });
      });
      if (cancelled) return;

      const duration = offscreen.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;

      const frameCount = Math.min(
        MAX_FRAMES,
        Math.max(MIN_FRAMES, Math.round(duration * FRAMES_PER_SECOND)),
      );
      const sourceWidth = offscreen.videoWidth || 1920;
      const sourceHeight = offscreen.videoHeight || 1080;
      const width = Math.min(MAX_FRAME_WIDTH, sourceWidth);
      const height = Math.round((width / sourceWidth) * sourceHeight);

      const scratch = document.createElement('canvas');
      scratch.width = width;
      scratch.height = height;
      const ctx = scratch.getContext('2d');
      if (!ctx) return;

      const frames: ImageBitmap[] = [];
      for (let i = 0; i < frameCount; i += 1) {
        if (cancelled) return;
        const time = (i / (frameCount - 1)) * Math.max(0, duration - 0.05);
        await new Promise<void>((resolve) => {
          offscreen.addEventListener('seeked', () => resolve(), { once: true });
          offscreen.currentTime = time;
        });
        if (cancelled) return;
        ctx.drawImage(offscreen, 0, 0, width, height);
        frames.push(await createImageBitmap(scratch));
      }

      if (cancelled) return;
      framesRef.current = frames;
      framesReadyRef.current = true;
      setFramesReady(true);
    };

    extract().catch(() => {
      // CORS-tainted canvas or a network failure: stay on the seek fallback.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a]"
      aria-hidden="true"
    >
      {!posterFailed && (
        <img
          src={assets.heroPoster}
          alt=""
          onError={() => setPosterFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            videoHasFrame || framesReady ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
      <video
        ref={videoRef}
        src={assets.heroVideo}
        muted
        playsInline
        preload="auto"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          videoHasFrame && !framesReady ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
          framesReady ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
