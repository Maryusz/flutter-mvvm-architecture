![Icon](https://github.com/Maryusz/flutter-mvvm-architecture/blob/master/assets/circuit-icon.png)

# Flutter MVVM architecture extension

This extension for Visual Studio Code helps you create an MVVM structure for Flutter projects as suggested by the latest guide you can find here:
[MVVM Flutter guide](https://docs.flutter.dev/app-architecture/case-study)
This extension was created with the help of AI coding agents (Claude code, Codex and Gemini) for the sole purpose of simplifying the use of the architecture in question.

## Available Commands

- **MVVM Flutter: Create Project Structure**

  Create the basic folder structure inside the `lib` folder of your Flutter project.

- **MVVM Flutter: Create Feature in Presentation Layer**

  Adds a new feature to the existing structure only to the presentation layer. You will be asked to enter the feature name.

- **MVVM Flutter: Create Feature in All Layers**

  Adds a new feature to the existing structure to all the layers including base files. You will be asked to enter the feature name.

- **MVVM Flutter: Create Base Configuration**

  Creates the base files for the configuration.

- **MVVM Flutter: Create Base Routing**

  Creates the base files use for routing.

- **MVVM Flutter: Show Architecture Diagram** *(State & Dependency Inspector)*

  Opens a WebView panel with two tools:

  - **Dependency Map** — interactive graph of all features and global Riverpod providers.
    Nodes are grouped in two zones (Features / Global Providers), colour-coded by role and
    connection count. Three edge types distinguish feature-to-feature, feature-to-global and
    global-to-feature dependencies.
    - **Health bar** — live metrics strip above the map: feature count, global provider count,
      unused provider warnings (⚠) and circular dependency alerts (↺).
    - **Orphan detection** — global providers with zero usages are highlighted in amber.
    - **Cycle detection** — circular dependencies between features are highlighted in red (nodes
      and edges); a counter appears in the health bar.
    - **Hover highlight** — hovering a node dims all unrelated nodes and edges.
    - **Auto-refresh** — the diagram refreshes automatically (~1.5 s) whenever a `.dart` file is saved.

  - **3-Layer Inspector** — click any feature in the map to open its layered anatomy:
    Presentation → (Use Cases) → Domain → Data. Provider cards show type, return type and
    dependency count; hover a card to trace incoming/outgoing connections with animated bezier
    arrows. Layer violations (e.g. data importing presentation) are listed below the header.

- **MVVM Flutter: Create Clean Riverpod Feature**

  Generates a complete feature scaffold following Clean Architecture + Riverpod 2/3
  (feature-first layout): datasource interface, local/remote implementations, repository,
  optional use cases (with their own `Provider<T>`), `AsyncNotifierProvider` state notifier
  and a ready-to-use `ConsumerWidget` screen.

  You will be asked for the **plural** feature name (e.g. `companies`); the singular form is
  auto-deduced (e.g. `company`).

  **Generated files** (example: feature `companies` / class `Company`):

  | File | Key class |
  |------|-----------|
  | `data/companies_datasource_interface.dart` | `LocalCompanyDataSource` (abstract), `RemoteCompanyDataSource` (abstract) |
  | `data/local/local_companies_datasource.dart` | `LocalCompaniesDataSourceImpl implements LocalCompanyDataSource` |
  | `data/remote/remote_companies_datasource.dart` | `RemoteCompaniesDataSourceImpl implements RemoteCompanyDataSource` |
  | `domain/companies_repository.dart` | `CompaniesRepository` (abstract), `CompaniesRepositoryImpl` |
  | `domain/usecases/get_companies.dart` | `GetCompanies` *(optional)* |
  | `presentation/providers/companies_state_provider.dart` | `CompaniesNotifier` |
  | `presentation/screens/companies_screen.dart` | `CompaniesScreen` |

  **Naming convention:** interfaces use the *singular* class name (`LocalCompanyDataSource`);
  concrete implementations and providers use the *plural* form
  (`LocalCompaniesDataSourceImpl`, `localCompaniesDataSourceProvider`).


## Usage

1. **Create the Basic Structure**

   - Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Search and select **"MVVM Flutter: Create Basic Structure"**.
   - The basic structure will be created in your project folder.

2. **Create Feature in Presentation Layer**

   - Make sure the basic structure has been created.
   - Open the command palette.
   - Search and select **"MVVM Flutter: Create Feature in Presentation Layer"**.
   - Enter the function name when prompted.
   - The new feature will be added into the UI folder

3. **Create Feature in All Layers**

   - Make sure the basic structure has been created.
   - Open the command palette.
   - Search and select **"MVVM Flutter: Create Feature in All Layers"**.
   - Enter the function name when prompted.
   - The new feature will be added into the UI, Data and Domain folders

4. **Create base configuration**
   - Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Search and select **"MVVM Flutter: Create Base Configuration"**
   - If the \config directory doesn't exist it will be created
   - Inside it two files will be added (`assets.dart` and `dependencies.dart`). 

5. **Create Base Routing**
   - Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Search and select **"MVVM Flutter: Create Base Routing"**
   - If the \routing directory doesn't exist it will be created
   - Inside it two files will be added (`router.dart` and `routes.dart`). 

## Requirements

- Installation of Node.js and NPM.
- Visual Studio Code.

## Contribute

Feel free to contribute to this project by opening issues or pull requests on GitHub.

