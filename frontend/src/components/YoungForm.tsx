import React, { useState } from 'react';

interface YoungFormData {
  fullName: string;
  ageRange: string;
  phone: string;
  birthday: string;
  profileImage?: File;
}

interface YoungFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: YoungFormData) => Promise<void>;
}

const YoungForm: React.FC<YoungFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<YoungFormData>({
    fullName: '',
    ageRange: '',
    phone: '',
    birthday: '',
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        profileImage: file
      }));

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.ageRange || !formData.phone || !formData.birthday) {
      alert('Por favor, completa todos los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      
      // Resetear formulario
      setFormData({
        fullName: '',
        ageRange: '',
        phone: '',
        birthday: '',
      });
      setImagePreview(null);
      onClose();
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar el joven. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Registrar Nuevo Joven</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Imagen de perfil */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto de Perfil (opcional)
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          {/* Nombre completo */}
          <div>
            <label className="form-label">
              Nombre Completo *
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Ej: Juan Pérez García"
              required
            />
          </div>

          {/* Rango de edad */}
          <div>
            <label className="form-label">
              Rango de Edad *
            </label>
            <select
              name="ageRange"
              value={formData.ageRange}
              onChange={handleInputChange}
              className="form-input"
              required
            >
              <option value="">Seleccionar rango</option>
              <option value="13-15">13-15 años</option>
              <option value="16-18">16-18 años</option>
              <option value="19-21">19-21 años</option>
              <option value="22-25">22-25 años</option>
              <option value="26-30">26-30 años</option>
              <option value="30+">30+ años</option>
            </select>
          </div>

          {/* Teléfono */}
          <div>
            <label className="form-label">
              Teléfono *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Ej: +52 55 1234 5678"
              required
            />
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label className="form-label">
              Fecha de Nacimiento *
            </label>
            <input
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleInputChange}
              className="form-input"
              required
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </div>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default YoungForm;
