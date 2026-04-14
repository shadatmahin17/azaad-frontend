export function ScrollArea({ className = "", ...props }) {
  return <div className={`overflow-y-auto overscroll-contain ${className}`.trim()} {...props} />;
}
