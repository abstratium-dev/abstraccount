# Income Statement (Profit & Loss) Comparison

## Overview

This document compares the Swiss SME standard income statement format (from KMU-Kontenplan-Französisch.pdf) with the implementation in this codebase.

---

## Standard Swiss SME Income Statement Format

The following schema comes from the document named "KMU-Kontenplan-Französisch.pdf":

```
# Compte de pertes et profits

## Compte de résultat (charges par nature)
Chiffre d'affaires net résultant des ventes et prestations de services
+/– Variation des travaux en cours et des prestations non facturées
= Produit net des ventes et des prestations de service
----
- Charges de marchandises et de matériel
= Résultat brut d'exploitation
----
- Charges de personnel
= Résultat brut d'exploitation après charges de personnel
----
- Autres charges d'exploitation
= Résultat d'exploitation avant intérêts, impôts et amortissements (EBITDA)
----
- Amortissements et corrections de valeur des immobilisations
= Résultat d'exploitation avant intérêts, impôts (EBIT)
----
- Charges financières
+ Produits financiers
= Résultat d'exploitation avant impôts (EBT)
----
+/- Résultats accessoires d'exploitation
- Charges hors exploitation
+ Produits hors exploitation
- Charges exceptionnelles, uniques ou hors période
+ Produits exceptionnels, uniques ou hors période
= Résultat de l'exercice avant impôts
----
- Impôts directs
= Résultat de l'exercice
----
```

