# Messi vs Cristiano LIVE — Android APK

Versión completa del MVP, preparada para generar un APK instalable.

## Funciones
- Batalla Messi vs Cristiano.
- Rosa +1, Rosquilla +10, Gorra gana para Messi.
- Rosa blanca +1, Capibara +10, Sombrero y bigote gana para Cristiano.
- Rondas de 1, 2, 3 o 5 minutos.
- Marcador, barra de progreso, último regalo y lista de eventos.
- Conexión WebSocket con reconexión automática.
- Panel de reglas y ajustes dentro de la app.
- Botones de demo para probar sin TikTok.
- Arte proporcionado incluido.

## Generar el APK
Requisitos: Node.js y una cuenta Expo/EAS.

```bash
npm install
eas login
npx eas build --platform android --profile production-apk
```

Ese perfil está configurado con `android.buildType = apk`, por lo que EAS genera un APK instalable directamente. Para Google Play, usa el perfil `production`, que genera AAB.

## Configurar el puente
En Ajustes de la app coloca, por ejemplo:

`wss://tu-servidor.com`

El servidor debe enviar eventos JSON:

```json
{"type":"gift","gift":"Rosquilla","quantity":1,"user":"Nombre"}
```

Valores válidos: `Rosa`, `Rosquilla`, `Gorra`, `Rosa blanca`, `Capibara`, `Sombrero y bigote`.

## Importante sobre TikTok
La app no intenta saltarse restricciones de TikTok ni simula una API oficial. El puente debe utilizar una integración permitida/compatible con tu cuenta y las políticas de TikTok. La app solamente consume eventos que el puente le entregue.
