import * as fs from "fs";
import * as path from "path";
import { toPascalCase } from "../utils/string";

export interface CleanRiverpodFeatureParams {
  featurePlural: string; // {NOME_FEATURE_PLURALE}
  featureSingular: string; // {NOME_FEATURE_SINGOLARE}
  classSingular: string; // {NOME_CLASSE_SINGOLARE}
}

export async function createCleanRiverpodFeature(
  rootPath: string,
  params: CleanRiverpodFeatureParams
): Promise<void> {
  const { featurePlural, featureSingular, classSingular } = params;
  const classPlural = toPascalCase(featurePlural);

  // Folders to create (No widgets folder as requested)
  const folders = [
    `lib/features/${featurePlural}/data/local`,
    `lib/features/${featurePlural}/data/remote`,
    `lib/features/${featurePlural}/domain/models`,
    `lib/features/${featurePlural}/presentation/providers`,
    `lib/features/${featurePlural}/presentation/screens`,
  ];

  for (const folder of folders) {
    const folderPath = path.join(rootPath, folder);
    await fs.promises.mkdir(folderPath, { recursive: true });
  }

  // File templates map
  const files: { [filePath: string]: string } = {};

  // 1. Model Domain
  files[`lib/features/${featurePlural}/domain/models/${featureSingular}.dart`] = `class ${classSingular} {
  const ${classSingular}();

  factory ${classSingular}.fromJson(Map<String, dynamic> json) {
    return const ${classSingular}();
  }

  Map<String, dynamic> toJson() {
    return {};
  }

  ${classSingular} copyWith() {
    return const ${classSingular}();
  }
}
`;

  // 2. Datasource Interface (Empty as requested)
  files[`lib/features/${featurePlural}/data/${featurePlural}_datasource_interface.dart`] = `abstract class ${classSingular}Datasource {
}
`;

  // 3. Local Datasource Concrete
  files[`lib/features/${featurePlural}/data/local/local_${featurePlural}_datasource.dart`] = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../${featurePlural}_datasource_interface.dart';

final local${classPlural}DatasourceProvider = Provider<Local${classPlural}Datasource>((ref) {
  return Local${classPlural}Datasource();
});

class Local${classPlural}Datasource implements ${classSingular}Datasource {
  Local${classPlural}Datasource();
}
`;

  // 4. Remote Datasource Concrete
  files[`lib/features/${featurePlural}/data/remote/remote_${featurePlural}_datasource.dart`] = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../${featurePlural}_datasource_interface.dart';

final remote${classPlural}DatasourceProvider = Provider<Remote${classPlural}Datasource>((ref) {
  return Remote${classPlural}Datasource();
});

class Remote${classPlural}Datasource implements ${classSingular}Datasource {
  Remote${classPlural}Datasource();
}
`;

  // 5. Repository Abstract and Concrete implementation
  files[`lib/features/${featurePlural}/domain/${featurePlural}_repository.dart`] = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/${featurePlural}_datasource_interface.dart';
import '../data/local/local_${featurePlural}_datasource.dart';
import '../data/remote/remote_${featurePlural}_datasource.dart';

final ${featureSingular}RepositoryProvider = Provider<${classPlural}Repository>((ref) {
  final localDs = ref.watch(local${classPlural}DatasourceProvider);
  final remoteDs = ref.watch(remote${classPlural}DatasourceProvider);
  return ${classPlural}RepositoryImpl(
    localDatasource: localDs,
    remoteDatasource: remoteDs,
  );
});

abstract class ${classPlural}Repository {
}

class ${classPlural}RepositoryImpl implements ${classPlural}Repository {
  final ${classSingular}Datasource _localDatasource;
  final ${classSingular}Datasource _remoteDatasource;

  ${classPlural}RepositoryImpl({
    required ${classSingular}Datasource localDatasource,
    required ${classSingular}Datasource remoteDatasource,
  })  : _localDatasource = localDatasource,
        _remoteDatasource = remoteDatasource;
}
`;

  // 6. Presentation State Provider
  files[`lib/features/${featurePlural}/presentation/providers/${featurePlural}_state_provider.dart`] = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/models/${featureSingular}.dart';
import '../../domain/${featurePlural}_repository.dart';

final ${featurePlural}StateProvider =
    AsyncNotifierProvider<${classPlural}Notifier, List<${classSingular}>>(${classPlural}Notifier.new);

class ${classPlural}Notifier extends AsyncNotifier<List<${classSingular}>> {
  @override
  Future<List<${classSingular}>> build() async {
    final repository = ref.watch(${featureSingular}RepositoryProvider);
    return [];
  }
}
`;

  // 7. Presentation Screen
  files[`lib/features/${featurePlural}/presentation/screens/${featurePlural}_screen.dart`] = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/${featurePlural}_state_provider.dart';

class ${classPlural}Screen extends ConsumerWidget {
  const ${classPlural}Screen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ${featurePlural}AsyncValue = ref.watch(${featurePlural}StateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('${classPlural}'),
      ),
      body: ${featurePlural}AsyncValue.when(
        data: (${featurePlural}) => ListView.builder(
          itemCount: ${featurePlural}.length,
          itemBuilder: (context, index) {
            final item = ${featurePlural}[index];
            return ListTile(
              title: Text(item.toString()),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: \$error')),
      ),
    );
  }
}
`;

  // Write all files
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(rootPath, relativePath);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, content, { flag: "w" });
  }
}
