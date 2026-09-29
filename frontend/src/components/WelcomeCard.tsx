import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  ArrowUpTrayIcon,
  UserCircleIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import type { IYoung } from '../types';
import logo2 from '../assets/logos/logo.png';
import { buildLoginUrl } from '../utils/loginUrl';

interface WelcomeCardProps {
  young: IYoung;
  onDownload?: () => void;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({ young, onDownload }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  // URL de login con query de placa
  const loginUrl = buildLoginUrl(young.placa);

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
        backgroundColor: '#140B10',
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
      {/* Tarjeta de Bienvenida (se exporta como imagen: sin texto con degradado) */}
      <div
        ref={cardRef}
        className="relative flex h-[600px] w-full max-w-[400px] flex-col overflow-hidden rounded-[32px] bg-ink-950 p-8 text-white shadow-2xl"
      >
        <div className="pointer-events-none absolute -right-28 -top-32 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.45)_0%,rgba(20,11,16,0)_65%)]" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(138,28,69,.5)_0%,rgba(20,11,16,0)_65%)]" />

        <div className="relative z-10 flex items-center gap-2.5">
          <img src={logo2} alt="Logo Jóvenes Modelia" className="h-9 w-9 object-contain" />
          <span className="font-display text-xs tracking-[0.28em] text-white/60">JÓVENES MODELIA</span>
        </div>

        <div className="relative z-10 mt-7 flex items-center gap-4">
          <span className="block h-24 w-24 flex-shrink-0 rounded-full bg-[linear-gradient(135deg,#F9A23B,#DC3340,#8A1C45)] p-1">
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-ink-950 bg-ink-800">
              {young.profileImage ? (
                <img src={young.profileImage} alt={young.fullName} className="h-full w-full object-cover" />
              ) : (
                <UserCircleIcon className="h-16 w-16 text-white/60" />
              )}
            </span>
          </span>
        </div>

        <div className="relative z-10 mt-6 flex flex-1 flex-col gap-4">
          <h2 className="m-0 font-display text-[34px] font-bold uppercase leading-none">
            Bienvenido,
            <span className="mt-1 block text-brand-amber">{young.fullName}</span>
          </h2>
          <p className="m-0 text-sm text-white/70">Ingresa con las credenciales de más abajo:</p>
          <div className="flex flex-col gap-2 rounded-[18px] border border-white/10 bg-white/[0.06] px-5 py-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">Tu placa</span>
            <span className="select-all font-mono text-2xl font-semibold text-brand-amber">
              {young.placa || 'Sin placa'}
            </span>
            <span className="text-[13px] text-white/70">
              Ingresa: <strong className="select-all text-white">www.jovenesmodelia.com/login</strong>
            </span>
          </div>
          <p className="m-0 mt-auto text-xs text-white/55">
            Recuerda cambiar tu contraseña en tu primer ingreso.
          </p>
        </div>
      </div>

      {/* Botón de compartir */}
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="btn-fire h-12 px-5 text-sm disabled:cursor-not-allowed"
        >
          <ArrowUpTrayIcon className="w-5 h-5" />
          {isSharing ? 'Generando...' : 'Guardar/Compartir'}
        </button>
        <button
          onClick={openWhatsapp}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-105"
        >
          <ShareIcon className="w-5 h-5" /> WhatsApp
        </button>
      </div>
    </div>
  );
};

export default WelcomeCard;
