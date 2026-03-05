import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegistrationModal from '../components/RegistrationModal';
import { useToast } from '../hooks/useToast';

/**
 * Public registration page for handling deep-linked referral invitations
 * Displays the registration modal directly and handles the ?referredBy query parameter
 */
function RegistrationPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isOpen] = useState(true);

  const handleClose = () => {
    // Redirect to login page when registration is closed
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RegistrationModal
        isOpen={isOpen}
        onClose={handleClose}
        showToast={showToast}
      />
    </div>
  );
}

export default RegistrationPage;
