import React, { useState } from 'react';
import { apiRequest, apiUpload } from '../services/api';
import BrandModalHeader from './ui/BrandModalHeader';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onShowSuccess?: (message: string) => void;
  onShowError?: (message: string) => void;
}

interface ImportResult {
  total: number;
  imported: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
  warnings: string[];
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess, onShowSuccess: _onShowSuccess, onShowError }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'result'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setResult(null);
  };

  const downloadTemplate = async () => {
    try {
      const response = await apiRequest('api/import/template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_jovenes.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error descargando plantilla:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiRequest('api/import/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jovenes_export.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        onShowError?.('Error al exportar: ' + response.statusText);
      }
    } catch (error) {
      console.error('Error exporting:', error);
      onShowError?.('Error al exportar los jóvenes');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiUpload('api/import/import', formData);

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setStep('result');
        if (data.data.imported > 0) {
          onSuccess();
        }
      } else {
        onShowError?.('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error importing file:', error);
      onShowError?.('Error al importar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setResult(null);
    setStep('upload');
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0C0609]/75 backdrop-blur-sm sm:p-4">
      <div
        className="flex max-h-[94vh] sm:max-h-[90vh] w-full sm:max-w-2xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[30px] bg-white shadow-2xl dark:bg-ink-900"
        role="dialog"
        aria-modal="true"
        aria-label="Importación masiva"
      >
        <BrandModalHeader
          title="Importación masiva"
          subtitle={'Sube un archivo Excel para importar múltiples jóvenes'}
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13l3 4M11 13l-3 4" />
            </svg>
          }
          iconTone="green"
          onClose={handleClose}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {step === 'upload' ? (
            <div className="space-y-6">
              {/* Instrucciones */}
              <div className="rounded-[18px] border border-sand-200 bg-cream p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <h3 className="eyebrow m-0 mb-2 text-[13px] text-brand-deep dark:text-brand-amber">Instrucciones</h3>
                <ul className="m-0 list-none space-y-1 p-0 text-[13px] leading-relaxed text-cocoa-600 dark:text-white/70">
                  <li>• Descarga la plantilla de Excel y úsala como referencia</li>
                  <li>• Los campos requeridos son: <strong>Nombre</strong></li>
                  <li>• Para fechas de cumpleaños usa formato: <strong>15-Mar</strong> o <strong>15/03</strong></li>
                  <li>• Si no especificas año, se usará el año actual</li>
                  <li>• Los teléfonos se formatearán automáticamente para Colombia (+57)</li>
                  <li>• Si falta información, se asignarán valores por defecto</li>
                </ul>
              </div>

              {/* Descargar plantilla */}
              <div className="text-center">
                <div className="flex justify-center gap-3">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex h-11 items-center gap-2 rounded-[14px] border-[1.5px] border-sand-300 bg-white px-4 text-[13px] font-semibold text-cocoa-600 transition-colors hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar plantilla
                </button>
                <button
                  onClick={handleExport}
                  className="inline-flex h-11 items-center gap-2 rounded-[14px] border-[1.5px] border-sand-300 bg-white px-4 text-[13px] font-semibold text-cocoa-600 transition-colors hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v6a4 4 0 004 4h10a4 4 0 004-4V7M8 7V4a2 2 0 012-2h4a2 2 0 012 2v3" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                  Exportar jóvenes
                </button>
                </div>
              </div>

              {/* Subir archivo */}
              <div className="rounded-[22px] border-2 border-dashed border-[#F4B58C] bg-cream p-8 dark:border-brand-orange/40 dark:bg-white/[0.03]">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-brand-ember dark:text-brand-amber" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                        {file ? file.name : 'Selecciona un archivo Excel'}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                        Excel (.xlsx, .xls) hasta 10MB
                      </span>
                    </label>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls,.ods"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>

              {/* Botón de importar */}
              {file && (
                <div className="text-center">
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="btn-fire h-12 px-7 text-[15px]"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Importando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Importar jóvenes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resultados */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-sand-50 p-4 text-center dark:bg-white/5">
                  <div className="font-display text-3xl font-bold text-cocoa-900 dark:text-white">{result?.total || 0}</div>
                  <div className="text-sm text-cocoa-500 dark:text-white/60">Total de filas</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{result?.imported || 0}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Importados exitosamente</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{result?.errors?.length || 0}</div>
                  <div className="text-sm text-red-700 dark:text-red-300">Errores</div>
                </div>
              </div>

              {/* Advertencias */}
              {result?.warnings && result.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Advertencias</h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errores */}
              {result?.errors && result.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Errores</h4>
                  <div className="max-h-40 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700 dark:text-red-300 mb-2 p-2 bg-red-100 dark:bg-red-900/30 rounded">
                        <strong>Fila {error.row}:</strong> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setStep('upload')}
                  className="h-12 rounded-full border-[1.5px] border-sand-300 bg-white px-5 text-sm font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
                >
                  Importar otro archivo
                </button>
                <button
                  onClick={handleClose}
                  className="btn-fire h-12 px-6 text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
