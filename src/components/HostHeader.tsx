import React, { useState, useEffect } from 'react';
import { useIonRouter } from '@ionic/react';
import { storageUrl, getAuthUser } from '../services/storage';
import { getNotifications } from '../services/events';
import './HostHeader.css';

const imgBase = import.meta.env.VITE_ASSETS_URL;

interface HostHeaderProps {
  variant?: 'main' | 'back';
  title?: string;
  onBack?: () => void;
  onLogoClick?: () => void;
  /** only for 'back' variant when you need something on the right (e.g. save button) */
  rightSlot?: React.ReactNode;
}

const HostHeader: React.FC<HostHeaderProps> = ({
  variant = 'main',
  title,
  onBack,
  onLogoClick,
  rightSlot,
}) => {
  const router = useIonRouter();

  const authUser = getAuthUser();
  const avatarUrl = storageUrl(authUser.avatar);

  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (variant !== 'main') return;
    let active = true;
    const load = () => {
      getNotifications()
        .then((res) => { if (active) setUnread(res.unread ?? 0); })
        .catch(() => {});
    };
    load();                          // fetch now
    const id = setInterval(load, 15000); // and refresh every 15s so new ones surface live
    return () => { active = false; clearInterval(id); };
  }, [variant]);

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  if (variant === 'main') {
    return (
      <div className="hh-header hh-main">
        <div className="hh-logo" onClick={onLogoClick}>
          <img src={`${imgBase}/logo_bg.svg?v=2`} alt="logo" />
          <span>Fundraising</span>
        </div>

        <div className="hh-right">
            <div className="hh-bell" style={{ position: 'relative', display: 'inline-flex', cursor: 'pointer' }} onClick={() => router.push('/notification')}>
              <img src={`${imgBase}/Bell.svg`} alt="notifications" className="bell" />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#E5484D', color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: '16px', textAlign: 'center', boxSizing: 'border-box', boxShadow: '0 0 0 2px #fff' }}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
          
            <img
              src={avatarUrl || `${imgBase}/profile.svg`}
              alt="profile"
			  onClick={() => router.push('/host-profile')}
              className="profile_img"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `${imgBase}/profile.svg`;
              }}
            />
          
        </div>
      </div>
    );
  }

  return (
    <div className="hh-header hh-back">
      <div className="hh-back-btn" onClick={handleBack}>
        <img src={`${imgBase}/Back.svg`} alt="back" />
      </div>
      {title && <div className="hh-title">{title}</div>}
      {rightSlot && <div className="hh-right">{rightSlot}</div>}
    </div>
  );
};

export default HostHeader;