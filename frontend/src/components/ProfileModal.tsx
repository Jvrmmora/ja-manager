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
  const [emailError, setEmailError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
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
      setError(null);
      setEmailError('');
      setPhoneError('');
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
    
    // Limpiar errores cuando se modifican los campos
    if (name === 'email') {
      setEmailError('');
    }
    setError(null);
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (phone: string) => {
    setPhoneError(''); // Limpiar error de teléfono cuando se cambia
    setError(null);
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
          // Actualizar localStorage con la información actualizada
          authService.updateUserInfo(result.data);
          
          onProfileUpdated(result.data);
          onClose(); // Cerrar inmediatamente
        } else {
          throw new Error(result.message || 'Error al actualizar el perfil');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Error response from backend:', {
          status: response.status,
          errorData,
          hasErrorObject: !!errorData.error,
          hasDetails: !!errorData.error?.details,
          field: errorData.error?.details?.field,
          existingOwner: errorData.error?.details?.existingOwner
        });
        
        // Manejo específico para errores de duplicación con información detallada
        if (response.status === 409 && errorData.error?.details?.field === 'email') {
          const existingOwner = errorData.error?.details?.existingOwner;
          const message = existingOwner 
            ? `Este email ya está registrado por ${existingOwner}. Por favor, usa un email diferente.`
            : 'Este email ya está registrado por otro usuario. Por favor, usa un email diferente.';
          throw new Error(message);
        }
        if (response.status === 409 && errorData.error?.details?.field === 'phone') {
          const existingOwner = errorData.error?.details?.existingOwner;
          const message = existingOwner 
            ? `Este teléfono ya está registrado por ${existingOwner}. Por favor, usa un teléfono diferente.`
            : 'Este teléfono ya está registrado por otro usuario. Por favor, usa un teléfono diferente.';
          throw new Error(message);
        }
        if (response.status === 409 && errorData.error?.details?.field === 'placa') {
          const existingOwner = errorData.error?.details?.existingOwner;
          const message = existingOwner 
            ? `Esta placa ya está registrada por ${existingOwner}.`
            : 'Esta placa ya está registrada por otro usuario.';
          throw new Error(message);
        }
        
        // Para otros errores, intentar extraer el mensaje del backend
        const backendMessage = errorData.error?.message || errorData.message;
        throw new Error(backendMessage || 'Error al actualizar el perfil');
      }
    } catch (err: any) {
      console.error('Error al actualizar perfil:', err);
      
      // Verificar si es un error de duplicados con información específica
      const errorMessage = err.message || 'Error al actualizar el perfil';
      
      // Detectar si es error de email duplicado
      if (errorMessage.includes('email ya está registrado por') || errorMessage.includes('email ya está registrado')) {
        setEmailError(errorMessage);
        setError(null); // No mostrar error general si es específico
      } 
      // Detectar si es error de teléfono duplicado  
      else if (errorMessage.includes('teléfono ya está registrado por') || errorMessage.includes('teléfono ya está registrado')) {
        setPhoneError(errorMessage);
        setError(null); // No mostrar error general si es específico
      } 
      // Otros errores
      else {
        setError(errorMessage);
        setEmailError('');
        setPhoneError('');
      }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mi Perfil</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Foto de Perfil (opcional)
            </label>
            <div className="space-y-4">
              {/* Vista previa de la imagen */}
              <div className="flex justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Foto de perfil"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                    <svg className="w-10 h-10 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Botón Choose File */}
              <div className="flex justify-center">
                <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              
              {/* Información sobre el archivo */}
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Formatos soportados: JPG, PNG (máx. 5MB)
                </p>
                {selectedFile && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Archivo seleccionado: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Teléfono *
              </label>
              <PhoneInput
                value={formData.phone}
                onChange={handlePhoneChange}
                error={phoneError}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  emailError 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {emailError}
                </p>
              )}
            </div>
          </div>

          {/* Info Readonly */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Información del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Placa:</span>
                <span className="ml-2 font-mono text-blue-600 dark:text-blue-400">{young.placa || 'No asignada'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Rol:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{young.role_name || young.role}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Rango de Edad:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{young.ageRange}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Miembro desde:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {young.createdAt ? new Date(young.createdAt).toLocaleDateString() : 'No disponible'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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