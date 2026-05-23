import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  createProjectStructure,
  createFeatureInPresentationLayer,
  createFeatureInAllLayers,
  createBaseConfiguration,
  createBaseRouting,
} from "./generators/mvvm_generator";
import { createCleanRiverpodFeature } from "./generators/clean_riverpod_generator";
import { StateDiagramPanel } from "./panels/state_diagram_panel";
import { deduceSingular, toPascalCase } from "./utils/string";

function isLikelyFlutterProject(rootPath: string): boolean {
  const hasLib = fs.existsSync(path.join(rootPath, "lib"));
  const hasPubspec = fs.existsSync(path.join(rootPath, "pubspec.yaml"));
  return hasLib && hasPubspec;
}

function findFlutterRootFromPath(startPath: string): string | null {
  let current = fs.existsSync(startPath) && fs.statSync(startPath).isDirectory()
    ? startPath
    : path.dirname(startPath);

  while (true) {
    if (isLikelyFlutterProject(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) { break; }
    current = parent;
  }

  return null;
}

function findNestedFlutterProjects(rootPath: string, maxDepth: number): string[] {
  const results: string[] = [];
  const excluded = new Set([".git", ".idea", ".vscode", "node_modules", "build", "out", "dist", ".dart_tool"]);

  function visit(dir: string, depth: number) {
    if (isLikelyFlutterProject(dir)) {
      results.push(dir);
      return;
    }
    if (depth >= maxDepth) { return; }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) { continue; }
      if (excluded.has(entry.name)) { continue; }
      visit(path.join(dir, entry.name), depth + 1);
    }
  }

  visit(rootPath, 0);
  return results;
}

async function resolveFlutterRootPath(workspaceFolders: readonly vscode.WorkspaceFolder[]): Promise<string | null> {
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri && activeUri.scheme === "file") {
    const activeFilePath = activeUri.fsPath;
    const fromActive = findFlutterRootFromPath(activeFilePath);
    if (fromActive) {
      return fromActive;
    }
  }

  const detected = workspaceFolders.find((folder) =>
    isLikelyFlutterProject(folder.uri.fsPath)
  );
  if (detected) {
    return detected.uri.fsPath;
  }

  const nestedCandidates = workspaceFolders.flatMap((folder) =>
    findNestedFlutterProjects(folder.uri.fsPath, 4)
  );

  if (nestedCandidates.length === 0) {
    return null;
  }
  if (nestedCandidates.length === 1) {
    return nestedCandidates[0];
  }

  const selected = await vscode.window.showQuickPick(
    nestedCandidates.map((candidate) => ({
      label: path.basename(candidate),
      description: candidate,
      candidate,
    })),
    {
      placeHolder: "Multiple Flutter projects found. Select one for the inspector.",
      canPickMany: false,
    }
  );

  return selected?.candidate ?? null;
}

export function activate(context: vscode.ExtensionContext) {
  // Base project structure configuration
  let createProjectStructureCmd = vscode.commands.registerCommand(
    "mvvmFlutterArchitecture.createProjectStructure",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          "Open a workspace folder before running this command."
        );
        return;
      }
      const rootPath = workspaceFolders[0].uri.fsPath;
      try {
        await createProjectStructure(rootPath);
        vscode.window.showInformationMessage(
          "Base structure created with success!"
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error while creating the structure: ${error}`
        );
      }
    }
  );

  // Presentation layer feature creation
  let createFeatureInPresentationLayerCmd = vscode.commands.registerCommand(
    "mvvmFlutterArchitecture.createFeatureInPresentationLayer",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          "Open a workspace folder before running this command."
        );
        return;
      }
      const rootPath = workspaceFolders[0].uri.fsPath;
      const featureName = await vscode.window.showInputBox({
        prompt: "Please insert the feature name",
      });
      if (!featureName) {
        vscode.window.showErrorMessage("No feature name inserted.");
        return;
      }
      try {
        await createFeatureInPresentationLayer(rootPath, featureName);
        vscode.window.showInformationMessage(
          `Feature "${featureName}" successfully created!`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `An error occurred while creating the feature: ${error}`
        );
      }
    }
  );

  // Complete layer MVVM style feature creation
  let createFeatureInAllLayersCmd = vscode.commands.registerCommand(
    "mvvmFlutterArchitecture.createFeatureInAllLayers",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          "Open a workspace folder before running this command."
        );
        return;
      }
      const rootPath = workspaceFolders[0].uri.fsPath;
      const featureName = await vscode.window.showInputBox({
        prompt: "Please insert the feature name",
      });
      if (!featureName) {
        vscode.window.showErrorMessage("No feature name inserted.");
        return;
      }
      try {
        await createFeatureInAllLayers(rootPath, featureName);
        vscode.window.showInformationMessage(
          `Feature "${featureName}" successfully created!`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `An error occurred while creating the feature: ${error}`
        );
      }
    }
  );

  // Riverpod, Clean Architecture (Feature-First) Generator command (No Code Gen)
  let createCleanRiverpodFeatureCmd = vscode.commands.registerCommand(
    "mvvmFlutterArchitecture.createCleanRiverpodFeature",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          "Open a workspace folder before running this command."
        );
        return;
      }
      const rootPath = workspaceFolders[0].uri.fsPath;

      // 1. Plural Feature Name
      const featurePluralInput = await vscode.window.showInputBox({
        prompt: "Nome feature al plurale (snake_case) es: companies, user_profiles",
        placeHolder: "companies",
      });
      if (!featurePluralInput) {
        vscode.window.showErrorMessage("Creazione feature annullata. Inserire un nome plurale valido.");
        return;
      }
      const featurePlural = featurePluralInput.trim().toLowerCase();

      // 2. Singular Feature Name (Auto-deduced)
      const inferredSingular = deduceSingular(featurePlural);
      const featureSingularInput = await vscode.window.showInputBox({
        prompt: "Conferma o modifica il nome feature al singolare (snake_case)",
        value: inferredSingular,
      });
      if (!featureSingularInput) {
        vscode.window.showErrorMessage("Creazione feature annullata. Inserire un nome singolare valido.");
        return;
      }
      const featureSingular = featureSingularInput.trim().toLowerCase();

      // 3. Class Name PascalCase (Auto-deduced)
      const inferredClassName = toPascalCase(featureSingular);
      const classSingularInput = await vscode.window.showInputBox({
        prompt: "Conferma o modifica il nome della classe della feature (PascalCase)",
        value: inferredClassName,
      });
      if (!classSingularInput) {
        vscode.window.showErrorMessage("Creazione feature annullata. Inserire un nome di classe valido.");
        return;
      }
      const classSingular = classSingularInput.trim();

      // 4. Optional Use Cases
      const includeUseCasesChoice = await vscode.window.showQuickPick(
        ["si", "no"],
        {
          placeHolder: "Aggiungere gli useCase?",
          canPickMany: false,
        }
      );
      if (!includeUseCasesChoice) {
        vscode.window.showErrorMessage(
          "Creazione feature annullata. Selezionare se aggiungere gli useCase."
        );
        return;
      }
      const includeUseCases = includeUseCasesChoice === "si";

      try {
        await createCleanRiverpodFeature(rootPath, {
          featurePlural,
          featureSingular,
          classSingular,
          includeUseCases,
        });
        vscode.window.showInformationMessage(
          `Feature Clean Riverpod "${featurePlural}" creata con successo!`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Errore durante la creazione della feature Clean Riverpod: ${error}`
        );
      }
    }
  );

  // Command to show architectural dependency state diagram webview
  let showArchitectureDiagramCmd = vscode.commands.registerCommand(
    "mvvmFlutterArchitecture.showArchitectureDiagram",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          "Open a workspace folder before running this command."
        );
        return;
      }
      const rootPath = await resolveFlutterRootPath(workspaceFolders);
      if (!rootPath) {
        vscode.window.showErrorMessage(
          "No Flutter project detected in the current workspace. Open the folder that contains pubspec.yaml and lib/."
        );
        return;
      }
      StateDiagramPanel.createOrShow(context.extensionUri, rootPath);
    }
  );

  // Configuration command
  let createBaseConfigurationCmd = vscode.commands.registerCommand(
    "mvvmFlutterArchitecture.createBaseConfiguration",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          "Open a workspace folder before running this command."
        );
        return;
      }
      const rootPath = workspaceFolders[0].uri.fsPath;
      try {
        await createBaseConfiguration(rootPath);
        vscode.window.showInformationMessage(
          "Base configuration added with success!"
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error while creating the configuration: ${error}`
        );
      }
    }
  );

  // Routing command
  let createBaseRoutingCmd = vscode.commands.registerCommand(
    "mvvmFlutterArchitecture.createBaseRouting",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          "Open a workspace folder before running this command."
        );
        return;
      }
      const rootPath = workspaceFolders[0].uri.fsPath;
      try {
        await createBaseRouting(rootPath);
        vscode.window.showInformationMessage(
          "Base routing added with success!"
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error while creating basic routing: ${error}`
        );
      }
    }
  );

  context.subscriptions.push(createProjectStructureCmd);
  context.subscriptions.push(createFeatureInPresentationLayerCmd);
  context.subscriptions.push(createFeatureInAllLayersCmd);
  context.subscriptions.push(createCleanRiverpodFeatureCmd);
  context.subscriptions.push(showArchitectureDiagramCmd);
  context.subscriptions.push(createBaseConfigurationCmd);
  context.subscriptions.push(createBaseRoutingCmd);
}

export function deactivate() {}


