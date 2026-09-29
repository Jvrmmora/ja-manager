import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import YoungForm from '../components/YoungForm';
import EditYoungForm from '../components/EditYoungForm';
import YoungCard from '../components/YoungCard';
import FilterBar from '../components/FilterBar';
import BirthdayDashboard from '../components/BirthdayDashboard';
import BirthdayStatsModal from '../components/BirthdayStatsModal';
import ImportModal from '../components/ImportModal';
import ProfileDropdown from '../components/ProfileDropdown';
import ProfileModal from '../components/ProfileModal';
import StatsCards from '../components/StatsCards';
import ToastContainer from '../components/ToastContainer';
import ThemeToggle from '../components/ThemeToggle';
import QRGenerator from '../components/QRGenerator';
import AttendanceList from '../components/AttendanceList';
import ManualAttendanceButton from '../components/ManualAttendanceButton';
import ManualAttendanceModal from '../components/ManualAttendanceModal';
import AttendanceModal from '../components/AttendanceModal';
import RankingModal from '../components/RankingModal';
import AdminPanelModal from '../components/admin/AdminPanelModal';
import {
  AdminQRCard,
  AdminRankingCard,
  AdminBirthdayCard,
} from '../components/admin/AdminHeroCards';
import YoungRow, { YOUNG_ROW_GRID } from '../components/young/YoungRow';
import { getCurrentDateTimeColombia } from '../utils/dateUtils';
import '../brand-skin.css';
import { SeasonProvider, useSeason } from '../context/SeasonContext';
import { pointsService } from '../services/pointsService';
import { seasonService } from '../services/seasonService';
import SeasonManager from '../components/SeasonManager';
import RegistrationRequestsManager from '../components/RegistrationRequestsManager';
import ContactMessagesManager from '../components/ContactMessagesManager';
import {
  apiRequest,
  apiUpload,
  debugAuthState,
  getCurrentUserProfile,
  getRecentUsersCount,
} from '../services/api';
import { useToast } from '../hooks/useToast';
import type {
  IYoung,
  PaginationQuery,
  ILeaderboardEntry,
  ISeason,
} from '../types';
import logo from '../assets/logos/logo.png';

interface YoungFormData {
  fullName: string;
  ageRange: string;
  phone: string;
  birthday: string;
  gender: 'masculino' | 'femenino' | '';
  role:
    | 'lider juvenil'
    | 'colaborador'
    | 'director'
    | 'subdirector'
    | 'club guias'
    | 'club conquistadores'
    | 'club aventureros'
    | 'escuela sabatica'
    | 'joven adventista'
    | 'simpatizante';
  email: string;
  skills: string[];
  profileImage?: File;
  group?: number | '' | undefined;
}

// Hook para scroll infinito automático
const useInfiniteScroll = (
  callback: () => void,
  hasMore: boolean,
  loading: boolean
) => {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      // Limpiar timeout anterior
      if (timeoutId) {
        clearTimeout(timeoutId as ReturnType<typeof setTimeout>);
      }

      // Debounce de 200ms para evitar múltiples llamadas
      timeoutId = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } =
          document.documentElement;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 1000; // 1000px antes del final

        if (isNearBottom && hasMore && !loading) {
          callback();
        }
      }, 200);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId as ReturnType<typeof setTimeout>);
      }
    };
  }, [callback, hasMore, loading]);
};

// Componente auxiliar para actualizar el SeasonContext en HomePage
const SeasonDataUpdater = ({
  activeSeason,
}: {
  activeSeason: ISeason | null;
}) => {
  const { setActiveSeason } = useSeason();

  useEffect(() => {
    if (activeSeason) {
      setActiveSeason(activeSeason);
    }
  }, [activeSeason, setActiveSeason]);

  return null;
};

function HomePage() {
  const navigate = useNavigate();
  const [youngList, setYoungList] = useState<IYoung[]>([]);
  const [allYoungList, setAllYoungList] = useState<IYoung[]>([]); // Para estadísticas
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingYoung, setEditingYoung] = useState<IYoung | null>(null);
  const [showBirthdayDashboard, setShowBirthdayDashboard] = useState(false);
  const [showBirthdayStats, setShowBirthdayStats] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<IYoung | null>(null);

  // Estados para QR y asistencias
  const [showQRSection, setShowQRSection] = useState(false);
  const [showAttendanceSection, setShowAttendanceSection] = useState(false);
  const [attendanceRefresh, setAttendanceRefresh] = useState(0);
  const [showManualAttendanceModal, setShowManualAttendanceModal] =
    useState(false);
  const [manualAttendanceResult, setManualAttendanceResult] =
    useState<any>(null);
  const [showManualSuccessModal, setShowManualSuccessModal] = useState(false);

  // Estados para nuevas secciones
  const [showLeaderboardSection, setShowLeaderboardSection] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ILeaderboardEntry[]>([]);
  const [activeSeason, setActiveSeason] = useState<ISeason | null>(null);
  const [showSeasonsSection, setShowSeasonsSection] = useState(false);
  const [showRegistrationRequestsSection, setShowRegistrationRequestsSection] =
    useState(false);
  const [showContactMessagesSection, setShowContactMessagesSection] =
    useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [recentUsersCount, setRecentUsersCount] = useState(0);

  // Vista del listado de jóvenes (se recuerda la última elegida)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem('adminYoungView') === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const changeViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('adminYoungView', mode);
    } catch {
      // Sin almacenamiento disponible: solo se mantiene en memoria
    }
  };

  // Ref para cerrar el menú de "Agregar" al hacer clic fuera
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        showAddMenu &&
        addMenuRef.current &&
        !addMenuRef.current.contains(target)
      ) {
        setShowAddMenu(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAddMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showAddMenu]);

  const [nextPageToLoad, setNextPageToLoad] = useState(2); // Track próxima página para cargar
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Prevenir múltiples llamadas simultáneas
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null); // Total de resultados filtrados
  const [filters, setFilters] = useState<PaginationQuery>({
    page: 1,
    limit: 10,
    sortBy: 'fullName',
    sortOrder: 'asc',
  });

  // Ref para trackear página actual sin causar re-renders
  const currentPageRef = useRef(1);
  const isLoadingPageRef = useRef(false);

  // Hook para manejo de toasts
  const { toasts, showSuccess, showError, removeToast } = useToast();

  // Función para obtener todos los jóvenes para estadísticas (sin filtros)
  const fetchAllYoung = async () => {
    try {
      let allYoung: IYoung[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', '100'); // Máximo permitido por el backend
        // NO aplicar filtros a las estadísticas - queremos el total real

        const url = `young?${params.toString()}`;
        const response = await apiRequest(url);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const youngArray =
          result.success && result.data && Array.isArray(result.data.data)
            ? result.data.data
            : [];

        allYoung = [...allYoung, ...youngArray];

        // Verificar si hay más páginas
        const pagination = result.data?.pagination;
        if (pagination && pagination.currentPage < pagination.totalPages) {
          currentPage++;
        } else {
          hasMorePages = false;
        }
      }

      // Guardar el listado completo para las estadísticas (total, cumpleaños, nuevos del mes)
      setAllYoungList(allYoung);
    } catch (err) {
      console.error('❌ Error en fetchAllYoung:', err);
    }
  };

  // Función para obtener jóvenes del backend con paginación
  const fetchYoung = useCallback(
    async (
      page = 1,
      append = false,
      customFilters?: PaginationQuery,
      silent = false
    ) => {
      try {
        // Prevenir llamadas duplicadas para la misma página en modo append
        if (append) {
          // Usar ref para verificar sin causar re-renders
          if (page <= currentPageRef.current || isLoadingPageRef.current) {
            return;
          }
          isLoadingPageRef.current = true;
        }

        if (!append) {
          if (!silent) setLoading(true);
          isLoadingPageRef.current = false; // Reset al empezar nueva búsqueda
        } else {
          setLoadingMore(true);
        }

        const activeFilters = customFilters || filters;

        // Construir query parameters
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '10');

        // Solo agregar filtros si tienen valores válidos
        if (activeFilters.search && activeFilters.search.trim()) {
          params.append('search', activeFilters.search.trim());
        }
        if (activeFilters.ageRange && activeFilters.ageRange !== '') {
          params.append('ageRange', activeFilters.ageRange);
        }
        if (activeFilters.gender && activeFilters.gender !== '') {
          params.append('gender', activeFilters.gender);
        }
        if (activeFilters.role && activeFilters.role !== '') {
          params.append('role', activeFilters.role);
        }
        if (activeFilters.groups && activeFilters.groups.length > 0) {
          activeFilters.groups.forEach(group => {
            params.append('groups', group);
          });
        }
        if (activeFilters.sortBy) {
          params.append('sortBy', activeFilters.sortBy);
        }
        if (activeFilters.sortOrder) {
          params.append('sortOrder', activeFilters.sortOrder);
        }

        const url = `young?${params.toString()}`;
        const response = await apiRequest(url);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const youngArray =
          result.success && result.data && Array.isArray(result.data.data)
            ? result.data.data
            : [];

        const pagination = result.data?.pagination;

        if (append) {
          // Scroll infinito: agregar nuevos elementos
          setYoungList(prevList => {
            const newList = [...prevList, ...youngArray];
            return newList;
          });
          const newCurrentPage = page;
          currentPageRef.current = newCurrentPage;
          setNextPageToLoad(newCurrentPage + 1);
          isLoadingPageRef.current = false; // Reset flag de carga
        } else {
          // Nueva búsqueda: reemplazar lista
          setYoungList(youngArray);
          const newCurrentPage = pagination?.currentPage || 1;
          currentPageRef.current = newCurrentPage;
          setNextPageToLoad(newCurrentPage + 1);
          isLoadingPageRef.current = false; // Reset flag de carga
        }

        // Actualizar información de paginación
        setHasMore(pagination ? pagination.hasNextPage : false);
        setFilteredTotal(pagination?.totalItems || null);
      } catch (err) {
        console.error('❌ Error al obtener jóvenes:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        isLoadingPageRef.current = false; // Reset en caso de error
      } finally {
        if (!silent) setLoading(false);
        setLoadingMore(false);
        if (!append) {
          isLoadingPageRef.current = false; // Asegurar reset en nuevas búsquedas
        }
      }
    },
    [filters] // Removido currentPage de dependencias para evitar re-renders infinitos
  );

  // Hook para cargar más contenido con scroll infinito
  const loadMore = useCallback(() => {
    // Verificar que no esté cargando y que haya más páginas
    if (
      !isLoadingMore &&
      !loadingMore &&
      !isLoadingPageRef.current &&
      hasMore &&
      nextPageToLoad > currentPageRef.current
    ) {
      setIsLoadingMore(true);
      fetchYoung(nextPageToLoad, true).finally(() => {
        setIsLoadingMore(false);
      });
    }
  }, [isLoadingMore, loadingMore, hasMore, nextPageToLoad, fetchYoung]);

  // Usar el hook de scroll infinito
  useInfiniteScroll(loadMore, hasMore, loadingMore || isLoadingMore);

  // Cargar datos iniciales y perfil del usuario
  useEffect(() => {
    // Inicializar refs
    currentPageRef.current = 1;
    isLoadingPageRef.current = false;
    fetchYoung(1, false);
    fetchAllYoung();

    // Cargar perfil del usuario actual
    const loadCurrentUser = async () => {
      try {
        const userData = await getCurrentUserProfile();
        setCurrentUser(userData);

        // Si es Super Admin, cargar conteo de usuarios recientes
        if (userData?.role_name === 'Super Admin') {
          loadRecentUsersCount();
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    loadCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  // Actualización reactiva del dashboard cuando se asignan puntos
  useEffect(() => {
    const onPointsUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<{ youngId?: string; delta?: number }>)
        .detail;
      if (detail?.youngId && typeof detail.delta === 'number') {
        setYoungList(prev =>
          prev.map(y =>
            y.id === detail.youngId
              ? {
                  ...y,
                  totalPoints: (y.totalPoints || 0) + (detail.delta || 0),
                }
              : y
          )
        );
        setAllYoungList(prev =>
          prev.map(y =>
            y.id === detail.youngId
              ? {
                  ...y,
                  totalPoints: (y.totalPoints || 0) + (detail.delta || 0),
                }
              : y
          )
        );
      }
      // Refrescar silenciosamente (sin spinner) y estadísticas
      fetchYoung(1, false, filters, true);
      fetchAllYoung();
    };
    window.addEventListener('points:updated', onPointsUpdated);
    return () => window.removeEventListener('points:updated', onPointsUpdated);
  }, [filters, fetchYoung]);

  // Función para aplicar filtros
  const handleFilterChange = (newFilters: PaginationQuery) => {
    setFilters(newFilters);
    currentPageRef.current = 1; // Reset ref
    setNextPageToLoad(2);
    setHasMore(true);
    setIsLoadingMore(false);
    isLoadingPageRef.current = false; // Reset flag de carga
    fetchYoung(1, false, newFilters);
  };

  const handleSubmit = async (data: YoungFormData) => {
    try {
      debugAuthState(); // Debug del estado de autenticación

      const formData = new FormData();
      formData.append('fullName', data.fullName);
      formData.append('ageRange', data.ageRange);
      formData.append('phone', data.phone);
      formData.append('birthday', data.birthday);
      formData.append('gender', data.gender);
      formData.append('role', data.role);
      formData.append('email', data.email);
      formData.append('skills', JSON.stringify(data.skills || []));

      if (data.group !== undefined && data.group !== '') {
        formData.append('group', data.group.toString());
      }

      if (data.profileImage) {
        formData.append('profileImage', data.profileImage);
      }

      // Usar apiUpload para enviar FormData con posibles archivos
      const response = await apiUpload('young', formData);

      if (!response.ok) {
        const errorData = await response.json();

        // Manejo específico para errores de duplicación con información detallada
        if (
          response.status === 409 &&
          errorData.error?.details?.field === 'email'
        ) {
          const existingOwner = errorData.error?.details?.existingOwner;
          const message = existingOwner
            ? `Este email ya está registrado por ${existingOwner}. Por favor, usa un email diferente.`
            : 'Este email ya está registrado por otro usuario. Por favor, usa un email diferente.';
          throw new Error(message);
        }
        if (
          response.status === 409 &&
          errorData.error?.details?.field === 'phone'
        ) {
          const existingOwner = errorData.error?.details?.existingOwner;
          const message = existingOwner
            ? `Este teléfono ya está registrado por ${existingOwner}. Por favor, usa un teléfono diferente.`
            : 'Este teléfono ya está registrado por otro usuario. Por favor, usa un teléfono diferente.';
          throw new Error(message);
        }
        if (
          response.status === 409 &&
          errorData.error?.details?.field === 'placa'
        ) {
          const existingOwner = errorData.error?.details?.existingOwner;
          const message = existingOwner
            ? `Esta placa ya está registrada por ${existingOwner}.`
            : 'Esta placa ya está registrada por otro usuario.';
          throw new Error(message);
        }

        throw new Error(
          errorData.error?.message ||
            errorData.message ||
            'Error al guardar el joven'
        );
      }

      await response.json();
      // Recargar los datos
      fetchYoung();
      fetchAllYoung(); // Actualizar estadísticas también
      setShowForm(false);

      // Mostrar mensaje de éxito
      showSuccess('¡Joven registrado exitosamente!');
    } catch (err) {
      console.error('❌ Error al crear joven:', err);
      showError(
        err instanceof Error
          ? err.message
          : 'Error desconocido al crear el joven'
      );
    }
  };

  const handleUpdate = async (id: string, data: YoungFormData) => {
    if (!editingYoung) return;

    try {
      debugAuthState(); // Debug del estado de autenticación

      const formData = new FormData();
      formData.append('fullName', data.fullName);
      formData.append('ageRange', data.ageRange);
      formData.append('phone', data.phone);
      formData.append('birthday', data.birthday);
      formData.append('gender', data.gender);
      formData.append('role', data.role);
      formData.append('email', data.email);
      formData.append('skills', JSON.stringify(data.skills || []));

      if (data.group !== undefined && data.group !== '') {
        formData.append('group', data.group.toString());
      }

      if (data.profileImage) {
        formData.append('profileImage', data.profileImage);
      }

      // Usar apiUpload para enviar FormData con posibles archivos
      const response = await apiUpload(`young/${id}`, formData, {
        method: 'PUT',
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Manejo específico para errores de duplicación con información detallada
        if (
          response.status === 409 &&
          errorData.error?.details?.field === 'email'
        ) {
          const existingOwner = errorData.error?.details?.existingOwner;
          const message = existingOwner
            ? `Este email ya está registrado por ${existingOwner}. Por favor, usa un email diferente.`
            : 'Este email ya está registrado por otro usuario. Por favor, usa un email diferente.';
          throw new Error(message);
        }
        if (
          response.status === 409 &&
          errorData.error?.details?.field === 'phone'
        ) {
          const existingOwner = errorData.error?.details?.existingOwner;
          const message = existingOwner
            ? `Este teléfono ya está registrado por ${existingOwner}. Por favor, usa un teléfono diferente.`
            : 'Este teléfono ya está registrado por otro usuario. Por favor, usa un teléfono diferente.';
          throw new Error(message);
        }
        if (
          response.status === 409 &&
          errorData.error?.details?.field === 'placa'
        ) {
          const existingOwner = errorData.error?.details?.existingOwner;
          const message = existingOwner
            ? `Esta placa ya está registrada por ${existingOwner}.`
            : 'Esta placa ya está registrada por otro usuario.';
          throw new Error(message);
        }

        throw new Error(
          errorData.error?.message ||
            errorData.message ||
            'Error al actualizar el joven'
        );
      }

      await response.json();
      // Recargar los datos
      fetchYoung(1); // Volver a página 1 después de actualizar
      fetchAllYoung(); // Actualizar estadísticas también
      setShowEditForm(false);
      setEditingYoung(null);

      // Mostrar mensaje de éxito
      showSuccess('¡Joven actualizado exitosamente!');
    } catch (err) {
      console.error('❌ Error al actualizar joven:', err);
      showError(
        err instanceof Error
          ? err.message
          : 'Error desconocido al actualizar el joven'
      );
    }
  };

  const handleEdit = (young: IYoung) => {
    setEditingYoung(young);
    setShowEditForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      debugAuthState(); // Debug del estado de autenticación

      const response = await apiRequest(`young/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar el joven');
      }

      // Recargar los datos
      fetchYoung();
      fetchAllYoung(); // Actualizar estadísticas también

      // Mostrar mensaje de éxito
      showSuccess('¡Joven eliminado exitosamente!');
    } catch (err) {
      console.error('❌ Error al eliminar joven:', err);
      showError(
        err instanceof Error
          ? err.message
          : 'Error desconocido al eliminar el joven'
      );
    }
  };

  const handleImportSuccess = () => {
    fetchYoung();
    fetchAllYoung(); // Actualizar estadísticas también
    setShowImportModal(false);
  };

  // Función para actualizar un joven en la lista local
  const handleYoungUpdate = (updatedYoung: IYoung) => {
    // Actualizar en la lista de visualización
    setYoungList(prevList =>
      prevList.map(young =>
        young.id === updatedYoung.id ? updatedYoung : young
      )
    );

    // Actualizar en la lista completa para estadísticas
    setAllYoungList(prevList =>
      prevList.map(young =>
        young.id === updatedYoung.id ? updatedYoung : young
      )
    );
  };

  // Funciones para manejar el perfil del usuario admin
  const handleOpenProfile = async () => {
    try {
      const userData = await getCurrentUserProfile();
      setCurrentUser(userData);
      setShowProfileModal(true);
    } catch (error) {
      console.error('Error al obtener el perfil del admin:', error);
      showError('Error al cargar el perfil');
    }
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
  };

  const handleProfileUpdated = (updatedUser: IYoung) => {
    setCurrentUser(updatedUser);
    showSuccess('Perfil actualizado exitosamente');

    // Si es Super Admin, actualizar conteo de usuarios recientes
    if (updatedUser?.role_name === 'Super Admin') {
      loadRecentUsersCount();
    }
  };

  // Función para cargar el conteo de usuarios recientes (últimas 48 horas)
  const loadRecentUsersCount = async () => {
    try {
      const count = await getRecentUsersCount(48);
      setRecentUsersCount(count);
    } catch (error) {
      console.error('Error loading recent users count:', error);
      setRecentUsersCount(0);
    }
  };

  // Verificar si el usuario es Super Admin
  const isSuperAdmin = currentUser?.role_name === 'Super Admin';

  // Cargar conteo de usuarios recientes cuando se abre la sección
  useEffect(() => {
    if (showRegistrationRequestsSection && isSuperAdmin) {
      loadRecentUsersCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRegistrationRequestsSection, isSuperAdmin]);

  const displayTotal =
    filteredTotal !== null ? filteredTotal : allYoungList.length;

  // Cargar datos del leaderboard y temporada activa para el modal
  useEffect(() => {
    const loadLeaderboardData = async () => {
      try {
        const seasons = await seasonService.getAll();
        const active = seasons.find(
          (s: ISeason) => s.isActive || s.status === 'ACTIVE'
        );
        setActiveSeason(active || null);

        if (active) {
          const data = await pointsService.getLeaderboard({
            seasonId: active.id,
          });
          setLeaderboard(data);
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      }
    };

    loadLeaderboardData();
  }, []);

  const referralPoints =
    activeSeason?.settings?.referralBonusPoints ?? 500;

  // Saludo según la hora de Colombia
  const greeting = (() => {
    const hour = getCurrentDateTimeColombia().getHours();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();
  const adminFirstName = currentUser?.fullName?.split(' ')[0] || 'Admin';

  // Encabezado ordenable de la vista lista
  const sortHeader = (key: 'fullName' | 'birthday' | 'createdAt', label: string) => {
    const activeSort = (filters.sortBy || 'fullName') === key;
    const arrow = activeSort ? (filters.sortOrder === 'desc' ? '▼' : '▲') : '';
    return (
      <button
        type="button"
        onClick={() =>
          handleFilterChange({
            ...filters,
            sortBy: key,
            sortOrder: activeSort && filters.sortOrder !== 'desc' ? 'desc' : 'asc',
            page: 1,
          })
        }
        className={`inline-flex items-center gap-1.5 text-left text-xs font-bold uppercase tracking-[0.08em] ${
          activeSort ? 'text-brand-deep dark:text-brand-amber' : 'text-cocoa-400 hover:text-cocoa-600 dark:text-white/50'
        }`}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <span aria-hidden="true">{arrow}</span>
      </button>
    );
  };

  const cardCallbacks = {
    onEdit: handleEdit,
    onDelete: handleDelete,
    onYoungUpdate: handleYoungUpdate,
    onShowSuccess: showSuccess,
    onShowError: showError,
  };

  const outlineBtn =
    'relative inline-flex h-11 items-center gap-2 rounded-full border border-sand-300 bg-white px-4 text-sm font-semibold text-cocoa-600 transition-colors hover:border-cocoa-400 dark:border-white/15 dark:bg-ink-800 dark:text-white/80';

  const viewToggle = (
    <div
      role="group"
      aria-label="Vista"
      className="flex h-12 items-center gap-1 rounded-2xl border border-sand-200 bg-sand-50 p-1 dark:border-white/10 dark:bg-white/5"
    >
      {(
        [
          ['grid', 'Tarjetas', 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
          ['list', 'Lista', 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
        ] as const
      ).map(([mode, label, path]) => (
        <button
          key={mode}
          type="button"
          aria-pressed={viewMode === mode}
          aria-label={label}
          onClick={() => changeViewMode(mode)}
          className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors ${
            viewMode === mode
              ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950'
              : 'text-cocoa-500 hover:text-cocoa-900 dark:text-white/60 dark:hover:text-white'
          }`}
        >
          <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={path} />
          </svg>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <SeasonProvider>
      <SeasonDataUpdater activeSeason={activeSeason} />
      <div className="brand-skin min-h-screen bg-cream dark:bg-ink-950">
        {/* Header */}
        <header className="border-b border-sand-200 bg-white dark:border-white/10 dark:bg-ink-950">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-[72px] lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                aria-label="Ir a la landing"
              >
                <img src={logo} alt="Jóvenes Modelia" className="h-9 w-9 object-contain lg:h-10 lg:w-10" />
                <span className="flex flex-col leading-none">
                  <span className="font-display text-[10px] tracking-[0.28em] text-cocoa-400 lg:text-[11px] dark:text-white/55">
                    JÓVENES
                  </span>
                  <span className="font-display text-lg font-semibold tracking-[0.04em] text-cocoa-900 lg:text-xl dark:text-white">
                    MODELIA
                  </span>
                </span>
              </button>
              <span className="inline-flex h-6 items-center rounded-full bg-ink-950 px-2.5 font-display text-[11px] tracking-[0.18em] text-brand-amber dark:bg-white/10">
                ADMIN
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/landing')}
                className="hidden h-11 items-center gap-2 rounded-full border border-sand-300 px-4 text-sm font-semibold text-cocoa-600 transition-colors hover:border-cocoa-400 md:inline-flex dark:border-white/15 dark:text-white/80"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                Landing CMS
              </button>
              <ThemeToggle />
              <ProfileDropdown onOpenProfile={handleOpenProfile} />
            </div>
          </div>
        </header>

        {/* Franja oscura: saludo + KPIs */}
        <section className="relative overflow-hidden bg-ink-950 pb-24 pt-7 sm:pt-10 lg:pb-28">
          <div className="pointer-events-none absolute left-1/3 -top-[420px] h-[820px] w-[820px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.3)_0%,rgba(220,51,64,.12)_38%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12 lg:px-8">
            <div className="flex flex-col gap-3">
              <span className="eyebrow text-brand-amber">Panel de administración</span>
              <h1 className="m-0 font-display text-[28px] font-bold uppercase leading-[1.05] text-white sm:text-4xl lg:text-[40px]">
                {greeting}, <span className="text-fire-name">{adminFirstName}</span>
              </h1>
              <p className="m-0 hidden max-w-md text-[15px] leading-relaxed text-white/65 sm:block">
                Jóvenes, asistencias, puntos y temporadas en un solo lugar.
              </p>
            </div>
            <div className="lg:w-[560px] lg:flex-shrink-0">
              <StatsCards youngList={allYoungList} />
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          {/* Tarjetas principales */}
          <section className="relative -mt-[72px] grid gap-4 md:grid-cols-2 lg:-mt-[84px] lg:grid-cols-[1.25fr_1fr_1fr] lg:gap-5">
            <div className="md:col-span-2 lg:col-span-1">
              <AdminQRCard
                refreshKey={attendanceRefresh}
                onOpenQR={() => setShowQRSection(true)}
                onOpenAttendance={() => setShowAttendanceSection(true)}
              />
            </div>
            <AdminRankingCard
              leaderboard={leaderboard}
              seasonName={activeSeason?.name}
              onViewRanking={() => setShowLeaderboardSection(true)}
              onOpenSeasons={() => setShowSeasonsSection(true)}
            />
            <AdminBirthdayCard
              youngList={allYoungList}
              onOpen={() => setShowBirthdayDashboard(true)}
              onOpenStats={() => setShowBirthdayStats(true)}
            />
          </section>

          {/* Jóvenes: barra de herramientas + filtros */}
          <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-sand-200 bg-white p-4 sm:mt-8 sm:p-6 dark:border-white/10 dark:bg-ink-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-baseline justify-between gap-3 lg:justify-start">
                <h2 className="m-0 font-display text-[26px] font-semibold uppercase text-cocoa-900 sm:text-3xl dark:text-white">
                  Jóvenes
                </h2>
                <span className="text-sm text-cocoa-500 dark:text-white/60">
                  {loading ? (
                    'Cargando...'
                  ) : (
                    <>
                      Mostrando <strong className="text-cocoa-900 dark:text-white">{youngList.length}</strong> de{' '}
                      <strong className="text-cocoa-900 dark:text-white">{displayTotal}</strong>
                      {filteredTotal !== null && filteredTotal < allYoungList.length && (
                        <span className="ml-1 font-semibold text-brand-deep dark:text-brand-amber">· filtrados</span>
                      )}
                    </>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isSuperAdmin && (
                  <button type="button" onClick={() => setShowRegistrationRequestsSection(true)} className={outlineBtn}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M19 8v6M22 11h-6" />
                    </svg>
                    Solicitudes
                    {recentUsersCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1.5 text-[11px] font-bold text-white">
                        {recentUsersCount > 9 ? '9+' : recentUsersCount}
                      </span>
                    )}
                  </button>
                )}
                <button type="button" onClick={() => setShowContactMessagesSection(true)} className={outlineBtn}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 6L2 7" />
                  </svg>
                  Contactos
                </button>
                <div className="relative ml-auto inline-flex lg:ml-0" ref={addMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="bg-fire inline-flex h-11 items-center gap-2 rounded-l-full pl-4 pr-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(194,65,15,0.7)] transition-all hover:brightness-110"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Agregar joven
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddMenu(prev => !prev)}
                    className="inline-flex h-11 w-10 items-center justify-center rounded-r-full border-l border-white/25 bg-brand-wine text-white transition-colors hover:bg-[#6E1640]"
                    aria-haspopup="menu"
                    aria-expanded={showAddMenu}
                    aria-label="Más acciones"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {showAddMenu && (
                    <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl border border-sand-200 bg-white p-1.5 shadow-[0_24px_48px_-16px_rgba(20,11,16,0.35)] dark:border-white/10 dark:bg-ink-800">
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          setShowForm(true);
                          setShowAddMenu(false);
                        }}
                        className="flex h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-sm font-medium text-cocoa-900 hover:bg-cream dark:text-white dark:hover:bg-white/5"
                      >
                        Agregar joven
                      </button>
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          setShowImportModal(true);
                          setShowAddMenu(false);
                        }}
                        className="flex h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-sm font-medium text-cocoa-900 hover:bg-cream dark:text-white dark:hover:bg-white/5"
                      >
                        Importar Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <FilterBar filters={filters} onFiltersChange={handleFilterChange} rightSlot={viewToggle} />
          </section>

          {/* Resultados */}
          <section className="mt-5">
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-sand-200 border-t-brand-ember" />
                <p className="mt-3 text-sm text-cocoa-500 dark:text-white/60">Cargando jóvenes...</p>
              </div>
            ) : youngList.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-sand-200 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-ink-900">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sand-100 text-brand-ember dark:bg-white/5 dark:text-brand-amber">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <h3 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">
                  No hay jóvenes registrados
                </h3>
                <p className="m-0 text-sm text-cocoa-500 dark:text-white/60">
                  {filteredTotal !== null && allYoungList.length > 0
                    ? 'No se encontraron jóvenes con los filtros aplicados'
                    : 'Comienza agregando jóvenes a la plataforma'}
                </p>
                <button type="button" onClick={() => setShowForm(true)} className="btn-fire mt-1 h-11 px-6 text-sm">
                  Agregar primer joven
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-[18px]">
                {youngList.map(young => (
                  <YoungCard
                    key={young.id || `young-${young.fullName}`}
                    young={young}
                    referralPoints={referralPoints}
                    {...cardCallbacks}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-sand-200 bg-white dark:border-white/10 dark:bg-ink-900">
                <div className={`hidden h-[46px] rounded-t-[22px] border-b border-sand-200 bg-sand-50 px-5 dark:border-white/10 dark:bg-white/[0.03] ${YOUNG_ROW_GRID}`}>
                  {sortHeader('fullName', 'Joven')}
                  <span className="hidden text-xs font-bold uppercase tracking-[0.08em] text-cocoa-400 lg:block dark:text-white/50">Edad</span>
                  <span className="hidden text-xs font-bold uppercase tracking-[0.08em] text-cocoa-400 xl:block dark:text-white/50">Contacto</span>
                  <span className="hidden lg:block">{sortHeader('birthday', 'Cumpleaños')}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-cocoa-400 dark:text-white/50">Puntos</span>
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-cocoa-400 dark:text-white/50">Placa</span>
                  <span className="text-right text-xs font-bold uppercase tracking-[0.08em] text-cocoa-400 dark:text-white/50">Acciones</span>
                </div>
                {youngList.map(young => (
                  <YoungRow
                    key={young.id || `young-${young.fullName}`}
                    young={young}
                    referralPoints={referralPoints}
                    {...cardCallbacks}
                  />
                ))}
              </div>
            )}

            {loadingMore && (
              <div className="flex items-center justify-center gap-2.5 py-7 text-sm text-cocoa-400 dark:text-white/55">
                <span className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-sand-200 border-t-brand-ember" />
                Cargando más jóvenes...
              </div>
            )}

            {!hasMore && youngList.length > 0 && (
              <p className="m-0 py-8 text-center text-sm text-cocoa-400 dark:text-white/50">
                <strong className="font-semibold text-cocoa-600 dark:text-white/70">¡Has visto todos los jóvenes!</strong>
                <br />
                No hay más elementos para mostrar
              </p>
            )}
          </section>
        </main>

        {/* Modales */}
        {showForm && (
          <YoungForm
            isOpen={showForm}
            onSubmit={handleSubmit}
            onClose={() => setShowForm(false)}
            onShowSuccess={showSuccess}
            onShowError={showError}
          />
        )}

        {showEditForm && editingYoung && (
          <EditYoungForm
            isOpen={showEditForm}
            young={editingYoung}
            onSubmit={handleUpdate}
            onClose={() => {
              setShowEditForm(false);
              setEditingYoung(null);
            }}
            onShowSuccess={showSuccess}
            onShowError={showError}
          />
        )}

        {showImportModal && (
          <ImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onSuccess={handleImportSuccess}
            onShowSuccess={showSuccess}
            onShowError={showError}
          />
        )}

        {showBirthdayDashboard && (
          <BirthdayDashboard
            isOpen={showBirthdayDashboard}
            onClose={() => setShowBirthdayDashboard(false)}
            youngList={allYoungList}
            onOpenStats={() => setShowBirthdayStats(true)}
          />
        )}

        {showBirthdayStats && (
          <BirthdayStatsModal
            isOpen={showBirthdayStats}
            onClose={() => setShowBirthdayStats(false)}
          />
        )}

        {showQRSection && (
          <AdminPanelModal
            title="Gestión QR"
            subtitle="Código de asistencia del día"
            icon={<PanelIcon d="M3 3h5v5H3zM16 3h5v5h-5zM3 16h5v5H3zM21 16h-3a2 2 0 0 0-2 2v3M12 7v3a2 2 0 0 1-2 2H7" />}
            size="lg"
            onClose={() => setShowQRSection(false)}
          >
            <QRGenerator
              onSuccess={() => {
                showSuccess('QR generado exitosamente');
                setAttendanceRefresh(prev => prev + 1);
              }}
              onError={error => showError(error)}
            />
          </AdminPanelModal>
        )}

        {showAttendanceSection && (
          <AdminPanelModal
            title="Asistencias del día"
            subtitle="Presentes, porcentaje y exportación"
            icon={<PanelIcon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM16 11l2 2 4-4" />}
            size="xl"
            onClose={() => setShowAttendanceSection(false)}
          >
            <AttendanceList refreshTrigger={attendanceRefresh} />
            {isSuperAdmin && (
              <div className="mt-5 flex justify-end">
                <ManualAttendanceButton onClick={() => setShowManualAttendanceModal(true)} />
              </div>
            )}
          </AdminPanelModal>
        )}

        {showLeaderboardSection && (
          <RankingModal
            leaderboard={leaderboard}
            seasonName={activeSeason?.name}
            onClose={() => setShowLeaderboardSection(false)}
          />
        )}

        {showSeasonsSection && (
          <AdminPanelModal
            title="Temporadas"
            subtitle="Solo una puede estar activa"
            icon={<PanelIcon d="M3 4h18v18H3zM16 2v4M8 2v4M3 10h18" />}
            size="xl"
            onClose={() => setShowSeasonsSection(false)}
          >
            <SeasonManager onShowSuccess={showSuccess} onShowError={showError} />
          </AdminPanelModal>
        )}

        {showRegistrationRequestsSection && isSuperAdmin && (
          <AdminPanelModal
            title="Solicitudes"
            subtitle="Registros recientes · solo Super Admin"
            icon={<PanelIcon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM19 8v6M22 11h-6" />}
            size="xl"
            onClose={() => setShowRegistrationRequestsSection(false)}
          >
            <RegistrationRequestsManager
              onShowSuccess={showSuccess}
              onShowError={showError}
              onPendingCountChange={setRecentUsersCount}
            />
          </AdminPanelModal>
        )}

        {showContactMessagesSection && (
          <AdminPanelModal
            title="Contactos"
            subtitle="Mensajes enviados desde la landing"
            icon={<PanelIcon d="M2 4h20v16H2zM22 7l-10 6L2 7" />}
            size="xl"
            onClose={() => setShowContactMessagesSection(false)}
          >
            <ContactMessagesManager onShowError={showError} />
          </AdminPanelModal>
        )}

        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

        <ProfileModal
          isOpen={showProfileModal}
          onClose={handleCloseProfile}
          young={currentUser}
          onProfileUpdated={handleProfileUpdated}
        />

        <ManualAttendanceModal
          isOpen={showManualAttendanceModal}
          onClose={() => setShowManualAttendanceModal(false)}
          onSuccess={data => {
            setShowManualAttendanceModal(false);
            setManualAttendanceResult(data);
            setShowManualSuccessModal(true);
            setAttendanceRefresh(prev => prev + 1);
          }}
        />
        <AttendanceModal
          variant="brand"
          isOpen={showManualSuccessModal}
          onClose={() => setShowManualSuccessModal(false)}
          success={true}
          message={manualAttendanceResult ? '¡Asistencia registrada manualmente!' : ''}
          subtitle={manualAttendanceResult?.young?.fullName}
          date={manualAttendanceResult?.attendanceDate}
        />
      </div>
    </SeasonProvider>
  );
}

const PanelIcon: React.FC<{ d: string }> = ({ d }) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export default HomePage;
