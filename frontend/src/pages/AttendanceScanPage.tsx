import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth';
import { scanQRAndRegisterAttendance } from '../services/api';
import AttendanceModal from '../components/AttendanceModal';

interface ModalData {
  success: boolean;
  message: string;
  subtitle?: string;
  date?: string;
}

const AttendanceScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');

    // Si no hay código, redirigir a home
    if (!code) {
      navigate('/');
      return;
    }

    // Si no está autenticado, redirigir a login
    const isAuth = authService.isAuthenticated();
    if (!isAuth) {
      navigate('/login');
      return;
    }

    // Si está autenticado, intentar registrar asistencia
    handleScan(code);
  }, [searchParams, navigate]);

  const handleScan = async (code: string) => {
    setLoading(true);
    try {
      const response = await scanQRAndRegisterAttendance(code);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al registrar asistencia');
      }

      // Extraer la información relevante de la respuesta
      const attendance = data.data;
      setModalData({
        success: true,
        message: `¡Asistencia registrada!`,
        subtitle: `+${attendance.points_earned || 0} puntos`,
        date: new Date().toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      });
      setShowModal(true);
    } catch (err: any) {
      setModalData({
        success: false,
        message: 'Error al registrar',
        subtitle: err.message || 'Error procesando el código QR',
      });
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Redirigir al dashboard correspondiente según rol
    const userInfo = authService.getUserInfo();
    if (userInfo?.role_name === 'Super Admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            Procesando asistencia...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {modalData && (
        <AttendanceModal
          isOpen={showModal}
          onClose={handleClose}
          success={modalData.success}
          message={modalData.message}
          subtitle={modalData.subtitle}
          date={modalData.date}
        />
      )}
    </div>
  );
};

export default AttendanceScanPage;
