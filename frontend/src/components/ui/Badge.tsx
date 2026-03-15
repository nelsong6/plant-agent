const variantClasses: Record<string, string> = {
  water: 'bg-water/10 text-water',
  watered: 'bg-water/10 text-water',
  fertilize: 'bg-fertilize/10 text-fertilize',
  fertilized: 'bg-fertilize/10 text-fertilize',
  repot: 'bg-repot/10 text-repot',
  repotted: 'bg-repot/10 text-repot',
  prune: 'bg-prune/10 text-prune',
  pruned: 'bg-prune/10 text-prune',
  analysis: 'bg-analysis/10 text-analysis',
  note: 'bg-note/10 text-note',
  high: 'bg-urgency-high/10 text-urgency-high',
  medium: 'bg-urgency-medium/10 text-urgency-medium',
  low: 'bg-urgency-low/10 text-urgency-low',
};

interface BadgeProps {
  variant: string;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  const colors = variantClasses[variant] ?? 'bg-bark-100 dark:bg-bark-700 text-bark-600 dark:text-bark-300';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors} ${className}`}>
      {children}
    </span>
  );
}
