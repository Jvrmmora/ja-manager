import React from 'react';
import type { PaginationQuery } from '../types';
import MultiGroupSelect from './MultiGroupSelect';

interface FilterBarProps {
  filters: PaginationQuery;
  onFiltersChange: (filters: PaginationQuery) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFiltersChange }) => {
  const handleInputChange = (key: keyof PaginationQuery, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
      page: 1 // Reset to first page when filtering
    });
  };

  const handleGroupsChange = (groups: string[]) => {
    onFiltersChange({
      ...filters,
      groups: groups.length > 0 ? groups : undefined,
      page: 1 // Reset to first page when filtering
    });
  };

  const clearFilters = () => {
    const clearedFilters: PaginationQuery = {
      page: 1,
      sortBy: 'fullName',
      sortOrder: 'asc'
    };
    
    if (filters.limit !== undefined) {
      clearedFilters.limit = filters.limit;
    }
    
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = !!(filters.search || filters.ageRange || filters.gender || filters.role || (filters.groups && filters.groups.length > 0));

  return (
    <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
      <div className="flex flex-wrap gap-3 sm:gap-4 items-end">
        {/* Búsqueda */}
        <div className="flex-1 min-w-full sm:min-w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar
          </label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtro por edad */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rango de Edad
          </label>
          <select
            value={filters.ageRange || ''}
            onChange={(e) => handleInputChange('ageRange', e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="13-15">13-15 años</option>
            <option value="16-18">16-18 años</option>
            <option value="19-21">19-21 años</option>
            <option value="22-25">22-25 años</option>
            <option value="26-30">26-30 años</option>
            <option value="30+">30+ años</option>
          </select>
        </div>

        {/* Filtro por género */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Género
          </label>
          <select
            value={filters.gender || ''}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>
        </div>

        {/* Filtro por rol */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rol
          </label>
          <select
            value={filters.role || ''}
            onChange={(e) => handleInputChange('role', e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="colaborador">Colaborador</option>
            <option value="lider juvenil">Líder Juvenil</option>
            <option value="joven adventista">Joven Adventista</option>
            <option value="simpatizante">Simpatizante</option>
            <option value="director">Director</option>
            <option value="subdirector">Subdirector</option>
            <option value="club guias">Club Guías</option>
            <option value="club conquistadores">Club Conquistadores</option>
            <option value="club aventureros">Club Aventureros</option>
            <option value="escuela sabatica">Escuela Sabática</option>
          </select>
        </div>

        {/* Filtro por grupos */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grupo
          </label>
          <MultiGroupSelect
            value={filters.groups || []}
            onChange={handleGroupsChange}
            className="w-full sm:w-auto min-w-[200px]"
          />
        </div>

        {/* Ordenar por */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ordenar por
          </label>
          <select
            value={filters.sortBy || 'fullName'}
            onChange={(e) => handleInputChange('sortBy', e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="fullName">Nombre</option>
            <option value="birthday">Fecha de Nacimiento</option>
            <option value="email">Email</option>
            <option value="role">Rol</option>
            <option value="gender">Género</option>
            <option value="createdAt">Fecha de Registro</option>
            <option value="updatedAt">Última Actualización</option>
          </select>
        </div>

        {/* Orden */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Orden
          </label>
          <select
            value={filters.sortOrder || 'asc'}
            onChange={(e) => handleInputChange('sortOrder', e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </select>
        </div>

        {/* Botón limpiar filtros */}
        {hasActiveFilters && (
          <div className="w-full sm:w-auto">
            <button
              onClick={clearFilters}
              className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Indicadores de filtros activos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-500 font-medium">Filtros activos:</span>
          
          {filters.search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Búsqueda: "{filters.search}"
            </span>
          )}
          
          {filters.ageRange && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Edad: {filters.ageRange} años
            </span>
          )}
          
          {filters.gender && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Género: {filters.gender}
            </span>
          )}
          
          {filters.role && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Rol: {filters.role}
            </span>
          )}

          {filters.groups && filters.groups.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Grupos: {filters.groups.length === 1 ? `Nivel ${filters.groups[0]}` : `${filters.groups.length} grupos`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;