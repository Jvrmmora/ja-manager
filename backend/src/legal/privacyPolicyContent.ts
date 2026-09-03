/**
 * Contenido versionado de la Política de Tratamiento de Datos Personales.
 *
 * Se guarda como módulo TypeScript (y no como archivo suelto) para que el
 * compilador lo incluya en `dist/` y esté siempre disponible en producción sin
 * pasos extra de copia. Cada versión es inmutable: si el texto cambia, se crea
 * una nueva entrada con un número de versión nuevo y se actualiza
 * `CURRENT_POLICY_VERSION` en `config/privacyPolicy.ts`.
 *
 * El texto está redactado conforme a la Ley 1581 de 2012 y el Decreto 1377 de
 * 2013 (art. 13). Los datos entre corchetes [ ] deben ser completados/validados
 * por la iglesia antes de publicar.
 */

export const PRIVACY_POLICY_VERSIONS: Record<string, string> = {
  '1.0.0': `# Política de Privacidad y Autorización para el Tratamiento de Datos Personales

**Versión 1.0.0 — Vigente desde el 3 de septiembre de 2026**

Grupo de Jóvenes Adventistas de Modelia ("Jóvenes Modelia"), Bogotá D.C., Colombia.

Esta política se expide en cumplimiento de la Ley Estatutaria 1581 de 2012, el
Decreto 1377 de 2013 y demás normas que regulan la protección de datos
personales en Colombia (Habeas Data).

---

## 1. Responsable del tratamiento

- **Nombre:** [Iglesia Adventista del Séptimo Día — Congregación Modelia / Grupo de Jóvenes Modelia]
- **Domicilio:** Cra. 72C #23d-44, Bogotá D.C., Colombia
- **Correo electrónico para asuntos de datos personales:** minjuvenil.modelia@gmail.com
- **Teléfono de contacto:** +57 3019831236

Toda petición, consulta o reclamo relacionado con datos personales debe dirigirse
a los canales indicados en esta sección.

## 2. Datos personales que se recolectan

A través de la plataforma se recolectan y almacenan los siguientes datos:

- Nombres y apellidos.
- Fecha de nacimiento (o día y mes de nacimiento).
- Rango de edad.
- Correo electrónico.
- Número de teléfono.
- Género.
- Rol, cargo o liderazgo dentro de la iglesia.
- Fotografía de perfil (opcional).
- Identificador interno (placa) asignado por la plataforma.
- Datos de participación: registros de asistencia (escaneo de códigos QR),
  puntos, rachas y posiciones en tablas de clasificación.
- Datos técnicos: dirección IP, tipo de navegador y fecha/hora de ciertas
  acciones (por ejemplo, la aceptación de esta política), con fines de
  seguridad y de prueba del consentimiento.

## 3. Datos sensibles

La información sobre el rol, cargo o participación en actividades de la iglesia
puede revelar convicciones religiosas y, por lo tanto, tener el carácter de
**dato sensible** conforme al artículo 5 de la Ley 1581 de 2012.

El suministro de datos sensibles es **facultativo**. El titular no está obligado
a autorizar su tratamiento ni a responder preguntas relacionadas con ellos. Al
aceptar esta política y marcar la casilla de autorización, el titular autoriza de
manera **explícita** el tratamiento de estos datos para las finalidades aquí
descritas.

## 4. Finalidades del tratamiento

Los datos personales se tratan para las siguientes finalidades:

1. Gestionar la vinculación y participación del titular en el grupo de jóvenes.
2. Registrar y controlar la asistencia a reuniones y actividades.
3. Operar el sistema de puntos, rachas y reconocimientos (gamificación).
4. Comunicar información sobre reuniones, eventos y actividades.
5. Enviar felicitaciones y mensajes con ocasión de fechas especiales.
6. Generar estadísticas e indicadores internos de participación (de forma
   agregada siempre que sea posible).
7. Contactar al titular para atender solicitudes, peticiones o reclamos.
8. Cumplir obligaciones legales aplicables y atender requerimientos de
   autoridades.

Los datos no se comercializan ni se comparten con terceros para fines
publicitarios.

## 5. Tratamiento de datos de menores de edad

La plataforma puede ser utilizada por menores de edad vinculados al grupo de
jóvenes. El tratamiento de sus datos se realiza atendiendo al **interés superior
del menor** y limitándose a las finalidades de la sección 4.

El registro de un menor de edad requiere la autorización de su padre, madre o
representante legal. Al completar el registro o la aceptación de esta política en
nombre de un menor, la persona adulta declara ser su representante legal y
autoriza el tratamiento de los datos del menor en los términos aquí descritos.

## 6. Derechos del titular

Conforme al artículo 8 de la Ley 1581 de 2012, el titular tiene derecho a:

- Conocer, actualizar y rectificar sus datos personales.
- Solicitar prueba de la autorización otorgada.
- Ser informado sobre el uso que se ha dado a sus datos.
- Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por
  infracciones a la ley.
- Revocar la autorización y/o solicitar la supresión de sus datos, cuando no
  exista un deber legal o contractual que lo impida.
- Acceder de forma gratuita a sus datos personales.

## 7. Procedimiento para ejercer los derechos

El titular (o su representante) puede ejercer sus derechos enviando una solicitud
al correo indicado en la sección 1, incluyendo su nombre, identificación, la
descripción de los hechos y la petición concreta.

- **Consultas:** se atienden en un término máximo de diez (10) días hábiles,
  prorrogables por cinco (5) días hábiles más.
- **Reclamos:** se atienden en un término máximo de quince (15) días hábiles,
  prorrogables por ocho (8) días hábiles más.

## 8. Encargados del tratamiento y transferencias

Para operar la plataforma se utilizan proveedores de servicios tecnológicos que
actúan como **encargados del tratamiento** y que pueden almacenar información en
servidores ubicados fuera de Colombia:

- Alojamiento de la aplicación e infraestructura: Microsoft Azure.
- Almacenamiento de imágenes: Cloudinary.
- Envío de correos electrónicos transaccionales: Azure Communication Services.
- Analítica de uso del sitio: Google Analytics.

Estos proveedores tratan los datos únicamente siguiendo las instrucciones del
responsable y bajo obligaciones de confidencialidad y seguridad.

## 9. Medidas de seguridad

Se aplican medidas técnicas, humanas y administrativas razonables para proteger
la información y evitar su acceso no autorizado, pérdida, alteración o uso
indebido; entre ellas: cifrado de las comunicaciones (HTTPS), control de acceso
basado en roles, almacenamiento de contraseñas mediante funciones de hash,
minimización de datos y registros de auditoría del consentimiento.

Ningún sistema es completamente infalible; ante un incidente de seguridad
relevante se actuará conforme a la ley y se informará a los titulares y
autoridades cuando corresponda.

## 10. Vigencia de la política y período de conservación

Esta política rige a partir de la fecha indicada al inicio del documento.

Los datos personales se conservan mientras el titular mantenga su vinculación con
el grupo de jóvenes y, una vez terminada, durante el término necesario para
atender obligaciones legales o eventuales reclamaciones. Cumplido ese término,
los datos se suprimen o se anonimizan.

## 11. Cambios a esta política

Cualquier cambio sustancial se comunicará a través de la plataforma. Cuando el
cambio lo amerite, se solicitará nuevamente la aceptación del titular y se
asignará un nuevo número de versión a este documento.

## 12. Aceptación

Al marcar la casilla correspondiente, el titular declara que leyó y entendió esta
política y que **autoriza de manera libre, previa, expresa e informada** al
responsable para recolectar, almacenar, usar, circular y en general tratar sus
datos personales —incluidos los datos sensibles señalados en la sección 3— para
las finalidades descritas en la sección 4.
`,
};
