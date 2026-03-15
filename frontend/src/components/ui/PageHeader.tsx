interface PageHeaderProps {
  title: string;
  count?: number;
  action?: React.ReactNode;
}

export function PageHeader({ title, count, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-bark-900 dark:text-bark-50">{title}</h1>
        {count != null && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bark-100 dark:bg-bark-700 text-bark-600 dark:text-bark-300">
            {count}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
