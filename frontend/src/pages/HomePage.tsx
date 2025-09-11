import { useState, useEffect } from 'react';
import YoungForm from '../components/YoungForm';
import EditYoungForm from '../components/EditYoungForm';
import YoungCard from '../components/YoungCard';
import FilterBar from '../components/FilterBar';
import BirthdayDashboard from '../components/BirthdayDashboard';
import ImportModal from '../components/ImportModal';
import ProfileDropdown from '../components/ProfileDropdown';
import StatsCards from '../components/StatsCards';
import ToastContainer from '../components/ToastContainer';
import { apiRequest } from '../services/api';
import { useToast } from '../hooks/useToast';
import type { IYoung, PaginationQuery } from '../types';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [nextPageToLoad, setNextPageToLoad] = useState(2); // Track próxima página para cargar
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Prevenir múltiples llamadas simultáneas
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null); // Total de resultados filtrados
  const [filters, setFilters] = useState<PaginationQuery>({
    page: 1,
    limit: 10,
    sortBy: 'fullName',
    sortOrder: 'asc'
  });

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
      
      const youngArray = result.success && result.data && Array.isArray(result.data.data) 
        ? result.data.data 
        : [];
      
      const pagination = result.data?.pagination;
      
      console.log('📊 Datos recibidos:', {
        youngArray: youngArray.length,
        pagination,
        append
      });

      if (append) {
        // Scroll infinito: agregar nuevos elementos
        setYoungList(prevList => {
          const newList = [...prevList, ...youngArray];
          console.log('📝 Lista actualizada (append):', newList.length, 'elementos');
          return newList;
        });
        setCurrentPage(page);
        setNextPageToLoad(page + 1);
      } else {
        // Nueva búsqueda: reemplazar lista
        setYoungList(youngArray);
        setCurrentPage(pagination?.currentPage || 1);
        setNextPageToLoad((pagination?.currentPage || 1) + 1);
        console.log('📝 Lista reemplazada:', youngArray.length, 'elementos');
      }

      // Actualizar información de paginación
      setHasMore(pagination ? pagination.hasNextPage : false);
      setFilteredTotal(pagination?.totalItems || null);
      
      console.log('📄 Estado de paginación:', {
        currentPage: pagination?.currentPage || 1,
        totalPages: pagination?.totalPages || 1,
        hasNextPage: pagination?.hasNextPage || false,
        totalItems: pagination?.totalItems || 0
      });

    } catch (err) {
      console.error('❌ Error al obtener jóvenes:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Hook para cargar más contenido con scroll infinito
  const loadMore = () => {
    if (!isLoadingMore && hasMore && !loadingMore) {
      console.log('🔄 Activando carga de más elementos. Página a cargar:', nextPageToLoad);
      setIsLoadingMore(true);
      fetchYoung(nextPageToLoad, true).finally(() => {
        setIsLoadingMore(false);
      });
    }
  };

  // Usar el hook de scroll infinito
  useInfiniteScroll(loadMore, hasMore, loadingMore || isLoadingMore);

  // Cargar datos iniciales
  useEffect(() => {
    fetchYoung();
    fetchAllYoung();
  }, []);

  // Función para aplicar filtros
  const handleFilterChange = (newFilters: PaginationQuery) => {
    console.log('🔍 Aplicando filtros:', newFilters);
    setFilters(newFilters);
    setCurrentPage(1);
    setNextPageToLoad(2);
    setHasMore(true);
    setIsLoadingMore(false);
    fetchYoung(1, false, newFilters);
  };

  const handleSubmit = async (data: YoungFormData) => {
    try {
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

      const response = await apiRequest('young', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el joven');
      }

      const result = await response.json();
      console.log('✅ Joven creado exitosamente:', result);
      
      // Recargar los datos
      fetchYoung();
      fetchAllYoung(); // Actualizar estadísticas también
      setShowForm(false);

      // Mostrar mensaje de éxito (puedes implementar un toast aquí)
      alert('¡Joven registrado exitosamente!');

    } catch (err) {
      console.error('❌ Error al crear joven:', err);
      alert(err instanceof Error ? err.message : 'Error desconocido al crear el joven');
    }
  };

  const handleUpdate = async (id: string, data: YoungFormData) => {
    if (!editingYoung) return;

    try {
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

      const response = await apiRequest(`young/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el joven');
      }

      const result = await response.json();
      console.log('✅ Joven actualizado exitosamente:', result);
      
      // Recargar los datos
      fetchYoung(1); // Volver a página 1 después de actualizar
      fetchAllYoung(); // Actualizar estadísticas también
      setShowEditForm(false);
      setEditingYoung(null);

      // Mostrar mensaje de éxito
      alert('¡Joven actualizado exitosamente!');

    } catch (err) {
      console.error('❌ Error al actualizar joven:', err);
      alert(err instanceof Error ? err.message : 'Error desconocido al actualizar el joven');
    }
  };

  const handleEdit = (young: IYoung) => {
    setEditingYoung(young);
    setShowEditForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este joven?')) {
      return;
    }

    try {
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
      alert('¡Joven eliminado exitosamente!');

    } catch (err) {
      console.error('❌ Error al eliminar joven:', err);
      alert(err instanceof Error ? err.message : 'Error desconocido al eliminar el joven');
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

  const displayTotal = filteredTotal !== null ? filteredTotal : allYoungList.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con ProfileDropdown */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y título */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L13.09 6.26L18 7L13.09 7.74L12 12L10.91 7.74L6 7L10.91 6.26L12 2ZM4 9L5.5 12.5L9 14L5.5 15.5L4 19L2.5 15.5L-1 14L2.5 12.5L4 9Z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">JA Manager</h1>
                <p className="text-sm text-gray-500 hidden sm:block">Dashboard de Administración</p>
              </div>
            </div>

            {/* Profile Dropdown */}
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard de Cumpleaños */}
        {showBirthdayDashboard && (
          <div className="mb-8">
            {/* <BirthdayDashboard /> */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">🎂 Dashboard de Cumpleaños</h2>
              <p className="text-gray-600">Próximamente: Vista de cumpleaños</p>
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
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agregar Joven
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Importar Excel
            </button>

            <button
              onClick={() => setShowBirthdayDashboard(!showBirthdayDashboard)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                showBirthdayDashboard 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              🎂 {showBirthdayDashboard ? 'Ocultar Cumpleaños' : 'Ver Cumpleaños'}
            </button>
          </div>

          {/* Contador de resultados */}
          <div className="text-sm text-gray-600">
            {loading ? (
              <span>Cargando...</span>
            ) : (
              <span>
                Mostrando {youngList.length} de {displayTotal} jóvenes
                {filteredTotal !== null && filteredTotal < allYoungList.length && (
                  <span className="text-blue-600 ml-1">(filtrados)</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Barra de filtros */}
        <FilterBar filters={filters} onFiltersChange={handleFilterChange} />

        {/* Contenido principal */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay jóvenes registrados</h3>
                <p className="text-gray-600 mb-4">
                  {filteredTotal !== null && allYoungList.length > 0 
                    ? 'No se encontraron jóvenes con los filtros aplicados'
                    : 'Comienza agregando jóvenes a la plataforma'
                  }
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
                {youngList.map((young) => (
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
                <p className="mt-2 text-sm text-gray-600">Cargando más jóvenes...</p>
              </div>
            )}

            {/* Indicador de fin de resultados */}
            {!hasMore && youngList.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  ✅ Has visto todos los jóvenes ({displayTotal} total{displayTotal !== 1 ? 'es' : ''})
                </p>
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
          />
        )}

        {showImportModal && (
          <ImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onSuccess={handleImportSuccess}
          />
        )}

        {showBirthdayDashboard && (
          <BirthdayDashboard
            isOpen={showBirthdayDashboard}
            onClose={() => setShowBirthdayDashboard(false)}
            youngList={allYoungList}
          />
        )}

        {/* Toast Container */}
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      </div>
    </div>
  );
}

export default HomePage;