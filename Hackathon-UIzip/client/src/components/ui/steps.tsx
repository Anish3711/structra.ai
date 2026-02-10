import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Steps({ steps, currentStep, className }: StepsProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex flex-col md:flex-row justify-between w-full">
        {/* Connecting Line (Desktop) */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 hidden md:block -z-10" />
        
        {steps.map((step, index) => {
          const isCompleted = currentStep > index + 1;
          const isCurrent = currentStep === index + 1;
          
          return (
            <div 
              key={step.id} 
              className={cn(
                "flex md:flex-col items-center gap-4 md:gap-2 bg-background md:bg-transparent p-2 md:p-0 rounded-lg md:rounded-none transition-all duration-300",
                isCurrent ? "scale-105 md:scale-100" : "opacity-70 md:opacity-100"
              )}
            >
              <motion.div 
                initial={false}
                animate={{
                  backgroundColor: isCompleted || isCurrent ? "hsl(var(--primary))" : "hsl(var(--muted))",
                  borderColor: isCompleted || isCurrent ? "hsl(var(--primary))" : "hsl(var(--border))",
                }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-300",
                  (isCompleted || isCurrent) ? "text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground bg-white"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <span className="font-bold">{step.id}</span>}
              </motion.div>
              
              <div className="flex flex-col md:items-center text-left md:text-center">
                <span className={cn(
                  "text-sm font-semibold transition-colors duration-300",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
                <span className="text-xs text-muted-foreground hidden md:block">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
