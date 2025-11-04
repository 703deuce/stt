'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowRight, CheckCircle } from 'lucide-react';

interface OnboardingTooltipProps {
  targetId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onComplete: (dontShowAgain?: boolean) => void;
  onDismiss: (dontShowAgain?: boolean) => void;
  step?: number;
  totalSteps?: number;
}

export default function OnboardingTooltip({
  targetId,
  title,
  description,
  position = 'bottom',
  onComplete,
  onDismiss,
  step,
  totalSteps
}: OnboardingTooltipProps) {
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10002
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const targetElement = document.getElementById(targetId);
      if (!targetElement) {
        console.warn('⚠️ [OnboardingTooltip] Target element not found:', targetId);
        return;
      }

      if (!tooltipRef.current) {
        console.warn('⚠️ [OnboardingTooltip] Tooltip ref not available');
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      console.log('📍 [OnboardingTooltip] Positioning tooltip for:', targetId, 'position:', position);
      console.log('📍 [OnboardingTooltip] Target rect:', targetRect);
      console.log('📍 [OnboardingTooltip] Tooltip rect:', tooltipRect);

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = targetRect.top - tooltipRect.height - 12;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
          top = targetRect.bottom + 12;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.left - tooltipRect.width - 12;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.right + 12;
          break;
      }

      // Ensure tooltip stays within viewport
      const padding = 16;
      if (left < padding) left = padding;
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding;
      }

      setPositionStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 10002
      });

      console.log('✅ [OnboardingTooltip] Tooltip positioned at:', { top, left });
    };

    // Initial render - wait for tooltip to be in DOM
    const timer1 = setTimeout(() => {
      updatePosition();
      
      // Update position again after a short delay to ensure dimensions are correct
      const timer2 = setTimeout(() => {
        updatePosition();
      }, 50);
    }, 100);

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer1);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [targetId, position]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[9999]"
        onClick={() => onDismiss(dontShowAgain)}
      />
      
      {/* Highlight target element */}
      <style>{`
        #${targetId} {
          position: relative;
          z-index: 10000 !important;
          box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.5) !important;
          border-radius: 8px;
        }
      `}</style>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={positionStyle}
        className="bg-white rounded-lg shadow-2xl border-2 border-purple-500 p-6 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {step && totalSteps && (
              <div className="text-xs font-medium text-purple-600 mb-1">
                Step {step} of {totalSteps}
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={() => onDismiss(dontShowAgain)}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          {description}
        </p>

        {/* Do not show again checkbox */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
            />
            <span className="text-sm text-gray-600">
              Do not show this again
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => onDismiss(dontShowAgain)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {dontShowAgain ? 'Skip onboarding' : 'Skip this step'}
          </button>
          <button
            onClick={() => onComplete(dontShowAgain)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium text-sm shadow-lg"
          >
            {step === totalSteps ? 'Finish' : 'Got it'}
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

