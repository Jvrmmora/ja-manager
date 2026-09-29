import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  getCurrentQR,
  manualRegisterAttendance,
  apiRequest,
  getTodayAttendances,
} from '../services/api';
import { seasonService } from '../services/seasonService';
import type { IYoung } from '../types';
import BrandModalHeader from './ui/BrandModalHeader';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

const DEBOUNCE_MS = 350;

const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [season, setSeason] = useState<any>(null);
  const [qr, setQr] = useState<any>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [errorMeta, setErrorMeta] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<IYoung[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedYoung, setSelectedYoung] = useState<IYoung | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // IDs de jóvenes que ya registraron asistencia hoy (para mostrar indicador y deshabilitar)
  const [presentTodayIds, setPresentTodayIds] = useState<Set<string>>(
    new Set()
  );

  // Cargar asistencias del día al abrir el modal para marcar los que ya asistieron
  useEffect(() => {
    if (!isOpen) return;
    const loadTodayAttendances = async () => {
      try {
        const today = await getTodayAttendances();
        const ids = new Set<string>();
        (today.attendances || []).forEach((a: any) => {
          const y = a.youngId || a.young || a?.youngId?._id;
          const id =
            (a.youngId && (a.youngId._id || a.youngId.id)) ||
            (typeof y === 'string' ? y : y?._id || y?.id);

          if (id) ids.add(String(id));
        });
        setPresentTodayIds(ids);
      } catch (e) {
        // No bloqueamos si falla
      }
    };
    loadTodayAttendances();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const loadMeta = async () => {
      setLoadingMeta(true);
      setErrorMeta(null);
      try {
        const s = await seasonService.getActive();
        if (!s) setErrorMeta('No hay temporada activa. Activa una antes.');
        setSeason(s);
        try {
          const currentQR = await getCurrentQR();
          setQr(currentQR.qrCode || currentQR);
        } catch (e: any) {
          setErrorMeta(
            prev => prev || 'No hay QR activo hoy. Genere uno primero.'
          );
        }
      } catch (err) {
        setErrorMeta('Error cargando datos iniciales');
      } finally {
        setLoadingMeta(false);
      }
    };
    loadMeta();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = setTimeout(async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }
      setLoadingSearch(true);
      try {
        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('limit', '10');
        params.append('search', search.trim());
        const resp = await apiRequest(`young?${params.toString()}`, {
          method: 'GET',
        });
        const json = await resp.json();
        const arr = json?.data?.data || [];
        // Excluir administradores; mostrar preferentemente quienes tienen placa
        setResults(arr.filter((y: any) => y.role_name !== 'Super Admin'));
        // Solo jóvenes (no Super Admin) CON placa activa
        setResults(
          arr.filter(
            (y: any) =>
              y.role_name !== 'Super Admin' &&
              typeof y.placa === 'string' &&
              y.placa.trim() !== ''
          )
        );
      } catch (err) {
        console.error('Error buscando jóvenes:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [search, isOpen]);

  const disabledForm = !!errorMeta || !season || !qr;

  const handleSubmit = async () => {
    if (!selectedYoung) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const id = (selectedYoung as any)._id || selectedYoung.id; // backend usa _id
      const data = await manualRegisterAttendance(id);
      onSuccess(data);
    } catch (err: any) {
      setSubmitError(err.message || 'Error al registrar asistencia');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#0C0609]/75 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          className="relative w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl dark:bg-ink-900"
          role="dialog"
          aria-modal="true"
          aria-label="Registro manual de asistencia"
        >
          <BrandModalHeader
            title="Registro manual"
            icon={<UserPlusIcon className="h-5 w-5" />}
            onClose={onClose}
            compact
          />
          <div className="p-6">
          <p className="text-sm text-cocoa-500 dark:text-white/60 mb-4">
            Elige un joven y confirma. Solo disponible con Temporada y QR
            activos.
          </p>
          {loadingMeta && (
            <div className="mb-4 text-sm text-brand-deep dark:text-brand-amber">
              Cargando datos...
            </div>
          )}
          {errorMeta && (
            <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
              <ExclamationTriangleIcon className="w-5 h-5 mt-0.5" />
              <span>{errorMeta}</span>
            </div>
          )}
          {!errorMeta && season && qr && (
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 rounded-full bg-ink-950 text-brand-amber text-xs font-semibold">
                Temporada Activa: {season.name}
              </div>
              <div className="px-3 py-1 rounded-full bg-sand-100 text-[#9A3412] dark:bg-brand-orange/15 dark:text-brand-amber text-xs font-semibold">
                QR Puntos: {qr.points}
              </div>
            </div>
          )}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1 block">
              Buscar Joven
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3.5 top-3.5 text-cocoa-400" />
              <input
                type="text"
                placeholder="Nombre, placa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                disabled={disabledForm}
                className="field-brand h-12 !pl-10 text-[15px] disabled:opacity-60"
              />
            </div>
          </div>
          {selectedYoung && (
            <div className="mb-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  {selectedYoung.profileImage ? (
                    <img
                      src={selectedYoung.profileImage}
                      alt={selectedYoung.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-5 h-5 text-gray-500 dark:text-gray-300"
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
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {selectedYoung.fullName}
                  </p>
                  {selectedYoung.placa && (
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      {selectedYoung.placa}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedYoung(null)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Quitar
              </button>
            </div>
          )}
          {search.trim() && !selectedYoung && (
            <div className="max-h-56 overflow-y-auto mb-4 space-y-1">
              {loadingSearch && (
                <div className="text-xs text-gray-500 dark:text-gray-400 p-2">
                  Buscando...
                </div>
              )}
              {!loadingSearch && results.length === 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 p-2">
                  Sin resultados
                </div>
              )}
              {results.map(r => {
                const id = (r as any)._id || (r as any).id;
                const alreadyPresent = presentTodayIds.has(String(id));
                return (
                  <button
                    key={id}
                    onClick={() => !alreadyPresent && setSelectedYoung(r)}
                    className={`w-full text-left p-2 rounded-lg transition flex items-center justify-between border ${
                      alreadyPresent
                        ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                        : 'hover:bg-blue-50 dark:hover:bg-gray-700 border-transparent hover:border-blue-200 dark:hover:border-gray-600'
                    }`}
                    disabled={alreadyPresent}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        {r.profileImage ? (
                          <img
                            src={r.profileImage}
                            alt={r.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            className="w-5 h-5 text-gray-500 dark:text-gray-300"
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
                      <div>
                        <p className="text-sm text-gray-800 dark:text-white">
                          {r.fullName}
                        </p>
                        {r.placa && (
                          <p className="text-xs text-gray-500 dark:text-gray-300">
                            {r.placa}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ml-3">
                      {alreadyPresent ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          <CheckCircleIcon className="w-3.5 h-3.5" /> Ya asistió
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {submitError && (
            <div className="mb-3 text-sm text-red-600 dark:text-red-400">
              {submitError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-full border-[1.5px] border-sand-300 bg-white text-sm font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                disabledForm ||
                !selectedYoung ||
                presentTodayIds.has(
                  String((selectedYoung as any)?._id || selectedYoung?.id)
                ) ||
                submitting
              }
              className="btn-fire flex-1 h-12 text-sm disabled:cursor-not-allowed"
            >
              {submitting && (
                <motion.span
                  className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <span>{submitting ? 'Registrando...' : 'Registrar'}</span>
            </button>
          </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ManualAttendanceModal;
