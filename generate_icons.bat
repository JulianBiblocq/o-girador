@echo off
npx -y sharp-cli@latest -i public/favicon.svg -o public/favicon-16x16.png resize 16 16
npx -y sharp-cli@latest -i public/favicon.svg -o public/favicon-32x32.png resize 32 32
npx -y sharp-cli@latest -i public/favicon.svg -o public/android-chrome-192x192.png resize 192 192
npx -y sharp-cli@latest -i public/favicon.svg -o public/android-chrome-512x512.png resize 512 512
npx -y sharp-cli@latest -i public/favicon.svg -o public/apple-touch-icon.png resize 180 180
npx -y sharp-cli@latest -i public/favicon.svg -o public/pwa-192x192.png resize 192 192
npx -y sharp-cli@latest -i public/favicon.svg -o public/pwa-512x512.png resize 512 512
copy /Y public\favicon-32x32.png public\favicon.ico
