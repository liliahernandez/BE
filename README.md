# Pokémon Backend API

Backend BFF (Backend For Frontend) para la aplicación de Pokémon. Consume la PokeAPI y proporciona autenticación, gestión de favoritos, equipos y batallas entre amigos.

## 🚀 Características

- ✅ Autenticación con email y contraseña
- ✅ Registro de usuarios con código de amigo único
- ✅ Gestión de favoritos persistentes por usuario
- ✅ Creación y administración de equipos de Pokémon
- ✅ Sistema de amigos con códigos únicos
- ✅ Batallas entre amigos con simulación completa
- ✅ Integración completa con PokeAPI
- ✅ Filtros por tipo, región y nombre
- ✅ Detalles completos de Pokémon (especies, estadísticas, línea evolutiva)

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- MongoDB (v4.4 o superior)
- npm o yarn

## 🛠️ Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

3. Editar el archivo `.env` con tus configuraciones:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/pokemon-app
JWT_SECRET=tu-clave-secreta-aqui
CORS_ORIGIN=http://localhost:5173
```

4. Asegúrate de que MongoDB esté corriendo:
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

## 🚀 Uso

### Modo Desarrollo
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📚 API Endpoints

### Autenticación

#### Registro de Usuario
```http
POST /auth/register
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Respuesta:**
```json
{
  "message": "User registered successfully",
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "usuario@ejemplo.com",
    "friendCode": "ABC12345"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

#### Obtener Perfil
```http
GET /auth/profile
Authorization: Bearer {token}
```

#### Agregar Amigo
```http
POST /auth/friends
Authorization: Bearer {token}
Content-Type: application/json

{
  "friendCode": "ABC12345"
}
```

#### Listar Amigos
```http
GET /auth/friends
Authorization: Bearer {token}
```

### Pokémon

#### Listar Pokémon
```http
GET /pokemon?limit=20&offset=0
Authorization: Bearer {token}
```

#### Buscar Pokémon
```http
GET /pokemon/search?name=pikachu
Authorization: Bearer {token}
```

#### Detalles de Pokémon
```http
GET /pokemon/:idOrName
Authorization: Bearer {token}
```

#### Obtener Tipos
```http
GET /pokemon/types
Authorization: Bearer {token}
```

#### Pokémon por Tipo
```http
GET /pokemon/type/:type
Authorization: Bearer {token}
```

#### Obtener Generaciones
```http
GET /pokemon/generations
Authorization: Bearer {token}
```

#### Pokémon por Generación
```http
GET /pokemon/generation/:id
Authorization: Bearer {token}
```

### Favoritos

#### Listar Favoritos
```http
GET /favorites
Authorization: Bearer {token}
```

#### Agregar Favorito
```http
POST /favorites
Authorization: Bearer {token}
Content-Type: application/json

{
  "pokemonId": 25
}
```

#### Eliminar Favorito
```http
DELETE /favorites/:pokemonId
Authorization: Bearer {token}
```

### Equipos

#### Listar Equipos
```http
GET /favorites/teams
Authorization: Bearer {token}
```

#### Crear Equipo
```http
POST /favorites/teams
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Mi Equipo",
  "pokemonIds": [1, 4, 7, 25, 133, 143]
}
```

#### Actualizar Equipo
```http
PUT /favorites/teams/:teamId
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nuevo Nombre",
  "pokemonIds": [1, 4, 7, 25, 133, 143]
}
```

#### Eliminar Equipo
```http
DELETE /favorites/teams/:teamId
Authorization: Bearer {token}
```

### Batallas

#### Crear Batalla
```http
POST /battles
Authorization: Bearer {token}
Content-Type: application/json

{
  "opponentId": "friend-user-id",
  "teamId": "your-team-id"
}
```

#### Iniciar Batalla
```http
POST /battles/:battleId/start
Authorization: Bearer {token}
```

#### Ver Batalla
```http
GET /battles/:battleId
Authorization: Bearer {token}
```

#### Listar Batallas
```http
GET /battles
Authorization: Bearer {token}
```

#### Cancelar Batalla
```http
DELETE /battles/:battleId
Authorization: Bearer {token}
```

## 🗂️ Estructura del Proyecto

```
BE/
├── src/
│   ├── controllers/
│   │   ├── authController.js       # Autenticación y amigos
│   │   ├── pokemonController.js    # Consultas a PokeAPI
│   │   ├── favoritesController.js  # Favoritos y equipos
│   │   └── battleController.js     # Batallas
│   ├── models/
│   │   ├── User.js                 # Modelo de usuario
│   │   └── Battle.js               # Modelo de batalla
│   ├── routes/
│   │   ├── auth.js                 # Rutas de autenticación
│   │   ├── pokemon.js              # Rutas de Pokémon
│   │   ├── favorites.js            # Rutas de favoritos
│   │   └── battles.js              # Rutas de batallas
│   ├── middleware/
│   │   └── auth.js                 # Middleware de autenticación
│   └── services/
│       ├── pokeapi.js              # Servicio de PokeAPI
│       └── battle.js               # Lógica de batallas
├── index.js                        # Punto de entrada
├── package.json
├── .env.example
└── README.md
```

## 🎮 Sistema de Batallas

El sistema de batallas simula combates Pokémon considerando:

- **Estadísticas**: HP, Ataque, Defensa, Velocidad
- **Tipos**: Efectividad de tipos (súper efectivo, no muy efectivo, inmune)
- **STAB**: Bonificación por usar movimientos del mismo tipo
- **Movimientos**: Cada Pokémon tiene hasta 4 movimientos
- **Turnos**: El Pokémon más rápido ataca primero
- **Log de batalla**: Registro completo de cada turno

### Tabla de Efectividad de Tipos

El sistema incluye la tabla completa de efectividad de tipos de Pokémon:
- 2x: Súper efectivo
- 1x: Daño normal
- 0.5x: No muy efectivo
- 0x: Inmune

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt
- Autenticación JWT
- Tokens con expiración de 7 días
- Validación de entrada en todos los endpoints
- CORS configurado

## 🧪 Testing

Para probar los endpoints, puedes usar:
- Postman
- Thunder Client (VS Code)
- cURL
- Insomnia

## 📝 Notas Importantes

1. **MongoDB**: Asegúrate de tener MongoDB corriendo antes de iniciar el servidor
2. **JWT_SECRET**: Cambia el JWT_SECRET en producción por una clave segura
3. **CORS**: Ajusta CORS_ORIGIN según tu frontend
4. **PokeAPI**: El servidor hace llamadas a https://pokeapi.co/api/v2

## 🐛 Troubleshooting

### Error de conexión a MongoDB
```bash
# Verifica que MongoDB esté corriendo
mongosh
```

### Error de puerto en uso
```bash
# Cambia el PORT en .env
PORT=3001
```

### Error de autenticación
- Verifica que el token JWT sea válido
- Asegúrate de incluir el header: `Authorization: Bearer {token}`

## 📄 Licencia

Este proyecto es parte de una prueba técnica.

## 👥 Autor

Desarrollado para la aplicación fullstack de Pokémon.
