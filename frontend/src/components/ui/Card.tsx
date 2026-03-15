interface CardProps {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, hover, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-bark-800 rounded-xl border border-bark-100 dark:border-bark-700 shadow-sm overflow-hidden ${
        hover ? 'hover:shadow-md hover:border-leaf-200 transition-all cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
