import './UserBottomNav.css';

const HomeIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const ChatIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const TicketIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a2 2 0 012-2h16a2 2 0 012 2v1a2 2 0 010 4v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-1a2 2 0 010-4V9z" />
    <line x1="9" y1="7" x2="9" y2="17" strokeDasharray="2 2" />
  </svg>
);

const ProfileIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const UserBottomNav = ({ goPage, currentPage, chatUnread = 0 }) => {
  const navItems = [
    { page: 'location', label: 'Home',   Icon: HomeIcon    },
    { page: 'chat',     label: 'Chat',        Icon: ChatIcon,  badge: chatUnread },
    { page: 'myticket', label: 'My Tickets', Icon: TicketIcon  },
    { page: 'profile',  label: 'Profile',   Icon: ProfileIcon },
  ];

  return (
    <nav className="user-bottom-nav">
      {navItems.map(({ page, label, Icon, badge }) => (
        <button
          key={page}
          className={`user-nav-item ${currentPage === page ? 'active' : ''}`}
          onClick={() => goPage(page)}
        >
          <Icon />
          {badge > 0 && (
            <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>
          )}
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default UserBottomNav;
