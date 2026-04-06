# --- Etapa 1: Build (Construcción) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos archivos de configuración del frontend
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos todos los archivos del código fuente del frontend
COPY . .

# Construimos la aplicación usando Vite, el resultado quedará en /app/dist
RUN npm run build

# --- Etapa 2: Producción (Servir con Nginx) ---
FROM nginx:alpine

# Copiamos la aplicación compilada desde la etapa anterior hacia la carpeta pública de nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Sobreescribimos la configuración por defecto de nginx si es necesario para SPA
# pero como regla general, nginx:alpine sirve los html automáticamente, 
# se añade una configuración custom para que funcionen las rutas en React / React Router
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Exponemos el puerto 80 del frontend
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
