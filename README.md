![Icon](https://github.com/Maryusz/flutter-mvvm-architecture/blob/master/assets/circuit-icon.png)

# Flutter MVVM architecture extension

This extension for Visual Studio Code helps you create an MVVM structure for Flutter projects as suggested by the latest guide you can find here:
[MVVM Flutter guide](https://docs.flutter.dev/app-architecture/case-study)
This extension was created with the help of ChatGPT for the sole purpose of simplifying the use of the architecture in question.

## Available Commands

- **MVVM Flutter: Create Basic Structure**

  Create the basic folder structure inside the `lib` folder of your Flutter project.

- **MVVM Flutter: Create function**

  Adds a new feature to the existing structure. You will be asked to enter the feature name.

## Usage

1. **Create the Basic Structure**

   - Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Search and select **"MVVM Flutter: Create Basic Structure"**.
   - The basic structure will be created in your project folder.

2. **Add a New Feature**

   - Make sure the basic structure has been created.
   - Open the command palette.
   - Search and select **"MVVM Flutter: Create Feature"**.
   - Enter the function name when prompted.
   - The new feature will be added into the ui folder

3. **Create base configuration**
   - Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Search and select **"MVVM Flutter: Create Base Configuration"**
   - If the \config directory doesn't exist it will be created
   - Inside it two files will be added (`assets.dart` and `dependencies.dart`). 

4. **Create Base Routing**
   - Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Search and select **"MVVM Flutter: Create Base Routing"**
   - If the \routing directory doesn't exist it will be created
   - Inside it two files will be added (`router.dart` and `routes.dart`). 

## Requirements

- Installation of Node.js and NPM.
- Visual Studio Code.

## Todo
- Add additional way to add features (for each feature a indipendent directory will be added to each layer of the architecture)

## Contribute

Feel free to contribute to this project by opening issues or pull requests on GitHub.

