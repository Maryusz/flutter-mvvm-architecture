// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // This register the base command
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

  // Command to create a new feature
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

      // Ask the user to insert the feature name
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

      // Ask the user to insert the feature name
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

  // Command to create the base configuration for providers and assets
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
          "Base configuration added with succcess!"
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error while creating the configuration: ${error}`
        );
      }
    }
  );

  // Command to create the base configuration for providers and assets
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
          "Base routing added with succcess!"
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
  context.subscriptions.push(createBaseConfigurationCmd);
  context.subscriptions.push(createBaseRoutingCmd);
}

async function createProjectStructure(rootPath: string) {
  const folders = [
    "lib/ui/core/ui",
    "lib/ui/core/themes",
    "lib/domain/models",
    "lib/data/repositories",
    "lib/data/services",
    "lib/config",
    "lib/utils",
    "lib/routing",
    "test/data",
    "test/domain",
    "test/ui",
    "test/utils",
    "testing/fakes",
    "testing/models",
  ];

  const files = [
    "lib/main_staging.dart",
    "lib/main_development.dart",
    "lib/main.dart",
  ];

  for (const folder of folders) {
    const folderPath = path.join(rootPath, folder);
    await fs.promises.mkdir(folderPath, { recursive: true });
  }

  for (const file of files) {
    const filePath = path.join(rootPath, file);
    if (!fs.existsSync(filePath)) {
      await fs.promises.writeFile(filePath, "", { flag: "w" });
    }
  }
}

async function createFeatureInPresentationLayer(
  rootPath: string,
  featureName: string
) {
  const featureFolders = [
    `lib/ui/${featureName}/view_model`,
    `lib/ui/${featureName}/widgets`,
  ];

  for (const folder of featureFolders) {
    const folderPath = path.join(rootPath, folder);
    await fs.promises.mkdir(folderPath, { recursive: true });
  }

  // Create the code templates with the feature name
  const className = capitalizeFeatureName(featureName);

  const viewModelContent = `
  import 'package:flutter/material.dart';
  
  class ${className}ViewModel extends ChangeNotifier {
	  ${className}ViewModel();
	
	  // Add your ViewModel code here
  }
  `;

  const screenContent = `
  import 'package:flutter/material.dart';
  import '../view_model/${featureName}_view_model.dart';

  
  class ${className}Screen extends StatelessWidget {
	final ${className}ViewModel viewModel;
  
	const ${className}Screen({super.key, required this.viewModel});
  
	@override
	Widget build(BuildContext context) {
	  return Scaffold();
	  }
  }
  `;

  // Paths to the files
  const viewModelFile = path.join(
    rootPath,
    `lib/ui/${featureName}/view_model/${featureName}_view_model.dart`
  );
  const screenFile = path.join(
    rootPath,
    `lib/ui/${featureName}/widgets/${featureName}_screen.dart`
  );

  // Write the content to the files
  await fs.promises.writeFile(viewModelFile, viewModelContent, { flag: "w" });
  await fs.promises.writeFile(screenFile, screenContent, { flag: "w" });
}

async function createFeatureInAllLayers(rootPath: string, featureName: string) {
  // The implementation of the addition of the feature in the presentation layer remains the same
  await createFeatureInPresentationLayer(rootPath, featureName);
  await createFeatureInDataLayer(rootPath, featureName);
  await createFeatureInDomainLayer(rootPath, featureName);
}

async function createBaseConfiguration(rootPath: string) {
  // Adds two files into config folder
  // dependencies.dart handle providers and change notifiers
  // assets.dart handle... assets
  const configFolders = ["lib/config"];

  for (const folder of configFolders) {
    const folderPath = path.join(rootPath, folder);
    await fs.promises.mkdir(folderPath, { recursive: true });
  }

  const dependenciesContent = `
import 'package:provider/single_child_widget.dart';

//! Add Provider to your pubspect.yaml file

/// Shared providers for all configurations.
List<SingleChildWidget> _sharedProviders = [];

List<SingleChildWidget> get providersRemote {
  return [
    //! Add your remote providers here
    ..._sharedProviders,
  ];
}

List<SingleChildWidget> get providersLocal {
  return [
    //! Add your local providers here
    ..._sharedProviders,
  ];
}

  `;

  // Paths to the files
  const dependenciesFile = path.join(rootPath, `lib/config/dependencies.dart`);

  const assetsContent = `
abstract final class Assets {
  // static const asset_one = 'assets/asset_file.extension';
  // static const asset_two = 'assets/asset_file.extension';
}
  `;

  const assetsFile = path.join(rootPath, `lib/config/assets.dart`);

  // Write the content to the files
  await fs.promises.writeFile(dependenciesFile, dependenciesContent, {
    flag: "w",
  });
  await fs.promises.writeFile(assetsFile, assetsContent, { flag: "w" });
}

async function createBaseRouting(rootPath: string) {
  const routingFolders = ["lib/routing"];

  for (const folder of routingFolders) {
    const folderPath = path.join(rootPath, folder);
    await fs.promises.mkdir(folderPath, { recursive: true });
  }

  const routerContent = `
//! Add your router configuration here
  `;

  const routerFile = path.join(rootPath, `lib/routing/router.dart`);

  const routesContent = `
abstract final class Routes {
  static const home = '/';
  // Add your routes here
}`;

  const routesFile = path.join(rootPath, `lib/routing/routes.dart`);

  await fs.promises.writeFile(routerFile, routerContent, { flag: "w" });
  await fs.promises.writeFile(routesFile, routesContent, { flag: "w" });
}

function capitalizeFeatureName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

async function createFeatureInDataLayer(rootPath: string, featureName: string) {
  const featureFolders = [`lib/data/repositories/${featureName}`];

  for (const folder of featureFolders) {
    const folderPath = path.join(rootPath, folder);
    await fs.promises.mkdir(folderPath, { recursive: true });
  }

  // Create the code templates with the feature name
  const className = capitalizeFeatureName(featureName);

  const repositoryContent = `
  /// Data source for activities.
  abstract class ${className}Repository {
  /// Add the interface methods here
}`;

  const localRepositoryContent = `
    import '${featureName}_repository.dart';
  /// Local implementation of ${className}Repository
class ${className}RepositoryLocal implements ${className}Repository {

  // In the constructor, you can add the dependencies needed to access the local data
  // ${className}RepositoryLocal({
  //  required LocalDataService localDataService,
  // }) : _localDataService = localDataService;

  // final LocalDataService _localDataService;

  // Add the implementation of the interface methods here
}`;

  const remoteRepositoryContent = `
  import '${featureName}_repository.dart';
/// Remote implementation of ${className}Repository
class ${className}RepositoryRemote implements ${className}Repository {

// In the constructor, you can add the dependencies needed to access the remote data
// ${className}RepositoryRemote({
//    required ApiClient apiClient,
//  }) : _apiClient = apiClient;

//  final ApiClient _apiClient;

// Add the implementation of the interface methods here
}`;

  const repositoryFile = path.join(
    rootPath,
    `lib/data/repositories/${featureName}/${featureName}_repository.dart`
  );

  const localRepositoryFile = path.join(
    rootPath,
    `lib/data/repositories/${featureName}/${featureName}_repository_local.dart`
  );

  const remoteRepositoryFile = path.join(
    rootPath,
    `lib/data/repositories/${featureName}/${featureName}_repository_remote.dart`
  );

  await fs.promises.writeFile(repositoryFile, repositoryContent, { flag: "w" });
  await fs.promises.writeFile(localRepositoryFile, localRepositoryContent, {
    flag: "w",
  });
  await fs.promises.writeFile(remoteRepositoryFile, remoteRepositoryContent, {
    flag: "w",
  });
}

async function createFeatureInDomainLayer(
  rootPath: string,
  featureName: string
) {
  const featureFolders = [`lib/domain/models/${featureName}`];

  for (const folder of featureFolders) {
    const folderPath = path.join(rootPath, folder);
    await fs.promises.mkdir(folderPath, { recursive: true });
  }

  // Create the code templates with the feature name
  const className = capitalizeFeatureName(featureName);

  const modelContent = `
class ${className} {
  /// Add the implementation of the model here
}`;

  const modelFile = path.join(
    rootPath,
    `lib/domain/models/${featureName}/${featureName}.dart`
  );

  await fs.promises.writeFile(modelFile, modelContent, { flag: "w" });
}

// This method is called when your extension is deactivated
export function deactivate() {}
