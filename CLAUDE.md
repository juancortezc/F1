# F1 Night - Documentación del Proyecto

## 🎯 Objetivo del Proyecto
Sistema de cronometraje para competencias de F1 con simuladores, diseñado específicamente para usuarios de 50+ años con un enfoque mobile-first, sobrio y elegante.

## 🎨 Rediseño UI/UX (Implementado)

### Sistema de Diseño
- **Tema**: Dark mode exclusivo con fondo negro puro (#000000)
- **Tipografía**: Grande y clara (18px base en móvil, 16px en desktop)
- **Colores limitados**:
  - Negro/Gris oscuro para fondos
  - Blanco/Gris claro para texto
  - Rojo F1 (#FF1801) solo para acciones críticas
  - Verde y amarillo suaves para destacados
- **Sin decoraciones**: No hay iconos, emojis, gradientes ni efectos visuales

### Componentes Simplificados
- **DataCard**: Tarjetas planas sin sombras, solo información esencial
- **StatsGrid**: Máximo 2 columnas para mejor legibilidad móvil
- **NavigationBar**: Mínimo, solo acciones esenciales
- **Botones**: Grandes (48px mínimo) con áreas táctiles amplias

### Pantallas Principales

#### 1. LandingPage
- Logo F1 centrado
- Solo 2 botones: JUGADOR (principal) y Crear Campeonato (secundario)
- Sin estadísticas públicas ni información adicional

#### 2. HubScreen
- Nombre del usuario prominente
- Máximo 3-4 botones grandes
- Sin tarjetas informativas ni decoración

#### 3. SpectatorDashboard (Vista Principal)
- Información del circuito y turno actual
- Posiciones en lista simple (sin avatares)
- Actualizaciones en vivo sin animaciones complejas
- Máximo 2 columnas en móvil

#### 4. RaceView (Ingreso de Tiempos)
- Inputs de tiempo extra grandes (32px)
- Feedback visual mínimo pero claro
- Auto-guardado silencioso
- Botones de acción del 100% del ancho

## 📱 Características Mobile-First
- Fuentes mínimas de 18px en móvil
- Touch targets de 48px mínimo
- Navegación simplificada con botones grandes
- Sin hover states en móvil
- Scrolling vertical optimizado

## 🔄 Actualizaciones en Vivo
- Polling cada 2 segundos para datos en tiempo real
- Sin notificaciones push (por simplicidad)
- Indicadores visuales sutiles para cambios
- Auto-guardado de tiempos después de 1 segundo

## 🚀 Próximas Mejoras Pendientes

### Fase 3: Sistema de Notificaciones
- Vibración + sonido suave para eventos importantes
- Banner temporal (3 segundos) en la parte superior
- Solo para: nuevo récord, cambio de líder, turno próximo

### Fase 4: Hall of Fame
- Lista simple con fondo negro
- Categorías: más vueltas rápidas, mejores promedios, campeonatos ganados
- Sin fotos, solo iniciales en círculos
- Actualización al finalizar cada campeonato

## 🛠️ Stack Técnico
- **Frontend**: Next.js con TypeScript
- **Estilos**: Tailwind CSS con sistema de diseño personalizado
- **Base de datos**: PostgreSQL con Prisma ORM
- **Actualizaciones**: SWR para polling y caché en tiempo real
- **Hosting**: Optimizado para Vercel con Neon Database
- **Service Worker**: Implementación mínima para PWA básico

## 📋 Comandos Importantes
```bash
# Desarrollo
npm run dev

# Build
npm run build

# Linting y type checking
npm run lint
npm run typecheck

# Base de datos
npx prisma studio  # Ver datos
npx prisma migrate dev  # Migrar esquema
```

## 🎯 Principios de Diseño
1. **Simplicidad sobre funcionalidad**: Menos es más
2. **Accesibilidad**: Texto grande, contraste alto, áreas táctiles amplias
3. **Rendimiento**: Carga rápida, actualizaciones eficientes
4. **Consistencia**: Mismo patrón visual en toda la app
5. **Mobile-first**: Diseñado principalmente para teléfonos

## 👥 Roles de Usuario
- **Jugador**: Solo puede unirse a campeonatos y ver resultados
- **Organizador**: Puede crear campeonatos y también jugar
- Control determinado en la creación del usuario (no hay admin global)

## 🏁 Flujo de Usuario

### Jugador
1. Login con PIN → Hub
2. Si hay campeonato activo → Unirse
3. Ver posiciones en tiempo real
4. Esperar turno → Ingresar tiempos cuando toque
5. Ver resultados finales

### Organizador  
1. Login con PIN → Hub
2. Crear nuevo campeonato
3. Configurar jugadores, circuitos y reglas
4. Iniciar campeonato
5. Jugar como un jugador más
6. Ver resultados y proclamar campeón

## 🔧 Problemas Técnicos Resueltos y Aprendizajes

### Errores de Routing en Next.js
**Problema**: Error "You cannot use different slug names for the same dynamic path ('id' !== 'playerId')"
- **Causa**: Conflicto entre `/api/players/[id].ts` y `/api/players/[playerId]/stats.ts`
- **Solución**: Unificar nombres de parámetros dinámicos - usar `[id]` consistentemente
- **Aprendizaje**: Next.js requiere nombres de parámetros consistentes en rutas que comparten el mismo nivel

### Errores de Base de Datos con Prisma
**Problema**: APIs devolviendo 500 por campos inexistentes
- **Causa**: Desincronización entre schema Prisma y código (ej: `bestLap` vs `historicalBestLap`)
- **Solución**: Revisar schema.prisma y usar nombres exactos de campos
- **Aprendizaje**: Siempre verificar el schema antes de hacer consultas

### Service Worker Cache Issues
**Problema**: Error `cache.addAll()` causando fallos de carga
- **Causa**: URLs en urlsToCache que no existen o son inaccesibles
- **Solución**: Implementar service worker mínimo que pase todas las requests sin cache
- **Aprendizaje**: Para desarrollo, un SW simple es mejor que uno complejo que falla

### Componentes TypeScript
**Problema**: Props inexistentes en componentes (ej: `variant="info"` en DataCard)
- **Causa**: Uso de props no definidos en interfaces TypeScript
- **Solución**: Verificar interfaces de componentes y usar solo props válidos
- **Aprendizaje**: TypeScript es estricto - revisar siempre las definiciones de tipos

### Navegación de Usuario Simplificada
**Problema**: Página intermedia confusa para jugadores sin campeonatos activos
- **Causa**: UX complicada con múltiples pantallas innecesarias
- **Solución**: Flujo directo - jugadores van a LIVE (si hay juego) o Acumulados (sin juego)
- **Aprendizaje**: Menos pantallas = mejor UX para usuarios 50+

### Errores SWR y Manejo de Estados
**Problema**: `SWR Error: Error: API request failed` en LivePage
- **Causa**: Llamadas API con parámetros undefined/null (circuitId, gameId)
- **Solución**: Conditional fetching con validación de parámetros antes de llamada
- **Mejora**: Estados de error visuales con iconos y mensajes claros
- **Aprendizaje**: Siempre validar parámetros antes de fetch, manejar estados gracefully

### Base de Datos Inconsistente
**Problema**: Récords históricos sin jugador, IDs de circuitos mezclados
- **Causa**: Datos acumulativos de múltiples sesiones y hardcoding de IDs
- **Solución**: Script de limpieza completa manteniendo estructura base
- **Resultado**: Base de datos prístina con integridad referencial completa
- **Aprendizaje**: Limpiezas periódicas necesarias para mantener calidad de datos

## 📊 Nuevas Funcionalidades Implementadas

### Sistema de Puntaje Unificado
- **RaceProgress.tsx**: Transformado de barras de progreso a tabla de clasificación
- **Columnas**: POS, JUGADOR, PTS, VR (Vueltas Rápidas), PR (Promedios), 1°, 2°, 3° (posiciones por turno)
- **Cálculos**: `calculateTurnPositions()` para estadísticas de posiciones por circuito
- **Diseño**: Scroll horizontal en móvil, fuentes ligeras, colores zinc

### Sistema de Resultados Dual
- **ResultsView.tsx**: Dos tabs principales
  - **TIEMPOS**: Récords de vueltas rápidas y promedios por circuito
  - **ACUMULADOS**: Estadísticas de carrera (campeonatos ganados, récords, etc.)
- **Integración**: Usa gameHistory para calcular estadísticas históricas
- **UX**: Tab navigation simple y clara

### Navegación Directa para Jugadores
- **HubScreen.tsx**: Eliminada página intermedia "Estadísticas y Menú"
- **Flujo simplificado**: 
  - Con campeonato activo → LIVE tab
  - Sin campeonato → Acumulados tab
- **Menos clics**: Acceso directo a contenido relevante

### Sistema de Tiempos Detallados - TimesPage
- **Nueva pestaña TIEMPOS**: Disponible junto a LIVE, Puntaje, STATS para todos los usuarios
- **Tabla luxury completa**: Jugador, Circuito, Turno, Vuelta, Tiempo, **Promedio del Turno**
- **Filtros avanzados**: Por juego, circuito y jugador con selectores elegantes
- **Cálculo automático**: Promedio por turno calculado desde vueltas individuales
- **Diseño 50+**: Fuentes grandes (18px+), contraste alto, spacing generoso
- **Datos 100% reales**: Integración directa con base de datos Neon PostgreSQL
- **Estados manejados**: Loading, error, sin datos con feedback visual claro

### Live Page con Récords Históricos
- **Card de récords históricos**: Bajo la tabla de timing en vivo
- **Información del circuito activo**: Récord de vuelta rápida y mejor promedio
- **Récords de sesión**: Mejor tiempo actual y turno en curso
- **Diseño luxury F1**: Cards compactos con colores semánticos
- **Responsive**: Grid 1 columna móvil, 2 columnas desktop
- **Estados robustos**: Manejo de récords sin jugador, circuitos sin récords

## 🗄️ Estructura de Base de Datos

### Modelos Principales
```prisma
model Player {
  id: String (CUID)
  name: String
  pin: String (default "0000")
  imageUrl: String
}

model Circuit {
  historicalBestLap: Int? (milliseconds)
  historicalBestAverage: Int? (milliseconds)
  bestLapHolderId: String?
  bestAverageHolderId: String?
}

model Game {
  state: Json (GameState completo)
  status: String (ACTIVE/COMPLETED)
}
```

### APIs Críticas
- `/api/players/[id]/stats` - Estadísticas individuales de jugador
- `/api/circuits` - Lista de circuitos con récords
- `/api/circuits/update-records` - Actualización de récords históricos
- `/api/lap-times/all` - Historial completo de vueltas por juego/circuito/jugador
- `/api/lap-times/live` - Datos en tiempo real con polling cada 3s
- `/api/settings` - Configuración global (PIN admin)
- `/api/game/active` - Estado del juego activo

## 🧹 Limpieza y Mantenimiento de Base de Datos

### Script de Limpieza Completa
- **Ubicación**: `scripts/cleanup-database.js`
- **Propósito**: Limpieza completa de datos transaccionales manteniendo estructura base
- **Datos eliminados**: 
  - Todos los lap times individuales
  - Todas las turn completions
  - Todos los games activos/históricos
  - Todos los récords históricos de circuitos
  - Datos de torneos y championships
- **Datos preservados**:
  - 3 jugadores: Juan, Berna, Borgia
  - 21 circuitos con nombres e imágenes
  - Configuraciones de la aplicación

### Problemas Resueltos
- **IDs inconsistentes**: Circuito "monaco" vs ID real corregido
- **Récords huérfanos**: Récords sin jugador asociado limpiados
- **Integridad referencial**: Referencias cruzadas rotas eliminadas
- **Datos contaminados**: Multiple juegos mezclados separados

## 🎨 F1 Luxury Look - Sistema de Diseño Refinado

### Definición del Luxury Look
El **F1 Luxury Look** es un sistema de diseño inspirado en interfaces profesionales de timing deportivo, caracterizado por:

1. **Minimalismo Premium**: Información densa pero organizada, sin elementos decorativos
2. **Tipografía Deportiva**: Font monoespace para datos críticos, sans-serif para navegación
3. **Color Psychology**: Paleta restringida con colores semánticos (oro=1°, plata=2°, bronce=3°)
4. **Micro-interacciones**: Transiciones sutiles que comunican profesionalismo
5. **Data-First**: El contenido es rey, la UI es invisible

### Paleta de Colores Luxury
```css
/* Fondos */
--luxury-black: #000000         /* Fondo principal - Elegancia máxima */
--luxury-surface: #18181b       /* zinc-900 - Superficies principales */
--luxury-elevated: #27272a      /* zinc-800 - Headers y elementos elevados */
--luxury-border: #3f3f46        /* zinc-700 - Bordes sutiles */
--luxury-divider: #52525b       /* zinc-600 - Separadores */

/* Textos */
--luxury-text-primary: #f4f4f5  /* zinc-100 - Texto principal */
--luxury-text-secondary: #a1a1aa /* zinc-400 - Texto secundario */
--luxury-text-muted: #71717a    /* zinc-500 - Texto desenfatizado */

/* Acciones */
--luxury-action: #FF1801        /* F1 Red - Solo acciones críticas */
--luxury-danger: #dc2626        /* red-600 - Estados de error */

/* Posiciones (Semánticos) */
--luxury-first: #fbbf24         /* amber-400 - Oro (1er lugar) */
--luxury-second: #d4d4d8        /* zinc-300 - Plata (2do lugar) */
--luxury-third: #f59e0b         /* amber-500 - Bronce (3er lugar) */
```

### Componentes Luxury

#### **Tablas de Datos (RaceProgress, AdminView)**
```css
/* Header estilo F1 */
.luxury-table-header {
  @apply bg-zinc-800 px-3 py-2 text-xs font-mono uppercase tracking-wide text-zinc-400;
}

/* Filas compactas */
.luxury-table-row {
  @apply px-3 py-2 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors;
}

/* Datos monoespace */
.luxury-data-cell {
  @apply font-mono font-bold text-center;
}
```

#### **Cards y Modales**
```css
/* Surface elevation */
.luxury-card {
  @apply bg-zinc-900 border border-zinc-800 rounded-md;
}

/* Modal luxury */
.luxury-modal {
  @apply bg-zinc-900 border border-zinc-700 rounded-md;
}

/* Header con separador */
.luxury-header {
  @apply px-3 py-2 border-b border-zinc-700 bg-zinc-800;
}
```

#### **Interacciones Luxury**
```css
/* Botón primario */
.luxury-button-primary {
  @apply bg-f1-red text-white font-bold rounded hover:bg-red-700 transition-colors;
}

/* Botón secundario */
.luxury-button-secondary {
  @apply bg-zinc-700 text-zinc-100 font-bold rounded hover:bg-zinc-600 transition-colors;
}

/* Hover states sutiles */
.luxury-hover {
  @apply hover:bg-zinc-800/30 transition-colors duration-200;
}
```

### Tipografía Luxury

#### **Jerarquía de Fuentes**
```css
/* Headers principales */
.luxury-title {
  @apply text-xl font-bold text-zinc-100;
}

/* Headers de sección */
.luxury-section-title {
  @apply text-lg font-bold text-zinc-100;
}

/* Datos críticos (tiempos, puntos) */
.luxury-data {
  @apply font-mono font-bold text-zinc-100;
}

/* Labels y metadata */
.luxury-label {
  @apply text-xs font-mono uppercase tracking-wide text-zinc-400;
}

/* Texto regular */
.luxury-text {
  @apply text-zinc-100 font-semibold;
}
```

### Responsive Luxury

#### **Mobile-First Premium**
- **Tablas compactas**: Grid layouts que mantienen toda la información visible
- **Touch targets**: Mínimo 44px para interacciones móviles
- **Density control**: Información densa sin sacrificar legibilidad
- **Scroll horizontal**: Para tablas con muchas columnas

#### **Desktop Enhancement**
- **Hover states**: Micro-interacciones que mejoran la experiencia
- **Spacing generoso**: Más padding en desktop para comodidad visual
- **Typography scaling**: Tamaños ligeramente diferentes para diferentes viewports

### Principios de Implementación

#### **Do's (Hacer)**
✅ **Usar font-mono** para datos numéricos y códigos  
✅ **Colores semánticos** solo donde comunican significado  
✅ **Padding compacto** (px-3 py-2) para densidad premium  
✅ **Transitions sutiles** (200ms max) para microinteracciones  
✅ **Borders zinc-700/800** para definición sin ruido visual  
✅ **Hierarchy clara** con zinc-100 (primary) y zinc-400 (secondary)  

#### **Don'ts (Evitar)**
❌ **Colores decorativos** que no comunican información  
❌ **Sombras o efectos** que distraigan del contenido  
❌ **Animaciones complejas** que ralenticen la percepción  
❌ **Tipografía inconsistente** mezclando weights sin criterio  
❌ **Spacing irregular** que rompa la grilla visual  
❌ **Hover effects exagerados** que se sientan amateur  

### Componentes de Referencia

#### **Implementación Completa**
- ✅ **RaceProgress.tsx** - Tabla luxury con headers, datos y posiciones
- ✅ **AdminView.tsx** - Listas compactas con hover states
- ✅ **Modal.tsx** - Modal elevation con borders y typography
- ✅ **ResultsView.tsx** - Navegación por tabs y secciones organizadas
- ✅ **LivePage.tsx** - Timing table con colores semánticos + card récords históricos
- ✅ **TimesPage.tsx** - Tabla detallada con filtros y diseño luxury 50+

#### **Manejo de Errores Mejorado**
- ✅ **SWR Error Handling** - Conditional fetching y null safety
- ✅ **Error States UI** - Estados visuales para errores de API
- ✅ **Robust Data Processing** - Validaciones comprehensivas
- ✅ **User Feedback** - Loading, error y retry messaging

## 🔄 Polling y Actualizaciones en Tiempo Real

### Configuración SWR
```javascript
// Cada 3 segundos para datos de juego activo
const interval = setInterval(() => {
  mutate('/api/game/active');
}, 3000);
```

### Estrategia de Caché
- **Revalidar en focus**: Datos frescos al cambiar de tab
- **Revalidar en reconexión**: Sincronización automática
- **Optimistic updates**: UI responde antes de confirmación del servidor

## 📈 Estado Actual del Proyecto (Agosto 2025)

### ✅ Funcionalidades Completadas

#### **Core Racing System**
- ✅ **Sistema completo de cronometraje** con F1 Night branding
- ✅ **Live timing** con tabla compacta F1 y delta dinámico
- ✅ **Cálculo automático de promedios** con best 4 of 5 support
- ✅ **Sistema de puntuación** configurable por posición
- ✅ **Manejo de turnos y circuitos** con flujo automático

#### **UI/UX Optimized for 50+**
- ✅ **Dark mode luxury** con esquema de colores F1 professional
- ✅ **Fuentes grandes** (18px+ móvil) con alta legibilidad
- ✅ **Touch targets 48px+** para interacción móvil cómoda
- ✅ **Navigation simplificada** sin pantallas intermedias innecesarias
- ✅ **Estados visuales claros** para loading, error y success

#### **Data Management**
- ✅ **Base de datos limpia** con integridad referencial completa
- ✅ **Récords históricos** por circuito con tracking de poseedores
- ✅ **APIs robustas** con manejo de errores comprehensivo
- ✅ **Real-time updates** con SWR y polling cada 3 segundos
- ✅ **Data validation** y null safety en todos los componentes

#### **Views y Navigation**
- ✅ **5 pestañas principales**: LIVE, Puntaje, STATS, TIEMPOS, Admin
- ✅ **TimesPage completa** con filtros avanzados y tabla luxury
- ✅ **ResultsView mejorada** con manejo de récords huérfanos
- ✅ **LivePage enhanced** con card de récords históricos integrado
- ✅ **Error handling visual** en todas las interfaces

### 🔧 Problemas Críticos Resueltos (26/08/2025)

#### **1. Registros falsos al cambiar de jugador**
- **Problema**: El segundo jugador veía/modificaba datos del jugador anterior
- **Causa**: LocalStorage compartía claves entre diferentes jugadores
- **Solución**: 
  - Agregado `gameId` a claves localStorage para aislamiento
  - Implementada validación de `playerId` en carga de datos
  - Función `cleanupStaleLocalStorage` elimina datos obsoletos
  - Limpieza completa al completar turnos

#### **2. Récords históricos no funcionaban**
- **Problema**: Los récords no se actualizaban ni mostraban correctamente
- **Causa**: Actualización durante auto-save individual no capturaba todos los tiempos
- **Solución**:
  - Actualización movida al momento de completar turno completo
  - Se actualizan tanto `bestLap` como `bestAverage` juntos
  - Garantiza captura de todos los tiempos del turno

#### **3. Cambio de circuito no funcionaba**
- **Problema**: Al terminar todos los turnos, no avanzaba al siguiente circuito
- **Causa**: `nextTurn` se reseteaba a 1 antes de verificar si debía cambiar circuito
- **Solución**:
  - Guardamos `currentTurnBeforeReset` antes del reseteo
  - Verificación usa el valor guardado: `currentTurnBeforeReset >= turnsPerCircuit`
  - Lógica reordenada para flujo correcto

#### **4. Vista horizontal PWA deficiente**
- **Problema**: En PWA la vista LIVE no se optimizaba para landscape
- **Solución**:
  - Meta tags adicionales para forzar rotación en iOS
  - Clases `landscape:` optimizan LivePage
  - Card de récords oculto en landscape para maximizar tabla
  - Tamaños de fuente responsive mejorados

### 🚀 Ready for Production
- ✅ **Build exitoso** sin errores TypeScript
- ✅ **Deploy funcionando** en master branch
- ✅ **Database prístina** lista para uso en vivo
- ✅ **Error resilience** para conexión inestable
- ✅ **Mobile-first responsive** para dispositivos 50+
- ✅ **Una sola branch** (master) para evitar confusión

### 🎯 Próximas Mejoras Sugeridas
- **Fase 3**: Sistema de notificaciones push para eventos importantes
- **Fase 4**: Hall of Fame con estadísticas de temporada completa
- **PWA**: Service worker para uso offline básico
- **Backup**: Sistema automatizado de respaldo de datos