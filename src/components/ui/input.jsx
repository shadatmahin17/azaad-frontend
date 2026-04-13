export function Input({ className = "", ...props }) {
  return (
    <input
      className={`h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 ${className}`}
      {...props}
    />
  );
}
