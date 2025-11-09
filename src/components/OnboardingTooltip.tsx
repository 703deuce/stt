'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

interface OnboardingTooltipProps {
  targetId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onComplete: () => void;
  onDismiss: () => void;
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
    zIndex: 10002,
  });
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

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

      let top = 0;
      let left = 0;
      const gap = 20; // Minimum gap between tooltip and target element

      // Calculate initial position based on preferred position
      switch (position) {
        case 'top':
          top = targetRect.top - tooltipRect.height - gap;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
          top = targetRect.bottom + gap;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.left - tooltipRect.width - gap;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.right + gap;
          break;
      }

      // Check if tooltip overlaps with target element
      const tooltipRectCalculated = {
        top,
        left,
        bottom: top + tooltipRect.height,
        right: left + tooltipRect.width
      };

      const overlaps = (
        tooltipRectCalculated.left < targetRect.right &&
        tooltipRectCalculated.right > targetRect.left &&
        tooltipRectCalculated.top < targetRect.bottom &&
        tooltipRectCalculated.bottom > targetRect.top
      );

      // If overlaps, try alternative positions
      if (overlaps) {
        // Try opposite side first
        if (position === 'bottom') {
          top = targetRect.top - tooltipRect.height - gap;
        } else if (position === 'top') {
          top = targetRect.bottom + gap;
        } else if (position === 'right') {
          left = targetRect.left - tooltipRect.width - gap;
        } else if (position === 'left') {
          left = targetRect.right + gap;
        }

        // Recalculate overlap
        const newOverlap = (
          left < targetRect.right &&
          left + tooltipRect.width > targetRect.left &&
          top < targetRect.bottom &&
          top + tooltipRect.height > targetRect.top
        );

        // If still overlaps, position to the side with more space
        if (newOverlap) {
          const spaceAbove = targetRect.top;
          const spaceBelow = window.innerHeight - targetRect.bottom;
          const spaceLeft = targetRect.left;
          const spaceRight = window.innerWidth - targetRect.right;

          if (spaceRight > spaceLeft && spaceRight > Math.max(spaceAbove, spaceBelow)) {
            // Position to the right
            left = targetRect.right + gap;
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          } else if (spaceLeft > spaceRight && spaceLeft > Math.max(spaceAbove, spaceBelow)) {
            // Position to the left
            left = targetRect.left - tooltipRect.width - gap;
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          } else if (spaceAbove > spaceBelow) {
            // Position above
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          } else {
            // Position below
            top = targetRect.bottom + gap;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          }
        }
      }

      // Ensure tooltip stays within viewport (but never overlaps target)
      const padding = 16;
      if (left < padding) {
        left = Math.max(padding, targetRect.right + gap);
      }
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = Math.min(window.innerWidth - tooltipRect.width - padding, targetRect.left - tooltipRect.width - gap);
      }
      if (top < padding) {
        top = Math.max(padding, targetRect.bottom + gap);
      }
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = Math.min(window.innerHeight - tooltipRect.height - padding, targetRect.top - tooltipRect.height - gap);
      }

      // Final overlap check - if still overlaps, position at a safe distance
      const finalOverlap = (
        left < targetRect.right &&
        left + tooltipRect.width > targetRect.left &&
        top < targetRect.bottom &&
        top + tooltipRect.height > targetRect.top
      );

      if (finalOverlap) {
        // Last resort: position below with extra gap
        top = targetRect.bottom + gap + 20;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
      }

      // Spotlight (target highlight)
      const spotlightPadding = 12;
      setSpotlightStyle({
        position: 'fixed',
        top: targetRect.top - spotlightPadding,
        left: targetRect.left - spotlightPadding,
        width: targetRect.width + spotlightPadding * 2,
        height: targetRect.height + spotlightPadding * 2,
        borderRadius: '14px',
        pointerEvents: 'none',
        transition: 'all 0.2s ease',
        zIndex: 10001,
      });

      setPositionStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 10002,
      });
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
      {/* Background click catcher */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => onDismiss()}
      />

      {/* Spotlight highlight */}
      {spotlightStyle && (
        <div
          className="pointer-events-none shadow-[0_0_0_2000px_rgba(15,23,42,0.55)] border border-purple-400/60 backdrop-blur-sm"
          style={spotlightStyle}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={positionStyle}
        className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex-1">
            {step && totalSteps && (
              <div className="text-xs font-medium text-purple-500 mb-1 tracking-wide">
                Step {step} of {totalSteps}
              </div>
            )}
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={() => onDismiss()}
            className="ml-3 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          {description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => onDismiss()}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Skip this step
          </button>
          <button
            onClick={() => onComplete()}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all font-medium text-sm shadow-md"
          >
            {step === totalSteps ? 'Finish' : 'Got it'}
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

