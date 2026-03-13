import { useEffect, useRef, useState } from 'react';
import { apiRequest, apiUpload } from '../services/api';
import { useToast } from '../hooks/useToast';
import PageLoader from '../components/PageLoader';
import RichTextEditor from '../components/RichTextEditor';

interface LandingContent {
  _id: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroVerseText: string;
  heroVerseCitation: string;
  heroImage: string;
  aboutTitle: string;
  aboutBody: string;
  missionTitle: string;
  missionText: string;
  visionTitle: string;
  visionText: string;
  valuesTitle: string;
  values: Array<{ title: string; description: string }>;
  sectionsVisible: {
    events: boolean;
    gallery: boolean;
    resources: boolean;
    testimonials: boolean;
    social: boolean;
  };
  social: {
    instagram: string;
    facebook: string;
    youtube: string;
    whatsapp: string;
  };
  addressLabel: string;
  addressLine: string;
  mapEmbedUrl: string;
  mapsDirectionsUrl: string;
  latitude: number | null;
  longitude: number | null;
  locationNote: string;
  eventsTitle: string;
  eventsBody: string;
  galleryTitle: string;
  galleryBody: string;
  resourcesTitle: string;
  testimonialsTitle: string;
  testimonialsBody: string;
  ctaTitle: string;
  ctaBody: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
}

interface LandingMeeting {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string;
  schedule: { day: string; time: string };
  modality: 'virtual' | 'presencial' | 'híbrido';
  meetingLink?: string;
  order: number;
  isPublished: boolean;
}

type MediaCategory = 'hero' | 'gallery' | 'testimonial' | 'event';

interface LandingMedia {
  _id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  category: MediaCategory;
  altText: string;
  order: number;
  isPublished: boolean;
}

interface MeetingForm {
  title: string;
  subtitle: string;
  description: string;
  day: string;
  time: string;
  modality: 'virtual' | 'presencial' | 'híbrido';
  meetingLink: string;
  order: number;
}

const EMPTY_MEETING: MeetingForm = {
  title: '',
  subtitle: '',
  description: '',
  day: '',
  time: '',
  modality: 'presencial',
  meetingLink: '',
  order: 0,
};

const MEDIA_CATEGORIES: { value: MediaCategory; label: string }[] = [
  { value: 'gallery', label: 'Galería' },
  { value: 'hero', label: 'Hero / Banner' },
  { value: 'testimonial', label: 'Testimonios' },
  { value: 'event', label: 'Eventos' },
];

const fieldClass =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

const EMPTY_LANDING_CONTENT: LandingContent = {
  _id: '',
  heroTitle: '',
  heroSubtitle: '',
  heroDescription: '',
  heroVerseText: '',
  heroVerseCitation: '',
  heroImage: '',
  aboutTitle: '',
  aboutBody: '',
  missionTitle: '',
  missionText: '',
  visionTitle: '',
  visionText: '',
  valuesTitle: '',
  values: [],
  sectionsVisible: {
    events: true,
    gallery: true,
    resources: true,
    testimonials: true,
    social: true,
  },
  social: {
    instagram: '',
    facebook: '',
    youtube: '',
    whatsapp: '',
  },
  addressLabel: '',
  addressLine: '',
  mapEmbedUrl: '',
  mapsDirectionsUrl: '',
  latitude: null,
  longitude: null,
  locationNote: '',
  eventsTitle: '',
  eventsBody: '',
  galleryTitle: '',
  galleryBody: '',
  resourcesTitle: '',
  testimonialsTitle: '',
  testimonialsBody: '',
  ctaTitle: '',
  ctaBody: '',
  ctaPrimaryLabel: '',
  ctaSecondaryLabel: '',
  seoTitle: '',
  seoDescription: '',
  isPublished: true,
};

const normalizeLandingContent = (
  data: Partial<LandingContent> | null | undefined
): LandingContent => ({
  ...EMPTY_LANDING_CONTENT,
  ...data,
  sectionsVisible: {
    ...EMPTY_LANDING_CONTENT.sectionsVisible,
    ...(data?.sectionsVisible || {}),
  },
  social: {
    ...EMPTY_LANDING_CONTENT.social,
    ...(data?.social || {}),
  },
  values: data?.values || [],
});

export default function LandingCMSPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'meetings' | 'media'>(
    'content'
  );
  const [loading, setLoading] = useState(true);

  // Content state
  const [content, setContent] = useState<LandingContent | null>(null);
  const [saving, setSaving] = useState(false);

  // Meetings state
  const [meetings, setMeetings] = useState<LandingMeeting[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<LandingMeeting | null>(
    null
  );
  const [meetingForm, setMeetingForm] = useState<MeetingForm>(EMPTY_MEETING);
  const [savingMeeting, setSavingMeeting] = useState(false);

  // Media state
  const [media, setMedia] = useState<LandingMedia[]>([]);
  const [mediaFilter, setMediaFilter] = useState<MediaCategory | 'all'>('all');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadCategory, setUploadCategory] =
    useState<MediaCategory>('gallery');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('landing/admin/content', { method: 'GET' });
      const data = await res.json();
      if (data.success && data.data) {
        setContent(normalizeLandingContent(data.data.content));
        setMeetings(data.data.meetings || []);
        setMedia(data.data.media || []);
      } else {
        showToast('Error al cargar datos', 'error');
      }
    } catch {
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Content ────────────────────────────────────────────── */
  const handleSaveContent = async () => {
    if (!content) return;
    try {
      setSaving(true);
      const res = await apiRequest('landing/admin/content', {
        method: 'PUT',
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Contenido guardado exitosamente', 'success');
      } else {
        showToast('Error al guardar', 'error');
      }
    } catch {
      showToast('Error al guardar contenido', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddValue = () => {
    if (!content) return;
    setContent({
      ...content,
      values: [...content.values, { title: '', description: '' }],
    });
  };

  const handleUpdateValue = (
    index: number,
    field: 'title' | 'description',
    value: string
  ) => {
    if (!content) return;
    const nextValues = [...content.values];
    nextValues[index] = {
      ...nextValues[index],
      [field]: value,
    };
    setContent({ ...content, values: nextValues });
  };

  const handleRemoveValue = (index: number) => {
    if (!content) return;
    setContent({
      ...content,
      values: content.values.filter((_, i) => i !== index),
    });
  };

  /* ── Meetings ───────────────────────────────────────────── */
  const openNewMeeting = () => {
    setEditingMeeting(null);
    setMeetingForm(EMPTY_MEETING);
    setShowMeetingForm(true);
  };

  const openEditMeeting = (m: LandingMeeting) => {
    setEditingMeeting(m);
    setMeetingForm({
      title: m.title,
      subtitle: m.subtitle,
      description: m.description,
      day: m.schedule.day,
      time: m.schedule.time,
      modality: m.modality,
      meetingLink: m.meetingLink || '',
      order: m.order,
    });
    setShowMeetingForm(true);
  };

  const handleSaveMeeting = async () => {
    if (!meetingForm.title || !meetingForm.day || !meetingForm.time) {
      showToast('Completa título, día y hora', 'error');
      return;
    }
    try {
      setSavingMeeting(true);
      const body = {
        title: meetingForm.title,
        subtitle: meetingForm.subtitle,
        description: meetingForm.description,
        schedule: { day: meetingForm.day, time: meetingForm.time },
        modality: meetingForm.modality,
        meetingLink: meetingForm.meetingLink,
        order: meetingForm.order,
      };
      let res: Response;
      if (editingMeeting) {
        res = await apiRequest(`landing/admin/meetings/${editingMeeting._id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        res = await apiRequest('landing/admin/meetings', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (data.success) {
        showToast(
          editingMeeting ? 'Reunión actualizada' : 'Reunión creada',
          'success'
        );
        setShowMeetingForm(false);
        setMeetings(prev =>
          editingMeeting
            ? prev.map(m => (m._id === editingMeeting._id ? data.data : m))
            : [...prev, data.data]
        );
      } else {
        showToast('Error al guardar reunión', 'error');
      }
    } catch {
      showToast('Error al guardar reunión', 'error');
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!window.confirm('¿Eliminar esta reunión?')) return;
    try {
      const res = await apiRequest(`landing/admin/meetings/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Reunión eliminada', 'success');
        setMeetings(prev => prev.filter(m => m._id !== id));
      } else {
        showToast('Error al eliminar', 'error');
      }
    } catch {
      showToast('Error al eliminar reunión', 'error');
    }
  };

  /* ── Media ──────────────────────────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = ev => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleUploadMedia = async () => {
    if (!uploadFile) {
      showToast('Selecciona un archivo primero', 'error');
      return;
    }
    if (!uploadTitle.trim()) {
      showToast('Escribe un título para la imagen', 'error');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('title', uploadTitle.trim());
      formData.append('altText', uploadAltText.trim());
      const res = await apiUpload('landing/admin/media/upload', formData);
      const data = await res.json();
      if (data.success && data.data) {
        showToast('Imagen subida exitosamente', 'success');
        setMedia(prev => [...prev, data.data]);
        setUploadFile(null);
        setUploadPreview(null);
        setUploadTitle('');
        setUploadAltText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        showToast(data.message || 'Error al subir imagen', 'error');
      }
    } catch {
      showToast('Error al subir imagen', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!window.confirm('¿Eliminar esta imagen?')) return;
    try {
      const res = await apiRequest(`landing/admin/media/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Imagen eliminada', 'success');
        setMedia(prev => prev.filter(m => m._id !== id));
      } else {
        showToast('Error al eliminar', 'error');
      }
    } catch {
      showToast('Error al eliminar imagen', 'error');
    }
  };

  if (loading) return <PageLoader />;

  if (!content) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 dark:text-red-400">
          Error al cargar contenido
        </p>
        <button
          onClick={fetchAll}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const filteredMedia =
    mediaFilter === 'all'
      ? media
      : media.filter(m => m.category === mediaFilter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            CMS — Landing Page
          </h1>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Ver landing ↗
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 border-b border-gray-200 dark:border-gray-700">
          {(['content', 'meetings', 'media'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab === 'content' && 'Contenido'}
              {tab === 'meetings' && `Reuniones (${meetings.length})`}
              {tab === 'media' && `Galería (${media.length})`}
            </button>
          ))}
        </div>

        {/* ── CONTENT TAB ──────────────────────────────────── */}
        {activeTab === 'content' && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm space-y-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Contenido General
            </h2>

            {/* Hero */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Hero
              </h3>
              <div className="space-y-3 pl-4 border-l-2 border-blue-400">
                <input
                  className={fieldClass}
                  placeholder="Título principal"
                  value={content.heroTitle}
                  onChange={e =>
                    setContent({ ...content, heroTitle: e.target.value })
                  }
                />
                <input
                  className={fieldClass}
                  placeholder="Subtítulo"
                  value={content.heroSubtitle}
                  onChange={e =>
                    setContent({ ...content, heroSubtitle: e.target.value })
                  }
                />
                <textarea
                  className={`${fieldClass} h-20`}
                  placeholder="Título corto / resumen"
                  value={content.heroDescription}
                  onChange={e =>
                    setContent({ ...content, heroDescription: e.target.value })
                  }
                />
                <input
                  className={fieldClass}
                  placeholder="Texto del verso bíblico"
                  value={content.heroVerseText}
                  onChange={e =>
                    setContent({ ...content, heroVerseText: e.target.value })
                  }
                />
                <input
                  className={fieldClass}
                  placeholder="Cita del verso (ej: 1 Timoteo 4:12)"
                  value={content.heroVerseCitation}
                  onChange={e =>
                    setContent({
                      ...content,
                      heroVerseCitation: e.target.value,
                    })
                  }
                />
                <input
                  className={fieldClass}
                  placeholder="Hero image URL (opcional)"
                  value={content.heroImage}
                  onChange={e =>
                    setContent({ ...content, heroImage: e.target.value })
                  }
                />
              </div>
            </section>

            {/* About */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Acerca de
              </h3>
              <input
                className={`${fieldClass} mb-3`}
                placeholder="Título de la sección About"
                value={content.aboutTitle}
                onChange={e =>
                  setContent({ ...content, aboutTitle: e.target.value })
                }
              />
              <RichTextEditor
                value={content.aboutBody}
                onChange={value => setContent({ ...content, aboutBody: value })}
                placeholder="Texto de la sección Acerca de"
              />
            </section>

            {/* Mission & Vision */}
            <section className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                  Misión
                </h3>
                <input
                  className={`${fieldClass} mb-3`}
                  placeholder="Título de misión"
                  value={content.missionTitle}
                  onChange={e =>
                    setContent({ ...content, missionTitle: e.target.value })
                  }
                />
                <RichTextEditor
                  value={content.missionText}
                  onChange={value =>
                    setContent({ ...content, missionText: value })
                  }
                  placeholder="Texto de la misión"
                  minHeightClassName="min-h-[120px]"
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                  Visión
                </h3>
                <input
                  className={`${fieldClass} mb-3`}
                  placeholder="Título de visión"
                  value={content.visionTitle}
                  onChange={e =>
                    setContent({ ...content, visionTitle: e.target.value })
                  }
                />
                <RichTextEditor
                  value={content.visionText}
                  onChange={value =>
                    setContent({ ...content, visionText: value })
                  }
                  placeholder="Texto de la visión"
                  minHeightClassName="min-h-[120px]"
                />
              </div>
            </section>

            {/* Values */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Valores
              </h3>
              <div className="space-y-3">
                <input
                  className={fieldClass}
                  placeholder="Título de la sección valores"
                  value={content.valuesTitle}
                  onChange={e =>
                    setContent({ ...content, valuesTitle: e.target.value })
                  }
                />

                {content.values.map((value, index) => (
                  <div
                    key={`${value.title}-${index}`}
                    className="grid md:grid-cols-12 gap-2 items-start"
                  >
                    <input
                      className="md:col-span-3 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Título"
                      value={value.title}
                      onChange={e =>
                        handleUpdateValue(index, 'title', e.target.value)
                      }
                    />
                    <div className="md:col-span-8">
                      <RichTextEditor
                        value={value.description}
                        onChange={nextValue =>
                          handleUpdateValue(index, 'description', nextValue)
                        }
                        placeholder="Descripción"
                        minHeightClassName="min-h-[100px]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveValue(index)}
                      className="md:col-span-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                    >
                      X
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddValue}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 rounded-lg text-sm font-medium"
                >
                  + Agregar valor
                </button>
              </div>
            </section>

            {/* Secciones visibles */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Visibilidad de secciones
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {(
                  [
                    ['events', 'Eventos'],
                    ['gallery', 'Galería'],
                    ['resources', 'Recursos'],
                    ['testimonials', 'Testimonios'],
                    ['social', 'Redes sociales'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <input
                      type="checkbox"
                      checked={content.sectionsVisible[key]}
                      onChange={e =>
                        setContent({
                          ...content,
                          sectionsVisible: {
                            ...content.sectionsVisible,
                            [key]: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Social */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Redes Sociales
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  className={fieldClass}
                  placeholder="Instagram URL"
                  value={content.social?.instagram || ''}
                  onChange={e =>
                    setContent({
                      ...content,
                      social: { ...content.social, instagram: e.target.value },
                    })
                  }
                />
                <input
                  className={fieldClass}
                  placeholder="Facebook URL"
                  value={content.social?.facebook || ''}
                  onChange={e =>
                    setContent({
                      ...content,
                      social: { ...content.social, facebook: e.target.value },
                    })
                  }
                />
                <input
                  className={fieldClass}
                  placeholder="YouTube URL"
                  value={content.social?.youtube || ''}
                  onChange={e =>
                    setContent({
                      ...content,
                      social: { ...content.social, youtube: e.target.value },
                    })
                  }
                />
                <input
                  className={fieldClass}
                  placeholder="WhatsApp número o URL"
                  value={content.social?.whatsapp || ''}
                  onChange={e =>
                    setContent({
                      ...content,
                      social: { ...content.social, whatsapp: e.target.value },
                    })
                  }
                />
              </div>
            </section>

            {/* Location */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Ubicación
              </h3>
              <div className="space-y-3">
                <input
                  className={fieldClass}
                  placeholder="Dirección (texto)"
                  value={content.addressLabel}
                  onChange={e =>
                    setContent({ ...content, addressLabel: e.target.value })
                  }
                />
                <input
                  className={fieldClass}
                  placeholder="Dirección línea completa"
                  value={content.addressLine}
                  onChange={e =>
                    setContent({ ...content, addressLine: e.target.value })
                  }
                />
                <input
                  className={fieldClass}
                  placeholder="URL embed Google Maps (iframe src)"
                  value={content.mapEmbedUrl}
                  onChange={e =>
                    setContent({ ...content, mapEmbedUrl: e.target.value })
                  }
                />
                <input
                  className={fieldClass}
                  placeholder="URL indicaciones Google Maps"
                  value={content.mapsDirectionsUrl}
                  onChange={e =>
                    setContent({
                      ...content,
                      mapsDirectionsUrl: e.target.value,
                    })
                  }
                />
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    type="number"
                    className={fieldClass}
                    placeholder="Latitud"
                    value={content.latitude ?? ''}
                    onChange={e =>
                      setContent({
                        ...content,
                        latitude:
                          e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                  <input
                    type="number"
                    className={fieldClass}
                    placeholder="Longitud"
                    value={content.longitude ?? ''}
                    onChange={e =>
                      setContent({
                        ...content,
                        longitude:
                          e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <RichTextEditor
                  value={content.locationNote}
                  onChange={value =>
                    setContent({ ...content, locationNote: value })
                  }
                  placeholder="Nota de ubicación"
                  minHeightClassName="min-h-[110px]"
                />
              </div>
            </section>

            {/* Eventos */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Eventos
              </h3>
              <div className="space-y-3">
                <input
                  className={fieldClass}
                  placeholder="Título eventos"
                  value={content.eventsTitle}
                  onChange={e =>
                    setContent({ ...content, eventsTitle: e.target.value })
                  }
                />
                <RichTextEditor
                  value={content.eventsBody}
                  onChange={value =>
                    setContent({ ...content, eventsBody: value })
                  }
                  placeholder="Texto eventos"
                  minHeightClassName="min-h-[110px]"
                />
              </div>
            </section>

            {/* Galería */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Galería
              </h3>
              <div className="space-y-3">
                <input
                  className={fieldClass}
                  placeholder="Título galería"
                  value={content.galleryTitle}
                  onChange={e =>
                    setContent({ ...content, galleryTitle: e.target.value })
                  }
                />
                <RichTextEditor
                  value={content.galleryBody}
                  onChange={value =>
                    setContent({ ...content, galleryBody: value })
                  }
                  placeholder="Texto galería"
                  minHeightClassName="min-h-[110px]"
                />
              </div>
            </section>

            {/* Recursos */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Recursos
              </h3>
              <input
                className={fieldClass}
                placeholder="Título recursos"
                value={content.resourcesTitle}
                onChange={e =>
                  setContent({ ...content, resourcesTitle: e.target.value })
                }
              />
            </section>

            {/* Testimonios */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Testimonios
              </h3>
              <div className="space-y-3">
                <input
                  className={fieldClass}
                  placeholder="Título testimonios"
                  value={content.testimonialsTitle}
                  onChange={e =>
                    setContent({
                      ...content,
                      testimonialsTitle: e.target.value,
                    })
                  }
                />
                <RichTextEditor
                  value={content.testimonialsBody}
                  onChange={value =>
                    setContent({ ...content, testimonialsBody: value })
                  }
                  placeholder="Texto testimonios"
                  minHeightClassName="min-h-[110px]"
                />
              </div>
            </section>

            {/* CTA */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                CTA final
              </h3>
              <div className="space-y-3">
                <input
                  className={fieldClass}
                  placeholder="Título CTA"
                  value={content.ctaTitle}
                  onChange={e =>
                    setContent({ ...content, ctaTitle: e.target.value })
                  }
                />
                <RichTextEditor
                  value={content.ctaBody}
                  onChange={value => setContent({ ...content, ctaBody: value })}
                  placeholder="Texto CTA"
                  minHeightClassName="min-h-[110px]"
                />
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    className={fieldClass}
                    placeholder="Texto botón principal"
                    value={content.ctaPrimaryLabel}
                    onChange={e =>
                      setContent({
                        ...content,
                        ctaPrimaryLabel: e.target.value,
                      })
                    }
                  />
                  <input
                    className={fieldClass}
                    placeholder="Texto botón secundario"
                    value={content.ctaSecondaryLabel}
                    onChange={e =>
                      setContent({
                        ...content,
                        ctaSecondaryLabel: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </section>

            {/* SEO */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                SEO
              </h3>
              <div className="space-y-3">
                <input
                  className={fieldClass}
                  placeholder="Título SEO"
                  value={content.seoTitle}
                  onChange={e =>
                    setContent({ ...content, seoTitle: e.target.value })
                  }
                />
                <RichTextEditor
                  value={content.seoDescription}
                  onChange={value =>
                    setContent({ ...content, seoDescription: value })
                  }
                  placeholder="Descripción SEO"
                  minHeightClassName="min-h-[100px]"
                />
              </div>
            </section>

            {/* Publicación */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Estado
              </h3>
              <label className="inline-flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={content.isPublished}
                  onChange={e =>
                    setContent({ ...content, isPublished: e.target.checked })
                  }
                />
                <span className="text-gray-700 dark:text-gray-300">
                  Publicado (visible en la landing)
                </span>
              </label>
            </section>

            <button
              onClick={handleSaveContent}
              disabled={saving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}

        {/* ── MEETINGS TAB ─────────────────────────────────── */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            {/* Form */}
            {showMeetingForm && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
                  {editingMeeting ? 'Editar reunión' : 'Nueva reunión'}
                </h2>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      className={fieldClass}
                      placeholder="Título *"
                      value={meetingForm.title}
                      onChange={e =>
                        setMeetingForm({
                          ...meetingForm,
                          title: e.target.value,
                        })
                      }
                    />
                    <input
                      className={fieldClass}
                      placeholder="Subtítulo"
                      value={meetingForm.subtitle}
                      onChange={e =>
                        setMeetingForm({
                          ...meetingForm,
                          subtitle: e.target.value,
                        })
                      }
                    />
                  </div>
                  <textarea
                    className={`${fieldClass} h-24`}
                    placeholder="Descripción"
                    value={meetingForm.description}
                    onChange={e =>
                      setMeetingForm({
                        ...meetingForm,
                        description: e.target.value,
                      })
                    }
                  />
                  <div className="grid md:grid-cols-3 gap-4">
                    <input
                      className={fieldClass}
                      placeholder="Día (ej. Viernes) *"
                      value={meetingForm.day}
                      onChange={e =>
                        setMeetingForm({ ...meetingForm, day: e.target.value })
                      }
                    />
                    <input
                      className={fieldClass}
                      placeholder="Hora (ej. 6:30 PM) *"
                      value={meetingForm.time}
                      onChange={e =>
                        setMeetingForm({ ...meetingForm, time: e.target.value })
                      }
                    />
                    <select
                      className={fieldClass}
                      value={meetingForm.modality}
                      onChange={e =>
                        setMeetingForm({
                          ...meetingForm,
                          modality: e.target.value as MeetingForm['modality'],
                        })
                      }
                    >
                      <option value="presencial">Presencial</option>
                      <option value="virtual">Virtual</option>
                      <option value="híbrido">Híbrido</option>
                    </select>
                  </div>
                  {(meetingForm.modality === 'virtual' ||
                    meetingForm.modality === 'híbrido') && (
                    <input
                      className={fieldClass}
                      placeholder="Enlace de reunión (Zoom / Meet)"
                      value={meetingForm.meetingLink}
                      onChange={e =>
                        setMeetingForm({
                          ...meetingForm,
                          meetingLink: e.target.value,
                        })
                      }
                    />
                  )}
                  <input
                    type="number"
                    className={fieldClass}
                    placeholder="Orden de aparición"
                    value={meetingForm.order}
                    onChange={e =>
                      setMeetingForm({
                        ...meetingForm,
                        order: Number(e.target.value),
                      })
                    }
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveMeeting}
                      disabled={savingMeeting}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
                    >
                      {savingMeeting
                        ? 'Guardando…'
                        : editingMeeting
                          ? 'Actualizar'
                          : 'Crear'}
                    </button>
                    <button
                      onClick={() => setShowMeetingForm(false)}
                      className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Reuniones Semanales
                </h2>
                {!showMeetingForm && (
                  <button
                    onClick={openNewMeeting}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition"
                  >
                    + Nueva reunión
                  </button>
                )}
              </div>
              {meetings.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No hay reuniones. Crea la primera.
                </p>
              ) : (
                <div className="space-y-3">
                  {meetings.map(m => (
                    <div
                      key={m._id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {m.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {m.schedule.day} · {m.schedule.time} · {m.modality}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditMeeting(m)}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteMeeting(m._id)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MEDIA TAB ────────────────────────────────────── */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            {/* Upload Panel */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
                Subir imagen
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* File drop zone */}
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    {uploadPreview ? (
                      <img
                        src={uploadPreview}
                        alt="preview"
                        className="max-h-48 mx-auto rounded-lg object-contain"
                      />
                    ) : (
                      <div className="text-gray-400">
                        <svg
                          className="w-12 h-12 mx-auto mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-sm">
                          Haz clic o arrastra una imagen
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Fields */}
                <div className="space-y-3">
                  <input
                    className={fieldClass}
                    placeholder="Título de la imagen *"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                  />
                  <input
                    className={fieldClass}
                    placeholder="Texto alternativo (accesibilidad)"
                    value={uploadAltText}
                    onChange={e => setUploadAltText(e.target.value)}
                  />
                  <select
                    className={fieldClass}
                    value={uploadCategory}
                    onChange={e =>
                      setUploadCategory(e.target.value as MediaCategory)
                    }
                  >
                    {MEDIA_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleUploadMedia}
                    disabled={uploading || !uploadFile}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
                  >
                    {uploading ? 'Subiendo…' : 'Subir a Azure'}
                  </button>
                </div>
              </div>
            </div>

            {/* Gallery */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mr-2">
                  Imágenes guardadas
                </h2>
                <button
                  onClick={() => setMediaFilter('all')}
                  className={`px-3 py-1 text-sm rounded-full transition ${mediaFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                >
                  Todas ({media.length})
                </button>
                {MEDIA_CATEGORIES.map(c => {
                  const count = media.filter(
                    m => m.category === c.value
                  ).length;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setMediaFilter(c.value)}
                      className={`px-3 py-1 text-sm rounded-full transition ${mediaFilter === c.value ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                      {c.label} ({count})
                    </button>
                  );
                })}
              </div>

              {filteredMedia.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No hay imágenes en esta categoría.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredMedia.map(img => (
                    <div
                      key={img._id}
                      className="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                      <img
                        src={img.mediaUrl}
                        alt={img.altText || img.title}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                          {img.title}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {img.category}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteMedia(img._id)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar"
                      >
                        <svg
                          className="w-3.5 h-3.5"
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
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
