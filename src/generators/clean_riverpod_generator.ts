import * as fs from "fs";
import * as path from "path";
import { toPascalCase } from "../utils/string";

export interface CleanRiverpodFeatureParams {
  featurePlural: string; // {NOME_FEATURE_PLURALE}
  featureSingular: string; // {NOME_FEATURE_SINGOLARE}
  classSingular: string; // {NOME_CLASSE_SINGOLARE}
  includeUseCases: boolean;
}

export async function createCleanRiverpodFeature(
  rootPath: string,
  params: CleanRiverpodFeatureParams
): Promise<void> {
  const { featurePlural, featureSingular, classSingular, includeUseCases } = params;
  const classPlural = toPascalCase(featurePlural);
  const repositoryProviderName = `${classPlural.charAt(0).toLowerCase()}${classPlural.slice(1)}RepositoryProvider`;

  // Folders to create (No widgets folder as requested)
  const folders = [
    `lib/features/${featurePlural}/data/local`,
    `lib/features/${featurePlural}/data/remote`,
    `lib/features/${featurePlural}/domain/models`,
    `lib/features/${featurePlural}/presentation/providers`,
    `lib/features/${featurePlural}/presentation/screens`,
  ];

  if (includeUseCases) {
    folders.push(`lib/features/${featurePlural}/domain/usecases`);
  }

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

  // 2. Datasource Interfaces (split local/remote to allow divergent contracts)
  files[`lib/features/${featurePlural}/data/${featurePlural}_datasource_interface.dart`] = `abstract class Local${classSingular}DataSource {
}

abstract class Remote${classSingular}DataSource {
}
`;

  // 3. Local Datasource Concrete
  files[`lib/features/${featurePlural}/data/local/local_${featurePlural}_datasource.dart`] = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../${featurePlural}_datasource_interface.dart';

final local${classPlural}DataSourceProvider = Provider<Local${classPlural}DataSource>((ref) {
  return Local${classPlural}DataSourceImpl();
});

class Local${classPlural}DataSourceImpl implements Local${classSingular}DataSource {
  Local${classPlural}DataSourceImpl();
}
`;

  // 4. Remote Datasource Concrete
  files[`lib/features/${featurePlural}/data/remote/remote_${featurePlural}_datasource.dart`] = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../${featurePlural}_datasource_interface.dart';

final remote${classPlural}DataSourceProvider = Provider<Remote${classPlural}DataSource>((ref) {
  return Remote${classPlural}DataSourceImpl();
});

class Remote${classPlural}DataSourceImpl implements Remote${classSingular}DataSource {
  Remote${classPlural}DataSourceImpl();
}
`;

  // 5. Repository Abstract and Concrete implementation
  files[`lib/features/${featurePlural}/domain/${featurePlural}_repository.dart`] = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/${featurePlural}_datasource_interface.dart';
import '../data/local/local_${featurePlural}_datasource.dart';
import '../data/remote/remote_${featurePlural}_datasource.dart';

final ${repositoryProviderName} = Provider<${classPlural}Repository>((ref) {
  final localDs = ref.watch(local${classPlural}DataSourceProvider);
  final remoteDs = ref.watch(remote${classPlural}DataSourceProvider);
  return ${classPlural}RepositoryImpl(
    localDatasource: localDs,
    remoteDatasource: remoteDs,
  );
});

abstract class ${classPlural}Repository {
}

class ${classPlural}RepositoryImpl implements ${classPlural}Repository {
  final Local${classSingular}DataSource _localDatasource;
  final Remote${classSingular}DataSource _remoteDatasource;

  ${classPlural}RepositoryImpl({
    required Local${classSingular}DataSource localDatasource,
    required Remote${classSingular}DataSource remoteDatasource,
  })  : _localDatasource = localDatasource,
        _remoteDatasource = remoteDatasource;
}
`;

  // Optional domain use case scaffold
  if (includeUseCases) {
    files[`lib/features/${featurePlural}/domain/usecases/get_${featurePlural}.dart`] = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../${featurePlural}_repository.dart';
import '../models/${featureSingular}.dart';

final get${classPlural}UseCaseProvider = Provider<Get${classPlural}>((ref) {
  final repository = ref.watch(${repositoryProviderName});
  return Get${classPlural}(repository);
});

class Get${classPlural} {
  final ${classPlural}Repository _repository;

  Get${classPlural}(this._repository);

  Future<List<${classSingular}>> call() async {
    // TODO: implement use case logic
    return [];
  }
}
`;
  }

  // 6. Presentation State Provider
  if (includeUseCases) {
    files[`lib/features/${featurePlural}/presentation/providers/${featurePlural}_state_provider.dart`] = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/models/${featureSingular}.dart';
import '../../domain/usecases/get_${featurePlural}.dart';

final ${featurePlural}StateProvider =
    AsyncNotifierProvider<${classPlural}Notifier, List<${classSingular}>>(${classPlural}Notifier.new);

class ${classPlural}Notifier extends AsyncNotifier<List<${classSingular}>> {
  @override
  Future<List<${classSingular}>> build() async {
    final useCase = ref.watch(get${classPlural}UseCaseProvider);
    return await useCase();
  }
}
`;
  } else {
    files[`lib/features/${featurePlural}/presentation/providers/${featurePlural}_state_provider.dart`] = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/models/${featureSingular}.dart';
import '../../domain/${featurePlural}_repository.dart';

final ${featurePlural}StateProvider =
    AsyncNotifierProvider<${classPlural}Notifier, List<${classSingular}>>(${classPlural}Notifier.new);

class ${classPlural}Notifier extends AsyncNotifier<List<${classSingular}>> {
  @override
  Future<List<${classSingular}>> build() async {
    final repository = ref.watch(${repositoryProviderName});
    return [];
  }
}
`;
  }

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
