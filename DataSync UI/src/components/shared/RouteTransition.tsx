import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

interface RouteTransitionProps {
  children: React.ReactNode;
  minDelay?: number;
}

const RouteTransition: React.FC<RouteTransitionProps> = ({ 
  children, 
  minDelay = 750 
}) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const startTime = Date.now();

    const checkDelay = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= minDelay) {
        setIsLoading(false);
      } else {
        setTimeout(() => {
          checkDelay();
        }, minDelay - elapsed);
      }
    };

    checkDelay();
  }, [location.pathname, minDelay]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
};

export default RouteTransition;
