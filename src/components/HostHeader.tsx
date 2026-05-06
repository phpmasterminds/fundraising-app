import React from 'react';
import { useIonRouter } from '@ionic/react';
import { storageUrl, getAuthUser } from '../services/storage';
import './HostHeader.css';

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

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  if (variant === 'main') {
    return (
      <div className="hh-header hh-main">
        <div className="hh-logo" onClick={onLogoClick}>
          <img src="/assets/img/logo_bg.svg" alt="logo" />
          <span>PeerFund</span>
        </div>

        <div className="hh-right">
            <img src="/assets/img/Bell.svg" alt="notifications" className="bell" onClick={() => router.push('/notification')} />
          
            <img
              src={avatarUrl || '/assets/img/profile.svg'}
              alt="profile"
			  onClick={() => router.push('/host-profile')}
              className="profile_img"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/img/profile.svg';
              }}
            />
          
        </div>
      </div>
    );
  }

  return (
    <div className="hh-header hh-back">
      <div className="hh-back-btn" onClick={handleBack}>
        <img src="/assets/img/Back.svg" alt="back" />
      </div>
      {title && <div className="hh-title">{title}</div>}
      {rightSlot && <div className="hh-right">{rightSlot}</div>}
    </div>
  );
};

export default HostHeader;