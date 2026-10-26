export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-ink-200">{children}</kbd>
  );
}
