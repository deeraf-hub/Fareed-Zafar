import { useEffect, useMemo, useState } from 'react';
import { Player } from '@/engine/player';
import { useProjectStore } from '@/store/projectStore';
import { sequenceDuration } from '@/model/project';

export interface PlaybackControls {
  player: Player;
  play(): void;
  pause(): void;
  togglePlay(): void;
  seek(time: number): void;
  stepFrames(delta: number): void;
  goToStart(): void;
  goToEnd(): void;
}

/** Creates one Player per editor session and exposes playback controls bound to the store. */
export function usePlayer(): PlaybackControls {
  const [player] = useState(
    () =>
      new Player({
        onTime: (t) => useProjectStore.setState({ playhead: t }),
        onEnded: () => useProjectStore.getState().setPlaying(false),
      }),
  );

  // Release media elements / AudioContext when the editor unmounts. The
  // player can be re-attached afterwards (StrictMode double-invokes effects).
  useEffect(() => {
    return () => player.dispose();
  }, [player]);

  return useMemo<PlaybackControls>(() => {
    const seek = (time: number) => {
      const s = useProjectStore.getState();
      const max = s.project ? sequenceDuration(s.project.clips) : 0;
      const t = Math.max(0, Math.min(time, max));
      useProjectStore.setState({ playhead: t });
      void player.seek(t);
    };
    const play = () => {
      const s = useProjectStore.getState();
      if (!s.project || sequenceDuration(s.project.clips) <= 0) return;
      s.setPlaying(true);
      void player.play();
    };
    const pause = () => {
      player.pause();
      useProjectStore.getState().setPlaying(false);
    };
    return {
      player,
      play,
      pause,
      seek,
      togglePlay: () => (player.isPlaying ? pause() : play()),
      stepFrames: (delta) => {
        const s = useProjectStore.getState();
        const fps = s.project?.settings.fps ?? 30;
        if (player.isPlaying) pause();
        seek(Math.round(s.playhead * fps + delta) / fps);
      },
      goToStart: () => {
        if (player.isPlaying) pause();
        seek(0);
      },
      goToEnd: () => {
        const s = useProjectStore.getState();
        if (player.isPlaying) pause();
        seek(s.project ? sequenceDuration(s.project.clips) : 0);
      },
    };
  }, [player]);
}
