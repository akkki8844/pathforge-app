import { forwardRef, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { useSpecularEffect } from "./useSpecularEffect";
import "./SpecularButton.css";

export interface SpecularLinkProps extends LinkProps {
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
  /** Unlike aria-disabled alone, this actually blocks navigation and click/keyboard activation. */
  disabled?: boolean;
}

/**
 * Same edge-shine effect as SpecularButton, but rendered as a react-router
 * Link so the landing page's "workspace" CTAs keep client-side navigation
 * (and framer-motion's whileHover/whileTap via motion.create(SpecularLink)).
 */
const SpecularLink = forwardRef<HTMLAnchorElement, SpecularLinkProps>(
  (
    {
      children = "Get Started",
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
      disabled = false,
      onClick,
      ...rest
    },
    forwardedRef
  ) => {
    const linkRef = useRef<HTMLAnchorElement>(null);
    const fxRef = useRef<HTMLSpanElement>(null);

    useSpecularEffect(linkRef, fxRef, {
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

    const blockIfDisabled = (e: MouseEvent<HTMLAnchorElement> | KeyboardEvent<HTMLAnchorElement>) => {
      if (!disabled) return;
      e.preventDefault();
      e.stopPropagation();
    };

    return (
      <Link
        ref={(node) => {
          linkRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        {...rest}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : rest.tabIndex}
        onClick={(e) => {
          blockIfDisabled(e);
          if (!disabled) onClick?.(e);
        }}
        onKeyDown={blockIfDisabled}
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
      </Link>
    );
  }
);
SpecularLink.displayName = "SpecularLink";

export default SpecularLink;
