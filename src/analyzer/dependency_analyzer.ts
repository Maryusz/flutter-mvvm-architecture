import * as fs from "fs";
import * as path from "path";

export interface DependencyNode {
  id: string;
  label: string;
  group: "feature" | "global_provider" | "core" | "external";
  isFeature: boolean;
}

export interface DependencyEdge {
  from: string;
  to: string;
}

export interface ArchitectureDiagramData {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  globalProviders: DartProviderInfo[];
}

export interface DartProviderInfo {
  name: string;
  providerType: string;
  returnType: string;
  definedInFile?: string;
  absolutePath?: string;
  layer?: "presentation" | "domain" | "data" | "unknown";
  dependencies?: string[];
  dependencyDetails?: { name: string; type: "watch" | "read" | "listen" | "unknown" }[];
}

export interface DartFileInfo {
  fileName: string;
  relativePath: string;
  absolutePath: string;
  classes: string[];
  providers: DartProviderInfo[];
}

export interface LayerDetails {
  files: DartFileInfo[];
  totalProviderCount: number;
}

export interface LayerViolation {
  providerName: string;
  providerLayer: string;
  dependencyName: string;
  dependencyLayer: string;
  severity: "error" | "warning";
  message: string;
}

export interface FeatureAnatomy {
  featureName: string;
  data: LayerDetails;
  domain: LayerDetails;
  presentation: LayerDetails;
  layerViolations: LayerViolation[];
}

/**
 * Reads all files recursively in a directory.
 */
async function getFilesRecursively(dir: string): Promise<string[]> {
  const subdirs = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = path.resolve(dir, subdir.name);
      return subdir.isDirectory() ? getFilesRecursively(res) : res;
    })
  );
  return files.flat();
}

/**
 * Statically analyses Dart files to detect inter-feature dependencies and global providers.
 */
export async function analyzeWorkspaceDependencies(
  rootPath: string
): Promise<ArchitectureDiagramData> {
  const nodesMap = new Map<string, DependencyNode>();
  const edgesSet = new Set<string>();
  const edgesList: DependencyEdge[] = [];
  const globalProvidersList: DartProviderInfo[] = [];

  const libDir = path.join(rootPath, "lib");
  if (!fs.existsSync(libDir)) {
    return { nodes: [], edges: [], globalProviders: [] };
  }

  // Try common Flutter project structures in priority order
  const candidateFeaturesSubPaths = ["features", "src/features", "modules"];
  let featuresSubPath: string | null = null;
  let featuresDir: string | null = null;

  for (const candidate of candidateFeaturesSubPaths) {
    const dir = path.join(libDir, candidate);
    if (fs.existsSync(dir)) {
      featuresSubPath = candidate.replace(/\\/g, "/");
      featuresDir = dir;
      break;
    }
  }

  // Segment name used when matching import paths (last component of subpath)
  const featuresDirSegment = featuresSubPath ? featuresSubPath.split("/").pop()! : "features";

  const featuresList: string[] = [];

  if (featuresDir && featuresSubPath) {
    const folders = await fs.promises.readdir(featuresDir, { withFileTypes: true });
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const featureName = folder.name;
        featuresList.push(featureName);
        nodesMap.set(featureName, {
          id: featureName,
          label: featureName,
          group: "feature",
          isFeature: true,
        });
      }
    }
  }

  const allLibFiles = await getFilesRecursively(libDir);
  const dartFiles = allLibFiles.filter(f => f.endsWith(".dart"));

  // Read all Dart files concurrently — single read per file for both passes below
  const contentCache = new Map<string, string>();
  await Promise.all(dartFiles.map(async (file) => {
    try {
      contentCache.set(file, await fs.promises.readFile(file, "utf-8"));
    } catch {
      // skip unreadable files
    }
  }));

  const providerLocations = new Map<string, string>();

  for (const file of dartFiles) {
    const content = contentCache.get(file);
    if (!content) { continue; }

    const relativeToLib = path.relative(libDir, file).replace(/\\/g, "/");
    const featurePrefix = featuresSubPath ? featuresSubPath + "/" : null;
    const isInsideFeatures = featurePrefix !== null && relativeToLib.startsWith(featurePrefix);
    let currentModule = "global";

    if (isInsideFeatures && featurePrefix) {
      const afterPrefix = relativeToLib.substring(featurePrefix.length);
      const parts = afterPrefix.split("/");
      if (parts.length > 0 && parts[0]) { currentModule = parts[0]; }
    }

    // Collect providers: legacy `final xxxProvider = ...` + Riverpod 3.0 @riverpod codegen
    const allDecls: Array<{ name: string; providerType: string; returnType: string }> = [];
    // Updated regex handles NotifierProvider.autoDispose<...> and similar chained constructors
    const providerRegex = /final\s+([A-Za-z0-9_]+Provider)\s*=\s*([A-Za-z0-9_.]+(?:\.[A-Za-z]+)*)(?:<([^>]+)>)?/g;
    let provMatch;
    while ((provMatch = providerRegex.exec(content)) !== null) {
      let returnType = provMatch[3] ? provMatch[3].trim() : "dynamic";
      if (returnType.includes(",")) { returnType = returnType.split(",")[0].trim(); }
      allDecls.push({ name: provMatch[1], providerType: provMatch[2], returnType });
    }
    for (const cg of detectCodegenProviders(content)) {
      if (!allDecls.some(p => p.name === cg.name)) {
        allDecls.push({ name: cg.name, providerType: cg.providerType, returnType: cg.returnType });
      }
    }
    for (const decl of allDecls) {
      const { name, providerType, returnType } = decl;
      // Skip Riverpod framework type names — only track user-defined providers
      if (RIVERPOD_TYPE_NAMES.has(name)) { continue; }
      providerLocations.set(name, currentModule);
      if (currentModule === "global") {
        globalProvidersList.push({ name, providerType, returnType, definedInFile: relativeToLib, absolutePath: file });
        if (!nodesMap.has(name)) {
          nodesMap.set(name, { id: name, label: name, group: "global_provider", isFeature: false });
        }
      }
    }
  }

  for (const file of dartFiles) {
    const relativeToLib = path.relative(libDir, file).replace(/\\/g, "/");
    const featurePrefix = featuresSubPath ? featuresSubPath + "/" : null;
    const isInsideFeatures = featurePrefix !== null && relativeToLib.startsWith(featurePrefix);
    if (!isInsideFeatures || !featurePrefix) { continue; }

    const afterPrefix = relativeToLib.substring(featurePrefix.length);
    const featureName = afterPrefix.split("/")[0];
    const content = contentCache.get(file);
    if (!content) { continue; }

    const importRegex = /import\s+['"]([^'"]+)['"]/g;
    let importMatch;
    while ((importMatch = importRegex.exec(content)) !== null) {
      const importPath = importMatch[1];
      if (importPath.startsWith("package:")) {
        const pParts = importPath.split("/");
        const fIndex = pParts.indexOf(featuresDirSegment);
        if (fIndex !== -1 && pParts.length > fIndex + 1) {
          const targetFeature = pParts[fIndex + 1];
          if (targetFeature !== featureName && featuresList.includes(targetFeature)) {
            addDependency(featureName, targetFeature, nodesMap, edgesSet, edgesList);
          }
        }
      } else if (importPath.includes("/" + featuresDirSegment + "/")) {
        const pParts = importPath.split("/");
        const fIndex = pParts.indexOf(featuresDirSegment);
        if (fIndex !== -1 && pParts.length > fIndex + 1) {
          const targetFeature = pParts[fIndex + 1];
          if (targetFeature !== featureName && featuresList.includes(targetFeature)) {
            addDependency(featureName, targetFeature, nodesMap, edgesSet, edgesList);
          }
        }
      }
    }

    for (const globalProv of globalProvidersList) {
      const escapedProd = globalProv.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const refRegex = new RegExp(`ref\\s*\\.\\s*(?:watch|read|listen)\\s*(?:<[^>]+>)?\\s*\\(\\s*${escapedProd}\\b`, "g");
      if (refRegex.test(content)) {
        addDependency(featureName, globalProv.name, nodesMap, edgesSet, edgesList);
      }
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges: edgesList,
    globalProviders: globalProvidersList,
  };
}

function addDependency(
  from: string,
  to: string,
  nodesMap: Map<string, DependencyNode>,
  edgesSet: Set<string>,
  edgesList: DependencyEdge[]
) {
  const edgeKey = `${from}->${to}`;
  if (!edgesSet.has(edgeKey)) {
    edgesSet.add(edgeKey);
    edgesList.push({ from, to });
  }
}

/**
 * Known Riverpod type names ending with "Provider" that are NOT user-defined state providers.
 * Includes Riverpod 3.0 unified names (AutoDispose* merged into base types).
 */
const RIVERPOD_TYPE_NAMES = new Set([
  "AsyncNotifierProvider", "NotifierProvider", "StreamNotifierProvider",
  "StateNotifierProvider", "ChangeNotifierProvider", "FutureProvider",
  "StreamProvider", "StateProvider", "Provider", "ProviderScope",
  "ProviderContainer", "ProviderObserver", "ProviderFamily",
  "AutoDisposeProvider", "AutoDisposeNotifierProvider", "AutoDisposeFutureProvider",
  "AutoDisposeStreamProvider", "KeepAliveLink"
]);

/**
 * Detects Riverpod 3.0 code-generation providers annotated with @riverpod / @Riverpod().
 * Covers both function-based providers and class-based notifiers:
 *   @riverpod Future<List<User>> users(Ref ref) {}  →  usersProvider
 *   @riverpod class Counter extends _$Counter {}   →  counterProvider
 */
function detectCodegenProviders(
  content: string
): Array<{ name: string; providerType: string; returnType: string; index: number }> {
  const results: Array<{ name: string; providerType: string; returnType: string; index: number }> = [];
  const seen = new Set<string>();
  const annotRegex = /@[Rr]iverpod(?:\s*\([^)]*\))?/g;
  let annotMatch;
  while ((annotMatch = annotRegex.exec(content)) !== null) {
    const annotIndex = annotMatch.index;
    const afterAnnot = content.substring(annotIndex + annotMatch[0].length);
    const lines = afterAnnot.split('\n');
    for (let j = 0; j < Math.min(lines.length, 8); j++) {
      const ln = lines[j].trim();
      if (!ln || ln.startsWith('//') || ln.startsWith('/*') || ln.startsWith('*') || /^@/.test(ln)) { continue; }
      // Class-based notifier: class ClassName extends _$ClassName
      const cm = ln.match(/^(?:abstract\s+)?class\s+([A-Z][A-Za-z0-9_]*)\s+extends\s+_\$/);
      if (cm) {
        const pName = cm[1].charAt(0).toLowerCase() + cm[1].slice(1) + 'Provider';
        if (!seen.has(pName)) { seen.add(pName); results.push({ name: pName, providerType: 'NotifierProvider', returnType: cm[1], index: annotIndex }); }
        break;
      }
      // Function-based provider: ReturnType funcName(Ref ref)
      const fm = ln.match(/(?:^|\s)([a-z][A-Za-z0-9_]*)\s*\(\s*(?:Ref|WidgetRef)\b/);
      if (fm) {
        const funcName = fm[1];
        if (['build', 'override', 'return', 'if', 'for', 'while', 'async'].includes(funcName)) { continue; }
        let ptype = 'Provider';
        let rtype = 'dynamic';
        const futM = ln.match(/^Future<([^>]+)>/);
        const strM = ln.match(/^Stream<([^>]+)>/);
        if (futM) { ptype = 'FutureProvider'; rtype = futM[1].trim(); }
        else if (strM) { ptype = 'StreamProvider'; rtype = strM[1].trim(); }
        else {
          const retM = ln.match(/^([A-Za-z][A-Za-z0-9_<>?,\s]*?)\s+[a-z][A-Za-z0-9_]*\s*\(/);
          if (retM && retM[1] !== 'void' && retM[1].length < 60) { rtype = retM[1].trim(); }
        }
        const pName2 = funcName + 'Provider';
        if (!seen.has(pName2)) { seen.add(pName2); results.push({ name: pName2, providerType: ptype, returnType: rtype, index: annotIndex }); }
        break;
      }
      if (ln.length > 0) { break; }
    }
  }
  return results;
}

/**
 * Analyses the internal anatomy of a feature across three MVVM layers.
 */
export async function analyzeFeatureAnatomy(
  rootPath: string,
  featureName: string
): Promise<FeatureAnatomy> {
  const anatomy: FeatureAnatomy = {
    featureName,
    data: { files: [], totalProviderCount: 0 },
    domain: { files: [], totalProviderCount: 0 },
    presentation: { files: [], totalProviderCount: 0 },
    layerViolations: [],
  };

  // Try multiple common Flutter project structures
  const candidatePaths = ["features", "src/features", "modules"].map(
    c => path.join(rootPath, "lib", c, featureName)
  );
  const featurePath = candidatePaths.find(p => fs.existsSync(p));
  if (!featurePath) {
    return anatomy;
  }

  const files = await getFilesRecursively(featurePath);

  for (const file of files) {
    if (!file.endsWith(".dart")) { continue; }

    const relativePath = path.relative(featurePath, file).replace(/\\/g, "/");
    const fileName = path.basename(file);
    const content = await fs.promises.readFile(file, "utf-8");

    const classes: string[] = [];
    const classRegex = /\bclass\s+([A-Za-z0-9_]+)/g;
    let classMatch;
    while ((classMatch = classRegex.exec(content)) !== null) {
      classes.push(classMatch[1]);
    }

    const providers: DartProviderInfo[] = [];
    // Legacy `final/const xxxProvider = ...` + Riverpod 3.0 @riverpod codegen
    const providerRegex = /(?:final|const)\s+([A-Za-z0-9_]+Provider)\s*=\s*([A-Za-z0-9_.]+(?:\.[A-Za-z]+)*)(?:<([^>]+)>)?/g;
    const matches: { name: string; type: string; ret: string; index: number }[] = [];
    let provMatch;
    while ((provMatch = providerRegex.exec(content)) !== null) {
      let returnType = provMatch[3] ? provMatch[3].trim() : "dynamic";
      if (returnType.includes(",")) { returnType = returnType.split(",")[0].trim(); }
      matches.push({ name: provMatch[1], type: provMatch[2], ret: returnType, index: provMatch.index });
    }
    for (const cg of detectCodegenProviders(content)) {
      if (!matches.some(m => m.name === cg.name)) {
        matches.push({ name: cg.name, type: cg.providerType, ret: cg.returnType, index: cg.index });
      }
    }
    matches.sort((a, b) => a.index - b.index);

    const lowerPath = relativePath.toLowerCase();
    let fileLayer: "data" | "domain" | "presentation";
    if (lowerPath.includes("/data/") || lowerPath.startsWith("data/")) {
      fileLayer = "data";
    } else if (lowerPath.includes("/domain/") || lowerPath.startsWith("domain/")) {
      fileLayer = "domain";
    } else if (lowerPath.includes("/presentation/") || lowerPath.startsWith("presentation/") || lowerPath.includes("/ui/") || lowerPath.startsWith("ui/")) {
      fileLayer = "presentation";
    } else {
      if (fileName.endsWith("_impl.dart") || fileName.includes("datasource") || fileName.includes("api") || fileName.includes("dto")) {
        fileLayer = "data";
      } else if (fileName.includes("use_case") || fileName.includes("entity") || fileName.includes("model") || fileName.endsWith("_repository.dart")) {
        fileLayer = "domain";
      } else {
        fileLayer = "presentation";
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const start = current.index;
      const end = (i + 1 < matches.length) ? matches[i + 1].index : content.length;
      const body = content.substring(start, end);

      const depDetails: { name: string; type: "watch" | "read" | "listen" | "unknown" }[] = [];
      const addedDeps = new Set<string>();

      // Only use explicit ref.watch / ref.read / ref.listen calls — avoids false positives
      const refCallRegex = /ref\s*\.\s*(watch|read|listen)\s*(?:<[^>]+>)?\s*\(\s*([A-Za-z0-9_]+Provider)\b/g;
      let refMatch;
      while ((refMatch = refCallRegex.exec(body)) !== null) {
        const verb = refMatch[1] as "watch" | "read" | "listen";
        const refName = refMatch[2];
        if (refName !== current.name && !RIVERPOD_TYPE_NAMES.has(refName) && !addedDeps.has(refName)) {
          addedDeps.add(refName);
          depDetails.push({ name: refName, type: verb });
        }
      }

      providers.push({
        name: current.name,
        providerType: current.type,
        returnType: current.ret,
        absolutePath: file,
        layer: fileLayer,
        dependencies: depDetails.map(d => d.name),
        dependencyDetails: depDetails,
      });
    }

    const fileInfo: DartFileInfo = {
      fileName,
      relativePath,
      absolutePath: file,
      classes,
      providers,
    };

    anatomy[fileLayer].files.push(fileInfo);
    anatomy[fileLayer].totalProviderCount += providers.length;
  }

  // Detect layer violations
  const providerLayerMap = new Map<string, "presentation" | "domain" | "data">();
  for (const layer of ["presentation", "domain", "data"] as const) {
    for (const fileInfo of anatomy[layer].files) {
      for (const prov of fileInfo.providers) {
        providerLayerMap.set(prov.name, layer);
      }
    }
  }

  for (const layer of ["presentation", "domain", "data"] as const) {
    for (const fileInfo of anatomy[layer].files) {
      for (const prov of fileInfo.providers) {
        for (const dep of (prov.dependencyDetails || [])) {
          const depLayer = providerLayerMap.get(dep.name);
          if (!depLayer) { continue; }

          // presentation should NOT directly watch data providers
          if (layer === "presentation" && depLayer === "data") {
            anatomy.layerViolations.push({
              providerName: prov.name,
              providerLayer: layer,
              dependencyName: dep.name,
              dependencyLayer: depLayer,
              severity: "warning",
              message: `\u26a0\ufe0f Presentation provider \'${prov.name}\' directly watches Data provider \'${dep.name}\'. Consider routing through a Domain provider.`,
            });
          }
          // domain should NOT watch presentation providers
          if (layer === "domain" && depLayer === "presentation") {
            anatomy.layerViolations.push({
              providerName: prov.name,
              providerLayer: layer,
              dependencyName: dep.name,
              dependencyLayer: depLayer,
              severity: "error",
              message: `\u274c Domain provider \'${prov.name}\' watches Presentation provider \'${dep.name}\'. This inverts the dependency rule.`,
            });
          }
          // data should NOT watch domain or presentation
          if (layer === "data" && (depLayer === "domain" || depLayer === "presentation")) {
            anatomy.layerViolations.push({
              providerName: prov.name,
              providerLayer: layer,
              dependencyName: dep.name,
              dependencyLayer: depLayer,
              severity: "error",
              message: `\u274c Data provider \'${prov.name}\' watches ${depLayer} provider \'${dep.name}\'. Data layer must not depend on upper layers.`,
            });
          }
        }
      }
    }
  }

  return anatomy;
}
