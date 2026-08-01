import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  /** Add an animated underline that grows on hover */
  underline?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, underline, ...props }, ref) => {
    const underlineClass = underline
      ? "relative inline-block after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-full after:origin-bottom-right after:scale-x-0 after:bg-current after:transition-transform after:duration-200 after:ease-out hover:after:origin-bottom-left hover:after:scale-x-100 motion-reduce:after:transition-none"
      : "";

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(
            "transition-colors duration-150 ease-out motion-reduce:transition-none",
            underlineClass,
            className,
            isActive && activeClassName,
            isPending && pendingClassName,
          )
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
