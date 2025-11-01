import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { IYoung } from '../types';
import logo2 from '../assets/logos/logo_2.png';

interface WelcomeCardProps {
  young: IYoung;
  onDownload?: () => void;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({ young, onDownload }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Generar URL de login con la placa para acceso rápido
  // Como la app usa App.tsx para manejar rutas, simplemente apuntamos a la raíz
  // y el componente Login leerá los query params
  const loginUrl = young.placa
    ? `${window.location.origin}?placa=${encodeURIComponent(young.placa)}`
    : `${window.location.origin}`;

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setIsDownloading(true);
    try {
      // Generar imagen del canvas
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#3B82F6',
        scale: 2, // Mejor calidad para exportar
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Convertir a blob y descargar
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Error generando imagen');
          setIsDownloading(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tarjeta_bienvenida_${young.placa || 'usuario'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setIsDownloading(false);
        onDownload?.();
      }, 'image/png');
    } catch (error) {
      console.error('Error al exportar imagen:', error);
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Tarjeta de Bienvenida */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[400px] h-[600px] bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center justify-between p-8"
        style={{
          backgroundColor: '#3B82F6',
          backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
        }}
      >
        {/* Patrón decorativo de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* Contenido */}
        <div className="relative z-10 flex flex-col items-center justify-between h-full w-full">
          {/* Logo */}
          <div className="flex-shrink-0 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
              <img
                src={logo2}
                alt="Logo Jóvenes Modelia"
                className="w-24 h-24 object-contain"
              />
            </div>
          </div>

          {/* Información del joven */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
            {/* Nombre */}
            <h2 className="text-3xl font-bold text-white drop-shadow-lg leading-tight">
              {young.fullName}
            </h2>

            {/* Placa */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg">
              <p className="text-sm text-white/80 font-medium mb-1">Tu placa</p>
              <p className="text-2xl font-bold text-white">
                {young.placa || 'Sin placa'}
              </p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex-shrink-0 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-2xl">
              <QRCodeSVG
                value={loginUrl}
                size={180}
                level="H"
                includeMargin={true}
                fgColor="#1F2937"
                bgColor="#FFFFFF"
              />
            </div>
            <p className="text-center mt-3 text-white/90 text-sm font-medium">
              QR para iniciar sesión
            </p>
          </div>
        </div>
      </div>

      {/* Botón de descarga */}
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowDownTrayIcon className="w-5 h-5" />
        {isDownloading ? 'Generando...' : 'Descargar tarjeta'}
      </button>
    </div>
  );
};

export default WelcomeCard;

