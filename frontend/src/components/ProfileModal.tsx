import React, { useState, useEffect } from 'react';
import type { IYoung } from '../types';
import { apiUpload } from '../services/api';
import { authService } from '../services/auth';
import PhoneInput from './PhoneInput';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  young: IYoung | null;
  onProfileUpdated: (updatedYoung: IYoung) => void;
}

interface ProfileFormData {
  fullName: string;
  phone: string;
  birthday: string;
  email: string;
  profileImage?: File;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  young,
  onProfileUpdated
}) => {
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    phone: '',
    birthday: '',
    email: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 ProfileModal - young changed:', young);
    if (young) {
      let birthdayValue = '';
      if (young.birthday) {
        const date = typeof young.birthday === 'string' ? new Date(young.birthday) : young.birthday;
        birthdayValue = date.toISOString().split('T')[0];
      }
      
      setFormData({
        fullName: young.fullName || '',
        phone: young.phone || '',
        birthday: birthdayValue,
        email: young.email || ''
      });
      setPreviewUrl(young.profileImage || null);
      console.log('✅ ProfileModal - formData set:', {
        fullName: young.fullName,
        phone: young.phone,
        birthday: birthdayValue,
        email: young.email,
        profileImage: young.profileImage
      });
    }
  }, [young]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (phone: string) => {
    setFormData(prev => ({
      ...prev,
      phone
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!young) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('fullName', formData.fullName);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('birthday', formData.birthday);
      formDataToSend.append('email', formData.email);
      
      if (selectedFile) {
        formDataToSend.append('profileImage', selectedFile);
      }

      const response = await apiUpload(`/young/${young.id}`, formDataToSend, {
        method: 'PUT'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess('Perfil actualizado exitosamente');
          
          // Actualizar localStorage con la información actualizada
          authService.updateUserInfo(result.data);
          
          onProfileUpdated(result.data);
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          throw new Error(result.message || 'Error al actualizar el perfil');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el perfil');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !young) {
    console.log('🚫 ProfileModal - not rendering:', { isOpen, young: !!young });
    return null;
  }

  console.log('✅ ProfileModal - rendering modal for user:', young.fullName);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Mi Perfil</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Photo Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto de Perfil
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Foto de perfil"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Haz clic en el ícono del lápiz para cambiar tu foto
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Formatos soportados: JPG, PNG (máx. 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <PhoneInput
                value={formData.phone}
                onChange={handlePhoneChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Info Readonly */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Información del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Placa:</span>
                <span className="ml-2 font-mono text-blue-600">{young.placa || 'No asignada'}</span>
              </div>
              <div>
                <span className="text-gray-500">Rol:</span>
                <span className="ml-2 text-gray-700">{young.role_name || young.role}</span>
              </div>
              <div>
                <span className="text-gray-500">Rango de Edad:</span>
                <span className="ml-2 text-gray-700">{young.ageRange}</span>
              </div>
              <div>
                <span className="text-gray-500">Miembro desde:</span>
                <span className="ml-2 text-gray-700">
                  {young.createdAt ? new Date(young.createdAt).toLocaleDateString() : 'No disponible'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;