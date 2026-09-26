"use client";

import { Toaster } from "sonner";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: "inherit",
          fontSize: "13.5px",
          borderRadius: "10px",
        },
      }}
    />
  );
}
