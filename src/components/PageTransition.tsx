import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <div className="animate-fade-in w-full">
      {children}
    </div>
  );
};

export default PageTransition;
