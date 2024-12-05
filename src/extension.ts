// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // This register the base command
  let createBaseStructureCmd = vscode.commands.registerCommand(
    "mvvmFlutterArchitecture.createBaseStructure",
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
        await createBaseStructure(rootPath);
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
  let createFeatureCmd = vscode.commands.registerCommand(
    "mvvmFlutterArchitecture.createFeature",
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
        await createFeatureStructure(rootPath, featureName);
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

  context.subscriptions.push(createBaseStructureCmd);
  context.subscriptions.push(createFeatureCmd);
}

async function createBaseStructure(rootPath: string) {
  const folders = [
    "lib/ui/core/ui",
    "lib/ui/core/themes",
    "lib/domain/models",
    "lib/data/repositories",
    "lib/data/services",
    "lib/data/model",
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

async function createFeatureStructure(rootPath: string, featureName: string) {
	const featureFolders = [
	  `lib/ui/${featureName}/view_model`,
	  `lib/ui/${featureName}/widgets`
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
	  return const Scaffold();
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
	await fs.promises.writeFile(viewModelFile, viewModelContent, { flag: 'w' });
	await fs.promises.writeFile(screenFile, screenContent, { flag: 'w' });
  }

  function capitalizeFeatureName(name: string): string {
	return name
	  .split('_')
	  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
	  .join('');
  }
  
  

// This method is called when your extension is deactivated
export function deactivate() {}
