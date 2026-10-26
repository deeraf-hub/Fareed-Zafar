import { Link, Navigate } from 'react-router-dom';
import { Clapperboard, Download, HardDrive, Layers, Type, Wand2 } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { APP_NAME } from '@/config/env';

const FEATURES = [
  { icon: Layers, title: 'Multi-track timeline', text: 'Drag, trim, split and layer video, images, text and audio.' },
  { icon: Type, title: 'Titles & subtitles', text: 'Animated text with fonts, outlines, backgrounds and presets.' },
  { icon: Wand2, title: 'Filters & transitions', text: 'Brightness, contrast, saturation, looks, fades, wipes and slides.' },
  { icon: Download, title: 'MP4 export in the browser', text: 'H.264 MP4 rendered locally with WebCodecs or FFmpeg.wasm.' },
  { icon: HardDrive, title: 'Your files stay local', text: 'Media never uploads. Only project settings are synced to your account.' },
  { icon: Clapperboard, title: '16:9, 9:16 and 1:1', text: 'Landscape, vertical and square projects for every platform.' },
];

export function LandingPage() {
  const { mode, user, ready } = useAuthStore();
  if (ready && mode === 'cloud' && user) return <Navigate to="/projects" replace />;
  return (
    <div className="min-h-full bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {mode === 'cloud' ? (
            <>
              <Link to="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary">Create account</Button>
              </Link>
            </>
          ) : (
            <Link to="/projects">
              <Button variant="primary">Open editor</Button>
            </Link>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <section className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-400">Browser-based video editor</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Edit video in your browser. <span className="text-ink-300">Nothing leaves your computer.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-300">
            {APP_NAME} is a free, open video editor for desktop Chrome: a real multi-track timeline, text and image
            overlays, filters, transitions, audio mixing and MP4 export, all rendered on your own machine.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={mode === 'cloud' ? '/register' : '/projects'}>
              <Button variant="primary" size="lg">
                Start editing
              </Button>
            </Link>
            {mode === 'cloud' && (
              <Link to="/login">
                <Button size="lg">I already have an account</Button>
              </Link>
            )}
          </div>
          {mode === 'local' && (
            <p className="mt-4 text-sm text-ink-400">
              Running in local mode: projects are saved in this browser. Configure Supabase to enable accounts and
              cloud project sync.
            </p>
          )}
        </section>
        <section className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-ink-700 bg-ink-900/60 p-5">
              <f.icon className="h-5 w-5 text-accent-400" />
              <h3 className="mt-3 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-300">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
