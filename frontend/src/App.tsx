import { useState, useEffect } from 'react';
import './App.css';
import YoungForm from './components/YoungForm';

interface Young {
  id: string; // El backend transforma _id a id
  fullName: string;
  ageRange: string;
  phone: string;
  birthday: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

interface YoungFormData {
  fullName: string;
  ageRange: string;
  phone: string;
  birthday: string;
  profileImage?: File;
}

function App() {
  const [youngList, setYoungList] = useState<Young[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgeRange, setSelectedAgeRange] = useState('');

  // console.log('App render - youngList length:', youngList.length, 'loading:', loading, 'error:', error);

  // Función para obtener jóvenes del backend
  const fetchYoung = async () => {
    try {
      setLoading(true);
      // console.log('Iniciando fetch de jóvenes...');
      
      const response = await fetch('/api/young');
      // console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      // console.log('Datos recibidos completos:', result);
      
      // El backend retorna: { success: true, data: { data: [jovenes] } }
      const youngArray = result.success && result.data && Array.isArray(result.data.data) 
        ? result.data.data 
        : [];
      
      // console.log('Array procesado:', youngArray);
      
      setYoungList(youngArray);
      setError(null); // Limpiar error anterior si lo había
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

  useEffect(() => {
    fetchYoung();
  }, []);

  // Filtrar jóvenes por búsqueda y rango de edad
  const filteredYoung = Array.isArray(youngList) ? youngList.filter(young => {
    try {
      const matchesSearch = young.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           young.phone?.includes(searchTerm);
      const matchesAge = selectedAgeRange === '' || young.ageRange === selectedAgeRange;
      return matchesSearch && matchesAge;
    } catch (filterError) {
      console.error('Error en filtro:', filterError, young);
      return false;
    }
  }) : [];

  // Estadísticas
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
          <h1 className="text-3xl font-bold">
            Sistema de Gestión de Jóvenes
          </h1>
          <p className="text-blue-100 mt-2">
            Plataforma de administración para jóvenes de la iglesia
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Debug info temporal - COMENTADO
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4 text-xs">
          Debug: youngList: {youngList.length}, loading: {loading.toString()}, error: {error || 'null'}
        </div>
        */}
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-gray-600">Total Jóvenes</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-gray-600">Activos</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.newThisMonth}</div>
            <div className="text-gray-600">Nuevos este mes</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.birthdays}</div>
            <div className="text-gray-600">Cumpleaños este mes</div>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedAgeRange}
              onChange={(e) => setSelectedAgeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los rangos</option>
              <option value="13-15">13-15 años</option>
              <option value="16-18">16-18 años</option>
              <option value="19-21">19-21 años</option>
              <option value="22-25">22-25 años</option>
              <option value="26-30">26-30 años</option>
              <option value="30+">30+ años</option>
            </select>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar Joven
            </button>
          </div>
        </div>

        {/* Lista de jóvenes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Jóvenes Registrados ({filteredYoung.length})
          </h3>
          
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Cargando...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">Error: {error}</p>
              <button 
                onClick={fetchYoung}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && filteredYoung.length === 0 && (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600">
                {searchTerm || selectedAgeRange ? 'No se encontraron jóvenes con los filtros aplicados' : 'No hay jóvenes registrados aún'}
              </p>
              <button 
                onClick={() => setShowForm(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Registrar Primer Joven
              </button>
            </div>
          )}

          {!loading && !error && filteredYoung.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredYoung.map((young) => (
                <div key={young.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      {young.profileImage ? (
                        <img 
                          src={young.profileImage} 
                          alt={young.fullName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{young.fullName}</h4>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                        young.ageRange === '13-15' ? 'bg-blue-100 text-blue-800' :
                        young.ageRange === '16-18' ? 'bg-green-100 text-green-800' :
                        young.ageRange === '19-21' ? 'bg-yellow-100 text-yellow-800' :
                        young.ageRange === '22-25' ? 'bg-purple-100 text-purple-800' :
                        young.ageRange === '26-30' ? 'bg-pink-100 text-pink-800' :
                        young.ageRange === '30+' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {young.ageRange} años
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="flex items-center">
                      <span className="w-4 text-center">📱</span>
                      <span className="ml-2">{young.phone}</span>
                    </p>
                    <p className="flex items-center">
                      <span className="w-4 text-center">🎂</span>
                      <span className="ml-2">{new Date(young.birthday).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => alert('Función de editar en desarrollo')}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteYoung(young.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulario de registro */}
        <YoungForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleAddYoung}
        />
      </main>
    </div>
  );
}

export default App;