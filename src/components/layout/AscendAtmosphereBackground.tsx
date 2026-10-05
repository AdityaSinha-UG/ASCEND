"use client";

import React from "react";

export function AscendAtmosphereBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Deep Christmas-Red & Crimson Ambient Radial Glows */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(130,22,28,0.18)_0%,transparent_70%)] blur-3xl motion-safe:animate-bgPulseGlow" />
      <div className="absolute top-1/4 -left-48 w-[650px] h-[650px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(95,16,22,0.14)_0%,transparent_70%)] blur-3xl" />
      <div className="absolute bottom-12 -right-48 w-[750px] h-[750px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(80,14,18,0.15)_0%,transparent_70%)] blur-3xl" />
      <div className="absolute top-2/3 left-1/3 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(110,18,24,0.10)_0%,transparent_70%)] blur-3xl" />

      {/* Subtle Atmospheric Energy Strings (Sparse, Soft Crimson World Lines) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-25"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bgEnergyGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8A181C" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#C84B47" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#5C1318" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bgEnergyGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5C1318" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#8A181C" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2A0B0E" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Curved World Connection Energy Trails */}
        <path
          d="M -100 250 C 350 150, 750 480, 1550 200"
          stroke="url(#bgEnergyGrad1)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="6 14"
        />
        <path
          d="M -50 720 C 450 540, 950 820, 1500 580"
          stroke="url(#bgEnergyGrad2)"
          strokeWidth="1.2"
          fill="none"
          strokeDasharray="4 18"
        />
        <path
          d="M 250 -50 C 580 320, 1020 280, 1350 950"
          stroke="#5C1318"
          strokeWidth="1"
          strokeOpacity="0.18"
          fill="none"
        />
      </svg>

      {/* Soft Vignette Overlay for Depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(9,7,6,0.5)_100%)] pointer-events-none" />
    </div>
  );
}
