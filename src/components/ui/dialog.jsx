import React, { createContext, useContext, useState } from "react";

const DialogCtx = createContext(null);

export function Dialog({ children }) {
  const [open, setOpen] = useState(false);
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
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className={`w-full max-w-md rounded-2xl p-4 ${className}`}>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

export function DialogTitle({ children, className = "" }) {
  return <h3 className={className}>{children}</h3>;
}
