import { useState, useEffect, useRef, useCallback } from 'react';
import YoungForm from '../components/YoungForm';
import EditYoungForm from '../components/EditYoungForm';
import YoungCard from '../components/YoungCard';
import FilterBar from '../components/FilterBar';
import BirthdayDashboard from '../components/BirthdayDashboard';
import ImportModal from '../components/ImportModal';
import ProfileDropdown from '../components/ProfileDropdown';
import ProfileModal from '../components/ProfileModal';
import StatsCards from '../components/StatsCards';
import ToastContainer from '../components/ToastContainer';
import ThemeToggle from '../components/ThemeToggle';
import QRGenerator from '../components/QRGenerator';
import AttendanceList from '../components/AttendanceList';
import LeaderboardSection from '../components/LeaderboardSection';
import SeasonManager from '../components/SeasonManager';
import RegistrationRequestsManager from '../components/RegistrationRequestsManager';
import {
  apiRequest,
  apiUpload,
  debugAuthState,
  getCurrentUserProfile,
  getAllRegistrationRequests,
} from '../services/api';
import { useToast } from '../hooks/useToast';
import type { IYoung, PaginationQuery } from '../types';
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
          console.log('🔄 Scroll infinito activado - cargando más elementos');
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

function HomePage() {
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<IYoung | null>(null);

  // Estados para QR y asistencias
  const [showQRSection, setShowQRSection] = useState(false);
  const [showAttendanceSection, setShowAttendanceSection] = useState(false);
  const [attendanceRefresh, setAttendanceRefresh] = useState(0);

  // Estados para nuevas secciones
  const [showLeaderboardSection, setShowLeaderboardSection] = useState(false);
  const [showSeasonsSection, setShowSeasonsSection] = useState(false);
  const [showRegistrationRequestsSection, setShowRegistrationRequestsSection] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showQRMenu, setShowQRMenu] = useState(false);
  const [showRankingMenu, setShowRankingMenu] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Refs para cerrar dropdowns al hacer clic fuera
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const qrMenuRef = useRef<HTMLDivElement | null>(null);
  const rankingMenuRef = useRef<HTMLDivElement | null>(null);

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
      if (
        showQRMenu &&
        qrMenuRef.current &&
        !qrMenuRef.current.contains(target)
      ) {
        setShowQRMenu(false);
      }
      if (
        showRankingMenu &&
        rankingMenuRef.current &&
        !rankingMenuRef.current.contains(target)
      ) {
        setShowRankingMenu(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAddMenu(false);
        setShowQRMenu(false);
        setShowRankingMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showAddMenu, showQRMenu, showRankingMenu]);

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
      console.log('🔍 Obteniendo todos los jóvenes para estadísticas...');

      let allYoung: IYoung[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', '100'); // Máximo permitido por el backend
        // NO aplicar filtros a las estadísticas - queremos el total real

        const url = `young?${params.toString()}`;
        console.log(`📡 URL para estadísticas página ${currentPage}:`, url);

        const response = await apiRequest(url);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`📊 Resultado página ${currentPage}:`, result);

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

        console.log(
          `📄 Página ${currentPage - 1}: ${youngArray.length} jóvenes. Total acumulado: ${allYoung.length}`
        );
      }

      console.log('👥 Total jóvenes para estadísticas:', allYoung.length);
      console.log('📋 Primeros 3 jóvenes:', allYoung.slice(0, 3));
      setAllYoungList(allYoung);
      console.log(
        '✅ allYoungList actualizado con',
        allYoung.length,
        'elementos'
      );
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
            console.log(
              '🚫 Evitando carga duplicada de página:',
              page,
              'currentPageRef:',
              currentPageRef.current,
              'isLoading:',
              isLoadingPageRef.current
            );
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
        console.log('📡 Llamando API con URL:', url);

        const response = await apiRequest(url);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('📊 Respuesta del servidor:', result);

        const youngArray =
          result.success && result.data && Array.isArray(result.data.data)
            ? result.data.data
            : [];

        const pagination = result.data?.pagination;

        console.log('📊 Datos recibidos:', {
          youngArray: youngArray.length,
          pagination,
          append,
        });

        if (append) {
          // Scroll infinito: agregar nuevos elementos
          setYoungList(prevList => {
            const newList = [...prevList, ...youngArray];
            console.log(
              '📝 Lista actualizada (append):',
              newList.length,
              'elementos'
            );
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
          console.log('📝 Lista reemplazada:', youngArray.length, 'elementos');
        }

        // Actualizar información de paginación
        setHasMore(pagination ? pagination.hasNextPage : false);
        setFilteredTotal(pagination?.totalItems || null);

        console.log('📄 Estado de paginación:', {
          currentPage: pagination?.currentPage || 1,
          totalPages: pagination?.totalPages || 1,
          hasNextPage: pagination?.hasNextPage || false,
          totalItems: pagination?.totalItems || 0,
        });
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
      console.log(
        '🔄 Activando carga de más elementos. Página a cargar:',
        nextPageToLoad,
        'currentPageRef:',
        currentPageRef.current
      );
      setIsLoadingMore(true);
      fetchYoung(nextPageToLoad, true).finally(() => {
        setIsLoadingMore(false);
      });
    } else {
      console.log('🚫 No se puede cargar más:', {
        isLoadingMore,
        loadingMore,
        isLoadingPageRef: isLoadingPageRef.current,
        hasMore,
        nextPageToLoad,
        currentPageRef: currentPageRef.current,
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
        
        // Si es Super Admin, cargar conteo de solicitudes pendientes
        if (userData?.role_name === 'Super Admin') {
          loadPendingRequestsCount();
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
    console.log('🔍 Aplicando filtros:', newFilters);
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
      console.log('✨ Iniciando creación de joven');
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

      const result = await response.json();
      console.log('✅ Joven creado exitosamente:', result);

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
      console.log('🔄 Iniciando actualización de joven:', id);
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

      const result = await response.json();
      console.log('✅ Joven actualizado exitosamente:', result);

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
      console.log('🗑️ Iniciando eliminación de joven:', id);
      debugAuthState(); // Debug del estado de autenticación

      const response = await apiRequest(`young/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar el joven');
      }

      console.log('✅ Joven eliminado exitosamente');

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
    console.log('📥 Importación exitosa, recargando datos...');
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
      console.log('👤 Abriendo perfil de admin...');
      const userData = await getCurrentUserProfile();
      console.log('👤 Datos del usuario admin obtenidos:', userData);
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
    
    // Si es Super Admin, actualizar conteo de solicitudes pendientes
    if (updatedUser?.role_name === 'Super Admin') {
      loadPendingRequestsCount();
    }
  };

  // Función para cargar el conteo de solicitudes pendientes
  const loadPendingRequestsCount = async () => {
    try {
      const result = await getAllRegistrationRequests({
        page: 1,
        limit: 1,
        status: 'pending',
      });
      setPendingRequestsCount(result.pagination?.totalItems || 0);
    } catch (error) {
      console.error('Error loading pending requests count:', error);
      setPendingRequestsCount(0);
    }
  };

  // Verificar si el usuario es Super Admin
  const isSuperAdmin = currentUser?.role_name === 'Super Admin';

  // Cargar conteo de solicitudes pendientes cuando se abre la sección
  useEffect(() => {
    if (showRegistrationRequestsSection && isSuperAdmin) {
      loadPendingRequestsCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRegistrationRequestsSection, isSuperAdmin]);

  const displayTotal =
    filteredTotal !== null ? filteredTotal : allYoungList.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header con ProfileDropdown */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y título */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <img
                  src={logo}
                  alt="JA Manager Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  JA Manager
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                  Dashboard de Administración
                </p>
              </div>
            </div>

            {/* Profile Dropdown y Theme Toggle */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <ProfileDropdown onOpenProfile={handleOpenProfile} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard de Cumpleaños */}
        {showBirthdayDashboard && (
          <div className="mb-8">
            {/* <BirthdayDashboard /> */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                🎂 Dashboard de Cumpleaños
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Próximamente: Vista de cumpleaños
              </p>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <StatsCards
          youngList={allYoungList}
          onBirthdayClick={() => setShowBirthdayDashboard(true)}
        />

        {/* Barra de acciones */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Split button: Agregar + menú */}
            <div className="relative inline-flex" ref={addMenuRef}>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-l-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow"
              >
                <span className="material-symbols-rounded text-base">add</span>
                <span>Agregar Joven</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddMenu(prev => !prev)}
                className="px-3 py-3 rounded-r-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow border-l border-blue-500/40"
                aria-haspopup="menu"
                aria-expanded={showAddMenu}
                title="Más acciones"
              >
                <span className="material-symbols-rounded text-base">
                  expand_more
                </span>
              </button>

              {showAddMenu && (
                <div className="absolute left-0 z-30 mt-2 w-56 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setShowAddMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    <span className="material-symbols-rounded text-base">
                      person_add
                    </span>
                    <span>Agregar Joven</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowImportModal(true);
                      setShowAddMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-emerald-700 dark:text-emerald-300"
                  >
                    <span className="material-symbols-rounded text-base">
                      upload
                    </span>
                    <span>Importar Excel</span>
                  </button>
                </div>
              )}
            </div>
            {/* Split button: Gestión QR + menú (incluye Ver Asistencias) */}
            <div className="relative inline-flex" ref={qrMenuRef}>
              <button
                onClick={() => {
                  setShowQRSection(true);
                  setShowQRMenu(false);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-l-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow"
              >
                <span className="material-symbols-rounded text-base">
                  qr_code_2
                </span>
                <span>Gestión QR</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQRMenu(prev => !prev)}
                className="px-3 py-3 rounded-r-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow border-l border-blue-500/40"
                aria-haspopup="menu"
                aria-expanded={showQRMenu}
                title="Más acciones"
              >
                <span className="material-symbols-rounded text-base">
                  expand_more
                </span>
              </button>

              {showQRMenu && (
                <div className="absolute left-0 z-30 mt-2 w-56 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowQRSection(true);
                      setShowQRMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    <span className="material-symbols-rounded text-base">
                      qr_code_2
                    </span>
                    <span>Gestión QR</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAttendanceSection(true);
                      setShowQRMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-emerald-700 dark:text-emerald-300"
                  >
                    <span className="material-symbols-rounded text-base">
                      how_to_reg
                    </span>
                    <span>Ver Asistencias</span>
                  </button>
                </div>
              )}
            </div>

            {/* Botón para Gestión de Solicitudes (solo Super Admin) */}
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setShowRegistrationRequestsSection(true);
                }}
                className="relative inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all shadow"
              >
                <span className="material-symbols-rounded text-base">
                  assignment_ind
                </span>
                <span>Solicitudes</span>
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full border-2 border-white dark:border-gray-800">
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </span>
                )}
              </button>
            )}

            {/* Split button: Ver Ranking + menú (incluye Gestión Temporadas) */}
            <div className="relative inline-flex" ref={rankingMenuRef}>
              <button
                onClick={() => {
                  setShowLeaderboardSection(true);
                  setShowRankingMenu(false);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-l-xl bg-yellow-600 text-white hover:bg-yellow-700 transition-all shadow"
              >
                <span className="material-symbols-rounded text-base">
                  leaderboard
                </span>
                <span>Ver Ranking</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRankingMenu(prev => !prev)}
                className="px-3 py-3 rounded-r-xl bg-yellow-600 text-white hover:bg-yellow-700 transition-all shadow border-l border-yellow-500/40"
                aria-haspopup="menu"
                aria-expanded={showRankingMenu}
                title="Más acciones"
              >
                <span className="material-symbols-rounded text-base">
                  expand_more
                </span>
              </button>

              {showRankingMenu && (
                <div className="absolute left-0 z-30 mt-2 w-64 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowLeaderboardSection(true);
                      setShowRankingMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    <span className="material-symbols-rounded text-base">
                      leaderboard
                    </span>
                    <span>Ver Ranking</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSeasonsSection(true);
                      setShowRankingMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-indigo-700 dark:text-indigo-300"
                  >
                    <span className="material-symbols-rounded text-base">
                      calendar_month
                    </span>
                    <span>Gestión Temporadas</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {loading ? (
              <span>Cargando...</span>
            ) : (
              <span>
                Mostrando {youngList.length} de {displayTotal} jóvenes
                {filteredTotal !== null &&
                  filteredTotal < allYoungList.length && (
                    <span className="text-blue-600 dark:text-blue-400 ml-1">
                      (filtrados)
                    </span>
                  )}
              </span>
            )}
          </div>
        </div>

        {/* Barra de filtros */}
        <FilterBar filters={filters} onFiltersChange={handleFilterChange} />

        {/* Contenido principal */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Cargando jóvenes...</p>
          </div>
        ) : (
          <>
            {youngList.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-12 h-12 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No hay jóvenes registrados
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {filteredTotal !== null && allYoungList.length > 0
                    ? 'No se encontraron jóvenes con los filtros aplicados'
                    : 'Comienza agregando jóvenes a la plataforma'}
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Agregar Primer Joven
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {youngList.map(young => (
                  <YoungCard
                    key={young.id || `young-${Math.random()}`}
                    young={young}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onYoungUpdate={handleYoungUpdate}
                    onShowSuccess={showSuccess}
                    onShowError={showError}
                  />
                ))}
              </div>
            )}

            {/* Indicador de carga para scroll infinito */}
            {loadingMore && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Cargando más jóvenes...
                </p>
              </div>
            )}

            {/* Indicador de fin de resultados */}
            {!hasMore && youngList.length > 0 && (
              <div className="text-center py-8">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <svg
                    className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <p className="font-medium text-sm sm:text-base">
                    ¡Has visto todos los jóvenes!
                  </p>
                  <p className="text-xs sm:text-sm mt-1">
                    No hay más elementos para mostrar
                  </p>
                </div>
              </div>
            )}
          </>
        )}

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
          />
        )}

        {/* Sección de Gestión QR */}
        {showQRSection && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Gestión de Código QR
                  </h2>
                  <button
                    onClick={() => setShowQRSection(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                <QRGenerator
                  onSuccess={() => {
                    showSuccess('QR generado exitosamente');
                    setAttendanceRefresh(prev => prev + 1);
                  }}
                  onError={error => showError(error)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Sección de Lista de Asistencias */}
        {showAttendanceSection && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Asistencias del Día
                  </h2>
                  <button
                    onClick={() => setShowAttendanceSection(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                <AttendanceList refreshTrigger={attendanceRefresh} />
              </div>
            </div>
          </div>
        )}

        {/* Sección de Ranking/Leaderboard */}
        {showLeaderboardSection && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-rounded text-3xl text-primary">
                      leaderboard
                    </span>
                    Ranking de Puntos
                  </h2>
                  <button
                    onClick={() => setShowLeaderboardSection(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                <LeaderboardSection />
              </div>
            </div>
          </div>
        )}

        {/* Sección de Gestión de Temporadas */}
        {showSeasonsSection && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-rounded text-3xl text-primary">
                      calendar_today
                    </span>
                    Gestión de Temporadas
                  </h2>
                  <button
                    onClick={() => setShowSeasonsSection(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                <SeasonManager
                  onShowSuccess={showSuccess}
                  onShowError={showError}
                />
              </div>
            </div>
          </div>
        )}

        {/* Sección de Gestión de Solicitudes de Registro (solo Super Admin) */}
        {showRegistrationRequestsSection && isSuperAdmin && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-rounded text-3xl text-purple-600 dark:text-purple-400">
                      assignment_ind
                    </span>
                    Gestión de Solicitudes de Registro
                  </h2>
                  <button
                    onClick={() => setShowRegistrationRequestsSection(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                <RegistrationRequestsManager
                  onShowSuccess={showSuccess}
                  onShowError={showError}
                  onPendingCountChange={setPendingRequestsCount}
                />
              </div>
            </div>
          </div>
        )}

        {/* Toast Container */}
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

        {/* Modal de perfil del admin */}
        <ProfileModal
          isOpen={showProfileModal}
          onClose={handleCloseProfile}
          young={currentUser}
          onProfileUpdated={handleProfileUpdated}
        />
      </div>
    </div>
  );
}

export default HomePage;
