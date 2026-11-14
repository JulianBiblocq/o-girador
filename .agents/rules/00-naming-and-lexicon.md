---
trigger: always_on
---
# 00 — Règle Stricte de Nommage & Lexique Métier (Écosystème O Girador)

## 1. Règle 0 : Orthographe Brésilienne Pure des 8 Applications
Il est formellement interdit d'insérer une apostrophe, un accent français parasite ou une majuscule interne avant la finale `-or` dans le nom des applications (que ce soit dans le code, les traductions, les commentaires, les scripts CI, les discussions ou la documentation). Ne jamais franciser `qu` en `ch` ni omettre la cédille de **Dançador**.

Utiliser **exclusivement** les 8 graphies officielles suivantes :
- **O Girador** (suite globale)
- **Orquestrador** (`o-girador-orquestrador` — Hub central, espace Mestre & back-office SSOT)
- **Organizador** (`o-girador-organizador` — Gestion associative, membres, répertoire, agenda, trésorerie)
- **Sequenciador** (`o-girador-sequenciador` — Séquenceur musical temps-réel, exercices, presets cloud)
- **Cantador** (`o-girador-vocal-lab` — Laboratoire vocal, enregistrement de Toadas, découpage syllabique, ambitus)
- **Dançador** (`o-girador-dancador` — Constructeur de chorégraphies, catalogue de pas, suivi corporel)
- **Mostrador** (hébergé par `o-girador-organizador`, target `mostrador` — Vitrine publique & portail web des groupes)
- **Afinador** (`o-girador-afinador` — Future 7e application en conception, réservée sous drapeau inactif `enabled: false` : ne créer aucun lien actif ni bouton grisé dans les menus utilisateurs tant qu'elle n'existe pas)

## 2. Vocabulaire Musical & Culturel par Univers
- **Interdiction absolue du mot `Bateria` dans l'univers Maracatu** (ainsi que dans tout libellé générique non qualifié par univers) :
  * En Maracatu, toujours employer **`Batuque`** (l'ensemble des percussions) ou **`Baque`** (le rythme / l'exécution).
  * Dans les composants multi-univers, consommer systématiquement le jeton dynamique `terminology.instrumentGroup` (`Batuque` en Maracatu, `Bateria` uniquement dans les dictionnaires explicites `samba` / `batucada`, `Roda` / `Bateria` en Capoeira).

## 3. Interdiction du Mot `IA` dans l'Interface Utilisateur
- Ne jamais afficher l'acronyme **`IA`**, **`Intelligence Artificielle`** ou **`Inteligência Artificial`** dans les composants `.jsx`/`.tsx`, info-bulles, modales, messages d'erreur ou fichiers de traduction visibles par l'utilisateur ou l'administrateur.
- Privilégier un vocabulaire artisanal et métier : *« Analyse automatique »*, *« Détection optique »*, *« Assistant de transcription »*, *« Détourage automatique »*.
- *Exception unique autorisée :* clauses juridiques obligatoires (directive européenne TDM anti-moissonnage) dans les pages de mentions légales (`LegalView` / `legalNoticeContent`).
