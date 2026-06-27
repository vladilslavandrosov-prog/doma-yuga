import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

export interface TourStep {
  target: string;
  title: string;
  description: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getRect(testId: string): Rect | null {
  const el = document.querySelector(`[data-testid="${testId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function startOnboardingTour() {
  window.dispatchEvent(new CustomEvent("onboarding-tour:start"));
}

export function OnboardingTour({ steps, storageKey }: { steps: TourStep[]; storageKey: string }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      const t = setTimeout(() => setActive(true), 700);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  useEffect(() => {
    function handler() {
      setStepIndex(0);
      setActive(true);
    }
    window.addEventListener("onboarding-tour:start", handler);
    return () => window.removeEventListener("onboarding-tour:start", handler);
  }, []);

  const updateRect = useCallback(() => {
    const step = steps[stepIndex];
    if (!step) return;
    setRect(getRect(step.target));
  }, [stepIndex, steps]);

  useEffect(() => {
    if (!active) return;
    const step = steps[stepIndex];
    if (step) {
      document.querySelector(`[data-testid="${step.target}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    updateRect();
    const t = setTimeout(updateRect, 350);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, stepIndex, updateRect]);

  function finish() {
    localStorage.setItem(storageKey, "1");
    setActive(false);
  }

  function next() {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else finish();
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  if (!active || steps.length === 0) return null;

  const step = steps[stepIndex];
  const pad = 8;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const spot = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  const cardWidth = 340;
  const tooltipBelow = spot ? spot.top + spot.height + 200 < viewportH : true;
  const tooltipTop = spot
    ? tooltipBelow ? spot.top + spot.height + 16 : Math.max(16, spot.top - 16 - 200)
    : viewportH / 2 - 120;
  const tooltipLeft = spot
    ? Math.min(Math.max(16, spot.left), viewportW - cardWidth - 16)
    : Math.max(16, viewportW / 2 - cardWidth / 2);

  return (
    <div className="fixed inset-0 z-[100]" data-testid="overlay-onboarding-tour">
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={finish}
        data-testid="overlay-onboarding-backdrop"
      />
      {spot && (
        <motion.div
          className="absolute rounded-lg ring-2 ring-primary pointer-events-none"
          style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)" }}
          initial={false}
          animate={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        />
      )}
      {!spot && <div className="absolute inset-0 bg-black/65" />}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          className="absolute rounded-xl border bg-popover p-4 shadow-2xl"
          style={{ top: tooltipTop, left: tooltipLeft, width: cardWidth }}
          data-testid={`card-tour-step-${stepIndex}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Шаг {stepIndex + 1} из {steps.length}
              </span>
            </div>
            <button
              onClick={finish}
              aria-label="Закрыть инструкцию"
              data-testid="button-tour-close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h3 className="font-semibold text-base mb-1" data-testid="text-tour-title">{step.title}</h3>
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-tour-description">{step.description}</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5" data-testid="indicator-tour-progress">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-5 bg-primary" : "w-1.5 bg-muted"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <Button size="sm" variant="ghost" onClick={back} data-testid="button-tour-back">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Назад
                </Button>
              )}
              <Button size="sm" onClick={next} data-testid="button-tour-next">
                {stepIndex === steps.length - 1 ? "Понятно" : "Далее"}
                {stepIndex < steps.length - 1 && <ArrowRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
