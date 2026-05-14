'use client';

import React from 'react';
import { TooltipRenderProps } from 'react-joyride';
import { X } from 'lucide-react';
import Image from 'next/image';

// Extended step data interface for custom properties
interface StepData {
  image?: string;
  imageAlt?: string;
}

const TourTooltip: React.FC<TooltipRenderProps> = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
  isLastStep,
}) => {
  // Extract custom data from step
  const stepData = step.data as StepData | undefined;
  const hasImage = stepData?.image;

  return (
    <div
      {...tooltipProps}
      className="bg-[#14192F] border border-[rgba(30,64,198,0.5)] rounded-2xl shadow-2xl max-w-md p-0 overflow-hidden"
      style={{
        boxShadow: '0 0 40px rgba(30, 64, 198, 0.3)',
      }}
    >
      {/* Image (if provided) */}
      {hasImage && (
        <div className="relative w-full h-40 bg-[#0A0E17]">
          <Image
            src={stepData.image!}
            alt={stepData.imageAlt || step.title?.toString() || 'Tour step'}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        {step.title && (
          <h3 className="text-white font-semibold text-lg">{step.title}</h3>
        )}
        <button
          {...closeProps}
          className="text-[#8E8E8E] hover:text-white transition-colors p-1 -mr-1"
          aria-label="Close tour"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        <p className="text-[#BBBBBB] text-sm leading-relaxed">{step.content}</p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 pb-4">
        {Array.from({ length: size }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i === index
                ? 'bg-[#1e40c6] w-6'
                : i < index
                ? 'bg-[#1e40c6]/50'
                : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Footer with buttons */}
      <div className="flex items-center justify-between px-5 py-4 bg-white/5 border-t border-white/10">
        <button
          {...skipProps}
          className="text-[#8E8E8E] text-sm hover:text-white transition-colors"
        >
          Skip tour
        </button>

        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="px-4 py-2 text-sm text-[#BBBBBB] hover:text-white border border-white/20 rounded-lg hover:border-white/40 transition-all"
            >
              Back
            </button>
          )}
          <button
            {...primaryProps}
            className="px-5 py-2 text-sm text-white bg-[#1e40c6] rounded-lg hover:bg-[#2850d6] transition-all shadow-[0_0_15px_rgba(30,64,198,0.4)]"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourTooltip;
