import { missingProfileFields, resolveContact } from './identity';
import { bowlingForm } from './__fixtures__/bowlingForm';

const config = bowlingForm().contactFields;

describe('resolveContact', () => {
  it('con perfil completo no pide nada', () => {
    const result = resolveContact(
      config,
      { fullName: 'Javier Montaño', phone: '3001234567', email: 'j@x.com', group: 2 },
      {}
    );
    expect(result.errors).toEqual({});
    expect(result.missing).toEqual([]);
    expect(result.fromProfile).toEqual(['fullName', 'phone', 'email']);
    // "group" está oculto en este formulario: no se copia
    expect(result.snapshot).toEqual({ fullName: 'Javier Montaño', phone: '3001234567', email: 'j@x.com' });
  });

  it('si el perfil no tiene teléfono lo toma de lo que escribió', () => {
    const result = resolveContact(config, { fullName: 'Javier Montaño' }, { phone: ' 300 123 4567 ' });
    expect(result.errors).toEqual({});
    expect(result.snapshot.phone).toBe('300 123 4567');
    expect(result.fromProfile).toEqual(['fullName']);
  });

  it('si falta un obligatorio lo reporta', () => {
    const result = resolveContact(config, { fullName: 'Javier Montaño' }, {});
    expect(result.missing).toEqual(['phone']);
    expect(result.errors.phone).toMatch(/obligatorio/);
  });

  it('el perfil gana: no se puede reemplazar un dato guardado', () => {
    const result = resolveContact(
      config,
      { fullName: 'Javier Montaño', phone: '3001234567' },
      { fullName: 'Otra Persona', phone: '3119999999' }
    );
    expect(result.snapshot.fullName).toBe('Javier Montaño');
    expect(result.snapshot.phone).toBe('3001234567');
  });

  it('un invitado debe escribir todo y se valida', () => {
    const result = resolveContact(config, null, { fullName: 'A', phone: 'abc', email: 'mal' });
    expect(Object.keys(result.errors).sort()).toEqual(['email', 'fullName', 'phone']);
    expect(result.snapshot).toEqual({});
  });

  it('normaliza el correo y colapsa espacios del nombre', () => {
    const result = resolveContact(config, null, {
      fullName: '  Ana   María  ',
      phone: '+573001234567',
      email: 'ANA@Mail.COM',
    });
    expect(result.errors).toEqual({});
    expect(result.snapshot).toEqual({ fullName: 'Ana María', phone: '+573001234567', email: 'ana@mail.com' });
  });
});

describe('missingProfileFields', () => {
  it('lista solo obligatorios vacíos', () => {
    expect(missingProfileFields(config, { fullName: 'X' })).toEqual(['phone']);
    expect(missingProfileFields(config, { fullName: 'X', phone: '3001234567' })).toEqual([]);
  });
});
