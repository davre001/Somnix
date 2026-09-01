"use client";

import { Sparkles } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LiquidMetalButtonProps {
  label?: string;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  viewMode?: "text" | "icon";
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "green" | "red" | "silver";
  disabled?: boolean;
  fullWidth?: boolean;
  width?: number;
  height?: number;
}

export function LiquidMetalButton({
  label = "Get Started",
  onClick,
  viewMode = "text",
  className = "",
  children,
  variant = "default",
  disabled = false,
  fullWidth = false,
  width: customWidth,
  height: customHeight = 46,
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);
  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  const baseWidth = useMemo(() => {
    if (customWidth) return customWidth;
    if (viewMode === "icon") return 46;
    if (fullWidth) return 280;
    return Math.max(142, (label ? label.length * 10 : 100) + 40);
  }, [viewMode, fullWidth, customWidth, label]);

  const dimensions = useMemo(() => {
    const w = baseWidth;
    const h = customHeight;
    return {
      width: w,
      height: h,
      innerWidth: w - 4,
      innerHeight: h - 4,
      shaderWidth: w,
      shaderHeight: h,
    };
  }, [baseWidth, customHeight]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const styleId = "shader-canvas-style-exploded";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .shader-container-exploded canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
          pointer-events: none !important;
        }
        @keyframes ripple-animation {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    let isMounted = true;

    const loadShader = async () => {
      try {
        const { ShaderMount, liquidMetalFragmentShader } = await import(
          "@paper-design/shaders"
        );

        if (shaderRef.current && isMounted) {
          if (shaderMount.current?.destroy) {
            shaderMount.current.destroy();
          }

          // Adjust shader tints based on button variant
          let shiftRed = 0.3;
          let shiftBlue = 0.3;
          if (variant === "green") {
            shiftRed = 0.1;
            shiftBlue = 0.6;
          } else if (variant === "red") {
            shiftRed = 0.8;
            shiftBlue = 0.1;
          }

          shaderMount.current = new ShaderMount(
            shaderRef.current,
            liquidMetalFragmentShader,
            {
              u_repetition: 4,
              u_softness: 0.5,
              u_shiftRed: shiftRed,
              u_shiftBlue: shiftBlue,
              u_distortion: 0,
              u_contour: 0,
              u_angle: 45,
              u_scale: 8,
              u_shape: 1,
              u_offsetX: 0.1,
              u_offsetY: -0.1,
            },
            undefined,
            0.6
          );
        }
      } catch (error) {
        console.error("[LiquidMetal] Shader load fallback:", error);
      }
    };

    loadShader();

    return () => {
      isMounted = false;
      if (shaderMount.current?.destroy) {
        shaderMount.current.destroy();
        shaderMount.current = null;
      }
    };
  }, [variant]);

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);
    shaderMount.current?.setSpeed?.(1);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    shaderMount.current?.setSpeed?.(0.6);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (shaderMount.current?.setSpeed) {
      shaderMount.current.setSpeed(2.4);
      setTimeout(() => {
        if (isHovered) {
          shaderMount.current?.setSpeed?.(1);
        } else {
          shaderMount.current?.setSpeed?.(0.6);
        }
      }, 300);
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = { x, y, id: rippleId.current++ };

      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
    }

    onClick?.(e);
  };

  // Background styling according to variant
  const innerBg = useMemo(() => {
    if (variant === "green") {
      return "linear-gradient(180deg, #059669 0%, #064e3b 100%)";
    }
    if (variant === "red") {
      return "linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)";
    }
    if (variant === "silver") {
      return "linear-gradient(180deg, #ffffff 0%, #d4d4d8 100%)";
    }
    return "linear-gradient(180deg, #202020 0%, #000000 100%)";
  }, [variant]);

  const textColor = useMemo(() => {
    if (variant === "silver") return "#000000";
    return "#ffffff";
  }, [variant]);

  return (
    <div className={cn("relative inline-block select-none", fullWidth && "w-full", className)}>
      <div
        style={{
          perspective: "1000px",
          perspectiveOrigin: "50% 50%",
        }}
        className={fullWidth ? "w-full" : ""}
      >
        <div
          style={{
            position: "relative",
            width: fullWidth ? "100%" : `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            transformStyle: "preserve-3d",
            transition:
              "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
            transform: "none",
          }}
        >
          {/* Label / Children Layer */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${dimensions.height}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transformStyle: "preserve-3d",
              transition:
                "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, gap 0.4s ease",
              transform: "translateZ(20px)",
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            {children ? (
              children
            ) : (
              <>
                {viewMode === "icon" && (
                  <Sparkles
                    size={16}
                    style={{
                      color: textColor,
                      filter: "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.5))",
                      transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  />
                )}
                {viewMode === "text" && (
                  <span
                    style={{
                      fontSize: "13px",
                      color: textColor,
                      fontWeight: 600,
                      textShadow: "0px 1px 2px rgba(0, 0, 0, 0.6)",
                      whiteSpace: "nowrap",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {label}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Inner Depth Layer */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${dimensions.height}px`,
              transformStyle: "preserve-3d",
              transition:
                "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
              transform: `translateZ(10px) ${isPressed ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)"}`,
              zIndex: 20,
            }}
          >
            <div
              style={{
                width: "calc(100% - 4px)",
                height: `${dimensions.innerHeight}px`,
                margin: "2px",
                borderRadius: "100px",
                background: innerBg,
                boxShadow: isPressed
                  ? "inset 0px 2px 4px rgba(0, 0, 0, 0.4), inset 0px 1px 2px rgba(0, 0, 0, 0.3)"
                  : "none",
                transition:
                  "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>

          {/* Shader Canvas Container Layer */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${dimensions.height}px`,
              transformStyle: "preserve-3d",
              transition:
                "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
              transform: `translateZ(0px) ${isPressed ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)"}`,
              zIndex: 10,
            }}
          >
            <div
              style={{
                height: `${dimensions.height}px`,
                width: "100%",
                borderRadius: "100px",
                boxShadow: isPressed
                  ? "0px 0px 0px 1px rgba(0, 0, 0, 0.5), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)"
                  : isHovered
                    ? "0px 0px 0px 1px rgba(255, 255, 255, 0.3), 0px 12px 20px 0px rgba(0, 0, 0, 0.3), 0px 0px 25px rgba(255, 255, 255, 0.15)"
                    : "0px 0px 0px 1px rgba(255, 255, 255, 0.1), 0px 4px 10px rgba(0, 0, 0, 0.3)",
                transition:
                  "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                background: "transparent",
              }}
            >
              <div
                ref={shaderRef}
                className="shader-container-exploded"
                style={{
                  borderRadius: "100px",
                  overflow: "hidden",
                  position: "relative",
                  width: "100%",
                  height: `${dimensions.shaderHeight}px`,
                }}
              />
            </div>
          </div>

          {/* Interactive Button Click & Ripple Surface */}
          <button
            ref={buttonRef}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={() => !disabled && setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            disabled={disabled}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${dimensions.height}px`,
              background: "transparent",
              border: "none",
              cursor: disabled ? "not-allowed" : "pointer",
              outline: "none",
              zIndex: 40,
              transformStyle: "preserve-3d",
              transform: "translateZ(25px)",
              transition:
                "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
              overflow: "hidden",
              borderRadius: "100px",
              opacity: disabled ? 0.6 : 1,
            }}
            aria-label={label}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                style={{
                  position: "absolute",
                  left: `${ripple.x}px`,
                  top: `${ripple.y}px`,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)",
                  pointerEvents: "none",
                  animation: "ripple-animation 0.6s ease-out",
                }}
              />
            ))}
          </button>
        </div>
      </div>
    </div>
  );
}
