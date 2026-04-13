export function Button({ className = "", variant, size, ...props }) {
  return <button className={className} {...props} />;
}
