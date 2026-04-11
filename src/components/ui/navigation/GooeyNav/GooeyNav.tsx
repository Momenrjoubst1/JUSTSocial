import { useRef, useEffect, useState } from 'react';
import './GooeyNav.css';

interface NavItem {
    label: string;
    href: string;
}

interface ElectricNavProps {
    items: NavItem[];
    initialActiveIndex?: number;
}

const GooeyNav = ({
    items,
    initialActiveIndex = 0
}: ElectricNavProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLUListElement>(null);
    const gliderRef = useRef<HTMLSpanElement>(null);
    const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

    const generateLightning = (element: HTMLElement) => {
        const count = Math.floor(Math.random() * 4) + 5; // 5 to 8 bolts
        
        for (let i = 0; i < count; i++) {
            const bolt = document.createElement('div');
            bolt.classList.add('lightning-bolt');
            
            // Random properties for each bolt
            const size = 30 + Math.random() * 40; // 30px to 70px
            const angle = Math.random() * 360; // 0 to 360 degrees
            const distance = 5 + Math.random() * 25; // Distance to push out
            const delay = Math.random() * 150; // Random delay for flashes
            const thickness = 1 + Math.random() * 2; // 1 to 3px thick

            bolt.style.setProperty('--bolt-size', `${size}px`);
            bolt.style.setProperty('--bolt-angle', `${angle}deg`);
            bolt.style.setProperty('--bolt-dist', `${distance}px`);
            bolt.style.setProperty('--bolt-delay', `${delay}ms`);
            bolt.style.setProperty('--bolt-thick', `${thickness}px`);

            element.appendChild(bolt);
            
            setTimeout(() => {
                try {
                    if (element.contains(bolt)) {
                        element.removeChild(bolt);
                    }
                } catch (e) {}
            }, 500 + delay);
        }
    };

    const updateEffectPosition = (element: HTMLElement, triggerLightning = false) => {
        if (!containerRef.current || !gliderRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const pos = element.getBoundingClientRect();

        const left = pos.x - containerRect.x;
        const top = pos.y - containerRect.y;

        gliderRef.current.style.left = `${left}px`;
        gliderRef.current.style.top = `${top}px`;
        gliderRef.current.style.width = `${pos.width}px`;
        gliderRef.current.style.height = `${pos.height}px`;

        if (triggerLightning) {
            generateLightning(gliderRef.current);
            gliderRef.current.classList.add('flash');
            setTimeout(() => {
                if (gliderRef.current) gliderRef.current.classList.remove('flash');
            }, 300);
        }
    };

    const handleClick = (e: any, index: number) => {
        const liEl = (e.currentTarget.tagName === 'A' ? e.currentTarget.parentElement : e.currentTarget) as HTMLElement;
        if (activeIndex === index) {
            // Even if it's currently active, generate lightning for a powerful electric feel!
            updateEffectPosition(liEl, true);
            return;
        }

        // Handle smooth scroll
        const href = items[index].href;
        if (href.startsWith('#')) {
            e.preventDefault();
            const targetId = href.substring(1);
            if (targetId === 'top') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const element = document.getElementById(targetId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }

        setActiveIndex(index);
        updateEffectPosition(liEl, true);
    };

    const handleKeyDown = (e: any, index: number) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const liEl = e.currentTarget.parentElement;
            if (liEl) {
                handleClick({ currentTarget: liEl }, index);
            }
        }
    };

    useEffect(() => {
        if (!navRef.current || !containerRef.current) return;
        const activeLi = navRef.current.querySelectorAll('li')[activeIndex];
        if (activeLi) {
            updateEffectPosition(activeLi);
        }

        const resizeObserver = new ResizeObserver(() => {
            const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex];
            if (currentActiveLi) {
                updateEffectPosition(currentActiveLi);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [activeIndex]);

    return (
        <div className="electric-nav-container" ref={containerRef}>
            <nav>
                <ul ref={navRef}>
                    {items.map((item, index) => (
                        <li key={index} className={`nav-item ${activeIndex === index ? 'active' : ''}`}>
                            <a href={item.href} onClick={e => handleClick(e, index)} onKeyDown={e => handleKeyDown(e, index)}>
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
            <span className="electric-glider" ref={gliderRef}>
                <div className="electric-sparks"></div>
            </span>
        </div>
    );
};

export default GooeyNav;
