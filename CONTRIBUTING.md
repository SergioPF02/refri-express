# Guía de Contribución para Refri Express

Para evitar conflictos de código y mantener el proyecto ordenado, seguiremos estas reglas de oro:

## 1. NUNCA trabajes directo en `main`
La rama `main` debe tener siempre la versión funcional del proyecto.

## 2. Crea una rama para CADA tarea
Antes de empezar a programar, crea una nueva rama:
```bash
git checkout -b nombre-de-la-tarea
# Ejemplo: git checkout -b nav-bar-fix
```

## 3. Actualiza tu rama constantemente
Antes de empezar a trabajar cada día, asegúrate de tener los últimos cambios de tu compañero:
```bash
git checkout main
git pull origin main
git checkout tu-rama
git merge main
```

## 4. Subir cambios (Push)
Sube tu rama al repositorio:
```bash
git push origin tu-rama
```

## 5. Integrar cambios (Merge)
1. Ve a GitHub.
2. Abre un "Pull Request" (PR) desde tu rama hacia `main`.
3. Avisa a tu compañero para que revise el código (opcional pero recomendado).
4. Si todo está bien, dale al botón "Merge".

## ¿Qué hacer si hay conflictos?
Si git te dice que hay conflicto, no entres en pánico:
1. Git marcará en los archivos dónde está el problema (busca `<<<<<<<`).
2. Decide qué código se queda y borra las marcas de git.
3. Guarda, haz commit y vuelve a subir.

## Tips para trabajar al mismo tiempo ⚡
Si ambos están programando en este momento:
*   **Divídanse los archivos:** "Yo hago el `Header.jsx` y tú el `Footer.jsx`". Eviten tocar el mismo archivo a la vez.
*   **Avisen:** Si vas a cambiar algo global (como `App.css` o `package.json`), avisa a tu compañero.
*   **Pull seguido:** Ejecuta `git pull origin main` en tu rama cada 30 minutos para traer lo que tu amigo ya terminó.

## Proyecto Android (Expansión) 📱
Si tu compañero va a crear la app móvil:
1.  **NO mezclen archivos:** Creen una carpeta nueva en la raíz llamada `/android` o `/mobile`.
2.  **Libertad total:** Mientras él trabaje DENTRO de esa carpeta, puede hacer lo que quiera sin romper tu página web.
3.  **Ramas:** Puede usar una rama llamada `android-dev` para mantener todo separado hasta que esté lista.

## Configuración Inicial para Nuevos Colaboradores 🛠️
Si eres nuevo en el proyecto, sigue estos pasos para configurar tu entorno:

1.  **Clonar el repositorio:** `git clone <url-del-repo>`
2.  **Configurar Variables de Entorno:**
    *   Ve a la carpeta `/server`.
    *   Copia el archivo de ejemplo: `cp .env.example .env` (o hazlo manual).
    *   Edita `.env` con tus credenciales de PostgreSQL.
3.  **Instalar y Configurar Base de Datos:**
    ```bash
    cd server
    npm install
    npm run db:setup  # <--- ¡Esto crea la BD y tablas automágicamente!
    ```
4.  **Iniciar Servidor:** `npm run dev`



