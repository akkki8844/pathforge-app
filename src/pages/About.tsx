import { motion } from "framer-motion";
import { 
  Target, Shield, Heart, BookOpen, ArrowRight, Star, X } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { StaggerContainer, staggerItemVariants } from "@/components/animations/StaggerContainer";
import { GlowCard } from "@/components/animations/GlowCard";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { ParallaxSection } from "@/components/animations/ParallaxSection";
import { TextReveal } from "@/components/animations/TextReveal";
import { Seo } from "@/components/Seo";
import pathforgeLogo from "@/assets/pathforge-logo.svg";

const principles = [
  {
    icon: Target,
    title: "Personalized Guidance",
    description: "Every recommendation adapts to your target college and intended major. No generic advice — only what matters for your specific path.",
  },
  {
    icon: Star,
    title: "Clarity Over Complexity",
    description: "College preparation can be overwhelming. We cut through the noise to show you exactly what matters and how to present it effectively.",
  },
  {
    icon: Shield,
    title: "Ethical Presentation",
    description: "We help you present your genuine self. No fabrication, no exaggeration — just clear, professional communication of your real experiences.",
  },
  {
    icon: BookOpen,
    title: "Structured Learning",
    description: "Whether it's essays, activities, or profiles, we provide step-by-step guidance that builds understanding, not just outputs.",
  },
];

export default function About() {
  return (
    <div className="py-8 sm:py-12 relative overflow-hidden">
      <Seo title='About Pathforge — our mission for students' description='Pathforge helps high schoolers plan, build, and apply to top colleges with AI guidance and personalized strategy.' path='/about' />
      {/* Background accents */}
      <ParallaxSection speed={0.1} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-0 w-72 h-72 bg-accent/3 rounded-full blur-3xl" />
      </ParallaxSection>

      <div className="section-container max-w-4xl relative z-10">
        {/* Hero */}
        <div className="text-center mb-16">
          <TextReveal>
            <MagneticButton className="inline-block" strength={0.2}>
              <motion.img
                src={pathforgeLogo}
                alt="Pathforge"
                className="mx-auto mb-6 h-16 w-16 rounded-2xl shadow-md"
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                transition={{ type: "spring", stiffness: 200 }}
              />
            </MagneticButton>
          </TextReveal>
          <TextReveal delay={0.1}>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">About Pathforge</h1>
          </TextReveal>
          <TextReveal delay={0.2}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Helping students understand what matters and how to present it clearly.
            </p>
          </TextReveal>
        </div>

        {/* Mission */}
        <ScrollReveal>
          <GlowCard className="rounded-xl border border-border/50 bg-card p-8 mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
            <div className="prose prose-lg text-muted-foreground">
              <p>
                Pathforge was created to address a simple problem: college preparation is confusing.
              </p>
              <p>
                Students spend countless hours wondering which activities actually matter, 
                how to write compelling essays, and how to present themselves professionally. 
                The advice they receive is often generic, contradictory, or inaccessible.
              </p>
              <p>
                We built Pathforge to be the clarity students deserve. A personalized platform that:
              </p>
              <ul>
                <li>Shows you activities that actually matter for <em>your</em> intended path</li>
                <li>Helps you write essays that are clear, structured, and authentically you</li>
                <li>Transforms informal descriptions into professional application entries</li>
                <li>Guides you through building a LinkedIn profile that opens doors</li>
              </ul>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* Principles */}
        <ScrollReveal className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Our Principles</h2>
          <StaggerContainer className="grid sm:grid-cols-2 gap-6" staggerDelay={0.1}>
            {principles.map((principle) => (
              <motion.div key={principle.title} variants={staggerItemVariants}>
                <GlowCard className="rounded-xl border border-border/50 bg-card p-6 h-full">
                  <MagneticButton strength={0.15}>
                    <motion.div
                      className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent"
                      whileHover={{
                        scale: 1.15,
                        backgroundColor: "hsl(var(--accent))",
                        color: "hsl(var(--accent-foreground))",
                      }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <principle.icon className="h-5 w-5" />
                    </motion.div>
                  </MagneticButton>
                  <h3 className="font-semibold text-foreground mb-2">{principle.title}</h3>
                  <p className="text-sm text-muted-foreground">{principle.description}</p>
                </GlowCard>
              </motion.div>
            ))}
          </StaggerContainer>
        </ScrollReveal>

        {/* What We're Not */}
        <ScrollReveal>
          <motion.div
            className="rounded-xl border border-border/50 bg-card p-8 border-l-4 border-l-accent"
            whileHover={{ borderLeftColor: "hsl(var(--destructive))" }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-bold text-foreground mb-4">What We're Not</h2>
            <p className="text-muted-foreground mb-4">
              Pathforge is a guidance and presentation tool — not a shortcut.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "We don't write your essays for you",
                "We don't fabricate or exaggerate experiences",
                "We don't guarantee admission anywhere",
                "We don't replace genuine effort and achievement",
              ].map((item, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-2"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <X className="h-4 w-4 shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
                  {item}
                </motion.li>
              ))}
            </ul>
            <p className="mt-4 text-muted-foreground">
              What we <em>do</em> is help you understand what matters and present your authentic self with clarity and confidence.
            </p>
          </motion.div>
        </ScrollReveal>

        {/* Made With Love */}
        <ScrollReveal className="mt-12">
          <motion.p
            className="text-sm text-muted-foreground flex items-center justify-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            Made with{" "}
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Heart className="h-4 w-4 text-destructive" />
            </motion.span>{" "}
            for students everywhere
          </motion.p>
        </ScrollReveal>
      </div>
    </div>
  );
}
