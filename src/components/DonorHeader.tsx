import { useIonRouter } from '@ionic/react';
import './DonorHeader.css';
import { storageUrl, getAuthUser } from '../services/storage';

const imgBase = import.meta.env.VITE_ASSETS_URL;

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
          <img src={`${imgBase}/logo_bg.svg?v=2`} alt="logo" />
          <span>Fundraising</span>
        </div>
		<div className="hh-right">
			{aDisplayName}
            <img
              src={avatarUrl || `${imgBase}/profile.svg`}
              alt="profile"
			  onClick={() => router.push('/profile')}
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
    <div className="dh-header dh-back">
      <div className="dh-back-btn" onClick={handleBack}>
        <img src={`${imgBase}/Back.svg`} alt="back" />
      </div>
      {title && <div className="dh-title">{title}</div>}
      {rightSlot && <div className="dh-right" onClick={onRightSlotClick}>{rightSlot}</div>}
    </div>
  );
};

export default DonorHeader;