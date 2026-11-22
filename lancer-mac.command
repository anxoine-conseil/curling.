#!/bin/bash
cd "$(dirname "$0")"
echo "Préparation de Curling (la première fois, cela peut prendre une minute)..."
if ! command -v npm >/dev/null 2>&1; then
  echo "Problème : Node.js n'est pas installé. Installez-le depuis https://nodejs.org (version LTS), puis recommencez."
  read -p "Appuyez sur Entrée pour fermer."
  exit 1
fi
npm install --omit=dev --no-fund --no-audit
(sleep 2; open http://localhost:3000) &
npm start
