import { landingPublicIdFromUrl } from './cloudinary';

describe('landingPublicIdFromUrl', () => {
  it('extrae el public_id con carpeta, descartando versión y extensión', () => {
    expect(
      landingPublicIdFromUrl(
        'https://res.cloudinary.com/ddb6p7or3/image/upload/v1787965773/ja-manager/landing/meetings/abc123.jpg'
      )
    ).toBe('ja-manager/landing/meetings/abc123');
  });

  it('funciona sin segmento de versión', () => {
    expect(
      landingPublicIdFromUrl(
        'https://res.cloudinary.com/ddb6p7or3/image/upload/ja-manager/landing/gallery/foo.png'
      )
    ).toBe('ja-manager/landing/gallery/foo');
  });

  it('ignora query string', () => {
    expect(
      landingPublicIdFromUrl(
        'https://res.cloudinary.com/ddb6p7or3/image/upload/v1/ja-manager/landing/meetings/bar.webp?retry=1'
      )
    ).toBe('ja-manager/landing/meetings/bar');
  });

  it('devuelve null si la URL no tiene /upload/', () => {
    expect(landingPublicIdFromUrl('https://example.com/foto.jpg')).toBeNull();
  });
});
