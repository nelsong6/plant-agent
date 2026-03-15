interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-bark-300 dark:text-bark-600 mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-bark-700 dark:text-bark-200">{title}</h3>
      {description && <p className="mt-1 text-sm text-bark-500 dark:text-bark-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
