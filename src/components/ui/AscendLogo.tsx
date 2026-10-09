"use client";

import React from "react";
import Image from "next/image";

interface AscendLogoProps {
  /**
   * Target height in pixels. Aspect ratio is preserved based on the 1314x1197 source dimensions (~1.1:1).
   * Default is 32.
   */
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}

const LOGO_SRC = "/logo/ascend-logo.png";
const ASPECT_RATIO = 1314 / 1197;

/**
 * Standard ASCEND Brand Logo component.
 * Uses public/logo/ascend-logo.png directly with preserved transparency and natural aspect ratio.
 */
export function AscendLogo({
  size = 32,
  width,
  height,
  className = "",
  priority = false,
  alt = "ASCEND Logo",
}: AscendLogoProps) {
  const renderedHeight = height ?? size;
  const renderedWidth = width ?? Math.round(renderedHeight * ASPECT_RATIO);

  return (
    <Image
      src={LOGO_SRC}
      alt={alt}
      width={renderedWidth}
      height={renderedHeight}
      priority={priority}
      className={`object-contain select-none shrink-0 ${className}`}
    />
  );
}
