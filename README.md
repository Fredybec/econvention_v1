# Plateforme de Gestion des Stages et Conventions FST

## Installation

Installer les dépendances :

```bash
npm install
```

## Configuration

Créer le fichier `.env` à partir du modèle fourni :

```bash
cp .env.example .env
```

Renseigner ensuite :

* Les paramètres MariaDB
* La configuration Firebase
* Les identifiants Firebase Admin
* NB: La configuration Firebase est necessaire pour l'auth avec Google

## Lancement en développement

```bash
npm run dev
```

## Build de production

```bash
npm run build
```

## Démarrage en production

```bash
npm start
```

## Base de données

L'application crée automatiquement la base `fst_records`, les tables et les comptes par défaut au premier démarrage.

⚠️ Vérifiez les logs en cas d'erreur de connexion à MariaDB ou d'initialisation.

## Comptes créés automatiquement

**Mot de passe par défaut :**

```text
fst2025
```

### Administration

| Rôle                     | Email                                                             |
| ------------------------ | ----------------------------------------------------------------- |
| Super Admin              | [admin@uca.ac.ma](mailto:admin@uca.ac.ma)                         |
| Responsable Informatique | [respo.info@uca.ac.ma](mailto:respo.info@uca.ac.ma)               |
| Service Scolarité        | [scolarite@uca.ac.ma](mailto:scolarite@uca.ac.ma)                 |
| Service Stage            | [service.stage@uca.ac.ma](mailto:service.stage@uca.ac.ma)         |
| Vice Doyen Pédagogie     | [vdp@uca.ac.ma](mailto:vdp@uca.ac.ma)                             |
| Secrétariat Doyen        | [secretariat.doyen@uca.ac.ma](mailto:secretariat.doyen@uca.ac.ma) |
| Support Technique        | [support@uca.ac.ma](mailto:support@uca.ac.ma)                     |

### Étudiants

| Nom                   | Email                                                     |
| --------------------- | --------------------------------------------------------- |
| Étudiant Informatique | [student.info@uca.ac.ma](mailto:student.info@uca.ac.ma)   |
| Etudiant Info 2        | [student2.info@uca.ac.ma](mailto:student2.info@uca.ac.ma) |
| Etudiant Info 3  | [student3.info@uca.ac.ma](mailto:student3.info@uca.ac.ma) |

## Première connexion

```text
Email : admin@uca.ac.ma
Mot de passe : fst2025
```

Une fois ces paramètres configurés, la plateforme est prête à être utilisée.
