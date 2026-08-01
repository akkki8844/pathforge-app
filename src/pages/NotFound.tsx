import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";
import { EASE_BACK, fadeUp, staggerParent, transition } from "@/lib/motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Seo
        title="Page not found (404) | Pathforge"
        description="The page you're looking for doesn't exist. Return to Pathforge to keep planning your college journey."
        path={location.pathname}
        noindex
      />
      <motion.div
        variants={staggerParent}
        custom={0.08}
        initial="hidden"
        animate="visible"
        className="text-center"
      >
        <motion.h1
          variants={{
            hidden: { opacity: 0, scale: 0.8 },
            visible: { opacity: 1, scale: 1, transition: { ...transition.slow, ease: EASE_BACK } },
          }}
          className="mb-4 text-4xl font-bold"
        >
          404
        </motion.h1>
        <motion.h2 variants={fadeUp} className="mb-4 text-xl text-foreground">
          Page not found
        </motion.h2>
        <motion.p variants={fadeUp} className="mb-4 text-muted-foreground">
          The page you're looking for doesn't exist.
        </motion.p>
        <motion.a
          variants={fadeUp}
          href="/"
          whileHover={{ x: -3 }}
          transition={transition.fast}
          className="inline-block text-primary underline hover:text-primary/90"
        >
          Return to Home
        </motion.a>
      </motion.div>
    </div>
  );
};

export default NotFound;
