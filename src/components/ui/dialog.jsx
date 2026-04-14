import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const DialogCtx = createContext(null);

export function Dialog({ children, open: controlledOpen, onOpenChange }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = useMemo(
    () =>
      onOpenChange
        ? (next) => onOpenChange(next)
        : (next) => setUncontrolledOpen(next),
    [onOpenChange]
  );
  return <DialogCtx.Provider value={{ open, setOpen }}>{children}</DialogCtx.Provider>;
}

export function DialogTrigger({ asChild, children }) {
  const ctx = useContext(DialogCtx);
  if (!ctx) return children;
  const child = React.Children.only(children);
  if (!asChild) return <button onClick={() => ctx.setOpen(true)}>{children}</button>;
  return React.cloneElement(child, {
    onClick: (e) => {
      child.props.onClick?.(e);
      ctx.setOpen(true);
    },
  });
}

export function DialogContent({ className = "", children }) {
  const ctx = useContext(DialogCtx);
  if (!ctx?.open) return null;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") ctx.setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ctx]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={() => ctx.setOpen(false)}
    >
      <div
        className={`w-full max-w-md rounded-2xl p-4 ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogClose({ asChild, children }) {
  const ctx = useContext(DialogCtx);
  if (!ctx) return children;
  const child = React.Children.only(children);
  if (!asChild) {
    return <button onClick={() => ctx.setOpen(false)}>{children}</button>;
  }
  return React.cloneElement(child, {
    onClick: (e) => {
      child.props.onClick?.(e);
      ctx.setOpen(false);
    },
  });
}

export function DialogHeader({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

export function DialogTitle({ children, className = "" }) {
  return <h3 className={className}>{children}</h3>;
}
