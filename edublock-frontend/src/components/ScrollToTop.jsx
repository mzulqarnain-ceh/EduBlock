import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const location = useLocation();

    useEffect(() => {
        // If navigating to home to scroll to a section, handle section scroll instead
        if (location.state?.scrollToSection) {
            const sectionId = location.state.scrollToSection;
            // Small delay to let the page render first
            setTimeout(() => {
                const element = document.getElementById(sectionId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 150);
            return;
        }

        // Default: scroll to top on route change
        window.scrollTo(0, 0);
    }, [location.pathname, location.state]);

    return null;
};

export default ScrollToTop;
