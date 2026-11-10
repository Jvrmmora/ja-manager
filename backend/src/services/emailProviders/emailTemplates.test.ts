import {
  buildSubject,
  buildHtml,
  buildText,
  getInitials,
  avatarPhotoUrl,
} from './emailTemplates';
import env from '../../config/env';

describe('emailTemplates: tarjeta de cumpleaños', () => {
  const params = {
    toEmail: 'vale@example.com',
    toName: '<Vale> Pérez',
    message: 'ignorado',
    type: 'birthday' as const,
    placa: '@MODVALE001',
    birthdayPoints: 100,
    birthdayCtaUrl: `${env.frontendUrl}/login?placa=%40MODVALE001`,
  };

  it('el asunto incluye el nombre y los puntos', () => {
    expect(buildSubject(params)).toBe(
      '¡Feliz cumpleaños, <Vale>! Tienes 100 puntos de regalo'
    );
  });

  it('el HTML incluye nombre escapado, puntos, placa, CTA y logo estable', () => {
    const html = buildHtml(params);
    expect(html).toContain('&lt;Vale&gt;');
    expect(html).not.toContain('<Vale>');
    expect(html).toContain('100 puntos de regalo');
    expect(html).toContain('Ya están en tu cuenta');
    expect(html).toContain('@MODVALE001');
    expect(html).toContain(`href="${env.frontendUrl}/login?placa=%40MODVALE001"`);
    expect(html).toContain(`${env.frontendUrl}/icon-512.png`);
    expect(html).toContain(`${env.frontendUrl}/email/birthday-header.jpg`);
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('yellow-river');
  });

  it('saluda solo con el primer nombre', () => {
    const html = buildHtml({ ...params, toName: 'Valentina Pérez' });
    expect(html).toContain('>Valentina</p>');
    expect(html).not.toContain('>Valentina Pérez</p>');
  });

  it('sin foto muestra las iniciales de nombre y apellido', () => {
    const html = buildHtml({ ...params, toName: 'Valentina Pérez' });
    expect(html).toContain('>VP</td>');
    expect(html).not.toContain('<img src="https://res.cloudinary.com');
  });

  it('con foto la muestra en el círculo y no pone iniciales', () => {
    const html = buildHtml({
      ...params,
      toName: 'Valentina Pérez',
      profileImage: 'https://example.com/fotos/vale.jpg',
    });
    expect(html).toContain('src="https://example.com/fotos/vale.jpg"');
    expect(html).toContain('width="106" height="106"');
    expect(html).not.toContain('>VP</td>');
  });

  it('escapa la URL de la foto y descarta URLs que no son http(s)', () => {
    const evil = buildHtml({
      ...params,
      profileImage: 'https://example.com/a.jpg"><script>alert(1)</script>',
    });
    expect(evil).not.toContain('<script>');
    const js = buildHtml({ ...params, toName: 'Ana Gómez', profileImage: 'javascript:alert(1)' });
    expect(js).not.toContain('javascript:');
    expect(js).toContain('>AG</td>');
  });

  it('sin placa ni CTA explícita apunta a /login y omite la nota de placa', () => {
    const html = buildHtml({ ...params, placa: undefined, birthdayCtaUrl: undefined });
    expect(html).toContain(`href="${env.frontendUrl}/login"`);
    expect(html).not.toContain('Entra con tu placa');
  });

  it('el texto plano lleva puntos, enlace y placa', () => {
    const text = buildText(params);
    expect(text).toContain('Tienes 100 puntos de regalo');
    expect(text).toContain(`${env.frontendUrl}/login?placa=%40MODVALE001`);
    expect(text).toContain('@MODVALE001');
  });

  it('usa los puntos de la temporada si vienen distintos de 100', () => {
    expect(buildHtml({ ...params, birthdayPoints: 150 })).toContain('150 puntos de regalo');
  });
});

describe('emailTemplates: plantillas heredadas', () => {
  it('el correo de bienvenida usa FRONTEND_URL y no la URL vieja', () => {
    const html = buildHtml({
      toEmail: 'a@b.com',
      toName: 'Ana',
      message: 'x',
      type: 'welcome',
      placa: '@MODANAX001',
    });
    expect(html).toContain(`href="${env.frontendUrl}"`);
    expect(html).toContain(`${env.frontendUrl}/icon-512.png`);
    expect(html).not.toContain('yellow-river');
  });

  it('cada tipo genera asunto, html y texto no vacíos', () => {
    const types = [
      'registration_request',
      'approval',
      'rejection',
      'birthday',
      'welcome',
      'new_user_notification',
    ] as const;
    for (const type of types) {
      const p = { toEmail: 'a@b.com', toName: 'Ana', message: 'msg', type };
      expect(buildSubject(p).length).toBeGreaterThan(0);
      expect(buildHtml(p)).toContain('<html');
      expect(buildText(p).length).toBeGreaterThan(0);
    }
  });
});

describe('getInitials', () => {
  it.each([
    ['Valentina Pérez', 'VP'],
    ['Juan Carlos Rodríguez Gómez', 'JG'],
    ['  maría   lópez ', 'ML'],
    ['Valentina', 'V'],
    ['Álvaro Ñúñez', 'ÁÑ'],
    ['', ''],
  ])('%s -> %s', (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});

describe('avatarPhotoUrl', () => {
  it('pide a Cloudinary un recorte cuadrado a la cara en JPG', () => {
    expect(
      avatarPhotoUrl('https://res.cloudinary.com/demo/image/upload/v123/youth/vale.png')
    ).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_240,h_240,f_jpg,q_auto/v123/youth/vale.png'
    );
  });

  it('deja intacta una URL de otro host', () => {
    expect(avatarPhotoUrl('https://example.com/vale.jpg')).toBe('https://example.com/vale.jpg');
  });

  it('devuelve null si no hay foto o no es http(s)', () => {
    expect(avatarPhotoUrl(null)).toBeNull();
    expect(avatarPhotoUrl('')).toBeNull();
    expect(avatarPhotoUrl('data:image/png;base64,AAAA')).toBeNull();
  });
});
