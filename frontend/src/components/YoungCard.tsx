import React, { useState } from 'react';
import type { IYoung } from '../types';
import ImageModal from './ImageModal';

// Mapeo de colores por grupo
const getGroupColor = (group?: number | null): string => {
  switch (group) {
    case 1: return '#34C759'; // green
    case 2: return '#FF9500'; // orange
    case 3: return '#FFCC00'; // yellow
    case 4: return '#0EA5E9'; // blue-ish
    case 5: return '#9CA3AF'; // gray
    default: return '#7C3AED'; // violet for unspecified
  }
};

interface YoungCardProps {
  young: IYoung;
  onDelete: (id: string) => void;
  onEdit: (young: IYoung) => void;
}

const YoungCard: React.FC<YoungCardProps> = ({ young, onDelete, onEdit }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar a ${young.fullName}?`)) {
      onDelete(young.id!);
    }
  };

  const handleEdit = () => {
    onEdit(young);
  };

  const handleImageClick = () => {
    if (young.profileImage) {
      setIsModalOpen(true);
    }
  };

  const formatDate = (date: Date | string) => {
    // Si viene como string, parsearlo correctamente evitando problemas de zona horaria
    let d: Date;
    if (typeof date === 'string') {
      // Para fechas en formato YYYY-MM-DD, agregar la hora local para evitar problemas de zona horaria
      const dateParts = date.split('T')[0]; // Tomar solo la parte de fecha
      d = new Date(dateParts + 'T12:00:00'); // Agregar mediodía para evitar cambios de zona horaria
    } else {
      d = new Date(date);
    }
    
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const capitalizeRole = (role: string) => {
    return role.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      {/* Header con imagen de perfil */}
      <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative" style={{ width: 64, height: 64 }}>
              <div
                className={`w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center ${
                  young.profileImage ? 'cursor-pointer' : ''
                } overflow-hidden group`}
                onClick={handleImageClick}
              >
                {young.profileImage ? (
                  <>
                    <img
                      src={young.profileImage}
                      alt={young.fullName}
                      className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center rounded-full">
                      <svg
                        className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}

              </div>

              <div style={{ position: 'absolute', bottom: -4, right: -4, zIndex: 30 }}>
                <span
                  title={young.group ? `Grupo ${young.group}` : 'Sin grupo'}
                  className={`inline-block w-3 h-3 rounded-full border-2 border-white`}
                  style={{ backgroundColor: getGroupColor(young.group) }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold">{young.fullName}</h3>
              <p className="text-blue-100">{capitalizeRole(young.role)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cuerpo con información */}
      <div className="p-6 space-y-4">
        {/* Información básica */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 font-medium">Edad:</span>
            <span className="ml-2 text-gray-800">{young.ageRange} años</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Género:</span>
            <span className="ml-2 text-gray-800 capitalize">
              {young.gender || 'No especificado'}
            </span>
          </div>
        </div>

        {/* Contacto */}
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-gray-800">{young.phone}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            <span className="text-gray-800">{young.email}</span>
          </div>

          <div className="flex items-center text-sm">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l1 12a2 2 0 002 2h2a2 2 0 002-2l1-12m-6 0H6a2 2 0 00-2 2v0a2 2 0 002 2h1" />
            </svg>
            <span className="text-gray-800">{formatDate(young.birthday)}</span>
          </div>
        </div>

        {/* Habilidades */}
        {young.skills && young.skills.length > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-500 block mb-2">Habilidades:</span>
            <div className="flex flex-wrap gap-2">
              {young.skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fecha de registro */}
        <div className="pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Registrado el {formatDate(young.createdAt || new Date())}
          </span>
        </div>
      </div>

      {/* Modal para mostrar imagen */}
      {young.profileImage && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={young.profileImage}
          altText={`Foto de perfil de ${young.fullName}`}
        />
      )}
    </div>
  );
};

export default YoungCard;