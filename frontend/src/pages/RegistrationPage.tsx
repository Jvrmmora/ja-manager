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
  // Primer nombre de quien invita (check-placa no expone más) para confirmar el referido
  const [referrerName, setReferrerName] = useState<string | null>(null);
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
        referredByPlaca: 'Formato inválido. Ej: @MODPRUE001',
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
        setReferrerName(data.exists ? data.data?.firstName || null : null);
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
    `field-brand h-12 text-[15px] ${errors[field] ? '!border-red-500' : ''}`;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
      {/* ── Top bar: same layout as Login/Landing ──────────────────────── */}
      <div className="bg-white dark:bg-ink-950 border-b border-sand-200 dark:border-white/10 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 group"
            aria-label="Volver al inicio"
          >
            <img
              src={logo}
              alt="JA Modelia"
              className="h-9 w-9 object-contain transition-transform group-hover:scale-110"
            />
            <span className="font-display text-lg font-semibold tracking-wide text-cocoa-900 dark:text-white group-hover:text-brand-deep dark:group-hover:text-brand-amber transition-colors">
              Jóvenes Modelia Bogotá
            </span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* ── Panel de marca (móvil: franja superior) ─────────────────────── */}
        <aside className="relative overflow-hidden bg-ink-950 lg:w-5/12 xl:w-2/5 flex items-center justify-center px-6 pt-10 pb-14 lg:p-16 text-center">
          <div className="pointer-events-none absolute left-1/2 top-2/3 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.34)_0%,rgba(138,28,69,.18)_40%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />
          <div className="relative flex w-full max-w-md flex-col items-center gap-4 lg:gap-6">
            <h1 className="m-0 flex flex-col items-center gap-2 font-display uppercase">
              <span className="text-fire text-5xl lg:text-7xl font-bold leading-[0.95]">
                Crea tu cuenta
              </span>
              <span className="text-[17px] lg:text-2xl font-medium tracking-[0.06em] text-white/85">
                Jóvenes Modelia Bogotá
              </span>
            </h1>
            <p className="m-0 text-[15px] lg:text-[17px] leading-relaxed text-white/75">
              Únete a nuestra comunidad de jóvenes apasionados por servir a
              Dios.
            </p>
            <figure className="hidden lg:flex m-0 mt-2 w-full flex-col items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.05] px-7 py-6">
              <span className="text-fire -mb-6 font-display text-6xl leading-none" aria-hidden="true">
                “
              </span>
              <blockquote className="m-0 text-base italic leading-relaxed text-white/90">
                Que nadie te menosprecie por tu juventud, sino sé un ejemplo
                para los creyentes.
              </blockquote>
              <figcaption className="font-display text-[13px] uppercase tracking-[0.16em] text-brand-amber">
                1 Timoteo 4:12
              </figcaption>
            </figure>
            <button
              onClick={() => navigate('/')}
              className="btn-outline-light hidden lg:inline-flex h-12 px-6 text-[15px]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              Volver al inicio
            </button>
          </div>
        </aside>

        {/* ── Right form panel ───────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col overflow-y-auto bg-cream dark:bg-ink-950"
        >
          <div className="flex-1 flex items-start justify-center pb-10 lg:py-14 px-4 sm:px-6 lg:px-10">
            <div className="-mt-6 lg:mt-0 relative w-full max-w-xl">
              {/* Page header */}
              <div className="mb-6 hidden lg:block">
                <h2 className="m-0 font-display text-[44px] font-semibold uppercase leading-none text-cocoa-900 dark:text-white">
                  Crear Cuenta
                </h2>
                <p className="mt-2 text-base text-cocoa-500 dark:text-white/65">
                  Completa el formulario para unirte a nuestra comunidad.
                </p>
              </div>

              {/* Form card */}
              <form
                onSubmit={handleSubmit}
                className="rounded-[28px] border border-sand-200 bg-white p-6 sm:p-9 space-y-5 shadow-[0_30px_60px_-40px_rgba(78,15,58,0.4)] dark:border-white/10 dark:bg-ink-900"
              >
                {errors.submit && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm">
                    {errors.submit}
                  </div>
                )}

                {/* Profile image */}
                <div>
                  <label
                    className="block text-sm font-semibold mb-2 text-cocoa-700 dark:text-white/85"
                  >
                    Foto de Perfil (opcional)
                  </label>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-dashed border-[#E6BFA6] bg-cream text-brand-ember dark:border-white/20 dark:bg-ink-800 dark:text-brand-amber"
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-7 h-7"
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
                      className="text-sm text-cocoa-500 dark:text-white/60 file:mr-3 file:h-10 file:px-4 file:rounded-full file:border-[1.5px] file:border-sand-300 file:bg-white file:text-sm file:font-semibold file:text-cocoa-900 hover:file:bg-sand-50 dark:file:border-white/20 dark:file:bg-ink-800 dark:file:text-white"
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
                      className="block text-sm font-semibold mb-1.5 text-cocoa-700 dark:text-white/85"
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
                      className="block text-sm font-semibold mb-1.5 text-cocoa-700 dark:text-white/85"
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
                      <p className="mt-1 text-xs text-[#9A3412] dark:text-brand-amber font-semibold">
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
                      className="block text-sm font-semibold mb-1.5 text-cocoa-700 dark:text-white/85"
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
                      className="block text-sm font-semibold mb-1.5 text-cocoa-700 dark:text-white/85"
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
                      variant="brand"
                      className={
                        errors.phone
                          ? 'border-red-500'
                          : 'border-sand-300 dark:border-white/15'
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
                    className="block text-sm font-semibold mb-1.5 text-cocoa-700 dark:text-white/85"
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
                    className="block text-sm font-semibold mb-1.5 text-cocoa-700 dark:text-white/85"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-400 hover:text-cocoa-700 dark:text-white/50 dark:hover:text-white"
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
                    className="block text-sm font-semibold mb-1.5 text-cocoa-700 dark:text-white/85"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-400 hover:text-cocoa-700 dark:text-white/50 dark:hover:text-white"
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
                  className="p-5 rounded-[18px] border border-[#F6D6B8] bg-sand-50 dark:border-brand-amber/25 dark:bg-brand-amber/[0.06]"
                >
                  <label
                    htmlFor="referredByPlaca"
                    className="block text-sm font-semibold mb-2 text-cocoa-700 dark:text-white/85"
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
                      placeholder="@MODPRUE001"
                      className={`field-brand h-12 font-mono text-[15px] pr-10 ${placaValid === false ? '!border-red-500' : placaValid === true ? '!border-green-500' : ''}`}
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
                  {placaValid === true && referrerName ? (
                    <p className="mt-2 text-xs font-semibold text-brand-deep dark:text-brand-amber">
                      Te invitó {referrerName} · ambos suman puntos al registrarte
                    </p>
                  ) : (
                    <p
                      className="mt-2 text-xs text-cocoa-500 dark:text-white/55"
                    >
                      Si alguien te refirió, ingresa su placa (ej: @MODPRUE001)
                    </p>
                  )}
                </div>

                {/* Consentimiento de datos personales */}
                <div>
                  {calculateAge(formData.birthday) !== null &&
                    (calculateAge(formData.birthday) as number) < 18 && (
                      <div className="mb-3 space-y-2 rounded-[18px] bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4">
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
                      className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 rounded accent-brand-ember"
                    />
                    <span
                      className="text-sm leading-relaxed text-cocoa-600 dark:text-white/75"
                    >
                      He leído y acepto la{' '}
                      <button
                        type="button"
                        onClick={() => setShowPolicy(true)}
                        className="text-brand-deep dark:text-brand-amber underline font-semibold"
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
                  className="btn-fire w-full h-14 text-base disabled:cursor-not-allowed"
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
                className="mt-6 text-center text-[15px] text-cocoa-500 dark:text-white/60"
              >
                ¿Ya tienes cuenta?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-brand-deep dark:text-brand-amber hover:underline font-semibold"
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
