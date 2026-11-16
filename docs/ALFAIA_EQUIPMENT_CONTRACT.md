# Contrat Inter-Applications — Equipement Secondaire d'Alfaia (`alfaiaEquipment`)

Contrat partage entre **Sequenciador** et **Organizador** (sous gouvernance SSOT **Orquestrador**) pour determiner automatiquement la baguette de main secondaire d'une piste ou d'un morceau d'Alfaia sans re-parser les grilles rythmiques cote **Organizador**.

## 1. Regle Metier et Ordre de Priorite

Sur chaque piste de la famille Alfaia (`alfaia`, `marcante`, `meiao`, `repique`), la main dominante tient toujours une grosse mailloche (`macaneta`). La baguette secondaire (main gauche en droitier, main droite en gaucher `isLeftHanded: true`) est resolue en inspectant tous les patterns utilises sur la timeline (`measureAssignments`, `patternOverrides`, `variations`, `preRollActiveSteps`), y compris les pas subdivises `[sub1, sub2]` :

1. **`'bacalhau'`** : au moins une frappe **`I`** (ou `i`) est presente (baguette souple d'Igarassu).
2. **`'fina'`** : aucun `I`, mais au moins une frappe **`A`** ou **`a`** (*Abafado*) est presente (baguette fine en bois pour etouffer et relancer).
3. **`'macaneta'`** : ni `I` ni `A`/`a` (uniquement `E`, `e`, `D`, `d`, `X`, `C`, `B`, `b` ou silences -> deux grosses mailloches jumelles).

Priorite stricte d'agregation entre pistes d'un meme role ou sur l'ensemble du morceau :
`bacalhau` > `fina` > `macaneta`.

Si le morceau ou la section ne comporte **aucune** piste de la famille Alfaia (exemple : breque uniquement Caixa ou Sementes), la resolution retourne **`null`**.

## 2. Schema JSON et Champs Firestore

Lors de la sauvegarde d'un Preset ou d'une Section depuis **Sequenciador**, le champ `alfaiaEquipment` (jamais `undefined`, toujours objet ou `null`) est ecrit :
- Dans `Preset.metadata.alfaiaEquipment` (export JSON / payload compresse `data`).
- A la racine du document Firestore `/presets/{presetId}` et `/sections/{sectionId}` (lecture directe par **Organizador** sans decompression `LZString`).

```json
{
  "alfaiaEquipment": {
    "secondaryStick": "fina",
    "byRole": {
      "marcante": "macaneta",
      "meiao": "macaneta",
      "repique": "fina"
    }
  }
}
```

Exemple sans piste Alfaia :
```json
{
  "alfaiaEquipment": null
}
```

## 3. Consommation dans Sequenciador et Organizador

- **Sequenciador (*Ao Vivo*)** : en mode par defaut `leftStickMode: 'auto'`, chaque piste Alfaia charge et conserve sa baguette secondaire (`AlfaiaBacalhauStickSvg`, `AlfaiaFinaStickSvg` ou `AlfaiaTwinMacanetaSvg`) sur toute la duree du morceau. Les modes manuels du Labo gardent priorite sur `'auto'`.
- **Organizador** : lit directement `doc.alfaiaEquipment` (ou `preset.metadata.alfaiaEquipment`) pour afficher le materiel requis sur les fiches de Baque par pupitre (`byRole`) et generer les QCM pedagogiques sans analyser les tableaux `activeSteps`.
