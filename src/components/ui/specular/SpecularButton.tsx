import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useSpecularEffect } from "./useSpecularEffect";
import "./SpecularButton.css";

export interface SpecularButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
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

const SpecularButton = ({
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
  disabled = false,
  className = "",
  type = "button",
  style,
  ...rest
}: SpecularButtonProps) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const fxRef = useRef<HTMLSpanElement>(null);

  useSpecularEffect(btnRef, fxRef, {
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
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
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
    </button>
  );
};

export default SpecularButton;
