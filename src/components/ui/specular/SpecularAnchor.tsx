import { forwardRef, useRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { useSpecularEffect } from "./useSpecularEffect";
import "./SpecularButton.css";

export interface SpecularAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
}

/**
 * SpecularLink, but a plain `<a>`.
 *
 * SpecularLink wraps react-router's Link, which is the right thing for a route
 * inside the app and the wrong thing for the desktop download: that URL points
 * at a GitHub release on another origin, and it is a file transfer rather than
 * a navigation. This renders the identical treatment — same CSS, same
 * edge-shine hook — around an ordinary anchor.
 */
const SpecularAnchor = forwardRef<HTMLAnchorElement, SpecularAnchorProps>(
  (
    {
      children,
      size = "lg",
      radius = 18,
      tint = "#ffffff",
      tintOpacity = 0,
      blur = 0,
      textColor = "#f5f5f5",
      lineColor = "#ffffff",
      baseColor = "#525252",
      intensity = 1,
      shineSize = 10,
      shineFade = 40,
      thickness = 1,
      speed = 0.35,
      followMouse = true,
      proximity = 250,
      autoAnimate = false,
      className = "",
      style,
      ...rest
    },
    forwardedRef
  ) => {
    const anchorRef = useRef<HTMLAnchorElement>(null);
    const fxRef = useRef<HTMLSpanElement>(null);

    useSpecularEffect(anchorRef, fxRef, {
      radius,
      lineColor,
      baseColor,
      intensity,
      shineSize,
      shineFade,
      thickness,
      speed,
      followMouse,
      proximity,
      autoAnimate,
    });

    return (
      <a
        ref={(node) => {
          anchorRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        {...rest}
        className={`specular-button specular-button--${size}${className ? ` ${className}` : ""}`}
        style={
          {
            ...style,
            "--sb-radius": `${radius}px`,
            "--sb-tint": tint,
            "--sb-tint-opacity": tintOpacity,
            "--sb-blur": `${blur}px`,
            "--sb-text-color": textColor,
          } as React.CSSProperties
        }
      >
        <span ref={fxRef} className="specular-button__fx" aria-hidden="true" />
        <span className="specular-button__label">{children}</span>
      </a>
    );
  }
);
SpecularAnchor.displayName = "SpecularAnchor";

export default SpecularAnchor;
