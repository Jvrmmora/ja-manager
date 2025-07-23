import React, { useState, useEffect } from 'react';
import PhoneInput from './PhoneInput';
import type { IYoung } from '../types';

interface YoungFormData {
  fullName: string;
  ageRange: string;
  phone: string;
  birthday: string;
  gender: 'masculino' | 'femenino';
  role: 'lider juvenil' | 'colaborador' | 'director' | 'subdirector' | 'club guias' | 'club conquistadores' | 'club aventureros' | 'escuela sabatica';
  email: string;
  skills: string[];
  profileImage?: File;
}

interface EditYoungFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: YoungFormData) => Promise<void>;
  young: IYoung;
}

const EditYoungForm: React.FC<EditYoungFormProps> = ({ isOpen, onClose, onSubmit, young }) => {
  const [formData, setFormData] = useState<YoungFormData>({
    fullName: '',
    ageRange: '',
    phone: '',
    birthday: '',
    gender: 'masculino',
    role: 'colaborador',
    email: '',
    skills: [],
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState('');

  // Cargar datos del joven al abrir el formulario
  useEffect(() => {
    if (isOpen && young) {
      // Formatear la fecha evitando problemas de zona horaria
      let formattedBirthday: string;
      const birthdayStr = young.birthday.toString();
      if (birthdayStr.includes('T')) {
        formattedBirthday = birthdayStr.split('T')[0];
      } else {
        const birthdayDate = new Date(young.birthday);
        formattedBirthday = birthdayDate.toISOString().split('T')[0];
      }
      
      setFormData({
        fullName: young.fullName,
        ageRange: young.ageRange,
        phone: young.phone,
        birthday: formattedBirthday,
        gender: young.gender,
        role: young.role,
        email: young.email,
        skills: young.skills || [],
      });
      
      setImagePreview(young.profileImage || null);
      setSkillInput('');
    }
  }, [isOpen, young]);

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

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.fullName.trim()) {
      alert('El nombre completo es obligatorio');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(young.id!, formData);
      
      // Resetear formulario
      setFormData({
        fullName: '',
        ageRange: '',
        phone: '',
        birthday: '',
        gender: 'masculino',
        role: 'colaborador',
        email: '',
        skills: [],
      });
      setImagePreview(null);
      onClose();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar el joven. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Editar Joven</h3>
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
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
            <PhoneInput
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              placeholder="Escribe tu número"
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

          {/* Email */}
          <div>
            <label className="form-label">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="ejemplo@correo.com"
              required
            />
          </div>

          {/* Género */}
          <div>
            <label className="form-label">
              Género *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="masculino"
                  checked={formData.gender === 'masculino'}
                  onChange={handleInputChange}
                  className="mr-2 text-blue-600"
                />
                Masculino
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="femenino"
                  checked={formData.gender === 'femenino'}
                  onChange={handleInputChange}
                  className="mr-2 text-blue-600"
                />
                Femenino
              </label>
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="form-label">
              Rol en la Iglesia *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="form-input"
              required
            >
              <option value="colaborador">Colaborador</option>
              <option value="lider juvenil">Líder Juvenil</option>
              <option value="director">Director</option>
              <option value="subdirector">Subdirector</option>
              <option value="club guias">Club Guías</option>
              <option value="club conquistadores">Club Conquistadores</option>
              <option value="club aventureros">Club Aventureros</option>
              <option value="escuela sabatica">Escuela Sabática</option>
            </select>
          </div>

          {/* Habilidades */}
          <div>
            <label className="form-label">
              Habilidades y Talentos
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={handleSkillKeyPress}
                  className="form-input flex-1"
                  placeholder="Ej: Música, Liderazgo, Enseñanza..."
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Agregar
                </button>
              </div>
              
              {/* Tags de habilidades */}
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-blue-600 hover:text-blue-800 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditYoungForm;
