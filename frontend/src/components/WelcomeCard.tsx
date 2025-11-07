import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  ArrowUpTrayIcon,
  UserCircleIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import type { IYoung } from '../types';
import logo2 from '../assets/logos/logo_2.png';

interface WelcomeCardProps {
  young: IYoung;
  onDownload?: () => void;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({ young, onDownload }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  // URL de login con query de placa
  const loginUrl = young.placa
    ? `https://www.jovenesmodelia.com/?placa=${encodeURIComponent(young.placa)}`
    : 'https://www.jovenesmodelia.com';

  // Generar mensaje de WhatsApp (sin emojis, versión simple para compatibilidad máxima)
  const generateWhatsappMessage = () => {
    const placa = young.placa || 'SINPLACA';
    const last3 = placa.slice(-3).replace(/[^0-9]/g, '') || '000';
    const password = `Password${last3}`;
    return `¡Hola ${young.fullName}!
Bienvenido a la plataforma de jóvenes de Modelia. Te comparto tu placa y contraseña para el ingreso que necesitaremos los días sábados.

Ingresa con las credenciales de más abajo:
${loginUrl}

Placa: ${placa}
Contraseña: ${password}

Recuerda cambiar tu contraseña en tu primer ingreso.

¡Gracias!`;
  };

  const openWhatsapp = () => {
    const msg = generateWhatsappMessage();
    let waUrl: string;
    if (young.phone) {
      // Sanitizar teléfono: solo dígitos
      let digits = young.phone.replace(/\D/g, '');
      // Asumir Colombia (+57) si es un número móvil de 10 dígitos iniciando en 3
      if (digits.length === 10 && digits.startsWith('3')) {
        digits = `57${digits}`; // Agregar indicativo país sin '+' para wa.me
      } else if (digits.startsWith('57') && digits.length === 12) {
        // Ya incluye 57 y probablemente el número completo (ej: 57 3xx xxx xxxx)
        // Mantener tal cual
      }
      waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    } else {
      waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    }
    window.open(waUrl, '_blank');
  };

  const handleShare = async () => {
    if (!cardRef.current) return;

    setIsSharing(true);
    try {
      // Generar imagen del canvas (sin QR ahora)
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1E3A8A',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Convertir a blob
      canvas.toBlob(async blob => {
        if (!blob) {
          console.error('Error generando imagen');
          setIsSharing(false);
          return;
        }

        const fileName = `tarjeta_bienvenida_${young.placa || 'usuario'}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        // Intentar usar Web Share API si está disponible
        if (navigator.share) {
          try {
            // Verificar si se puede compartir el archivo
            const canShareFile =
              navigator.canShare && navigator.canShare({ files: [file] });

            if (canShareFile) {
              await navigator.share({
                title: `Bienvenido - ${young.fullName}`,
                text: generateWhatsappMessage(),
                files: [file],
              });
              setIsSharing(false);
              onDownload?.();
              return;
            }
          } catch (shareError: any) {
            // Si el usuario cancela la compartición, no es un error real
            if (shareError.name !== 'AbortError') {
              console.log(
                'Error al compartir, usando descarga como fallback:',
                shareError
              );
              // Continuar con el fallback de descarga
            } else {
              setIsSharing(false);
              return;
            }
          }
        }

        // Fallback: descargar si Web Share API no está disponible
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setIsSharing(false);
        onDownload?.();
      }, 'image/png');
    } catch (error) {
      console.error('Error al exportar imagen:', error);
      setIsSharing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Tarjeta de Bienvenida */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[400px] h-[600px] bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center p-8"
      >
        {/* Fondo decorativo sutil */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Avatar / Foto del joven */}
        <div className="relative z-10 mt-2 mb-4">
          <div className="w-32 h-32 rounded-full ring-4 ring-white/20 overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-xl">
            {young.profileImage ? (
              <img
                src={young.profileImage}
                alt={young.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-24 h-24 text-white/70" />
            )}
          </div>
        </div>

        {/* Texto bienvenida */}
        <div className="relative z-10 text-center flex flex-col items-center gap-4 flex-1 w-full">
          <h2 className="text-2xl font-semibold text-white tracking-wide">
            Bienvenido,
          </h2>
          <h3 className="text-3xl font-bold text-white drop-shadow">
            {young.fullName}
          </h3>

          {/* Placa */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 shadow-lg flex flex-col items-center w-full max-w-xs">
            <p className="text-sm text-white/80 font-medium mb-1">Tu placa</p>
            <p className="text-2xl font-bold text-white select-all">
              {young.placa || 'Sin placa'}
            </p>
          </div>

          {/* Link de ingreso */}
          <div className="mt-6 mb-4 flex flex-col items-center gap-2">
            <p className="text-white/90 text-sm font-medium">Ingresa:</p>
            <p className="text-white text-lg font-semibold select-all underline decoration-blue-300">
              www.jovenesmodelia.com
            </p>
          </div>
        </div>

        {/* Logo debajo */}
        <div className="relative z-10 mt-auto mb-4">
          <img
            src={logo2}
            alt="Logo Jóvenes Modelia"
            className="w-20 h-20 object-contain drop-shadow-lg"
          />
        </div>
      </div>

      {/* Botón de compartir */}
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUpTrayIcon className="w-5 h-5" />
          {isSharing ? 'Generando...' : 'Guardar/Compartir'}
        </button>
        <button
          onClick={openWhatsapp}
          className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg transition-all"
        >
          <ShareIcon className="w-5 h-5" /> WhatsApp
        </button>
      </div>
    </div>
  );
};

export default WelcomeCard;
