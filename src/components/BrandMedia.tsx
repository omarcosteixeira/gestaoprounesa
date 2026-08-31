import React, { useState } from "react";

export function isVideoMedia(url?: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  if (clean.startsWith("data:video/")) return true;
  // Match file extensions like .mp4, .webm, .ogg, .mov, .m4v
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(clean);
}

export function isGifMedia(url?: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  if (clean.startsWith("data:image/gif")) return true;
  return /\.gif(\?.*)?$/i.test(clean);
}

interface BrandMediaProps {
  src?: string;
  alt?: string;
  className?: string;
  videoClassName?: string;
  fallback?: React.ReactNode;
}

export function BrandMedia({
  src,
  alt = "Logo",
  className = "max-h-16 max-w-full object-contain",
  videoClassName,
  fallback = null,
}: BrandMediaProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <>{fallback}</>;
  }

  if (isVideoMedia(src)) {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className={videoClassName || className}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}
