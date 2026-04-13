export function Button({ className = "", variant = "default", size = "default", ...props }) {
  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-emerald-400 text-black hover:bg-emerald-300 shadow-lg shadow-emerald-950/20",
    ghost: "bg-transparent text-zinc-200 hover:bg-white/10 hover:text-white",
    outline: "border border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10",
  };
  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 px-3 text-xs",
    icon: "h-10 w-10",
  };
  return <button className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`} {...props} />;
}
