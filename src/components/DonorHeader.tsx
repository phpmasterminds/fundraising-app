import { useIonRouter } from '@ionic/react';
import './DonorHeader.css';
import { storageUrl, getAuthUser } from '../services/storage';

interface DonorHeaderProps {
  /** 'main'  → logo + username (DEventList style)
   *  'back'  → back button + optional title + optional right slot */
  variant?: 'main' | 'back';

  /** shown next to username in 'main' variant */
  username?: string;

  /** centre title in 'back' variant */
  title?: string;

  /** right-side slot in 'back' variant (e.g. "Sign Out" text) */
  rightSlot?: React.ReactNode;

  /** click handler for the right slot (e.g. Sign Out) */
  onRightSlotClick?: () => void;

  /** override back navigation */
  onBack?: () => void;

  /** click handler for username area in 'main' variant */
  onUsernameClick?: () => void;
}

const DonorHeader: React.FC<DonorHeaderProps> = ({
  variant = 'main',
  username = 'John Doe 🐰',
  title,
  rightSlot,
  onRightSlotClick,
  onBack,
  onUsernameClick,
}) => {
  const router = useIonRouter();
  
  const authUser = getAuthUser();
  const avatarUrl = storageUrl(authUser.avatar);
  
  const aDisplayName = authUser.pseudonym;

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  if (variant === 'main') {
    return (
      <div className="dh-header dh-main">
        <div className="dh-logo">
          <img src="/assets/img/logo_bg.svg" alt="logo" />
          <span>PeerFund</span>
        </div>
		<div className="hh-right">
			{aDisplayName}
            <img
              src={avatarUrl || '/assets/img/profile.svg'}
              alt="profile"
			  onClick={() => router.push('/profile')}
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
    <div className="dh-header dh-back">
      <div className="dh-back-btn" onClick={handleBack}>
        <img src="/assets/img/Back.svg" alt="back" />
      </div>
      {title && <div className="dh-title">{title}</div>}
      {rightSlot && <div className="dh-right" onClick={onRightSlotClick}>{rightSlot}</div>}
    </div>
  );
};

export default DonorHeader;