jest.mock('../models/LandingContent');
jest.mock('../models/LandingMedia');
jest.mock('../models/LandingMeetings');
jest.mock('../models/LandingVisitMetric');
jest.mock('../models/LandingVisitSummary');
jest.mock('../config/cloudinary', () => ({
  uploadLandingMediaToCloudinary: jest.fn().mockResolvedValue('https://cloudinary/x.jpg'),
  deleteLandingMediaFromCloudinary: jest.fn().mockResolvedValue(undefined),
  extractPublicId: jest.fn(() => 'public-id'),
  landingPublicIdFromUrl: jest.fn(() => 'public-id'),
}));

import LandingContent from '../models/LandingContent';
import LandingMedia from '../models/LandingMedia';
import LandingMeeting from '../models/LandingMeetings';
import LandingVisitMetric from '../models/LandingVisitMetric';
import LandingVisitSummary from '../models/LandingVisitSummary';
import {
  createMeeting,
  updateMeeting,
  deleteMedia,
  updateMedia,
  recordLandingVisit,
} from './landingService';

const mockedContent = LandingContent as jest.Mocked<typeof LandingContent>;
const mockedMedia = LandingMedia as jest.Mocked<typeof LandingMedia>;
const mockedMeeting = LandingMeeting as jest.Mocked<typeof LandingMeeting>;
const mockedVisitMetric = LandingVisitMetric as jest.Mocked<typeof LandingVisitMetric>;
const mockedVisitSummary = LandingVisitSummary as jest.Mocked<typeof LandingVisitSummary>;

describe('landingService.createMeeting', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exige los campos requeridos', async () => {
    await expect(createMeeting({ title: 'Solo título' })).rejects.toThrow(
      'Faltan campos requeridos'
    );
  });

  it('crea la reunión con los datos dados', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    (mockedMeeting as any).mockImplementation((data: any) => ({ ...data, save }));

    const result = await createMeeting({
      title: 'Reunión',
      subtitle: 'Sub',
      description: 'Desc',
      schedule: 'Sábados 9am',
      modality: 'presencial',
    });

    expect(save).toHaveBeenCalled();
    expect(result.isPublished).toBe(true);
  });
});

describe('landingService.updateMeeting', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundError si la reunión no existe', async () => {
    mockedMeeting.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    } as any);
    mockedMeeting.findByIdAndUpdate.mockResolvedValue(null);

    await expect(updateMeeting('id1', { title: 'x' })).rejects.toThrow(
      'Reunión no encontrada'
    );
  });
});

describe('landingService.updateMedia', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sincroniza heroImage cuando el media pasa a categoría hero', async () => {
    mockedMedia.findById.mockResolvedValue({
      category: 'gallery',
      mediaUrl: 'https://old.jpg',
    } as any);
    mockedMedia.findByIdAndUpdate.mockResolvedValue({
      category: 'hero',
      mediaUrl: 'https://new-hero.jpg',
    } as any);
    mockedContent.findOneAndUpdate.mockResolvedValue({} as any);

    await updateMedia('id1', { category: 'hero' });

    expect(mockedContent.findOneAndUpdate).toHaveBeenCalledWith(
      {},
      { heroImage: 'https://new-hero.jpg' },
      { new: true }
    );
  });

  it('limpia heroImage cuando el media deja de ser hero', async () => {
    mockedMedia.findById.mockResolvedValue({
      category: 'hero',
      mediaUrl: 'https://old-hero.jpg',
    } as any);
    mockedMedia.findByIdAndUpdate.mockResolvedValue({
      category: 'gallery',
      mediaUrl: 'https://old-hero.jpg',
    } as any);
    const landingSave = jest.fn().mockResolvedValue(undefined);
    mockedContent.findOne.mockResolvedValue({
      heroImage: 'https://old-hero.jpg',
      save: landingSave,
    } as any);

    await updateMedia('id1', { category: 'gallery' });

    expect(landingSave).toHaveBeenCalled();
  });
});

describe('landingService.deleteMedia', () => {
  beforeEach(() => jest.clearAllMocks());

  it('conserva el archivo en Cloudinary si sigue referenciado en otra parte', async () => {
    const deleteOne = jest.fn().mockResolvedValue(undefined);
    mockedMedia.findById.mockResolvedValue({
      _id: 'm1',
      mediaUrl: 'https://cloudinary/x.jpg',
      deleteOne,
    } as any);
    mockedMeeting.exists.mockResolvedValue({ _id: 'meet1' } as any);
    mockedContent.exists.mockResolvedValue(null as any);
    (mockedMedia as any).exists = jest.fn().mockResolvedValue(null);
    mockedContent.findOne.mockResolvedValue(null);

    const result = await deleteMedia('m1');

    expect(result.stillReferenced).toBe(true);
    expect(deleteOne).toHaveBeenCalled();
  });

  it('lanza NotFoundError si el media no existe', async () => {
    mockedMedia.findById.mockResolvedValue(null);

    await expect(deleteMedia('missing')).rejects.toThrow('Media no encontrado');
  });
});

describe('landingService.recordLandingVisit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('incrementa el contador único cuando el visitante es nuevo', async () => {
    mockedVisitMetric.updateOne
      .mockResolvedValueOnce({ upsertedCount: 1 } as any)
      .mockResolvedValueOnce({} as any);
    mockedVisitSummary.findOneAndUpdate.mockResolvedValue({
      uniqueVisitorsCount: 5,
    } as any);

    const result = await recordLandingVisit({
      year: 2026,
      visitorHash: 'hash1',
      ipHash: 'iphash1',
      now: new Date(),
    });

    expect(result.isNewVisitor).toBe(true);
    expect(result.uniqueVisitorsCount).toBe(5);
    expect(result.visitorNumber).toBe(5);
  });

  it('no incrementa el contador para un visitante repetido', async () => {
    mockedVisitMetric.updateOne.mockResolvedValue({ upsertedCount: 0 } as any);
    mockedVisitMetric.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ visitorNumber: 3 }),
    } as any);
    mockedVisitSummary.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ uniqueVisitorsCount: 8 }),
    } as any);

    const result = await recordLandingVisit({
      year: 2026,
      visitorHash: 'hash1',
      ipHash: 'iphash1',
      now: new Date(),
    });

    expect(result.isNewVisitor).toBe(false);
    expect(result.visitorNumber).toBe(3);
    expect(result.uniqueVisitorsCount).toBe(8);
    expect(mockedVisitSummary.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
