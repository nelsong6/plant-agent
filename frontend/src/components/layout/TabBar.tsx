// Vertical sidebar tab navigation — matches eight-queens / bender-world / kill-me pattern.
// Overlapping-border trick: active tab's right border is removed and extends over
// the sidebar's right edge, visually connecting to the content area.

import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Plants' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/photos', label: 'Photos' },
];

// Inline styles for the overlapping-border trick (not expressible in pure Tailwind)
const wrapperBase: React.CSSProperties = {
  padding: '1px 0 1px 1px',
  position: 'relative',
  marginBottom: -1,
  zIndex: 0,
};

const wrapperActive: React.CSSProperties = {
  padding: 0,
  borderLeft: '1px solid var(--color-bark-200)',
  borderTop: '1px solid var(--color-bark-200)',
  borderBottom: '1px solid var(--color-bark-200)',
  borderRight: 'none',
  backgroundColor: 'var(--color-bark-50)',
  marginRight: -1,
  zIndex: 1,
};

const wrapperActiveDark: React.CSSProperties = {
  ...wrapperActive,
  borderLeftColor: 'var(--color-bark-700)',
  borderTopColor: 'var(--color-bark-700)',
  borderBottomColor: 'var(--color-bark-700)',
  backgroundColor: 'var(--color-bark-900)',
};

export function TabBar() {
  const { pathname } = useLocation();
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="flex flex-col items-stretch pb-4">
      {tabs.map((tab, index) => {
        const isActive = tab.to === '/'
          ? pathname === '/' || pathname.startsWith('/plants/')
          : pathname.startsWith(tab.to);

        const activeStyle = isDark ? wrapperActiveDark : wrapperActive;

        return (
          <div
            key={tab.to}
            style={{
              ...wrapperBase,
              ...(isActive ? activeStyle : {}),
              ...(isActive && index === 0 ? { borderTop: 'none' } : {}),
            }}
          >
            <Link
              to={tab.to}
              className={`block w-full px-4 py-2.5 text-xs font-mono tracking-wide text-left no-underline whitespace-nowrap ${
                isActive
                  ? 'text-bark-900 dark:text-bark-50 font-bold'
                  : 'text-bark-400 dark:text-bark-500 hover:text-bark-600 dark:hover:text-bark-300'
              }`}
            >
              {tab.label}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
