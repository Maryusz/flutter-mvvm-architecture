# Change Log

All notable changes to the "flutter-mvvm-architecture" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 1.4.3

- Fixed a bug in the Clean Riverpod Feature generator where local and remote datasource providers were typed against a non-existent plural class name (e.g. `LocalCompaniesDataSource`) instead of the correct singular interface (e.g. `LocalCompanyDataSource`); generated Dart code now compiles without type errors
- Dependency Map now detects and displays dependencies between global providers — edges rendered as dashed purple arrows
- Global providers zone now uses a hierarchical left-to-right layout based on dependency depth (foundational providers on the left, composed ones on the right); falls back to sorted flat grid when no inter-global edges exist
- Hovering a node in the Dependency Map now shows a floating tooltip with the full bidirectional picture: which providers it depends on (orange) and which providers depend on it (blue)
- Hover highlighting is now directional: dependencies glow orange, dependents glow blue, unrelated nodes are dimmed
- Global provider nodes now show `→N` (outgoing global deps) and `←N` (incoming usages) counters, consistent with feature nodes

## 1.4.1

- Refactored datasource interface naming: split single generic `Datasource` into separate `Local{Singular}DataSource` and `Remote{Singular}DataSource` abstract classes
- Provider suffix changed from `DatasourceProvider` to `DataSourceProvider`; implementation classes now carry the `Impl` suffix
- Repository provider name extracted into a variable for consistency across generated files

## 1.4.0

- Added the Create Clean Riverpod Feature command with feature-first scaffolding for data, domain, and presentation layers
- Added optional use case generation, repository providers, and AsyncNotifier-based state management to the Clean Riverpod templates
- Added the State & Dependency Inspector with an interactive dependency map and a 3-layer feature anatomy view
- Added cycle detection, orphan provider warnings, health metrics, hover highlighting, and auto-refresh to the architecture diagram
- Improved anatomy rendering with richer provider details, dependency tracing, zoom and pan support, and clearer connection arrows

## 1.3.1
- More clear names given to commands
- Added Create Feature In All Layers

## 1.2.0

- Added Create route command
- Added Create config command
- Minor adjustments 

## 1.0.1

- Initial release 