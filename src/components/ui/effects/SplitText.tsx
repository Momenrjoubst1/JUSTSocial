import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: 'chars' | 'words' | 'words, chars';
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  tag?: keyof React.JSX.IntrinsicElements;
  onLetterAnimationComplete?: () => void;
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '0px',
  textAlign = 'center',
  tag = 'p',
  onLetterAnimationComplete
}) => {
  const ref = useRef<HTMLElement>(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);

  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useGSAP(
    () => {
      if (!ref.current || !text) return;
      if (animationCompletedRef.current) return;
      
      const el = ref.current;
      const targets = splitType === 'chars' || splitType === 'words, chars'
         ? el.querySelectorAll('.split-char') 
         : el.querySelectorAll('.split-word');

      if (targets.length === 0) return;

      gsap.fromTo(
        targets,
        { ...from },
        {
          ...to,
          duration,
          ease,
          stagger: delay / 1000,
          scrollTrigger: {
            trigger: el,
            start: 'top 95%', // Trigger earlier
            once: true,
          },
          onComplete: () => {
            animationCompletedRef.current = true;
            onCompleteRef.current?.();
          },
        }
      );

      return () => {
        ScrollTrigger.getAll().forEach(st => {
          if (st.trigger === el) st.kill();
        });
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
      ],
      scope: ref
    }
  );

  const style: React.CSSProperties = {
    textAlign,
    display: 'inline-block',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    position: 'relative'
  };

  const Tag = tag as any;

  return (
    <Tag ref={ref} style={style} className={`split-parent ${className}`}>
      {text.split(' ').map((word, wIdx) => (
        <span key={wIdx} className="split-word" style={{ display: 'inline-block', whiteSpace: 'pre', position: 'relative' }}>
          {(splitType === 'chars' || splitType === 'words, chars') ? (
            word.split('').map((char, cIdx) => (
              <span key={cIdx} className="split-char" style={{ display: 'inline-block', position: 'relative' }}>
                {char}
              </span>
            ))
          ) : (
            word
          )}
          {wIdx !== text.split(' ').length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
};

export default SplitText;
