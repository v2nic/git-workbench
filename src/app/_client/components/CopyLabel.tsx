import React, { memo, useCallback } from "react";

interface CopyLabelProps {
  text: string;
  className?: string;
  title?: string;
}

export const CopyLabel = memo(function CopyLabel({
  text,
  className = "",
  title = `Copy ${text}`,
}: CopyLabelProps) {
  const handleCopy = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`font-mono font-normal hover:text-foreground transition-colors ${className}`}
      title={title}
    >
      {text}
    </button>
  );
});
