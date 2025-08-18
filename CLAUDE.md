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
- **Base de datos**: SQLite con Prisma
- **Actualizaciones**: SWR para polling y caché
- **Hosting**: Optimizado para Vercel

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