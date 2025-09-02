import YAML from 'yamljs';
import path from 'path';

// Cargar la especificación OpenAPI desde el archivo YAML
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/oas3.yaml'));

export const specs = swaggerDocument;
