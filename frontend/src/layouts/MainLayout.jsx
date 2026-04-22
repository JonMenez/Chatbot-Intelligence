import { Outlet } from 'react-router-dom';
import { ChatNavbar } from '../components/Chat/ChatNavbar.jsx';
import { MobileNav } from '../components/Chat/MobileNav.jsx';

export function MainLayout() {
  const shell = 'relative z-[1] max-w-4xl mx-auto w-full px-6';

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-on-surface font-body">
      <div className="ethereal-stage" aria-hidden />

      <ChatNavbar shellClassName={shell} />

      <Outlet context={{ shell }} />

      <MobileNav />
    </div>
  );
}
