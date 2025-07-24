import { useState, useEffect } from 'react';
import './App.css';
import YoungForm from './components/YoungForm';
import EditYoungForm from './components/EditYoungForm';
import YoungCard from './components/YoungCard';
import FilterBar from './components/FilterBar';
import BirthdayDashboard from './components/BirthdayDashboard';
import ImportModal from './components/ImportModal';
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
}

function App() {
  const [youngList, setYoungList] = useState<IYoung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingYoung, setEditingYoung] = useState<IYoung | null>(null);
  const [showBirthdayDashboard, setShowBirthdayDashboard] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [filters, setFilters] = useState<PaginationQuery>({
    page: 1,
    limit: 10,
    sortBy: 'fullName',
    sortOrder: 'asc'
  });

  // Función para obtener jóvenes del backend
  const fetchYoung = async () => {
    try {
      setLoading(true);
      
      // Construir query parameters
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.ageRange) params.append('ageRange', filters.ageRange);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.role) params.append('role', filters.role);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      const url = `/api/young?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // El backend retorna: { success: true, data: { data: [jovenes] } }
      const youngArray = result.success && result.data && Array.isArray(result.data.data) 
        ? result.data.data 
        : [];
      
      setYoungList(youngArray);
      setError(null);
    } catch (err) {
      console.error('Error en fetchYoung:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
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
      form.append('email', formData.email);
      form.append('skills', JSON.stringify(formData.skills));
      
      if (formData.profileImage) {
        form.append('profileImage', formData.profileImage);
      }

      const response = await fetch('/api/young', {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        throw new Error('Error al registrar el joven');
      }

      // Recargar la lista
      await fetchYoung();
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
      const response = await fetch(`/api/young/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el joven');
      }

      // Recargar la lista
      await fetchYoung();
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
      form.append('email', formData.email);
      form.append('skills', JSON.stringify(formData.skills));
      
      if (formData.profileImage) {
        form.append('profileImage', formData.profileImage);
      }

      const response = await fetch(`/api/young/${id}`, {
        method: 'PUT',
        body: form,
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el joven');
      }

      // Recargar la lista
      await fetchYoung();
      setShowEditForm(false);
      setEditingYoung(null);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchYoung();
  }, [filters]); // Actualizar cuando cambien los filtros

  // Estadísticas básicas
  const stats = {
    total: Array.isArray(youngList) ? youngList.length : 0,
    active: Array.isArray(youngList) ? youngList.length : 0,
    newThisMonth: Array.isArray(youngList) ? youngList.filter(young => {
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
    birthdays: Array.isArray(youngList) ? youngList.filter(young => {
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

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">
                Sistema de Gestión de Jóvenes
              </h1>
              <p className="text-blue-100 mt-2">
                Plataforma de administración para jóvenes de la iglesia
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Importar Excel
              </button>
              
              <button
                onClick={() => setShowForm(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Joven
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-gray-600 text-sm">Total Jóvenes</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-gray-600 text-sm">Activos</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.newThisMonth}</div>
            <div className="text-gray-600 text-sm">Nuevos Este Mes</div>
          </div>
          <button
            onClick={() => setShowBirthdayDashboard(true)}
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer group text-white transform hover:scale-105"
          >
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl mr-2">🎂</span>
              <div className="text-2xl font-bold group-hover:text-orange-100">
                {stats.birthdays}
              </div>
            </div>
            <div className="text-orange-100 text-sm group-hover:text-white">
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
          onFiltersChange={setFilters} 
        />

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
              onClick={fetchYoung}
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
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No hay jóvenes registrados</h3>
                <p className="text-gray-500 mb-4">
                  {filters.search || filters.ageRange || filters.gender || filters.role 
                    ? 'No se encontraron jóvenes con los filtros aplicados' 
                    : 'Comienza agregando el primer joven al sistema'
                  }
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Agregar Primer Joven
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {youngList.map((young) => (
                  <YoungCard
                    key={young.id}
                    young={young}
                    onDelete={handleDeleteYoung}
                    onEdit={handleEditYoung}
                  />
                ))}
              </div>
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
          youngList={youngList}
        />
      )}

      {/* Modal de Importación */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            fetchYoung(); // Recargar la lista después de importar
          }}
        />
      )}
    </div>
  );
}

export default App;
