// Punto de entrada histórico de la capa de API del frontend. El wrapper HTTP
// de bajo nivel vive en './httpClient' y los helpers de cada dominio en sus
// propios archivos (youngAccountApi, attendanceApi, registrationApi); todo
// se re-exporta aquí para no romper el resto del código, que los importa
// desde 'services/api'. Código nuevo puede importar directamente del
// archivo de dominio correspondiente.
export * from './httpClient';
export { default } from './httpClient';
export * from './youngAccountApi';
export * from './attendanceApi';
export * from './registrationApi';
