import React from 'react';
import TeamsLogo from '../../assets/icons/TeamsLogo.svg';
import OutlookIcon from '../../assets/icons/OutlookIcon.svg';

const UserProfilePopup = ({ user, anchorRef, visible, onMouseEnter, onMouseLeave }) => {
  if (!user || !visible) return null;

  // Position the popup below the anchor element
  const rect = anchorRef?.current?.getBoundingClientRect();
  const style = rect
    ? {
        position: 'absolute',
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        zIndex: 9999,
      }
    : { display: 'none' };

  return (
    <div
      className="bg-white border border-gray-300 rounded shadow-lg p-4 min-w-[220px]"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="font-bold text-base mb-1">{user.fullName || user.email.split('@')[0]}</div>
      <div className="text-sm text-gray-700 mb-2">{user.email}</div>
      <div className="flex gap-3">
        <a href={`mailto:${user.email}`} title="Send Email">
          <img src={OutlookIcon} alt="Outlook" className="w-5 h-5 hover:opacity-80" />
        </a>
        <a
          href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(user.email)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat in Microsoft Teams"
        >
          <img src={TeamsLogo} alt="Teams" className="w-5 h-5 hover:opacity-80" />
        </a>
      </div>
    </div>
  );
};

export default UserProfilePopup; 