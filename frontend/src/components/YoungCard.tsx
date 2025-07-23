import React from 'react';
import type { IYoung } from '../types';

interface YoungCardProps {
  young: IYoung;
  onDelete: (id: string) => void;
  onEdit: (young: IYoung) => void;
}

const YoungCard: React.FC<YoungCardProps> = ({ young, onDelete, onEdit }) => {
  const handleDelete = () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar a ${young.fullName}?`)) {
      onDelete(young.id!);
    }
  };

  const handleEdit = () => {
    onEdit(young);
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
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center overflow-hidden">
              {young.profileImage ? (
                <img
                  src={young.profileImage}
                  alt={young.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{young.fullName}</h3>
              <p className="text-blue-100">{capitalizeRole(young.role)}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="text-white hover:text-blue-200 transition-colors p-1"
              title="Editar joven"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            <button
              onClick={handleDelete}
              className="text-white hover:text-red-200 transition-colors p-1"
              title="Eliminar joven"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
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
            <span className="ml-2 text-gray-800 capitalize">{young.gender}</span>
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
    </div>
  );
};

export default YoungCard;