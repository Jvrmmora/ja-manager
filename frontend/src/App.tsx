import { useState, useEffect } from 'react';
import './App.css';
import YoungForm from './components/YoungForm';
import EditYoungForm from './components/EditYoungForm';
import YoungCard from './components/YoungCard';
import FilterBar from './components/FilterBar';
import BirthdayDashboard from './components/BirthdayDashboard';
import ImportModal from './components/ImportModal';
import { apiRequest } from './services/api';
import type { IYoung, PaginationQuery } from './types';

interface YoungFormData {
  fullName: string;
  ageRange: string;
  phone: string;
  birthday: string;
  gender: 'masculino' | 'femenino' | '';
  role: 'lider juvenil' | 'colaborador' | 'director' | 'subdirector' | 'club guias' | 'club conquistadores' | 'club aventureros' | 'escuela sabatica' | 'joven adventista' | 'simpatizante';
  email: string;
  skills: string[];
  profileImage?: File;
  group?: number | '' | undefined;
}

// Hook para scroll infinito automático
const useInfiniteScroll = (callback: () => void, hasMore: boolean, loading: boolean) => {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const handleScroll = () => {
      // Limpiar timeout anterior
      if (timeoutId) {
        clearTimeout(timeoutId as ReturnType<typeof setTimeout>);
      }
      
      // Debounce de 200ms para evitar múltiples llamadas
      timeoutId = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
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

function App() {
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
  const [currentPage, setCurrentPage] = useState(1);
  const [nextPageToLoad, setNextPageToLoad] = useState(2); // Track próxima página para cargar
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Prevenir múltiples llamadas simultáneas
  const [filters, setFilters] = useState<PaginationQuery>({
    page: 1,
    limit: 10,
    sortBy: 'fullName',
    sortOrder: 'asc'
  });

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
        
        const url = `api/young?${params.toString()}`;
        console.log(`📡 URL para estadísticas página ${currentPage}:`, url);
        
        const response = await apiRequest(url);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`📊 Resultado página ${currentPage}:`, result);
        
        const youngArray = result.success && result.data && Array.isArray(result.data.data) 
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
        
        console.log(`📄 Página ${currentPage - 1}: ${youngArray.length} jóvenes. Total acumulado: ${allYoung.length}`);
      }
      
      console.log('👥 Total jóvenes para estadísticas:', allYoung.length);
      console.log('📋 Primeros 3 jóvenes:', allYoung.slice(0, 3));
      setAllYoungList(allYoung);
      console.log('✅ allYoungList actualizado con', allYoung.length, 'elementos');
    } catch (err) {
      console.error('❌ Error en fetchAllYoung:', err);
    }
  };

  // Función para obtener jóvenes del backend con paginación
  const fetchYoung = async (page = 1, append = false, customFilters?: PaginationQuery) => {
    try {
      // Prevenir llamadas duplicadas para la misma página en modo append
      if (append && page <= currentPage) {
        console.log('🚫 Evitando carga duplicada de página:', page, 'currentPage:', currentPage);
        return;
      }
      
      if (!append) {
        setLoading(true);
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
      if (activeFilters.sortBy) {
        params.append('sortBy', activeFilters.sortBy);
      }
      if (activeFilters.sortOrder) {
        params.append('sortOrder', activeFilters.sortOrder);
      }
      
      const url = `api/young?${params.toString()}`;
      console.log('📡 Llamando API con URL:', url);
      
      const response = await apiRequest(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📊 Respuesta del servidor:', result);
      
      const youngArray = result.success && result.data && Array.isArray(result.data.data) 
        ? result.data.data 
        : [];
      
      const pagination = result.data?.pagination;
      
      console.log('📊 Datos recibidos:', {
        page: page,
        append: append,
        receivedCount: youngArray.length,
        currentListCount: youngList.length,
        youngIds: youngArray.map((y: IYoung) => y.id),
      });
      
      if (append) {
        // Verificar duplicados antes de agregar - usando múltiples criterios
        const currentIds = new Set(youngList.map((y: IYoung) => y.id));
        const currentNames = new Set(youngList.map((y: IYoung) => `${y.fullName}-${y.birthday}`));
        
        const newYoung = youngArray.filter((y: IYoung) => {
          const hasIdDuplicate = currentIds.has(y.id);
          const hasNameBirthdayDuplicate = currentNames.has(`${y.fullName}-${y.birthday}`);
          const isDuplicate = hasIdDuplicate || hasNameBirthdayDuplicate;
          
          if (isDuplicate) {
            console.log('🚫 Duplicado detectado:', {
              name: y.fullName,
              id: y.id,
              hasIdDuplicate,
              hasNameBirthdayDuplicate
            });
          }
          
          return !isDuplicate;
        });
        
        console.log('➕ Agregando elementos:', {
          totalReceived: youngArray.length,
          duplicatesFiltered: youngArray.length - newYoung.length,
          newElementsAdded: newYoung.length,
          currentListSize: youngList.length,
          finalListSize: youngList.length + newYoung.length,
          receivedIds: youngArray.map((y: IYoung) => y.id),
          currentIds: Array.from(currentIds),
          newIds: newYoung.map((y: IYoung) => y.id)
        });
        
        if (newYoung.length > 0) {
          setYoungList(prev => [...prev, ...newYoung]);
        } else {
          console.log('⚠️ No hay elementos nuevos para agregar - todos eran duplicados');
        }
      } else {
        console.log('🔄 Reemplazando lista completa con', youngArray.length, 'elementos');
        setYoungList(youngArray);
      }
      
      // Verificar si hay más páginas
      if (pagination) {
        setHasMore(pagination.currentPage < pagination.totalPages);
        
        // Actualizar currentPage y nextPageToLoad
        if (!append) {
          setCurrentPage(pagination.currentPage);
          setNextPageToLoad(pagination.currentPage + 1);
        } else if (pagination.currentPage > currentPage) {
          setCurrentPage(pagination.currentPage);
          setNextPageToLoad(pagination.currentPage + 1);
        }
        
        console.log('📊 Paginación:', {
          requestedPage: page,
          backendCurrentPage: pagination.currentPage,
          frontendCurrentPage: currentPage,
          nextPageToLoad: pagination.currentPage + 1,
          totalPages: pagination.totalPages,
          totalItems: pagination.totalItems,
          hasNext: pagination.hasNext,
          receivedItems: youngArray.length,
          isAppend: append
        });
      } else {
        setHasMore(youngArray.length === 10); // Si devuelve 10, probablemente hay más
        setCurrentPage(page); // Actualizar página manualmente si no hay paginación
        setNextPageToLoad(page + 1);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error en fetchYoung:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Función específica para aplicar filtros
  const fetchYoungWithFilters = async (filtersToApply: PaginationQuery) => {
    await fetchYoung(1, false, filtersToApply);
  };

  // Función para manejar cambios en filtros
  const handleFiltersChange = (newFilters: PaginationQuery) => {
    console.log('🔄 Aplicando nuevos filtros:', newFilters);
    
    // Limpiar filtros vacíos para evitar problemas
    const cleanFilters = {
      page: 1,
      limit: 10,
      sortBy: newFilters.sortBy || 'fullName',
      sortOrder: newFilters.sortOrder || 'asc',
      // NO hacer trim del search aquí, dejarlo como está para permitir espacios
      ...(newFilters.search !== undefined && newFilters.search !== '' && { search: newFilters.search }),
      ...(newFilters.ageRange && { ageRange: newFilters.ageRange }),
      ...(newFilters.gender && { gender: newFilters.gender }),
      ...(newFilters.role && { role: newFilters.role }),
    };
    
    console.log('🧹 Filtros limpiados:', cleanFilters);
    
    // Resetear todo el estado de paginación
    setFilters(cleanFilters);
    setCurrentPage(1);
    setNextPageToLoad(2);
    setHasMore(true);
    setYoungList([]); // Limpiar lista actual
    setLoading(true); // Mostrar loading
    setIsLoadingMore(false); // Reset loading state
    
    // Aplicar filtros de forma síncrona
    const applyFilters = async () => {
      try {
        await fetchYoungWithFilters(cleanFilters);
      } catch (error) {
        console.error('Error aplicando filtros:', error);
        setLoading(false);
      }
    };
    
    applyFilters();
  };

  // Función para cargar más elementos
  const loadMore = async () => {
    if (!hasMore || loadingMore || isLoadingMore) {
      console.log('🚫 No se puede cargar más:', { hasMore, loadingMore, isLoadingMore });
      return;
    }
    
    setIsLoadingMore(true);
    
    console.log('📄 Cargando más elementos:', {
      currentPage,
      nextPageToLoad,
      totalElementsDisplayed: youngList.length
    });
    
    try {
      await fetchYoung(nextPageToLoad, true);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Función para recargar estadísticas después de operaciones CRUD
  const refreshAllData = async () => {
    setCurrentPage(1);
    setNextPageToLoad(2);
    setHasMore(true);
    setYoungList([]); // Limpiar lista actual
    await Promise.all([
      fetchYoung(1, false),
      fetchAllYoung()
    ]);
  };

  // Función para agregar nuevo joven
  const handleAddYoung = async (formData: YoungFormData) => {
    try {
      const form = new FormData();
      form.append('fullName', formData.fullName);
      form.append('ageRange', formData.ageRange);
      form.append('phone', formData.phone);
      form.append('birthday', formData.birthday);
      form.append('gender', formData.gender);
      form.append('role', formData.role);
      if (formData.group !== undefined && formData.group !== '') {
        form.append('group', String(formData.group));
      }
      
      // Solo incluir email si tiene un valor válido
      if (formData.email && formData.email.trim()) {
        form.append('email', formData.email);
      }
      
      form.append('skills', JSON.stringify(formData.skills));
      
      if (formData.profileImage) {
        form.append('profileImage', formData.profileImage);
      }

      const response = await apiRequest('api/young', {
        method: 'POST',
        body: form,
        headers: {} // Eliminar Content-Type para multipart/form-data
      });

      if (!response.ok) {
        throw new Error('Error al registrar el joven');
      }

      // Recargar la lista
      await refreshAllData();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };

  // Función para eliminar joven
  const handleDeleteYoung = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este joven?')) {
      return;
    }

    try {
      const response = await apiRequest(`api/young/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el joven');
      }

      // Recargar la lista
      await refreshAllData();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el joven. Por favor, intenta de nuevo.');
    }
  };

  // Función para abrir el formulario de edición
  const handleEditYoung = (young: IYoung) => {
    setEditingYoung(young);
    setShowEditForm(true);
  };

  // Función para actualizar un joven
  const handleUpdateYoung = async (id: string, formData: YoungFormData) => {
    try {
      const form = new FormData();
      form.append('fullName', formData.fullName);
      form.append('ageRange', formData.ageRange);
      form.append('phone', formData.phone);
      form.append('birthday', formData.birthday);
      form.append('gender', formData.gender);
      form.append('role', formData.role);
      if (formData.group !== undefined && formData.group !== '') {
        form.append('group', String(formData.group));
      }
      
      // Solo incluir email si tiene un valor válido
      if (formData.email && formData.email.trim()) {
        form.append('email', formData.email);
      }
      
      form.append('skills', JSON.stringify(formData.skills));
      
      if (formData.profileImage) {
        form.append('profileImage', formData.profileImage);
      }

      const response = await apiRequest(`api/young/${id}`, {
        method: 'PUT',
        body: form,
        headers: {} // Eliminar Content-Type para multipart/form-data
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el joven');
      }

      // Recargar la lista
      await refreshAllData();
      setShowEditForm(false);
      setEditingYoung(null);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };

  // Cargar estadísticas al inicio
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('🚀 Cargando datos iniciales...');
      await Promise.all([
        fetchAllYoung(), // Cargar estadísticas
        fetchYoung(1, false) // Cargar primera página
      ]);
    };
    
    loadInitialData();
  }, []); // Sin dependencias, solo al montar

  // Scroll infinito automático
  useInfiniteScroll(loadMore, hasMore, loadingMore || isLoadingMore);

  // Estadísticas básicas
  const stats = {
    total: Array.isArray(allYoungList) ? allYoungList.length : 0,
    active: Array.isArray(allYoungList) ? allYoungList.length : 0,
    newThisMonth: Array.isArray(allYoungList) ? allYoungList.filter(young => {
      try {
        if (!young.createdAt) return false;
        const created = new Date(young.createdAt);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      } catch (err) {
        console.error('Error calculando nuevos este mes:', err, young);
        return false;
      }
    }).length : 0,
    birthdays: Array.isArray(allYoungList) ? allYoungList.filter(young => {
      try {
        if (!young.birthday) return false;
        const birthday = new Date(young.birthday);
        const now = new Date();
        return birthday.getMonth() === now.getMonth();
      } catch (err) {
        console.error('Error calculando cumpleaños:', err, young);
        return false;
      }
    }).length : 0
  };

  // Debug de estadísticas
  console.log('📊 Estado actual de allYoungList:', allYoungList.length, 'jóvenes');
  console.log('📊 Estadísticas calculadas:', stats);
  
  // Debug adicional para monitorear cambios en allYoungList
  useEffect(() => {
    console.log('🔄 allYoungList cambió:', allYoungList.length, 'elementos');
  }, [allYoungList]);

  // Debug y limpieza de duplicados en youngList
  useEffect(() => {
    const uniqueIds = new Set();
    const duplicates = youngList.filter(young => {
      const isDuplicate = uniqueIds.has(young.id);
      uniqueIds.add(young.id);
      return isDuplicate;
    });
    
    if (duplicates.length > 0) {
      console.warn('⚠️ Duplicados detectados en youngList:', duplicates);
      console.log('🧹 Limpiando duplicados...');
      
      // Limpiar duplicados manteniendo solo la primera instancia
      const uniqueYoung = youngList.filter((young, index, arr) => 
        arr.findIndex(y => y.id === young.id) === index
      );
      
      if (uniqueYoung.length !== youngList.length) {
        console.log('✅ Duplicados eliminados:', youngList.length - uniqueYoung.length);
        setYoungList(uniqueYoung);
      }
    }
  }, [youngList]);

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
                Sistema de Gestión de Jóvenes
              </h1>
              <p className="text-blue-100 mt-1 sm:mt-2 text-sm sm:text-base">
                Plataforma de administración para jóvenes de la iglesia
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="hidden xs:inline">Importar Excel</span>
                <span className="xs:hidden">Importar</span>
              </button>
              
              <button
                onClick={() => setShowForm(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden xs:inline">Agregar Joven</span>
                <span className="xs:hidden">Agregar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-gray-600 text-xs sm:text-sm">Total Jóvenes</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-gray-600 text-xs sm:text-sm">Activos</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.newThisMonth}</div>
            <div className="text-gray-600 text-xs sm:text-sm">Nuevos Este Mes</div>
          </div>
          <button
            onClick={() => setShowBirthdayDashboard(true)}
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-3 sm:p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer group text-white transform hover:scale-105 col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-center mb-2">
              <span className="text-xl sm:text-2xl mr-2">🎂</span>
              <div className="text-xl sm:text-2xl font-bold group-hover:text-orange-100">
                {stats.birthdays}
              </div>
            </div>
            <div className="text-orange-100 text-xs sm:text-sm group-hover:text-white">
              Cumpleaños Este Mes: {new Date().toLocaleDateString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleDateString('es-ES', { month: 'long' }).slice(1)}
            </div>
            <div className="mt-1 text-xs text-orange-200 group-hover:text-orange-100">
              Haz clic para ver detalles
            </div>
          </button>
        </div>

        {/* Filtros */}
        <FilterBar 
          filters={filters} 
          onFiltersChange={handleFiltersChange} 
        />

        {/* Debug de filtros activos */}
        {(filters.search || filters.ageRange || filters.gender || filters.role) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
            <h4 className="font-medium text-blue-800 mb-2">Filtros activos:</h4>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  Búsqueda: "{filters.search}"
                </span>
              )}
              {filters.ageRange && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  Edad: {filters.ageRange}
                </span>
              )}
              {filters.gender && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  Género: {filters.gender}
                </span>
              )}
              {filters.role && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  Rol: {filters.role}
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-blue-600">
              Mostrando {youngList.length} resultados | Página: {currentPage} | Hay más: {hasMore ? 'Sí' : 'No'}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando jóvenes...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <h3 className="text-red-800 font-medium">Error al cargar datos</h3>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            <button 
              onClick={() => refreshAllData()}
              className="mt-3 text-red-800 hover:text-red-900 font-medium"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* Lista de jóvenes */}
        {!loading && !error && (
          <>
            {youngList.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No hay jóvenes registrados</h3>
                <p className="text-gray-500 mb-4 text-sm sm:text-base px-4">
                  {filters.search || filters.ageRange || filters.gender || filters.role 
                    ? 'No se encontraron jóvenes con los filtros aplicados' 
                    : 'Comienza agregando el primer joven al sistema'
                  }
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm sm:text-base"
                >
                  Agregar Primer Joven
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {youngList.map((young) => (
                    <YoungCard
                      key={young.id}
                      young={young}
                      onDelete={handleDeleteYoung}
                      onEdit={handleEditYoung}
                    />
                  ))}
                </div>
                
                {/* Botón Cargar Más / Estado final */}
                <div className="flex justify-center mt-6 sm:mt-8">
                  {loadingMore ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600 text-sm sm:text-base">Cargando más jóvenes...</span>
                    </div>
                  ) : hasMore ? (
                    <button
                      onClick={loadMore}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Cargar más jóvenes
                    </button>
                  ) : (
                    youngList.length > 0 && (
                      <div className="text-center text-gray-500">
                        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-medium text-sm sm:text-base">¡Has visto todos los jóvenes!</p>
                        <p className="text-xs sm:text-sm mt-1">No hay más elementos para mostrar</p>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Formulario Modal para Agregar */}
      {showForm && (
        <YoungForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleAddYoung}
        />
      )}

      {/* Formulario Modal para Editar */}
      {showEditForm && editingYoung && (
        <EditYoungForm
          isOpen={showEditForm}
          onClose={() => {
            setShowEditForm(false);
            setEditingYoung(null);
          }}
          onSubmit={handleUpdateYoung}
          young={editingYoung}
        />
      )}

      {/* Dashboard de Cumpleaños */}
      {showBirthdayDashboard && (
        <BirthdayDashboard
          isOpen={showBirthdayDashboard}
          onClose={() => setShowBirthdayDashboard(false)}
          youngList={allYoungList}
        />
      )}

      {/* Modal de Importación */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            refreshAllData(); // Recargar la lista después de importar
          }}
        />
      )}
    </div>
  );
}

export default App;
