import React, { useState, useEffect, useCallback } from 'react';
import { createRegistrationRequest } from '../services/api';
import PhoneInput from './PhoneInput';
import LoadingSpinner from './LoadingSpinner';
import { useTheme } from '../context/ThemeContext';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info'
  ) => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [placaValid, setPlacaValid] = useState<boolean | null>(null);
  const [validatingPlaca, setValidatingPlaca] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    birthday: '',
    gender: '' as 'masculino' | 'femenino' | '',
    phone: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    referredByPlaca: '',
    profileImage: null as File | null,
  });

  // Calcular ageRange automáticamente basado en birthday
  const calculateAgeRange = (birthday: string): string => {
    if (!birthday) return '13-15';
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age >= 13 && age <= 15) return '13-15';
    if (age >= 16 && age <= 18) return '16-18';
    if (age >= 19 && age <= 21) return '19-21';
    if (age >= 22 && age <= 25) return '22-25';
    if (age >= 26 && age <= 30) return '26-30';
    return '30+';
  };

  // Validar placa de referido en tiempo real (debounce)
  useEffect(() => {
    if (formData.referredByPlaca.trim() === '') {
      setPlacaValid(null);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.referredByPlaca;
        return newErrors;
      });
      return;
    }

    // Debounce para evitar muchas llamadas
    const timeoutId = setTimeout(() => {
      validatePlacaExists(formData.referredByPlaca);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.referredByPlaca]);

  // Validar coincidencia de contraseñas en tiempo real
  useEffect(() => {
    if (formData.passwordConfirmation === '') {
      setPasswordsMatch(null);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.passwordConfirmation;
        return newErrors;
      });
      return;
    }

    const match = formData.password === formData.passwordConfirmation;
    setPasswordsMatch(match);
    if (!match) {
      setErrors(prev => ({
        ...prev,
        passwordConfirmation: 'Las contraseñas no coinciden',
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.passwordConfirmation;
        return newErrors;
      });
    }
  }, [formData.password, formData.passwordConfirmation]);

  // Validar formato de email
  const validateEmailFormat = (email: string) => {
    if (!email || !email.includes('@')) {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validar email único en tiempo real
  const validateEmailUnique = useCallback(async (email: string) => {
    if (!email || !validateEmailFormat(email)) {
      setEmailExists(false);
      return;
    }

    setValidatingEmail(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/registration/check-email?email=${encodeURIComponent(email)}`
      );
      if (response.ok) {
        const data = await response.json();
        setEmailExists(data.exists || false);
        if (data.exists) {
          setErrors(prev => ({
            ...prev,
            email: data.message || 'Este email ya está registrado',
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.email;
            return newErrors;
          });
        }
      }
    } catch (error) {
      console.error('Error validando email:', error);
    } finally {
      setValidatingEmail(false);
    }
  }, []);

  // Validar email único en tiempo real (debounce)
  useEffect(() => {
    if (!formData.email || !validateEmailFormat(formData.email)) {
      setEmailExists(false);
      return;
    }

    // Debounce para evitar muchas llamadas
    const timeoutId = setTimeout(() => {
      validateEmailUnique(formData.email);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.email, validateEmailUnique]);

  // Validar placa de referido existe
  const validatePlacaExists = async (placa: string) => {
    if (!placa || placa.trim() === '') {
      setPlacaValid(null);
      setValidatingPlaca(false);
      return;
    }

    const placaRegex = /^@MOD[A-Z]{2,4}\d{3}$/;
    const normalizedPlaca = placa.trim().toUpperCase();

    // Validar formato primero
    if (!placaRegex.test(normalizedPlaca)) {
      setPlacaValid(false);
      setValidatingPlaca(false);
      setErrors(prev => ({
        ...prev,
        referredByPlaca:
          'Formato de placa inválido. Debe ser @MODxx### (ej: @MODJAVI001)',
      }));
      return;
    }

    setValidatingPlaca(true);
    // Verificar si existe en el backend
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/registration/check-placa?placa=${encodeURIComponent(normalizedPlaca)}`
      );
      if (response.ok) {
        const data = await response.json();
        setPlacaValid(data.exists || false);
        if (data.exists) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.referredByPlaca;
            return newErrors;
          });
        } else {
          setErrors(prev => ({
            ...prev,
            referredByPlaca: 'Esta placa no existe en el sistema',
          }));
        }
      }
    } catch (error) {
      console.error('Error validando placa:', error);
      setPlacaValid(false);
    } finally {
      setValidatingPlaca(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpiar errores al escribir
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Validar formato de email en tiempo real
    if (name === 'email') {
      if (value && !validateEmailFormat(value)) {
        setErrors(prev => ({
          ...prev,
          email: 'Formato de email inválido',
        }));
        setEmailExists(false);
      } else if (value && validateEmailFormat(value)) {
        // Validar unicidad con debounce (se hace en useEffect separado)
        // Solo limpiamos errores aquí
        if (errors.email) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.email;
            return newErrors;
          });
        }
      }
    }
  };

  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({ ...prev, phone: value }));
    if (errors.phone) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          profileImage: 'La imagen debe ser menor a 5MB',
        }));
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          profileImage: 'El archivo debe ser una imagen',
        }));
        return;
      }

      setFormData(prev => ({ ...prev, profileImage: file }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.profileImage;
        return newErrors;
      });

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validaciones básicas
      if (!formData.fullName.trim()) {
        setErrors(prev => ({ ...prev, fullName: 'El nombre es requerido' }));
        setLoading(false);
        return;
      }

      if (!formData.birthday) {
        setErrors(prev => ({
          ...prev,
          birthday: 'La fecha de nacimiento es requerida',
        }));
        setLoading(false);
        return;
      }

      // Validar fecha mínima (1925)
      const birthDate = new Date(formData.birthday);
      const minDate = new Date('1925-01-01');
      if (birthDate < minDate) {
        setErrors(prev => ({
          ...prev,
          birthday: 'La fecha debe ser posterior a 1925',
        }));
        setLoading(false);
        return;
      }

      if (!formData.gender) {
        setErrors(prev => ({ ...prev, gender: 'El género es requerido' }));
        setLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        setErrors(prev => ({ ...prev, email: 'El email es requerido' }));
        setLoading(false);
        return;
      }

      if (!validateEmailFormat(formData.email)) {
        setErrors(prev => ({ ...prev, email: 'Formato de email inválido' }));
        setLoading(false);
        return;
      }

      if (!formData.password) {
        setErrors(prev => ({
          ...prev,
          password: 'La contraseña es requerida',
        }));
        setLoading(false);
        return;
      }

      if (formData.password.length < 8) {
        setErrors(prev => ({
          ...prev,
          password: 'La contraseña debe tener al menos 8 caracteres',
        }));
        setLoading(false);
        return;
      }

      if (!formData.passwordConfirmation) {
        setErrors(prev => ({
          ...prev,
          passwordConfirmation: 'La confirmación de contraseña es requerida',
        }));
        setLoading(false);
        return;
      }

      if (formData.password !== formData.passwordConfirmation) {
        setErrors(prev => ({
          ...prev,
          passwordConfirmation: 'Las contraseñas no coinciden',
        }));
        setLoading(false);
        return;
      }

      if (formData.referredByPlaca && !placaValid) {
        setErrors(prev => ({
          ...prev,
          referredByPlaca: 'Formato de placa inválido',
        }));
        setLoading(false);
        return;
      }

      // Crear FormData
      const formDataToSend = new FormData();
      formDataToSend.append('fullName', formData.fullName.trim());
      formDataToSend.append('birthday', formData.birthday);
      formDataToSend.append('ageRange', calculateAgeRange(formData.birthday));
      formDataToSend.append('gender', formData.gender);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('email', formData.email.trim().toLowerCase());
      formDataToSend.append('password', formData.password);
      formDataToSend.append(
        'passwordConfirmation',
        formData.passwordConfirmation
      );
      formDataToSend.append('role', 'joven adventista');
      formDataToSend.append('group', '1');

      if (formData.referredByPlaca.trim()) {
        formDataToSend.append(
          'referredByPlaca',
          formData.referredByPlaca.trim()
        );
      }

      if (formData.profileImage) {
        formDataToSend.append('profileImage', formData.profileImage);
      }

      // Enviar solicitud
      await createRegistrationRequest(formDataToSend);

      // Mostrar mensaje de éxito
      if (showToast) {
        showToast(
          'Solicitud enviada exitosamente. El administrador revisará tu solicitud y te notificará por correo.',
          'success'
        );
      }

      // Resetear formulario
      setFormData({
        fullName: '',
        birthday: '',
        gender: '' as 'masculino' | 'femenino' | '',
        phone: '',
        email: '',
        password: '',
        passwordConfirmation: '',
        referredByPlaca: '',
        profileImage: null,
      });
      setImagePreview(null);
      setEmailExists(false);
      setPlacaValid(null);
      setPasswordsMatch(null);
      setErrors({});

      // Cerrar modal después de un breve delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: unknown) {
      console.error('Error en registro:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al enviar la solicitud de registro';
      setErrors(prev => ({ ...prev, submit: errorMessage }));
      if (showToast) {
        showToast(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        fullName: '',
        birthday: '',
        gender: '' as 'masculino' | 'femenino' | '',
        phone: '',
        email: '',
        password: '',
        passwordConfirmation: '',
        referredByPlaca: '',
        profileImage: null,
      });
      setImagePreview(null);
      setEmailExists(false);
      setPlacaValid(null);
      setPasswordsMatch(null);
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        className={`${
          isDark ? 'bg-gray-800' : 'bg-white'
        } rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div
          className={`p-6 border-b ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <h2
              className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Registro de Nuevo Joven
            </h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p
            className={`mt-2 text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Completa el formulario para solicitar tu registro. El administrador
            revisará tu solicitud.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error general */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
              {errors.submit}
            </div>
          )}

          {/* Imagen de perfil */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Foto de Perfil (opcional)
            </label>
            <div className="flex items-center space-x-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${
                  isDark ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-8 h-8 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={loading}
                className="text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400 dark:hover:file:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {errors.profileImage && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.profileImage}
              </p>
            )}
          </div>

          {/* Nombre completo y Fecha de nacimiento en la misma línea */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-3">
              <label
                htmlFor="fullName"
                className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Nombre Completo *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                disabled={loading}
                className={`w-full px-3 py-2 border rounded-md ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } ${errors.fullName ? 'border-red-500' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.fullName}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="birthday"
                className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                id="birthday"
                name="birthday"
                value={formData.birthday}
                onChange={handleInputChange}
                required
                disabled={loading}
                min="1925-01-01"
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } ${errors.birthday ? 'border-red-500' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.birthday && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.birthday}
                </p>
              )}
              {formData.birthday && !errors.birthday && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400 font-medium">
                  Rango de edad: {calculateAgeRange(formData.birthday)}
                </p>
              )}
            </div>
          </div>

          {/* Género y Teléfono en la misma línea */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label
                htmlFor="gender"
                className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Género *
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                required
                disabled={loading}
                className={`w-full px-3 py-2 border rounded-md ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } ${errors.gender ? 'border-red-500' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Selecciona...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.gender}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Teléfono *
              </label>
              <PhoneInput
                value={formData.phone}
                onChange={handlePhoneChange}
                error={errors.phone}
                className={
                  errors.phone
                    ? 'border-red-500'
                    : isDark
                      ? 'border-gray-600'
                      : 'border-gray-300'
                }
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Email *
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => {
                  if (formData.email && validateEmailFormat(formData.email)) {
                    validateEmailUnique(formData.email);
                  }
                }}
                required
                disabled={loading}
                className={`w-full px-3 py-2 border rounded-md pr-10 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } ${errors.email || emailExists ? 'border-red-500' : ''} ${
                  validatingEmail ? 'opacity-50' : ''
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="tu@email.com"
              />
              {validatingEmail && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.email}
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label
              htmlFor="password"
              className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Contraseña *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={loading}
                className={`w-full px-3 py-2 pr-10 border rounded-md ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } ${errors.password ? 'border-red-500' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M6.464 6.464L18 18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label
              htmlFor="passwordConfirmation"
              className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Confirmar Contraseña *
            </label>
            <div className="relative">
              <input
                type={showPasswordConfirmation ? 'text' : 'password'}
                id="passwordConfirmation"
                name="passwordConfirmation"
                value={formData.passwordConfirmation}
                onChange={handleInputChange}
                required
                disabled={loading}
                className={`w-full px-3 py-2 pr-10 border rounded-md ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } ${
                  passwordsMatch === false
                    ? 'border-red-500'
                    : passwordsMatch === true
                      ? 'border-green-500'
                      : ''
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Confirma tu contraseña"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswordConfirmation(!showPasswordConfirmation)
                }
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswordConfirmation ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M6.464 6.464L18 18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
              {passwordsMatch !== null && (
                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                  {passwordsMatch ? (
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </div>
              )}
            </div>
            {errors.passwordConfirmation && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.passwordConfirmation}
              </p>
            )}
          </div>

          {/* Placa de Referido */}
          <div>
            <label
              htmlFor="referredByPlaca"
              className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Placa de Referido (Opcional)
            </label>
            <div className="relative">
              <input
                type="text"
                id="referredByPlaca"
                name="referredByPlaca"
                value={formData.referredByPlaca}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-3 py-2 pr-10 border rounded-md ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } ${
                  placaValid === false
                    ? 'border-red-500'
                    : placaValid === true
                      ? 'border-green-500'
                      : ''
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="@MODJAVI001"
              />
              {(placaValid !== null || validatingPlaca) && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {validatingPlaca ? (
                    <LoadingSpinner size="sm" />
                  ) : placaValid ? (
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </div>
              )}
            </div>
            {errors.referredByPlaca && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.referredByPlaca}
              </p>
            )}
            <p
              className={`mt-1 text-xs ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Si alguien te refirió, ingresa su placa (ej: @MODJAVI001)
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                isDark
                  ? 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-white'
                  : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Enviar Solicitud</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationModal;
