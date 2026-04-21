import { NavLink } from 'react-router-dom';

export function MobileNav() {
  const navItems = [
    { path: '/chat', icon: 'chat_bubble', label: 'Chat' },
    { path: '/memory', icon: 'database', label: 'Memory' },
    { path: '/discover', icon: 'explore', label: 'Discover' },
    { path: '/profile', icon: 'person', label: 'Profile' }
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-8 pt-4 pb-8 rounded-t-[3rem] border-t ghost-border glass-panel"
      style={{
        boxShadow: '0 -24px 48px rgba(0, 0, 0, 0.4)',
      }}
    >
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => 
            `flex flex-col items-center transition-all ${
              isActive 
                ? 'text-primary relative' 
                : 'text-on-surface-variant/40 hover:text-primary/90 active:scale-95'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span className={`font-label text-[10px] uppercase tracking-[0.18em] mt-1 ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" aria-hidden />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

