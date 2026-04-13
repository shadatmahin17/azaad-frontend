export function Slider({ value = [0], min = 0, max = 100, step = 1, onValueChange, className = "" }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0] ?? 0}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={className}
    />
  );
}
