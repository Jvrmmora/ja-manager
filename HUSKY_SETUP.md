# Configuración de Husky para ja-manager

## Descripción

Se ha implementado **Husky** junto con **lint-staged** para asegurar la calidad del código y la integridad del proyecto antes de realizar commits y pushes. Esta configuración garantiza que tanto el backend como el frontend compilen correctamente antes de enviar cualquier cambio al repositorio.

## Hooks Configurados

### Pre-commit Hook

**Archivo**: `.husky/pre-commit`

**Funciones**:

- Ejecuta validación rápida de lint en backend y frontend
- Ejecuta lint-staged para formatear archivos modificados automáticamente
- **Tiempo estimado**: 30-60 segundos

**Validaciones**:

- ✅ Lint del backend (TypeScript/JavaScript)
- ✅ Lint del frontend (React/TypeScript)
- ✅ Formateo automático con Prettier

### Pre-push Hook

**Archivo**: `.husky/pre-push`

**Funciones**:

- Ejecuta validación completa de build para ambos proyectos
- Verifica que la aplicación compile correctamente
- **Tiempo estimado**: 2-5 minutos

**Validaciones**:

- ✅ Instalación de dependencias (si es necesario)
- ✅ Lint completo del backend
- ✅ Build completo del backend
- ✅ Lint completo del frontend
- ✅ Build completo del frontend
- ✅ Limpieza automática de artifacts temporales

## Scripts Disponibles

### Scripts de Validación

```bash
# Validación completa (build + lint)
npm run validate

# Validación rápida (solo lint)
npm run validate:quick

# Lint completo de ambos proyectos
npm run lint

# Lint con auto-fix
npm run lint:fix
```

### Scripts por Proyecto

```bash
# Backend
npm run lint:backend
npm run lint:fix:backend

# Frontend
npm run lint:frontend
npm run lint:fix:frontend
```

## Configuración de lint-staged

Los siguientes archivos son procesados automáticamente durante el pre-commit:

- **Backend**: `backend/**/*.{ts,js}` - Ejecuta ESLint con auto-fix
- **Frontend**: `frontend/**/*.{ts,tsx,js,jsx}` - Ejecuta ESLint con auto-fix
- **Otros**: `**/*.{json,md,yml,yaml}` - Ejecuta Prettier para formateo

## Flujo de Trabajo

### 1. Durante el Desarrollo

```bash
# Validación rápida manual (opcional)
npm run validate:quick

# Hacer cambios al código...
git add .
```

### 2. Al Hacer Commit

```bash
git commit -m "feat: nueva funcionalidad"
```

**Automáticamente ejecuta**:

- Validación rápida de lint
- Formateo automático de archivos modificados
- Si todo pasa ✅, el commit se realiza
- Si algo falla ❌, el commit se cancela

### 3. Al Hacer Push

```bash
git push origin main
```

**Automáticamente ejecuta**:

- Validación completa de build
- Verifica que todo compile correctamente
- Si todo pasa ✅, el push se realiza
- Si algo falla ❌, el push se cancela

## Manejo de Errores

### Si el Pre-commit Falla

1. **Revisa los errores** mostrados en la terminal
2. **Corrige los problemas** de lint o sintaxis
3. **Agrega los cambios** corregidos: `git add .`
4. **Intenta el commit nuevamente**: `git commit -m "mensaje"`

### Si el Pre-push Falla

1. **Revisa los errores** de compilación mostrados
2. **Corrige los problemas** que impiden el build
3. **Haz commit** de las correcciones
4. **Intenta el push nuevamente**: `git push`

### Bypass (Solo en Emergencias)

```bash
# Saltarse pre-commit (NO RECOMENDADO)
git commit -m "mensaje" --no-verify

# Saltarse pre-push (NO RECOMENDADO)
git push --no-verify
```

## Archivos de Configuración

### Prettier (`.prettierrc`)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf"
}
```

### Lint-staged (`package.json`)

```json
{
  "lint-staged": {
    "backend/**/*.{ts,js}": ["cd backend && npm run lint:fix", "git add"],
    "frontend/**/*.{ts,tsx,js,jsx}": [
      "cd frontend && npm run lint -- --fix",
      "git add"
    ],
    "**/*.{json,md,yml,yaml}": ["prettier --write", "git add"]
  }
}
```

## Beneficios

### 🛡️ Protección del Proyecto

- Previene commits que rompan la compilación
- Mantiene la consistencia del código
- Detecta errores antes de que lleguen al repositorio

### 🚀 Productividad

- Formateo automático del código
- Validaciones rápidas durante desarrollo
- Feedback inmediato sobre problemas

### 👥 Trabajo en Equipo

- Estándares de código consistentes
- Reducción de conflictos de merge
- Código siempre funcional en el repositorio

## Solución de Problemas Comunes

### "husky: command not found"

```bash
npm install
npx husky install
```

### "Permission denied" en scripts

```bash
chmod +x .husky/validate-build.sh
chmod +x .husky/validate-quick.sh
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### Dependencias no instaladas

```bash
# Proyecto raíz
npm install

# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### ESLint/Prettier conflictos

- Los archivos `.eslintrc` y `.prettierrc` están configurados para trabajar juntos
- En caso de conflicto, Prettier tiene prioridad para formato
- ESLint se enfoca en calidad de código

## Mantenimiento

### Actualizar Dependencias

```bash
npm update husky lint-staged prettier
```

### Modificar Validaciones

- Editar `.husky/validate-build.sh` para cambiar validaciones completas
- Editar `.husky/validate-quick.sh` para cambiar validaciones rápidas
- Modificar `package.json` para ajustar lint-staged

### Deshabilitar Temporalmente

```bash
# Deshabilitar todos los hooks
mv .husky .husky-disabled

# Rehabilitar
mv .husky-disabled .husky
```

## Notas Importantes

- ⚠️ **No** uses `--no-verify` excepto en emergencias
- 🔄 Los hooks se ejecutan automáticamente después de `npm install`
- 📝 Los artifacts de build se limpian automáticamente
- 🐛 Si encuentras problemas, revisa los logs detallados en la terminal
- 💡 Para desarrollo rápido, usa `npm run validate:quick` manualmente
