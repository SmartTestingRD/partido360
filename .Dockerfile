# Usamos una imagen de Node.js versión 20 ligera
FROM node:20-alpine

# Establecemos el directorio de trabajo
WORKDIR /app

# Copiamos solo los archivos de dependencias del backend primero
COPY package*.json ./

# Instalamos únicamente las dependencias de producción
RUN npm install --omit=dev

# Copiamos el resto del código del backend
# (Tanto src, scripts, como cualquier otra carpeta, omitiendo frontend si quieres por tamaño)
COPY . .

# Exponemos el puerto
EXPOSE 3001

# Comando por defecto para iniciar el backend
CMD ["node", "src/server.js"]
