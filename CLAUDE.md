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
- `/api/settings` - Configuración global (PIN admin)
- `/api/game/active` - Estado del juego activo

## 🎨 Sistema de Colores Refinado

### Paleta Principal
```css
--f1-black: #000000      /* Fondo principal */
--f1-red: #FF1801        /* Acciones críticas */
--zinc-900: #18181b      /* Superficies secundarias */
--zinc-300: #d4d4d8      /* Texto secundario */
--zinc-100: #f4f4f5      /* Texto principal */
```

### Aplicación por Componente
- **Botones primarios**: bg-f1-red con texto blanco
- **Botones secundarios**: bg-zinc-900 con bordes zinc-700
- **Tarjetas**: bg-zinc-900 con bordes zinc-800
- **Texto**: zinc-100 (principal), zinc-300 (secundario)

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