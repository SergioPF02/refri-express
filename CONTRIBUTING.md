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
