# Usa una imagen base de Node.js 18 (una versión LTS estable)
FROM node:18

# Instala dependencias necesarias para compilar sqlite3
RUN apt-get update && apt-get install -y python3 build-essential

# Establece el directorio de trabajo
WORKDIR /opt/render/project/src

# Copia package.json y package-lock.json (si existe) para instalar dependencias
COPY package.json ./
RUN npm install

# Copia el resto de los archivos del proyecto
COPY . .

# Expone el puerto que usa tu aplicación (ajusta según tu app, normalmente 3000)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]