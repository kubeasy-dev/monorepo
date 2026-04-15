import {
  ArrowRight,
  Bug,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code,
  LogIn,
  Rocket,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";

export function HowItWorksSection() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const steps = [
    {
      icon: Terminal,
      title: "Install the CLI",
      description:
        "One command to get started. Works on macOS, Linux, and Windows.",
      command: "npm install -g @kubeasy-dev/kubeasy-cli",
      color: "bg-purple-400",
    },
    {
      icon: LogIn,
      title: "Login to Kubeasy",
      description:
        "Authenticate with your account to track progress and access challenges.",
      command: "kubeasy login",
      color: "bg-blue-400",
    },
    {
      icon: Rocket,
      title: "Setup your cluster",
      description: "Create a local Kubernetes cluster ready for challenges.",
      command: "kubeasy setup",
      color: "bg-yellow-400",
    },
    {
      icon: Code,
      title: "Start a challenge",
      description:
        "Deploy the challenge manifests and begin your learning journey.",
      command: "kubeasy challenge start pod-crashloop",
      color: "bg-cyan-400",
    },
    {
      icon: Bug,
      title: "Debug & Fix",
      description:
        "Identify issues, edit resources, and apply your Kubernetes knowledge.",
      command: "kubectl get pods && kubectl edit pod",
      color: "bg-pink-400",
    },
    {
      icon: CheckCircle2,
      title: "Submit & Validate",
      description:
        "Submit your solution and get instant feedback on your work.",
      command: "kubeasy challenge submit pod-crashloop",
      color: "bg-green-400",
    },
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, steps.length]);

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
    setIsAutoPlaying(false);
  };

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
    setIsAutoPlaying(false);
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
    setIsAutoPlaying(false);
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <section className="py-24 px-4 bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full neo-border" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent rounded-full neo-border" />
      </div>

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="text-center mb-20 space-y-6">
          <div className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground neo-border-thick neo-shadow font-black text-sm uppercase tracking-wider">
            <Sparkles className="h-5 w-5" />
            How it works
          </div>
          <h2 className="text-5xl md:text-6xl font-black leading-tight">
            From zero to Kubernetes hero
            <br />
            <span className="text-primary">in 6 simple steps</span>
          </h2>
          <p className="text-xl font-bold max-w-2xl mx-auto opacity-70">
            No complex setup. No boring theory. Just hands-on learning with
            instant feedback.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div
            className="relative w-full text-left"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
            // biome-ignore lint/a11y/useSemanticElements: carousel wrapper needs role="group" without fieldset semantics
            role="group"
            aria-label="Interactive steps carousel"
          >
            <div className="relative bg-card neo-border neo-shadow p-8 md:p-12 rounded-xl transition-all duration-500 min-h-[400px] flex flex-col justify-between">
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-foreground text-background rounded-full flex items-center justify-center font-black text-2xl neo-border neo-shadow-lg">
                {currentStep + 1}
              </div>

              <div className="space-y-6 flex-1">
                <div
                  className={`inline-flex p-5 rounded-xl ${currentStepData.color} neo-border neo-shadow`}
                >
                  <Icon
                    className="h-12 w-12 text-foreground"
                    strokeWidth={2.5}
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-4xl md:text-5xl font-black text-foreground leading-tight">
                    {currentStepData.title}
                  </h3>
                  <p className="text-xl font-bold leading-relaxed opacity-70">
                    {currentStepData.description}
                  </p>
                </div>

                <div className="pt-4">
                  <div className="bg-foreground text-background p-6 rounded-xl neo-border font-mono text-base md:text-lg overflow-x-auto">
                    <span className="text-green-400 font-bold">$</span>{" "}
                    <span className="font-bold">{currentStepData.command}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-8 pt-8 neo-border-thick !border-l-0 !border-r-0 !border-b-0">
                <button
                  type="button"
                  onClick={prevStep}
                  className="p-3 bg-card neo-border neo-shadow rounded-xl hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="h-6 w-6 stroke-foreground stroke-[3]" />
                </button>

                <div className="flex gap-3">
                  {steps.map((step, index) => (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => goToStep(index)}
                      className={`transition-all neo-border ${
                        index === currentStep
                          ? "w-12 h-4 bg-primary neo-shadow"
                          : "w-4 h-4 bg-card hover:bg-primary/20"
                      } rounded-full`}
                      aria-label={`Go to step ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="p-3 bg-card neo-border neo-shadow rounded-xl hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center"
                  aria-label="Next step"
                >
                  <ChevronRight className="h-6 w-6 stroke-foreground stroke-[3]" />
                </button>
              </div>
            </div>

            {isAutoPlaying && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-bold opacity-50 flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Auto-playing
              </div>
            )}
          </div>

          <div className="text-center mt-16">
            <a
              href="/docs/user/getting-started"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md font-black text-lg neo-border neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              Start Your First Challenge
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
