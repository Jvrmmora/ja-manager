import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, apiUpload } from '../services/api';
import { useToast } from '../hooks/useToast';
import PageLoader from '../components/PageLoader';
import RichTextEditor from '../components/RichTextEditor';
import ThemeToggle from '../components/ThemeToggle';
import BrandModalHeader from '../components/ui/BrandModalHeader';
import logo from '../assets/logos/logo.png';
import '../brand-skin.css';

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
  resourcesBody: string;
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

const MAX_MEDIA_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
];

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

type MediaCategory = 'hero' | 'gallery' | 'testimonial' | 'event' | 'resource';
type UploadMode = 'file' | 'link';

interface LandingMedia {
  _id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  category: MediaCategory;
  altText: string;
  order: number;
  isPublished: boolean;
}

interface MeetingForm {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
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
  imageUrl: '',
  day: '',
  time: '',
  modality: 'presencial',
  meetingLink: '',
  order: 0,
};

const MEDIA_CATEGORIES: { value: MediaCategory; label: string }[] = [
  { value: 'gallery', label: 'Galería' },
  { value: 'resource', label: 'Recursos' },
  { value: 'hero', label: 'Hero / Banner' },
  { value: 'testimonial', label: 'Testimonios' },
  { value: 'event', label: 'Eventos' },
];

const fieldClass = 'field-brand min-h-[48px] py-2.5 text-[15px]';

// Índice lateral del contenido (id del ancla, etiqueta)
const CMS_SECTIONS: Array<[string, string]> = [
  ['cms-hero', 'Hero'],
  ['cms-about', 'Acerca de'],
  ['cms-mission', 'Misión y visión'],
  ['cms-values', 'Valores'],
  ['cms-visibility', 'Visibilidad'],
  ['cms-social', 'Redes sociales'],
  ['cms-location', 'Ubicación'],
  ['cms-events', 'Eventos'],
  ['cms-gallery', 'Galería'],
  ['cms-resources', 'Recursos'],
  ['cms-testimonials', 'Testimonios'],
  ['cms-cta', 'CTA final'],
  ['cms-seo', 'SEO y estado'],
];

const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase();

    if (hostname.includes('youtu.be')) {
      return parsed.pathname.replace(/^\/+/, '').split('/')[0] || null;
    }

    if (hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) return videoId;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const segment = pathParts[0];
      if ((segment === 'shorts' || segment === 'live' || segment === 'embed') && pathParts[1]) {
        return pathParts[1];
      }
    }

    if (hostname.includes('youtube-nocookie.com')) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'embed' && pathParts[1]) {
        return pathParts[1];
      }
    }
  } catch {
    // ignore invalid URL format
  }

  return null;
};

const isYouTubeUrl = (url: string) => !!getYouTubeVideoId(url);

const isVimeoUrl = (url: string) => /vimeo\.com\//i.test(url);

const toEmbeddableUrl = (url: string): string => {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    try {
      const parsed = new URL(url.trim());
      const params = new URLSearchParams();

      ['si', 'start', 't', 'end', 'list', 'index', 'autoplay', 'mute', 'loop', 'playsinline', 'origin']
        .forEach(key => {
          const value = parsed.searchParams.get(key);
          if (value) params.set(key, value);
        });

      params.set('rel', '0');
      params.set('modestbranding', '1');

      const query = params.toString();
      return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ''}`;
    } catch {
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    }
  }

  if (isVimeoUrl(url)) {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : url;
  }

  return url;
};

const inferMediaTypeFromUrl = (
  rawUrl: string
): 'image' | 'video' | 'document' => {
  const url = rawUrl.toLowerCase().trim();

  if (isYouTubeUrl(url) || isVimeoUrl(url)) return 'video';
  if (/\.(pdf)(\?|#|$)/i.test(url)) return 'document';
  if (/\.(jpg|jpeg|png|webp|gif|avif)(\?|#|$)/i.test(url)) return 'image';
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)) return 'video';

  return 'document';
};

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
  resourcesBody: '',
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

const MAX_MEDIA_DESCRIPTION_LENGTH = 700;

const getPlainTextLength = (htmlValue: string) => {
  const plainText = htmlValue
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return plainText.length;
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
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const meetingImageInputRef = useRef<HTMLInputElement>(null);
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
  const [meetingImageFile, setMeetingImageFile] = useState<File | null>(null);
  const [meetingImagePreview, setMeetingImagePreview] = useState<string | null>(
    null
  );
  const [uploadingMeetingImage, setUploadingMeetingImage] = useState(false);

  // Media state
  const [media, setMedia] = useState<LandingMedia[]>([]);
  const [mediaFilter, setMediaFilter] = useState<MediaCategory | 'all'>('all');
  const [blockedVideos, setBlockedVideos] = useState<Record<string, boolean>>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] =
    useState<MediaCategory>('gallery');
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [uploadLinkUrl, setUploadLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingMedia, setEditingMedia] = useState<LandingMedia | null>(null);
  const [editingMediaTitle, setEditingMediaTitle] = useState('');
  const [editingMediaDescription, setEditingMediaDescription] = useState('');
  const [editingMediaCategory, setEditingMediaCategory] = useState<MediaCategory>('gallery');
  const [savingMediaEdit, setSavingMediaEdit] = useState(false);

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
    setMeetingImageFile(null);
    setMeetingImagePreview(null);
    if (meetingImageInputRef.current) meetingImageInputRef.current.value = '';
    setShowMeetingForm(true);
  };

  const openEditMeeting = (m: LandingMeeting) => {
    setEditingMeeting(m);
    setMeetingForm({
      title: m.title,
      subtitle: m.subtitle,
      description: m.description,
      imageUrl: m.imageUrl || '',
      day: m.schedule.day,
      time: m.schedule.time,
      modality: m.modality,
      meetingLink: m.meetingLink || '',
      order: m.order,
    });
    setMeetingImageFile(null);
    setMeetingImagePreview(null);
    if (meetingImageInputRef.current) meetingImageInputRef.current.value = '';
    setShowMeetingForm(true);
  };

  const handleMeetingImageFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      showToast('Solo se permiten imágenes (JPG, PNG, WEBP, GIF)', 'error');
      return;
    }

    if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) {
      showToast('Imagen demasiado grande. Máximo 100MB.', 'error');
      return;
    }

    setMeetingImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setMeetingImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadMeetingImage = async () => {
    if (!meetingImageFile) {
      showToast('Selecciona una imagen primero', 'error');
      return;
    }

    try {
      setUploadingMeetingImage(true);
      const formData = new FormData();
      formData.append('file', meetingImageFile);

      // Endpoint propio de reuniones: sube a su carpeta y NO crea entrada en la
      // galería, así la imagen no se puede borrar por error desde "Media".
      const res = await apiUpload(
        'landing/admin/meetings/upload-image',
        formData
      );
      const data = await res.json();

      if (data.success && data.data?.imageUrl) {
        setMeetingForm(prev => ({ ...prev, imageUrl: data.data.imageUrl }));
        setMeetingImageFile(null);
        setMeetingImagePreview(null);
        if (meetingImageInputRef.current)
          meetingImageInputRef.current.value = '';
        showToast('Imagen subida y vinculada a la reunión', 'success');
      } else {
        showToast(data.message || 'Error al subir imagen', 'error');
      }
    } catch {
      showToast('Error al subir imagen', 'error');
    } finally {
      setUploadingMeetingImage(false);
    }
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
        imageUrl: meetingForm.imageUrl || undefined,
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

    if (!ALLOWED_MEDIA_MIME_TYPES.includes(file.type)) {
      showToast(
        'Archivo no permitido. Usa imagen, video MP4/WebM/MOV o PDF.',
        'error'
      );
      return;
    }

    if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) {
      showToast('Archivo demasiado grande. Máximo 100MB.', 'error');
      return;
    }

    setUploadFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setUploadPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
    }

    if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleUploadMedia = async () => {
    const descriptionLength = getPlainTextLength(uploadDescription);
    if (descriptionLength > MAX_MEDIA_DESCRIPTION_LENGTH) {
      showToast(
        `La descripción no puede exceder ${MAX_MEDIA_DESCRIPTION_LENGTH} caracteres`,
        'error'
      );
      return;
    }

    if (uploadMode === 'link') {
      if (!uploadLinkUrl.trim()) {
        showToast('Pega un enlace primero', 'error');
        return;
      }
      if (!uploadTitle.trim()) {
        showToast('Escribe un título para el recurso', 'error');
        return;
      }

      try {
        setUploading(true);
        const normalizedUrl = uploadLinkUrl.trim();
        const mediaType = inferMediaTypeFromUrl(normalizedUrl);

        const res = await apiRequest('landing/admin/media', {
          method: 'POST',
          body: JSON.stringify({
            title: uploadTitle.trim(),
            description: uploadDescription.trim(),
            mediaUrl: normalizedUrl,
            mediaType,
            category: uploadCategory,
            altText: uploadAltText.trim(),
            order: 0,
          }),
        });

        const data = await res.json();
        if (data.success && data.data) {
          showToast('Enlace guardado exitosamente', 'success');
          setMedia(prev => [...prev, data.data]);
          setUploadTitle('');
          setUploadAltText('');
          setUploadDescription('');
          setUploadLinkUrl('');
        } else {
          showToast(data.message || 'Error al guardar enlace', 'error');
        }
      } catch {
        showToast('Error al guardar enlace', 'error');
      } finally {
        setUploading(false);
      }

      return;
    }

    if (!uploadFile) {
      showToast('Selecciona un archivo primero', 'error');
      return;
    }
    if (!uploadTitle.trim()) {
      showToast('Escribe un título para el archivo', 'error');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('title', uploadTitle.trim());
      formData.append('altText', uploadAltText.trim());
      formData.append('description', uploadDescription.trim());
      const res = await apiUpload('landing/admin/media/upload', formData);
      const data = await res.json();
      if (data.success && data.data) {
        showToast('Archivo subido exitosamente', 'success');
        setMedia(prev => [...prev, data.data]);
        setUploadFile(null);
        setUploadPreview(null);
        setUploadTitle('');
        setUploadAltText('');
        setUploadDescription('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        showToast(data.message || 'Error al subir archivo', 'error');
      }
    } catch {
      showToast('Error al subir archivo', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    try {
      const res = await apiRequest(`landing/admin/media/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Archivo eliminado', 'success');
        setMedia(prev => prev.filter(m => m._id !== id));
      } else {
        showToast('Error al eliminar', 'error');
      }
    } catch {
      showToast('Error al eliminar archivo', 'error');
    }
  };

  const openEditMediaModal = (item: LandingMedia) => {
    setEditingMedia(item);
    setEditingMediaTitle(item.title || '');
    setEditingMediaDescription(item.description || '');
    setEditingMediaCategory(item.category || 'gallery');
  };

  const handleSaveMediaEdit = async () => {
    if (!editingMedia) return;
    if (!editingMediaTitle.trim()) {
      showToast('El título es requerido', 'error');
      return;
    }

    const descriptionLength = getPlainTextLength(editingMediaDescription);
    if (descriptionLength > MAX_MEDIA_DESCRIPTION_LENGTH) {
      showToast(
        `La descripción no puede exceder ${MAX_MEDIA_DESCRIPTION_LENGTH} caracteres`,
        'error'
      );
      return;
    }

    try {
      setSavingMediaEdit(true);
      const res = await apiRequest(`landing/admin/media/${editingMedia._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editingMediaTitle.trim(),
            description: editingMediaDescription.trim(),
            category: editingMediaCategory,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setMedia(prev =>
          prev.map(item => (item._id === editingMedia._id ? data.data : item))
        );
        showToast('Recurso actualizado', 'success');
        setEditingMedia(null);
      } else {
        showToast(data.message || 'Error al actualizar recurso', 'error');
      }
    } catch {
      showToast('Error al actualizar recurso', 'error');
    } finally {
      setSavingMediaEdit(false);
    }
  };

  if (loading) return <PageLoader />;

  if (!content) {
    return (
      <div className="brand-skin min-h-screen bg-cream p-8 text-center dark:bg-ink-950">
        <p className="text-red-600 dark:text-red-400">
          Error al cargar contenido
        </p>
        <button
          onClick={fetchAll}
          className="btn-fire mt-4 h-11 px-6 text-sm"
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
    <div className="brand-skin min-h-screen bg-cream dark:bg-ink-950">
      {/* Header */}
      <header className="border-b border-sand-200 bg-white dark:border-white/10 dark:bg-ink-950">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-sand-300 pl-2.5 pr-3.5 text-sm font-semibold text-cocoa-600 transition-colors hover:border-cocoa-400 dark:border-white/15 dark:text-white/80"
              aria-label="Volver al panel"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="hidden sm:inline">Panel</span>
            </button>
            <img src={logo} alt="Jóvenes Modelia" className="h-9 w-9 object-contain lg:h-10 lg:w-10" />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-[11px] tracking-[0.28em] text-cocoa-400 dark:text-white/55">JÓVENES</span>
              <span className="font-display text-xl font-semibold tracking-[0.04em] text-cocoa-900 dark:text-white">MODELIA</span>
            </span>
            <span className="inline-flex h-6 items-center rounded-full bg-ink-950 px-2.5 font-display text-[11px] tracking-[0.18em] text-brand-amber dark:bg-white/10">
              CMS
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-sand-300 px-4 text-sm font-semibold text-cocoa-600 transition-colors hover:border-cocoa-400 dark:border-white/15 dark:text-white/80"
              aria-label="Ver landing"
            >
              <span className="hidden sm:inline">Ver landing</span>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Franja con título y pestañas */}
      <section className="relative overflow-hidden bg-ink-950 pt-7 sm:pt-9">
        <div className="pointer-events-none absolute left-1/2 -top-[440px] h-[760px] w-[760px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.3)_0%,rgba(20,11,16,0)_65%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <span className="eyebrow text-brand-amber">Landing CMS</span>
              <h1 className="m-0 font-display text-3xl font-bold uppercase leading-none text-white sm:text-[46px]">
                {activeTab === 'content'
                  ? 'Contenido de la landing'
                  : activeTab === 'meetings'
                    ? 'Reuniones semanales'
                    : 'Galería y archivos'}
              </h1>
            </div>
            <span
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold ${
                content.isPublished
                  ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
                  : 'border-white/20 bg-white/10 text-white/70'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${content.isPublished ? 'bg-emerald-400' : 'bg-white/50'}`} />
              {content.isPublished ? 'Publicado' : 'No publicado'}
            </span>
          </div>
          <nav aria-label="Secciones del CMS" className="mt-6 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {(['content', 'meetings', 'media'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-current={activeTab === tab ? 'page' : undefined}
                className={`inline-flex h-12 flex-shrink-0 items-center gap-2 rounded-t-2xl px-5 text-[15px] transition-colors ${
                  activeTab === tab
                    ? 'bg-cream font-bold text-cocoa-900 dark:bg-ink-950 dark:text-white'
                    : 'font-semibold text-white/70 hover:text-white'
                }`}
              >
                {tab === 'content' && 'Contenido'}
                {tab === 'meetings' && 'Reuniones'}
                {tab === 'media' && 'Galería'}
                {tab !== 'content' && (
                  <span
                    className={`inline-flex h-[22px] items-center rounded-full px-2 text-xs ${
                      activeTab === tab
                        ? 'bg-sand-100 text-[#9A3412] dark:bg-brand-orange/15 dark:text-brand-amber'
                        : 'bg-white/10'
                    }`}
                  >
                    {tab === 'meetings' ? meetings.length : media.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {/* ── CONTENT TAB ──────────────────────────────────── */}
        {activeTab === 'content' && (
          <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
            {/* Índice de secciones */}
            <nav
              aria-label="Secciones del contenido"
              className="sticky top-4 z-10 -mx-4 overflow-x-auto bg-cream/95 px-4 py-2 backdrop-blur [scrollbar-width:none] lg:mx-0 lg:self-start lg:rounded-[22px] lg:border lg:border-sand-200 lg:bg-white lg:p-3 dark:bg-ink-950/95 lg:dark:border-white/10 lg:dark:bg-ink-900"
            >
              <span className="hidden px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-400 lg:block dark:text-white/50">
                Secciones
              </span>
              <div className="flex gap-1.5 lg:flex-col lg:gap-0.5">
                {CMS_SECTIONS.map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="inline-flex h-9 flex-shrink-0 items-center rounded-xl border border-sand-200 bg-white px-3 text-[13px] font-semibold text-cocoa-600 transition-colors hover:bg-sand-50 hover:text-cocoa-900 lg:h-10 lg:border-0 lg:bg-transparent lg:text-sm dark:border-white/10 dark:bg-ink-900 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white lg:dark:bg-transparent"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </nav>
            <div className="min-w-0 space-y-5 pb-4">

            {/* Hero */}
            <section id="cms-hero" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  01
                </span>
                Hero
              </h3>
              <div className="space-y-3 pl-4 border-l-2 border-brand-orange/60">
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
            <section id="cms-about" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  02
                </span>
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
            <section id="cms-mission" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900 grid md:grid-cols-2 gap-5">
              <div>
                <h3 className="eyebrow m-0 mb-3 text-[13px] text-brand-deep dark:text-brand-amber">
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
                <h3 className="eyebrow m-0 mb-3 text-[13px] text-brand-deep dark:text-brand-amber">
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
            <section id="cms-values" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  04
                </span>
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
                      className="md:col-span-1 h-11 rounded-full border-[1.5px] border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:border-red-400 dark:border-red-500/30 dark:bg-transparent dark:text-red-300"
                    >
                      X
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddValue}
                  className="h-10 rounded-full border-[1.5px] border-sand-300 bg-white px-4 text-sm font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
                >
                  + Agregar valor
                </button>
              </div>
            </section>

            {/* Secciones visibles */}
            <section id="cms-visibility" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  05
                </span>
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
            <section id="cms-social" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  06
                </span>
                Redes sociales
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
            <section id="cms-location" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  07
                </span>
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
                  placeholder="Pega la URL src o el iframe completo de Google Maps"
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
            <section id="cms-events" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  08
                </span>
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
            <section id="cms-gallery" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  09
                </span>
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
            <section id="cms-resources" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  10
                </span>
                Recursos
              </h3>
              <div className="space-y-3">
                <input
                  className={fieldClass}
                  placeholder="Título recursos"
                  value={content.resourcesTitle}
                  onChange={e =>
                    setContent({ ...content, resourcesTitle: e.target.value })
                  }
                />
                <RichTextEditor
                  value={content.resourcesBody}
                  onChange={value =>
                    setContent({ ...content, resourcesBody: value })
                  }
                  placeholder="Descripción de la sección de recursos"
                  minHeightClassName="min-h-[110px]"
                />
              </div>
            </section>

            {/* Testimonios */}
            <section id="cms-testimonials" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  11
                </span>
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
            <section id="cms-cta" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  12
                </span>
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
            <section id="cms-seo" className="scroll-mt-24 rounded-[26px] border border-sand-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-ink-900">
              <h3 className="m-0 mb-4 flex items-center gap-3 font-display text-[22px] font-semibold uppercase text-cocoa-900 dark:text-white">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink-950 font-display text-[15px] text-brand-amber dark:bg-white/10">
                  13
                </span>
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
                <textarea
                  className={`${fieldClass} h-24`}
                  placeholder="Descripción SEO (texto plano, ~150-160 caracteres — esto es lo que Google muestra bajo el título)"
                  value={content.seoDescription}
                  onChange={e =>
                    setContent({ ...content, seoDescription: e.target.value })
                  }
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                  {content.seoDescription.length}/160 caracteres recomendados
                </p>
              </div>
            </section>

            <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-ink-950/95 px-4 py-3 text-white shadow-[0_20px_50px_-20px_rgba(20,11,16,0.7)] backdrop-blur sm:px-5">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={content.isPublished}
                  onChange={e =>
                    setContent({ ...content, isPublished: e.target.checked })
                  }
                  className="h-4 w-4 accent-brand-orange"
                />
                Publicado (visible en la landing)
              </label>
              <button
                onClick={handleSaveContent}
                disabled={saving}
                className="btn-fire h-12 px-7 text-[15px]"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
            </div>
          </div>
        )}

        {/* ── MEETINGS TAB ─────────────────────────────────── */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            {/* Form */}
            {showMeetingForm && (
              <div className="rounded-[26px] border-[1.5px] border-[#F4B58C] bg-white p-5 sm:p-6 dark:border-brand-orange/40 dark:bg-ink-900">
                <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white mb-5">
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
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Imagen de la reunión (opcional)
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        ref={meetingImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleMeetingImageFileChange}
                        className="flex-1 text-sm text-gray-600 dark:text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleUploadMeetingImage}
                        disabled={!meetingImageFile || uploadingMeetingImage}
                        className="btn-fire h-11 px-5 text-sm"
                      >
                        {uploadingMeetingImage ? 'Subiendo…' : 'Subir imagen'}
                      </button>
                    </div>

                    {meetingImagePreview && (
                      <img
                        src={meetingImagePreview}
                        alt="Preview reunión"
                        className="w-full max-h-40 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                    )}

                    <select
                      className={fieldClass}
                      value={meetingForm.imageUrl}
                      onChange={e =>
                        setMeetingForm({
                          ...meetingForm,
                          imageUrl: e.target.value,
                        })
                      }
                    >
                      <option value="">Sin imagen</option>
                      {media
                        .filter(
                          item =>
                            item.mediaType === 'image' &&
                            (item.category === 'gallery' ||
                              item.category === 'event')
                        )
                        .map(item => (
                          <option key={item._id} value={item.mediaUrl}>
                            {item.title} ({item.category})
                          </option>
                        ))}
                    </select>

                    <input
                      className={fieldClass}
                      placeholder="O pega URL de imagen manualmente"
                      value={meetingForm.imageUrl}
                      onChange={e =>
                        setMeetingForm({
                          ...meetingForm,
                          imageUrl: e.target.value,
                        })
                      }
                    />
                  </div>
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
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Orden de aparición
                    </label>
                    <input
                      type="number"
                      className={fieldClass}
                      value={meetingForm.order}
                      onChange={e =>
                        setMeetingForm({
                          ...meetingForm,
                          order: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveMeeting}
                      disabled={savingMeeting}
                      className="btn-fire h-11 px-5 text-sm"
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
            <div className="rounded-[26px] border border-sand-200 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-ink-900">
              <div className="flex items-center justify-between mb-5">
                <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">
                  Reuniones Semanales
                </h2>
                {!showMeetingForm && (
                  <button
                    onClick={openNewMeeting}
                    className="btn-fire h-11 px-5 text-sm"
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
                          className="h-9 rounded-full border-[1.5px] border-sand-300 bg-white px-4 text-[13px] font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteMeeting(m._id)}
                          className="h-9 rounded-full border-[1.5px] border-red-200 bg-white px-4 text-[13px] font-semibold text-red-700 hover:border-red-400 dark:border-red-500/30 dark:bg-transparent dark:text-red-300"
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
            <div className="rounded-[26px] border border-sand-200 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-ink-900">
              <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white mb-5">
                Cargar recurso
              </h2>
              <div className="flex gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`px-3 py-1.5 text-sm rounded-full transition ${uploadMode === 'file' ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950' : 'bg-sand-50 text-cocoa-600 dark:bg-white/5 dark:text-white/70'}`}
                >
                  Archivo
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('link')}
                  className={`px-3 py-1.5 text-sm rounded-full transition ${uploadMode === 'link' ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950' : 'bg-sand-50 text-cocoa-600 dark:bg-white/5 dark:text-white/70'}`}
                >
                  Enlace (YouTube/Vimeo/PDF/etc.)
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {/* File drop zone */}
                <div>
                  {uploadMode === 'file' ? (
                    <>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer rounded-[22px] border-2 border-dashed border-[#F4B58C] bg-cream p-6 text-center transition-colors hover:border-brand-orange dark:border-brand-orange/40 dark:bg-white/[0.03]"
                      >
                        {uploadPreview ? (
                          <img
                            src={uploadPreview}
                            alt="preview"
                            className="max-h-48 mx-auto rounded-lg object-contain"
                          />
                        ) : uploadFile ? (
                          <div className="text-gray-500 dark:text-gray-300">
                            <p className="text-sm font-medium truncate">
                              {uploadFile.name}
                            </p>
                            <p className="text-xs mt-1">
                              {(uploadFile.size / (1024 * 1024)).toFixed(1)} MB
                            </p>
                          </div>
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
                              Haz clic o arrastra un archivo
                            </p>
                            <p className="text-xs mt-1">
                              Imagen, video o PDF (máx. 100MB)
                            </p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </>
                  ) : (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/30">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        URL del recurso
                      </label>
                      <input
                        className={fieldClass}
                        placeholder="https://youtube.com/... | https://vimeo.com/... | https://.../archivo.pdf"
                        value={uploadLinkUrl}
                        onChange={e => setUploadLinkUrl(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Se detecta automáticamente si es video, documento o
                        imagen.
                      </p>
                    </div>
                  )}
                </div>

                {/* Fields */}
                <div className="space-y-3">
                  <input
                    className={fieldClass}
                    placeholder="Título del archivo *"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Descripción (opcional)
                    </label>
                    <RichTextEditor
                      value={uploadDescription}
                      onChange={setUploadDescription}
                      placeholder="Describe el recurso o evento..."
                      minHeightClassName="min-h-[120px]"
                    />
                    <div className="flex justify-end mt-2 text-xs">
                      <span
                        className={
                          getPlainTextLength(uploadDescription) > MAX_MEDIA_DESCRIPTION_LENGTH
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }
                      >
                        {getPlainTextLength(uploadDescription)}/{MAX_MEDIA_DESCRIPTION_LENGTH}
                      </span>
                    </div>
                  </div>
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
                    disabled={
                      uploading ||
                      (uploadMode === 'file'
                        ? !uploadFile
                        : !uploadLinkUrl.trim())
                    }
                    className="btn-fire h-12 w-full text-[15px]"
                  >
                    {uploading
                      ? uploadMode === 'file'
                        ? 'Subiendo…'
                        : 'Guardando enlace…'
                      : uploadMode === 'file'
                        ? 'Subir Archivo'
                        : 'Guardar Enlace'}
                  </button>
                </div>
              </div>
            </div>

            {/* Gallery */}
            <div className="rounded-[26px] border border-sand-200 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-ink-900">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <h2 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white mr-2">
                  Archivos guardados
                </h2>
                <button
                  onClick={() => setMediaFilter('all')}
                  className={`px-3 py-1 text-sm rounded-full transition ${mediaFilter === 'all' ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950' : 'bg-sand-50 text-cocoa-600 dark:bg-white/5 dark:text-white/70'}`}
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
                      className={`px-3 py-1 text-sm rounded-full transition ${mediaFilter === c.value ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950' : 'bg-sand-50 text-cocoa-600 dark:bg-white/5 dark:text-white/70'}`}
                    >
                      {c.label} ({count})
                    </button>
                  );
                })}
              </div>

              {filteredMedia.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No hay archivos en esta categoría.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredMedia.map(img => (
                    <div
                      key={img._id}
                      className="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                      <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                        {img.mediaType === 'image' && (
                          <img
                            src={img.mediaUrl}
                            alt={img.altText || img.title}
                            className="w-full h-32 object-cover"
                          />
                        )}
                        {img.mediaType === 'video' &&
                          (isYouTubeUrl(img.mediaUrl) ||
                          isVimeoUrl(img.mediaUrl) ? (
                            blockedVideos[img._id] ? (
                              <div className="w-full h-32 bg-black/90 flex items-center justify-center text-center px-2">
                                <div>
                                  <p className="text-white text-xs font-semibold">Video bloqueado</p>
                                  <a
                                    href={img.mediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 text-[11px] font-medium text-brand-amber underline"
                                  >
                                    Abrir enlace
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <iframe
                                src={toEmbeddableUrl(img.mediaUrl)}
                                title={img.title}
                                className="w-full h-32"
                                loading="lazy"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                onError={() =>
                                  setBlockedVideos(prev => ({ ...prev, [img._id]: true }))
                                }
                              />
                            )
                          ) : (
                            <video
                              src={img.mediaUrl}
                              className="w-full h-32 object-cover"
                              muted
                              preload="metadata"
                            />
                          ))}
                        {img.mediaType === 'document' && (
                          <div className="text-center text-red-600 dark:text-red-300">
                            <svg
                              className="w-10 h-10 mx-auto"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8l-5-6z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M14 2v6h6"
                              />
                            </svg>
                            <p className="text-xs font-semibold mt-1">PDF</p>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                          {img.title}
                        </p>
                        <p className="text-xs text-gray-400 capitalize truncate">
                          {img.category} · {img.mediaType}
                        </p>
                        {img.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                            {img.description}
                          </p>
                        )}
                        <a
                          href={img.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-deep dark:text-brand-amber font-medium hover:underline mt-1 inline-flex"
                        >
                          Abrir
                        </a>
                        <button
                          type="button"
                          onClick={() => openEditMediaModal(img)}
                          className="text-xs text-amber-700 dark:text-amber-300 font-medium hover:underline mt-1 ml-3 inline-flex"
                        >
                          Editar
                        </button>
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

            {editingMedia && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C0609]/75 p-4 backdrop-blur-sm"
                onClick={() => setEditingMedia(null)}
              >
                <div
                  className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl dark:bg-ink-900"
                  onClick={e => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Editar archivo guardado"
                >
                  <BrandModalHeader
                    title="Editar archivo guardado"
                    onClose={() => setEditingMedia(null)}
                    compact
                  />

                  <div className="p-6 space-y-4">
                    <input
                      className={fieldClass}
                      placeholder="Título del recurso *"
                      value={editingMediaTitle}
                      onChange={e => setEditingMediaTitle(e.target.value)}
                    />

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Descripción
                      </label>
                      <RichTextEditor
                        value={editingMediaDescription}
                        onChange={setEditingMediaDescription}
                        placeholder="Describe el recurso..."
                        minHeightClassName="min-h-[140px]"
                      />
                      <div className="flex justify-end mt-2 text-xs">
                        <span
                          className={
                            getPlainTextLength(editingMediaDescription) > MAX_MEDIA_DESCRIPTION_LENGTH
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }
                        >
                          {getPlainTextLength(editingMediaDescription)}/{MAX_MEDIA_DESCRIPTION_LENGTH}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Sección
                        </label>
                        <select
                          className={fieldClass}
                          value={editingMediaCategory}
                          onChange={e => setEditingMediaCategory(e.target.value as MediaCategory)}
                        >
                          {MEDIA_CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {editingMedia?.mediaType}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingMedia(null)}
                      className="h-11 rounded-full border-[1.5px] border-sand-300 bg-white px-5 text-sm font-semibold text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-transparent dark:text-white/80"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMediaEdit}
                      disabled={savingMediaEdit}
                      className="btn-fire h-11 px-6 text-sm"
                    >
                      {savingMediaEdit ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
