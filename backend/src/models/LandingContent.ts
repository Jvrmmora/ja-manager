import mongoose, { Schema, Document } from 'mongoose';

export interface ILandingContent extends Document {
  // Hero section
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroVerseText: string;
  heroVerseCitation: string;
  heroImage?: string;

  // About section
  aboutTitle: string;
  aboutBody: string;

  // Mission & Vision
  missionTitle: string;
  missionText: string;
  visionTitle: string;
  visionText: string;

  // Values
  valuesTitle: string;
  values: {
    title: string;
    description: string;
  }[];

  // Sections visibility
  sectionsVisible: {
    events: boolean;
    gallery: boolean;
    resources: boolean;
    testimonials: boolean;
    social: boolean;
  };

  // Social media links
  social: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    whatsapp?: string;
  };

  // Location
  addressLabel: string;
  addressLine: string;
  mapEmbedUrl: string;
  mapsDirectionsUrl: string;
  latitude?: number;
  longitude?: number;
  locationNote: string;

  // Events section
  eventsTitle: string;
  eventsBody: string;

  // Gallery section
  galleryTitle: string;
  galleryBody: string;

  // Resources section
  resourcesTitle: string;

  // Testimonials section
  testimonialsTitle: string;
  testimonialsBody: string;

  // CTA section
  ctaTitle: string;
  ctaBody: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;

  // SEO
  seoTitle: string;
  seoDescription: string;

  // Metadata
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const landingContentSchema = new Schema<ILandingContent>(
  {
    // Hero section
    heroTitle: {
      type: String,
      required: [true, 'Hero title es requerido'],
      default: 'Jóvenes Adventistas Modelia Bogotá',
    },
    heroSubtitle: {
      type: String,
      required: [true, 'Hero subtitle es requerido'],
      default: 'Encendidos por Cristo',
    },
    heroDescription: {
      type: String,
      required: [true, 'Hero description es requerido'],
      default:
        'Un espacio para crecer en la fe, construir amistades con propósito y vivir el llamado de Jesús en comunidad.',
    },
    heroVerseText: {
      type: String,
      default:
        'Ninguno tenga en poco tu juventud, sino sé ejemplo de los creyentes en palabra, conducta, amor, espíritu, fe y pureza.',
    },
    heroVerseCitation: {
      type: String,
      default: '1 Timoteo 4:12',
    },
    heroImage: {
      type: String,
      default: null,
    },

    // About section
    aboutTitle: {
      type: String,
      default: '¿Quiénes somos?',
    },
    aboutBody: {
      type: String,
      default:
        'Somos Jóvenes Modelia — una comunidad de más de 50 jóvenes de todas las edades, unidos por una misma llama: la fe en Cristo y el amor genuino entre nosotros.Somos parte de la Iglesia Adventista del Séptimo Día en Modelia, Bogotá, y nos encontramos cada semana para vivir algo más que una reunión religiosa: vivimos una experiencia real, cercana y transformadora.',
    },

    // Mission & Vision
    missionTitle: {
      type: String,
      default: 'Misión',
    },
    missionText: {
      type: String,
      default: 'Guiar a cada joven a una relación auténtica con Jesús.',
    },
    visionTitle: {
      type: String,
      default: 'Visión',
    },
    visionText: {
      type: String,
      default:
        'Ver una generación de jóvenes encendidos por Cristo, arraigados en la Biblia y comprometidos con compartir esperanza.',
    },

    // Values
    valuesTitle: {
      type: String,
      default: 'Nuestros Valores',
    },
    values: [
      {
        title: String,
        description: String,
      },
    ],

    // Sections visibility
    sectionsVisible: {
      events: { type: Boolean, default: true },
      gallery: { type: Boolean, default: true },
      resources: { type: Boolean, default: true },
      testimonials: { type: Boolean, default: true },
      social: { type: Boolean, default: true },
    },

    // Social media
    social: {
      instagram: {
        type: String,
        default: 'https://www.instagram.com/iglesiamodelia/',
      },
      facebook: {
        type: String,
        default:
          'https://www.facebook.com/p/Iglesia-Adventista-Modelia-100068969414436/',
      },
      youtube: {
        type: String,
        default: 'https://www.youtube.com/@ModeliaAdventista',
      },
      whatsapp: {
        type: String,
        default: null,
      },
    },

    // Location
    addressLabel: {
      type: String,
      default: 'Iglesia Adventista Modelia',
    },
    addressLine: {
      type: String,
      default: 'Cra. 72C #23d-44, Bogotá',
    },
    mapEmbedUrl: {
      type: String,
      default: '',
    },
    mapsDirectionsUrl: {
      type: String,
      default: 'https://maps.app.goo.gl/p32k5CdjtmrwUGcXA',
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    locationNote: {
      type: String,
      default:
        'Si vienes por primera vez, escríbenos por WhatsApp y con gusto te orientamos.',
    },

    // Events section
    eventsTitle: {
      type: String,
      default: 'Próximos encuentros',
    },
    eventsBody: {
      type: String,
      default:
        'Muy pronto podrás ver aquí retiros, campamentos, sábados especiales y actividades destacadas.',
    },

    // Gallery section
    galleryTitle: {
      type: String,
      default: 'Así vivimos nuestra comunidad',
    },
    galleryBody: {
      type: String,
      default:
        'Cada encuentro es una oportunidad para adorar, aprender, servir y crear recuerdos con propósito.',
    },

    // Resources section
    resourcesTitle: {
      type: String,
      default: 'Recursos para crecer',
    },

    // Testimonials section
    testimonialsTitle: {
      type: String,
      default: 'Historias que inspiran',
    },
    testimonialsBody: {
      type: String,
      default:
        'Muy pronto compartiremos testimonios de jóvenes que han encontrado amistad, propósito y crecimiento espiritual.',
    },

    // CTA section
    ctaTitle: {
      type: String,
      default: 'Hay un lugar para ti',
    },
    ctaBody: {
      type: String,
      default:
        'Si estás buscando una comunidad para crecer en la fe, hacer amigos y servir a Dios con propósito, queremos conocerte.',
    },
    ctaPrimaryLabel: {
      type: String,
      default: 'Hablar por WhatsApp',
    },
    ctaSecondaryLabel: {
      type: String,
      default: 'Completar registro',
    },

    // SEO
    seoTitle: {
      type: String,
      default: 'Jóvenes Adventistas Modelia Bogotá | Encendidos por Cristo',
    },
    seoDescription: {
      type: String,
      default:
        'Comunidad juvenil adventista en Bogotá. Conoce nuestras reuniones, actividades, recursos, galería y cómo visitarnos.',
    },

    // Metadata
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'landing_content',
  }
);

export default mongoose.model<ILandingContent>(
  'LandingContent',
  landingContentSchema
);
