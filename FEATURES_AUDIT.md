# Audit des Fonctionnalités : O Girador

Ce document dresse la liste complète des fonctionnalités de l'application **O Girador**, classées de la plus stratégique/importante à la moins critique. Il inclut également une proposition de bloc "Forfait" (Pricing / Highlights) pour présenter l'application aux futurs utilisateurs.

---

## 📋 Hiérarchisation des Fonctionnalités (De la plus à la moins importante)

### 1. Le Cœur du Moteur Musical (Essentiel)
* **Séquenceur Linéaire & Mode Song** : Création, organisation et structuration de compositions mesure par mesure via une interface horizontale intuitive. Possibilité de créer de multiples motifs (patterns) par instrument.
* **Moteur Audio Haute Fidélité** : Utilisation de la Web Audio API et de Tone.js garantissant un séquençage stable (sans désynchronisation) et une lecture de qualité professionnelle.
* **Contrôle Dynamique par Pas (Micro-timing & Decay)** : Réglage du volume individuel, de la durée (résonance/étouffement) et micro-décalage temporel (avance/retard) pour chaque frappe.

### 2. L'Identité Culturelle et Visuelle (Différenciateur)
* **Visualisation "Roda de Maracatu"** : Interface circulaire dynamique en temps réel simulant le positionnement physique des instruments dans une vraie Roda, avec baguette de lecture rotative.
* **Algorithme "Swing Maracatu"** : Système reproduisant mécaniquement le balancement (gingado) authentique et traditionnel du Baque Virado, notamment sur les caisses.
* **Design "Cordel & Xilogravura"** : Interface utilisateur unique, rustique et élégante inspirée de la littérature de cordel.

### 3. Les Dynamiques Musicales Avancées (Pro/Avancé)
* **Rampes de Tempo (Aceleração / Arrasto)** : Création d'accélérations et décélérations fluides entre les mesures, une dynamique vitale dans la musique de maracatu.
* **Signatures Rythmiques Multiples** : Capacité de définir des signatures différentes par mesure (4/4, 3/4, 2/4, 6/8, 12/8).
* **Automations de Volume (Fades)** : Contrôle du volume par mesure avec transitions progressives (Fade In / Fade Out) ou immédiates.

### 4. L'Interactivité et l'Apprentissage (Engagement)
* **Toada (Syllabe Karaoké)** : Génération automatique de pistes vocales avec affichage synchronisé type karaoké, séparant visuellement le Chanteur (PUX) et le Chœur (CORO).
* **Bibliothèque de Presets Intégrée** : Rythmes traditionnels pré-chargés (Baque de Luanda, Imalê, Pitomba, etc.) prêts à être écoutés et modifiés.

### 5. Exportation et Sauvegarde (Utilitaires)
* **Enregistrement Audio en Temps Réel** : Capture instantanée de la session au format `.webm` pour partage facile.
* **Import/Export JSON** : Sauvegarde locale des compositions et motifs personnels pour un rechargement ultérieur.

---

## 💎 Bloc "Forfait" : Les Points Forts (Pour Landing Page)

Voici une proposition de structure pour un bloc de type "Forfait" ou "Features", idéal pour la page d'accueil de l'application, un pitch de présentation ou un tableau de prix.

> ### **O Girador : Votre Roda de Maracatu Virtuelle**
> *Le seul séquenceur web dédié au Maracatu de Baque Virado.*
>
> ✓ **Séquenceur Professionnel & Mode Song** : Arrangez vos compositions avec une précision chirurgicale (volume, micro-timing, résonance).  
> ✓ **Swing Authentique** : Algorithme exclusif reproduisant le "gingado" traditionnel des tambours de Pernambuco.  
> ✓ **Roda Interactive** : Visualisez votre musique en temps réel dans un cercle concentrique dynamique.  
> ✓ **Dynamiques Avancées** : Créez des accélérations de tempo fluides et mixez les signatures rythmiques à la volée.  
> ✓ **Toada Karaoké** : Chantez avec le chœur grâce à l'affichage synchronisé des paroles.  
> ✓ **Export Facile** : Enregistrez vos créations en un clic (.webm) ou sauvegardez vos projets hors-ligne.  
> 
> **[ Commencer à jouer gratuitement ]**

---

*Note pour le développement : L'ensemble de ces fonctionnalités respecte la contrainte de performance absolue (60 FPS, Zero Render Thrashing) via la manipulation directe du DOM et l'utilisation optimisée de Zustand.*
