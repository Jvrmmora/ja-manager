import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { apiRequest } from '../services/api';
import PageLoader from '../components/PageLoader';
import Navbar from '../components/landing/Navbar.tsx';
import HeroSection from '../components/landing/HeroSection.tsx';
import AboutSection from '../components/landing/AboutSection.tsx';
import MissionVisionSection from '../components/landing/MissionVisionSection.tsx';
import ValuesSection from '../components/landing/ValuesSection.tsx';
import MeetingsSection from '../components/landing/MeetingsSection.tsx';
import EventsSection from '../components/landing/EventsSection';
import GallerySection from '../components/landing/GallerySection.tsx';
import ResourcesSection from '../components/landing/ResourcesSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import LocationSection from '../components/landing/LocationSection.tsx';
import SocialLinksSection from '../components/landing/SocialLinksSection.tsx';
import CTASection from '../components/landing/CTASection.tsx';
import Footer from '../components/landing/Footer.tsx';

interface LandingContent {
  _id: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroVerse?: string;
  heroVerseText?: string;
  heroVerseCitation?: string;
  heroImage?: string;
  aboutTitle?: string;
  aboutBody: string;
  missionTitle?: string;
  missionText: string;
  visionTitle?: string;
  visionText: string;
  valuesArray?: {
    title: string;
    description: string;
  }[];
  values?: {
    title: string;
    description: string;
  }[];
  sectionsVisible?: Partial<{
    hero: boolean;
    about: boolean;
    mission: boolean;
    values: boolean;
    meetings: boolean;
    events: boolean;
    gallery: boolean;
    resources: boolean;
    testimonials: boolean;
    location: boolean;
    social: boolean;
  }>;
  social: {
    instagram: string;
    facebook: string;
    youtube: string;
    whatsapp: string;
  };
  addressLabel: string;
  mapEmbedUrl: string;
  mapsDirectionsUrl: string;
  eventsTitle?: string;
  eventsBody?: string;
  galleryTitle?: string;
  galleryBody?: string;
  resourcesTitle?: string;
  resourcesBody?: string;
  testimonialsTitle?: string;
  testimonialsBody?: string;
  ctaTitle?: string;
  ctaBody?: string;
  ctaPrimaryLabel?: string;
  ctaSecondaryLabel?: string;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
}

interface LandingMeeting {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  schedule: {
    day: string;
    time: string;
  };
  modality: 'virtual' | 'presencial' | 'híbrido';
  meetingLink?: string;
  order: number;
  isPublished: boolean;
}

interface LandingMedia {
  _id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  category: 'hero' | 'gallery' | 'testimonial' | 'event' | 'resource';
  altText: string;
  order: number;
  isPublished: boolean;
}

interface LandingData {
  content: LandingContent;
  meetings: LandingMeeting[];
  media: {
    hero: LandingMedia[];
    gallery: LandingMedia[];
    testimonial: LandingMedia[];
    event: LandingMedia[];
    resource: LandingMedia[];
  };
}

export default function LandingPage() {
  const { theme } = useTheme();
  const [landingData, setLandingData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLandingContent();
  }, []);

  // Update document title and meta tags
  useEffect(() => {
    if (landingData?.content) {
      document.title = landingData.content.seoTitle;
      const metaDescription = document.querySelector(
        'meta[name="description"]'
      );
      if (metaDescription) {
        metaDescription.setAttribute(
          'content',
          landingData.content.seoDescription
        );
      }
    }
  }, [landingData?.content]);

  const fetchLandingContent = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('landing', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setLandingData(data.data);
          setError(null);
        } else {
          throw new Error('Failed to fetch landing content');
        }
      } else {
        throw new Error('Failed to fetch landing content');
      }
    } catch (err) {
      console.error('Error fetching landing content:', err);
      setError('Error cargando contenido de la página');
      // Set default/empty data to allow rendering
      setLandingData({
        content: {
          _id: '',
          heroTitle: 'Jóvenes Adventistas Modelia Bogotá',
          heroSubtitle: 'Encendidos por Cristo',
          heroDescription:
            'Un movimiento de jóvenes apasionados por servir a Dios y transformar el mundo',
          heroVerse:
            'Que nadie te menosprecie por tu juventud, sino que sé un ejemplo para los creyentes - 1 Timoteo 4:12',
          aboutBody:
            'Somos un grupo dinámico de jóvenes comprometidos con nuestra fe y comunidad',
          missionText: 'Impactar al mundo con el mensaje del evangelio',
          visionText: 'Formar líderes espirituales que transformen la sociedad',
          valuesArray: [],
          sectionsVisible: {
            hero: true,
            about: true,
            mission: true,
            values: true,
            meetings: true,
            events: true,
            gallery: true,
            resources: true,
            testimonials: true,
            location: true,
            social: true,
          },
          social: {
            instagram: '#',
            facebook: '#',
            youtube: '#',
            whatsapp: '#',
          },
          addressLabel: 'Cra. 72C #23d-44, Bogotá',
          mapEmbedUrl: '',
          mapsDirectionsUrl: '',
          eventsTitle: 'Próximos encuentros',
          eventsBody: '',
          galleryTitle: 'Galería',
          galleryBody: '',
          resourcesTitle: 'Recursos para crecer',
          resourcesBody: '',
          testimonialsTitle: 'Testimonios',
          testimonialsBody: '',
          seoTitle:
            'Jóvenes Adventistas Modelia Bogotá | Encendidos por Cristo',
          seoDescription:
            'Un movimiento de jóvenes apasionados por servir a Dios y transformar el mundo',
          isPublished: true,
        },
        meetings: [],
        media: {
          hero: [],
          gallery: [],
          testimonial: [],
          event: [],
          resource: [],
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!landingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {error || 'Error loading content'}
          </p>
          <button
            onClick={fetchLandingContent}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { content, meetings, media } = landingData;
  const values = content.valuesArray || content.values || [];

  const isSectionVisible = (
    section:
      | 'hero'
      | 'about'
      | 'mission'
      | 'values'
      | 'meetings'
      | 'events'
      | 'gallery'
      | 'resources'
      | 'testimonials'
      | 'location'
      | 'social'
  ) => {
    const visibility = content.sectionsVisible?.[section];
    // Si el flag no existe en DB, mostramos la sección por defecto.
    return visibility !== false;
  };

  const heroMedia =
    media.hero[0] ||
    (content.heroImage
      ? {
          _id: 'content-hero-image',
          title: content.heroTitle,
          mediaUrl: content.heroImage,
          mediaType: 'image' as const,
          category: 'hero' as const,
          altText: content.heroTitle,
          order: 0,
          isPublished: true,
        }
      : undefined);

  const normalizedContent: LandingContent = {
    ...content,
    heroVerse:
      content.heroVerse ||
      [content.heroVerseText, content.heroVerseCitation]
        .filter(Boolean)
        .join(' - '),
  };

  const ctaProps = {
    ...(content.ctaTitle ? { title: content.ctaTitle } : {}),
    ...(content.ctaBody ? { body: content.ctaBody } : {}),
    ...(content.ctaPrimaryLabel
      ? { primaryLabel: content.ctaPrimaryLabel }
      : {}),
    ...(content.ctaSecondaryLabel
      ? { secondaryLabel: content.ctaSecondaryLabel }
      : {}),
    ...(content.social?.whatsapp
      ? { whatsappUrl: content.social.whatsapp }
      : {}),
  };

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        {/* Navbar */}
        <Navbar />

        {/* Hero Section */}
        {isSectionVisible('hero') && (
          <HeroSection content={normalizedContent} heroMedia={heroMedia} />
        )}

        {/* About Section */}
        {isSectionVisible('about') && <AboutSection content={content} />}

        {/* Mission & Vision Section */}
        {isSectionVisible('mission') && (
          <MissionVisionSection content={content} />
        )}

        {/* Values Section */}
        {isSectionVisible('values') && <ValuesSection values={values} />}

        {/* Weekly Meetings Section */}
        {isSectionVisible('meetings') && (
          <MeetingsSection meetings={meetings} />
        )}

        {/* Events Section */}
        {isSectionVisible('events') && (
          <EventsSection
            {...(content.eventsTitle ? { title: content.eventsTitle } : {})}
            {...(content.eventsBody ? { body: content.eventsBody } : {})}
            eventMedia={media.event}
          />
        )}

        {/* Gallery Section */}
        {isSectionVisible('gallery') && (
          <GallerySection
            {...(content.galleryTitle ? { title: content.galleryTitle } : {})}
            {...(content.galleryBody ? { body: content.galleryBody } : {})}
            galleryMedia={media.gallery}
          />
        )}

        {/* Resources Section */}
        {isSectionVisible('resources') && (
          <ResourcesSection
            {...(content.resourcesTitle
              ? { title: content.resourcesTitle }
              : {})}
            {...(content.resourcesBody ? { body: content.resourcesBody } : {})}
            resourcesMedia={media.resource}
          />
        )}

        {/* Testimonials Section */}
        {isSectionVisible('testimonials') && (
          <TestimonialsSection
            {...(content.testimonialsTitle
              ? { title: content.testimonialsTitle }
              : {})}
            {...(content.testimonialsBody
              ? { body: content.testimonialsBody }
              : {})}
            testimonialMedia={media.testimonial}
          />
        )}

        {/* Location Section */}
        {isSectionVisible('location') && <LocationSection content={content} />}

        {/* Social Links Section */}
        {isSectionVisible('social') && (
          <SocialLinksSection social={content.social} />
        )}

        {/* CTA Section */}
        <CTASection {...ctaProps} />

        {/* Footer */}
        <Footer addressLabel={content.addressLabel} social={content.social} />
      </div>
    </div>
  );
}
