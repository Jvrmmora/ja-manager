import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRegistrationRequest } from '../services/api';
import { authService } from '../services/auth';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../hooks/useToast';
import PhoneInput from '../components/PhoneInput';
import LoadingSpinner from '../components/LoadingSpinner';
import ThemeToggle from '../components/ThemeToggle';
import PrivacyPolicyModal from '../components/privacy/PrivacyPolicyModal';
import { fetchPrivacyPolicy } from '../services/consentService';
import logo from '../assets/logos/logo.png';

function calculateAge(birthday: string): number | null {
  if (!birthday) return null;
  const today = new Date();
  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) return null;
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function calculateAgeRange(birthday: string): string {
  if (!birthday) return '13-15';
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  if (age >= 13 && age <= 15) return '13-15';
  if (age >= 16 && age <= 18) return '16-18';
  if (age >= 19 && age <= 21) return '19-21';
  if (age >= 22 && age <= 25) return '22-25';
  if (age >= 26 && age <= 30) return '26-30';
  return '30+';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ─── component ───────────────────────────────────────────────────────────────

function RegistrationPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [placaValid, setPlacaValid] = useState<boolean | null>(null);
  const [validatingPlaca, setValidatingPlaca] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [policyVersion, setPolicyVersion] = useState<string | null>(null);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRel, setGuardianRel] = useState('');

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

  // Cargar la versión vigente de la política de privacidad
  useEffect(() => {
    fetchPrivacyPolicy()
      .then(p => setPolicyVersion(p.currentVersion))
      .catch(() => setPolicyVersion(null));
  }, []);

  // Read referredBy from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referredBy = params.get('referredBy');
    if (referredBy) {
      const normalized = referredBy.trim().toUpperCase();
      if (/^@MOD[A-Z]{2,4}\d{3}$/.test(normalized)) {
        setFormData(prev => ({ ...prev, referredByPlaca: normalized }));
      }
    }
  }, []);

  // Validate passwords match
  useEffect(() => {
    if (!formData.passwordConfirmation) {
      setPasswordsMatch(null);
      setErrors(prev => {
        const e = { ...prev };
        delete e.passwordConfirmation;
        return e;
      });
      return;
    }
    const match = formData.password === formData.passwordConfirmation;
    setPasswordsMatch(match);
    setErrors(prev => {
      const e = { ...prev };
      if (!match) e.passwordConfirmation = 'Las contraseñas no coinciden';
      else delete e.passwordConfirmation;
      return e;
    });
  }, [formData.password, formData.passwordConfirmation]);

  // Validate email uniqueness
  const validateEmailUnique = useCallback(async (email: string) => {
    if (!email || !isValidEmail(email)) {
      setEmailExists(false);
      return;
    }
    setValidatingEmail(true);
    try {
      const res = await fetch(
        `${API_BASE}/registration/check-email?email=${encodeURIComponent(email)}`
      );
      if (res.ok) {
        const data = await res.json();
        setEmailExists(data.exists || false);
        setErrors(prev => {
          const e = { ...prev };
          if (data.exists)
            e.email = data.message || 'Este email ya está registrado';
          else delete e.email;
          return e;
        });
      }
    } catch {
      /* ignore */
    } finally {
      setValidatingEmail(false);
    }
  }, []);

  useEffect(() => {
    if (!formData.email || !isValidEmail(formData.email)) {
      setEmailExists(false);
      return;
    }
    const t = setTimeout(() => validateEmailUnique(formData.email), 500);
    return () => clearTimeout(t);
  }, [formData.email, validateEmailUnique]);

  // Validate referral placa
  const validatePlaca = useCallback(async (placa: string) => {
    const normalized = placa.trim().toUpperCase();
    if (!normalized) {
      setPlacaValid(null);
      return;
    }
    if (!/^@MOD[A-Z]{2,4}\d{3}$/.test(normalized)) {
      setPlacaValid(false);
      setErrors(prev => ({
        ...prev,
        referredByPlaca: 'Formato inválido. Ej: @MODJAVI001',
      }));
      return;
    }
    setValidatingPlaca(true);
    try {
      const res = await fetch(
        `${API_BASE}/registration/check-placa?placa=${encodeURIComponent(normalized)}`
      );
      if (res.ok) {
        const data = await res.json();
        setPlacaValid(data.exists || false);
        setErrors(prev => {
          const e = { ...prev };
          if (!data.exists) e.referredByPlaca = 'Esta placa no existe';
          else delete e.referredByPlaca;
          return e;
        });
      }
    } catch {
      setPlacaValid(false);
    } finally {
      setValidatingPlaca(false);
    }
  }, []);

  useEffect(() => {
    if (!formData.referredByPlaca) {
      setPlacaValid(null);
      return;
    }
    const t = setTimeout(() => validatePlaca(formData.referredByPlaca), 500);
    return () => clearTimeout(t);
  }, [formData.referredByPlaca, validatePlaca]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name])
      setErrors(prev => {
        const e = { ...prev };
        delete e[name];
        return e;
      });
    if (name === 'email' && value && !isValidEmail(value)) {
      setErrors(prev => ({ ...prev, email: 'Formato de email inválido' }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, profileImage: 'Máximo 5MB' }));
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, profileImage: 'Debe ser una imagen' }));
      return;
    }
    setFormData(prev => ({ ...prev, profileImage: file }));
    setErrors(prev => {
      const e = { ...prev };
      delete e.profileImage;
      return e;
    });
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim())
      newErrors.fullName = 'El nombre es requerido';
    if (!formData.birthday) newErrors.birthday = 'La fecha es requerida';
    if (!formData.gender) newErrors.gender = 'El género es requerido';
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    else if (!isValidEmail(formData.email))
      newErrors.email = 'Formato inválido';
    else if (emailExists) newErrors.email = 'Este email ya está registrado';
    if (!formData.password) newErrors.password = 'La contraseña es requerida';
    else if (formData.password.length < 8)
      newErrors.password = 'Mínimo 8 caracteres';
    if (formData.password !== formData.passwordConfirmation)
      newErrors.passwordConfirmation = 'Las contraseñas no coinciden';
    if (formData.referredByPlaca && placaValid === false)
      newErrors.referredByPlaca = 'Placa inválida';
    if (!acceptPrivacy)
      newErrors.acceptPrivacy =
        'Debes aceptar la Política de Privacidad para registrarte';
    const age = calculateAge(formData.birthday);
    const isMinor = age !== null && age < 18;
    if (isMinor && !guardianName.trim())
      newErrors.guardianName =
        'Ingresa el nombre del padre, madre o representante legal';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const fd = new FormData();
      fd.append('fullName', formData.fullName.trim());
      fd.append('birthday', formData.birthday);
      fd.append('ageRange', calculateAgeRange(formData.birthday));
      fd.append('gender', formData.gender);
      fd.append('phone', formData.phone);
      fd.append('email', formData.email.trim().toLowerCase());
      fd.append('password', formData.password);
      fd.append('passwordConfirmation', formData.passwordConfirmation);
      fd.append('role', 'joven adventista');
      fd.append('group', '1');
      if (formData.referredByPlaca.trim())
        fd.append('referredByPlaca', formData.referredByPlaca.trim());
      if (formData.profileImage)
        fd.append('profileImage', formData.profileImage);

      // Consentimiento de tratamiento de datos personales (Ley 1581/2012)
      fd.append('acceptPrivacyPolicy', 'true');
      fd.append('policyVersion', policyVersion || '');
      if (isMinor) {
        if (guardianName.trim())
          fd.append('guardianFullName', guardianName.trim());
        if (guardianRel.trim())
          fd.append('guardianRelationship', guardianRel.trim());
      }

      const response = await createRegistrationRequest(fd);
      const registeredPlaca = response.data?.placa;

      showToast(
        `¡Cuenta creada! Tu placa: ${registeredPlaca || 'N/A'}. Iniciando sesión...`,
        'success'
      );

      try {
        await authService.login({
          username: registeredPlaca,
          password: formData.password,
        });
        showToast('¡Bienvenido! Redirigiendo...', 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch {
        showToast(
          'Cuenta creada. Por favor inicia sesión manualmente.',
          'warning'
        );
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrarse';
      setErrors({ submit: msg });
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      isDark
        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
    } ${errors[field] ? 'border-red-500' : ''}`;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
      {/* ── Top bar: same layout as Login/Landing ──────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 group"
            aria-label="Volver al inicio"
          >
            <img
              src={logo}
              alt="JA Modelia"
              className="h-8 w-8 object-contain transition-transform group-hover:scale-110"
            />
            <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Jóvenes Modelia Bogotá
            </span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 lg:flex-row">
        {/* ── Left branding panel (desktop) ─────────────────────────────── */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 relative overflow-hidden flex-col justify-center items-center p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/95 via-blue-600/95 to-indigo-700/95" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute bottom-20 right-10 w-48 h-48 bg-white/5 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full" />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-white/10 rounded-full blur-xl" />
              <img
                src={logo}
                alt="JA Modelia"
                className="w-28 h-28 relative z-10 drop-shadow-2xl object-contain"
              />
            </div>
            <h1 className="text-white text-3xl font-bold mb-2">
              Crea tu cuenta
            </h1>
            <h2 className="text-blue-200 text-xl font-semibold mb-6">
              Jóvenes Modelia Bogotá
            </h2>
            <p className="text-white/85 text-base max-w-xs leading-relaxed mb-8">
              Únete a nuestra comunidad de jóvenes apasionados por servir a
              Dios.
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 max-w-xs w-full">
              <svg
                className="w-7 h-7 text-white/60 mb-3 mx-auto"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" />
              </svg>
              <p className="text-white/90 text-sm leading-relaxed italic mb-2">
                "Que nadie te menosprecie por tu juventud, sino sé un ejemplo
                para los creyentes."
              </p>
              <p className="text-white/60 text-xs font-medium">
                — 1 Timoteo 4:12
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="mt-8 flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Volver al inicio
            </button>
          </div>
        </div>

        {/* ── Right form panel ───────────────────────────────────────────── */}
        <div
          className={`flex-1 flex flex-col overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
        >
          <div className="flex-1 flex items-start justify-center py-8 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-lg">
              {/* Page header */}
              <div className="mb-6">
                <h1
                  className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  Crear Cuenta
                </h1>
                <p
                  className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  Completa el formulario para unirte a nuestra comunidad.
                </p>
              </div>

              {/* Form card */}
              <form
                onSubmit={handleSubmit}
                className={`rounded-2xl shadow-sm border p-6 space-y-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              >
                {errors.submit && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                    {errors.submit}
                  </div>
                )}

                {/* Profile image */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Foto de Perfil (opcional)
                  </label>
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-7 h-7 text-gray-400"
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
                      className="text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                    />
                  </div>
                  {errors.profileImage && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.profileImage}
                    </p>
                  )}
                </div>

                {/* Name + birthday */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  <div className="sm:col-span-3">
                    <label
                      htmlFor="fullName"
                      className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Nombre Completo *
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Tu nombre completo"
                      className={inputCls('fullName')}
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.fullName}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="birthday"
                      className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Fecha de Nacimiento *
                    </label>
                    <input
                      id="birthday"
                      name="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={handleChange}
                      disabled={loading}
                      min="1925-01-01"
                      max={new Date().toISOString().split('T')[0]}
                      className={inputCls('birthday')}
                    />
                    {errors.birthday && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.birthday}
                      </p>
                    )}
                    {formData.birthday && !errors.birthday && (
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Rango: {calculateAgeRange(formData.birthday)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Gender + phone */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="gender"
                      className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Género *
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      disabled={loading}
                      className={inputCls('gender')}
                    >
                      <option value="">Selecciona...</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                    </select>
                    {errors.gender && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.gender}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Teléfono *
                    </label>
                    <PhoneInput
                      value={formData.phone}
                      onChange={v => {
                        setFormData(prev => ({ ...prev, phone: v }));
                        if (errors.phone)
                          setErrors(prev => {
                            const e = { ...prev };
                            delete e.phone;
                            return e;
                          });
                      }}
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
                      <p className="mt-1 text-xs text-red-500">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Email *
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => {
                        if (formData.email && isValidEmail(formData.email))
                          validateEmailUnique(formData.email);
                      }}
                      disabled={loading}
                      placeholder="tu@email.com"
                      className={`${inputCls('email')} pr-10`}
                    />
                    {validatingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Mínimo 8 caracteres"
                      className={`${inputCls('password')} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {showPassword ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878L6.464 6.464M17.536 17.536L21 21"
                          />
                        ) : (
                          <>
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
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="passwordConfirmation"
                    className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Confirmar Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      id="passwordConfirmation"
                      name="passwordConfirmation"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      value={formData.passwordConfirmation}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Confirma tu contraseña"
                      className={`${inputCls('passwordConfirmation')} pr-20`}
                    />
                    {passwordsMatch !== null && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        {passwordsMatch ? (
                          <svg
                            className="w-4 h-4 text-green-500"
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
                            className="w-4 h-4 text-red-500"
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
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {showPasswordConfirm ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878L6.464 6.464M17.536 17.536L21 21"
                          />
                        ) : (
                          <>
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
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  {errors.passwordConfirmation && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.passwordConfirmation}
                    </p>
                  )}
                </div>

                {/* Referral placa */}
                <div
                  className={`p-4 rounded-xl border-2 transition-colors ${
                    isDark
                      ? 'bg-purple-900/10 border-purple-500/30'
                      : 'bg-purple-50/50 border-purple-200'
                  }`}
                >
                  <label
                    htmlFor="referredByPlaca"
                    className={`block text-sm font-semibold mb-2 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}
                  >
                    Placa de Referido (Opcional)
                    {placaValid === true && (
                      <span className="ml-2 text-xs font-medium bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                        ✓ Válida
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      id="referredByPlaca"
                      name="referredByPlaca"
                      type="text"
                      value={formData.referredByPlaca}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="@MODJAVI001"
                      className={`w-full px-3 py-2.5 border-2 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10 ${
                        isDark
                          ? 'bg-gray-800 text-white border-purple-500/40 placeholder-gray-500'
                          : 'bg-white text-gray-900 border-purple-200 placeholder-gray-400'
                      } ${placaValid === false ? 'border-red-500' : placaValid === true ? 'border-green-500' : ''}`}
                    />
                    {(validatingPlaca || placaValid !== null) && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {validatingPlaca ? (
                          <LoadingSpinner size="sm" />
                        ) : placaValid ? (
                          <svg
                            className="w-5 h-5 text-green-500"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-red-500"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.referredByPlaca && (
                    <p className="mt-1.5 text-xs text-red-500">
                      {errors.referredByPlaca}
                    </p>
                  )}
                  <p
                    className={`mt-2 text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
                  >
                    Si alguien te refirió, ingresa su placa (ej: @MODJAVI001)
                  </p>
                </div>

                {/* Consentimiento de datos personales */}
                <div>
                  {calculateAge(formData.birthday) !== null &&
                    (calculateAge(formData.birthday) as number) < 18 && (
                      <div className="mb-3 space-y-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                          Eres menor de edad: se requiere la autorización de tu
                          padre, madre o representante legal.
                        </p>
                        <input
                          type="text"
                          value={guardianName}
                          onChange={e => {
                            setGuardianName(e.target.value);
                            setErrors(prev => {
                              const x = { ...prev };
                              delete x.guardianName;
                              return x;
                            });
                          }}
                          disabled={loading}
                          placeholder="Nombre del padre, madre o representante legal"
                          className={inputCls('guardianName')}
                        />
                        {errors.guardianName && (
                          <p className="text-xs text-red-500">
                            {errors.guardianName}
                          </p>
                        )}
                        <input
                          type="text"
                          value={guardianRel}
                          onChange={e => setGuardianRel(e.target.value)}
                          disabled={loading}
                          placeholder="Parentesco (padre, madre, representante legal)"
                          className={inputCls('guardianRel')}
                        />
                      </div>
                    )}

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptPrivacy}
                      onChange={e => {
                        setAcceptPrivacy(e.target.checked);
                        setErrors(prev => {
                          const x = { ...prev };
                          delete x.acceptPrivacy;
                          return x;
                        });
                      }}
                      disabled={loading}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      He leído y acepto la{' '}
                      <button
                        type="button"
                        onClick={() => setShowPolicy(true)}
                        className="text-blue-600 dark:text-blue-400 underline font-medium"
                      >
                        Política de Privacidad
                      </button>{' '}
                      y <strong>autorizo el tratamiento de mis datos personales</strong>.
                    </span>
                  </label>
                  {errors.acceptPrivacy && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.acceptPrivacy}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="text-white" />
                      <span>Creando cuenta...</span>
                    </>
                  ) : (
                    'Crear Cuenta'
                  )}
                </button>
              </form>

              {/* Footer link */}
              <p
                className={`mt-5 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              >
                ¿Ya tienes cuenta?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Inicia sesión
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <PrivacyPolicyModal
        open={showPolicy}
        onClose={() => setShowPolicy(false)}
      />
    </div>
  );
}

export default RegistrationPage;
