![Icon](https://github.com/Maryusz/flutter-mvvm-architecture/blob/master/assets/circuit-icon.png)

# Flutter MVVM architecture extension

This extension for Visual Studio Code helps you create an MVVM structure for Flutter projects as suggested by the latest guide you can find here:
[MVVM Flutter guide](https://docs.flutter.dev/app-architecture/case-study)
This extension was created with the help of ChatGPT for the sole purpose of simplifying the use of the architecture in question.

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

