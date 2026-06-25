import React from "react";
import { Check } from "lucide-react";
interface StepperProps {
  currentStep: number;
  steps: string[];
}
export const Stepper: React.FC<StepperProps> = ({ currentStep, steps }) => {
  return (
    <div className="w-full py-6 bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center justify-between w-full">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;
              return (
                <li
                  key={step}
                  className={`relative flex flex-col items-center ${index !== steps.length - 1 ? "w-full" : ""}`}
                >
                  <div className="flex items-center w-full">
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors duration-200 ${isCompleted ? "bg-green-500 border-green-500 text-white" : isCurrent ? "bg-black border-black text-white" : "bg-white border-gray-300 text-gray-500"}`}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          stepNumber
                        )}
                      </div>
                      <span className="absolute top-10 w-32 text-center text-xs font-medium text-gray-900 hidden sm:block -ml-12">
                        {step}
                      </span>
                    </div>
                    {index !== steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 ml-4 mr-4 transition-colors duration-200 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {/* Mobile Step Label */}
          <div className="mt-4 sm:hidden text-center">
            <p className="text-sm font-medium text-gray-900">
              Step {currentStep} of {steps.length}:{" "}
              <span className="text-gray-600">{steps[currentStep - 1]}</span>
            </p>
          </div>
        </nav>
      </div>
    </div>
  );
};
