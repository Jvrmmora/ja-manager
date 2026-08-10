import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contactService } from '../services/contactService';
import { getAuthToken } from '../services/api';
import type { IContactMessage } from '../types';

interface ContactMessagesManagerProps {
  onShowError: (message: string) => void;
}

export default function ContactMessagesManager({
  onShowError,
}: ContactMessagesManagerProps) {
  const [messages, setMessages] = useState<IContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<IContactMessage | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    setIsAuthenticated(!!token);
    if (!token) {
      setLoading(false);
    }
  }, []);

  const loadMessages = async (page = 1) => {
    try {
      setLoading(true);
      const result = await contactService.getContactMessages(page, 10);
      setMessages(result.data);
      setCurrentPage(result.pagination.currentPage);
      setTotalPages(result.pagination.totalPages);
      setTotalItems(result.pagination.totalItems);
      setSelectedIds(new Set());
    } catch (error) {
      onShowError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los mensajes de contacto'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadMessages(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const formatDate = (dateValue: string | Date) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const toggleSelectMessage = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      const ids = messages.map(m => m._id || m.id).filter((id): id is string => Boolean(id));
      setSelectedIds(new Set(ids));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar ${selectedIds.size} mensaje(s)?`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      const idsArray = Array.from(selectedIds);
      await contactService.deleteMultipleContactMessages(idsArray);
      
      // Reload messages on current page, or go to previous page if no more messages
      if (messages.length === selectedIds.size && currentPage > 1) {
        await loadMessages(currentPage - 1);
      } else {
        await loadMessages(currentPage);
      }
    } catch (error) {
      onShowError(
        error instanceof Error
          ? error.message
          : 'No se pudieron eliminar los mensajes'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isAuthenticated ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20 p-6 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M6.172 6.172a4 4 0 015.656 0l3.656 3.656a4 4 0 010 5.656l-3.656 3.656a4 4 0 01-5.656 0L2.516 15.828a4 4 0 010-5.656l3.656-3.656z" />
          </svg>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">
            Se requiere autenticación
          </h3>
          <p className="text-red-700 dark:text-red-300 text-sm">
            Debes iniciar sesión como administrador para ver los mensajes de contacto.
          </p>
        </div>
      ) : null}

      {isAuthenticated && (
        <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Total mensajes: {totalItems}
            {selectedIds.size > 0 && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                ({selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium transition flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Eliminando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </>
              )}
            </button>
          )}
          <button
            onClick={() => loadMessages(currentPage)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Recargar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Cargando mensajes...
          </p>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-600 dark:text-gray-300">
          Aun no hay mensajes de contacto.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={messages.length > 0 && selectedIds.size === messages.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 cursor-pointer w-4 h-4"
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Correo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Mensaje
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
                {messages.map(item => {
                  const itemId = item._id || item.id;
                  if (!itemId) return null;
                  return (
                  <tr key={itemId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(itemId)}
                        onChange={() => toggleSelectMessage(itemId)}
                        className="rounded border-gray-300 text-blue-600 cursor-pointer w-4 h-4"
                        aria-label={`Seleccionar ${item.fullName}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {item.fullName}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-700 dark:text-blue-300 whitespace-nowrap">
                      <a href={`mailto:${item.email}`} className="hover:underline">
                        {item.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 min-w-[280px]">
                      <p className="whitespace-pre-wrap break-words line-clamp-3">
                        {item.message}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">
                      {formatDate(item.createdAt || '')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedMessage(item)}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition"
                        title="Ver detalle"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const previousPage = Math.max(currentPage - 1, 1);
                loadMessages(previousPage);
              }}
              disabled={currentPage <= 1}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              Pagina {currentPage} de {totalPages}
            </p>

            <button
              onClick={() => {
                const nextPage = Math.min(currentPage + 1, totalPages);
                loadMessages(nextPage);
              }}
              disabled={currentPage >= totalPages}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMessage && isAuthenticated && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[1px]"
              onClick={() => setSelectedMessage(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl pointer-events-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Detalle del Mensaje
                  </h3>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-6 py-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Nombre</p>
                    <p className="text-gray-900 dark:text-gray-100">{selectedMessage.fullName}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Correo</p>
                    <a
                      href={`mailto:${selectedMessage.email}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {selectedMessage.email}
                    </a>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Fecha</p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {formatDate(selectedMessage.createdAt || '')}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Mensaje</p>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                        {selectedMessage.message}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    Cerrar
                  </button>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
                  >
                    Responder
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
