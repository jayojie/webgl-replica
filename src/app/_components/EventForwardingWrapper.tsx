"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface EventForwardingWrapperProps {
  children: ReactNode;
  className?: string;
}

export function EventForwardingWrapper({ children, className = "" }: EventForwardingWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Find the canvas element (our WebGL background)
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const forwardMouseEvent = (e: MouseEvent) => {
      // Check if the event target is an interactive element
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('a, button, input, select, textarea, [role="button"]');

      // If it's an interactive element, don't forward the event
      if (isInteractive) {
        return;
      }

      // Create a new mouse event with the same properties
      const forwardedEvent = new MouseEvent(e.type, {
        bubbles: e.bubbles,
        cancelable: e.cancelable,
        view: e.view,
        detail: e.detail,
        screenX: e.screenX,
        screenY: e.screenY,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        button: e.button,
        buttons: e.buttons,
        relatedTarget: e.relatedTarget
      });

      // Dispatch the event on the canvas
      canvas.dispatchEvent(forwardedEvent);
    };

    const forwardTouchEvent = (e: TouchEvent) => {
      // Check if the event target is an interactive element
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('a, button, input, select, textarea, [role="button"]');

      // If it's an interactive element, don't forward the event
      if (isInteractive) {
        return;
      }

      // Forward touch events directly to canvas by creating a synthetic event
      console.log('Forwarding touch event:', e.type, 'touches:', e.touches.length);

      // Create a synthetic touch event with the same coordinates
      if (e.touches.length > 0 || e.changedTouches.length > 0) {
        const touch = e.touches.length > 0 ? e.touches[0] : e.changedTouches[0];
        if (touch) {
          // Create a synthetic touch event that our canvas handlers can process
          const syntheticEvent = new TouchEvent(e.type, {
            bubbles: true,
            cancelable: true,
            touches: e.touches,
            targetTouches: e.targetTouches,
            changedTouches: e.changedTouches
          } as any); // Use any to bypass TypeScript issues

          // Set the coordinates manually
          Object.defineProperty(syntheticEvent, 'touches', {
            value: e.touches,
            writable: false
          });
          Object.defineProperty(syntheticEvent, 'changedTouches', {
            value: e.changedTouches,
            writable: false
          });

          canvas.dispatchEvent(syntheticEvent);
        }
      }
    };

    // Add event listeners for mouse events
    wrapper.addEventListener('mousemove', forwardMouseEvent);
    wrapper.addEventListener('mouseenter', forwardMouseEvent);
    wrapper.addEventListener('mouseleave', forwardMouseEvent);

    // Add event listeners for touch events with passive: false to allow preventDefault
    wrapper.addEventListener('touchmove', (e) => {
      e.preventDefault(); // Prevent scrolling
      forwardTouchEvent(e);
    }, { passive: false });
    wrapper.addEventListener('touchstart', forwardTouchEvent);
    wrapper.addEventListener('touchend', forwardTouchEvent);

    // Cleanup
    return () => {
      wrapper.removeEventListener('mousemove', forwardMouseEvent);
      wrapper.removeEventListener('mouseenter', forwardMouseEvent);
      wrapper.removeEventListener('mouseleave', forwardMouseEvent);
      wrapper.removeEventListener('touchmove', forwardTouchEvent);
      wrapper.removeEventListener('touchstart', forwardTouchEvent);
      wrapper.removeEventListener('touchend', forwardTouchEvent);
    };
  }, []);

  return (
    <div ref={wrapperRef} className={className}>
      {children}
    </div>
  );
}
