#!/usr/bin/env node
const fs = require('fs');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: ua-arch-analyze.js <input.json> <output.json>');
  process.exit(1);
}

let input;
try {
  input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (e) {
  console.error('Failed to read input:', e.message);
  process.exit(1);
}

const { fileNodes, importEdges, allEdges } = input;

// ---- Helpers ----

// Extract path from node, preferring filePath
function getPath(node) {
  return (node.filePath || node.name || '').trim();
}

function getTopDir(node) {
  const p = getPath(node);
  const parts = p.split('/').filter(Boolean);
  if (parts.length === 0) return '__root__';
  return parts[0];
}

// Determine common path prefix
function commonPathPrefix(paths) {
  if (!paths.length) return '';
  const partsList = paths.map(p => p.split('/').filter(Boolean));
  if (partsList.some(parts => parts.length === 0)) return '';
  const first = partsList[0];
  let common = [];
  for (let i = 0; i < first.length; i++) {
    if (partsList.every(p => p[i] === first[i])) {
      common.push(first[i]);
    } else break;
  }
  return common.join('/');
}

// All file paths
const allPaths = fileNodes.map(getPath).filter(Boolean);
const commonPrefix = commonPathPrefix(allPaths);

// Get directory group for a node
function getDirGroup(node) {
  const p = getPath(node);
  if (!p) return '__root__';
  const prefixLen = commonPrefix ? commonPrefix.split('/').length : 0;
  const parts = p.split('/').filter(Boolean);
  if (parts.length === 0) return '__root__';
  // If common prefix exists, take the first segment after it
  if (prefixLen > 0 && parts.length > prefixLen) {
    return parts[prefixLen];
  }
  return parts[0];
}

// IDs of all file node IDs
const allNodeIds = new Set(fileNodes.map(n => n.id));

// ---- A. Directory Grouping ----
const directoryGroups = {};
fileNodes.forEach(n => {
  const group = getDirGroup(n);
  if (!directoryGroups[group]) directoryGroups[group] = [];
  directoryGroups[group].push(n.id);
});

// ---- B. Node Type Grouping ----
const nodeTypeGroups = {};
fileNodes.forEach(n => {
  const t = n.type;
  if (!nodeTypeGroups[t]) nodeTypeGroups[t] = [];
  nodeTypeGroups[t].push(n.id);
});

// ---- C. Import Adjacency ----
const fanOut = {};
const fanIn = {};
importEdges.forEach(e => {
  const src = e.source;
  const tgt = e.target;
  if (!fanOut[src]) fanOut[src] = 0;
  if (!fanIn[tgt]) fanIn[tgt] = 0;
  fanOut[src]++;
  fanIn[tgt]++;
});

// ---- D. Cross-Category Dependency Analysis ----
// For allEdges, compute edge types between node type groups
function getNodeType(nodeId) {
  for (const n of fileNodes) {
    if (n.id === nodeId) return n.type;
  }
  return nodeId.split(':')[0];
}

const crossCategoryEdgesMap = {};
allEdges.forEach(e => {
  const fromType = getNodeType(e.source);
  const toType = getNodeType(e.target);
  const edgeType = e.type || e.relation || 'unknown';
  const key = `${fromType}->${toType}::${edgeType}`;
  if (!crossCategoryEdgesMap[key]) {
    crossCategoryEdgesMap[key] = { fromType, toType, edgeType, count: 0 };
  }
  crossCategoryEdgesMap[key].count++;
});
const crossCategoryEdges = Object.values(crossCategoryEdgesMap);

// ---- E. Inter-Group Import Frequency ----
const groupImportMap = {};
importEdges.forEach(e => {
  const srcNode = fileNodes.find(n => n.id === e.source);
  const tgtNode = fileNodes.find(n => n.id === e.target);
  if (!srcNode || !tgtNode) return;
  const srcGroup = getDirGroup(srcNode);
  const tgtGroup = getDirGroup(tgtNode);
  if (srcGroup === tgtGroup) return;
  const key = `${srcGroup}->${tgtGroup}`;
  if (!groupImportMap[key]) groupImportMap[key] = { from: srcGroup, to: tgtGroup, count: 0 };
  groupImportMap[key].count++;
});
const interGroupImports = Object.values(groupImportMap);

// ---- F. Intra-Group Import Density ----
const intraGroupDensity = {};
// Count total edges involving each group
const groupTotalEdges = {};
const groupInternalEdges = {};
importEdges.forEach(e => {
  const srcNode = fileNodes.find(n => n.id === e.source);
  const tgtNode = fileNodes.find(n => n.id === e.target);
  if (!srcNode || !tgtNode) return;
  const srcGroup = getDirGroup(srcNode);
  const tgtGroup = getDirGroup(tgtNode);

  [srcGroup, tgtGroup].forEach(g => {
    if (!groupTotalEdges[g]) groupTotalEdges[g] = 0;
    groupTotalEdges[g]++;
  });

  if (srcGroup === tgtGroup) {
    if (!groupInternalEdges[srcGroup]) groupInternalEdges[srcGroup] = 0;
    groupInternalEdges[srcGroup]++;
  }
});

Object.keys(directoryGroups).forEach(g => {
  const total = groupTotalEdges[g] || 1;
  const internal = groupInternalEdges[g] || 0;
  intraGroupDensity[g] = {
    internalEdges: internal,
    totalEdges: total,
    density: total > 0 ? Math.round((internal / total) * 100) / 100 : 0
  };
});

// ---- G. Directory Pattern Matching ----
const dirPatternMap = {
  'routes': 'api', 'api': 'api', 'controllers': 'api', 'endpoints': 'api', 'handlers': 'api',
  'serializers': 'api', 'controller': 'api', 'routers': 'api', 'blueprints': 'api',
  'services': 'service', 'core': 'service', 'lib': 'service', 'domain': 'domain', 'logic': 'service',
  'signals': 'service', 'composables': 'service', 'mailers': 'service', 'jobs': 'service',
  'channels': 'service', 'internal': 'service',
  'models': 'data', 'db': 'data', 'data': 'data', 'persistence': 'data', 'repository': 'data',
  'entities': 'data', 'migrations': 'data', 'sql': 'data', 'database': 'data', 'schema': 'data',
  'entity': 'data',
  'components': 'ui', 'views': 'ui', 'pages': 'ui', 'ui': 'ui', 'layouts': 'ui', 'screens': 'ui',
  'middleware': 'middleware', 'plugins': 'middleware', 'interceptors': 'middleware', 'guards': 'middleware',
  'utils': 'utility', 'helpers': 'utility', 'common': 'utility', 'shared': 'utility', 'tools': 'utility',
  'pkg': 'utility', 'templatetags': 'utility',
  'config': 'config', 'constants': 'config', 'env': 'config', 'settings': 'config',
  'management': 'config', 'commands': 'config',
  '__tests__': 'test', 'test': 'test', 'tests': 'test', 'spec': 'test', 'specs': 'test',
  'types': 'types', 'interfaces': 'types', 'contracts': 'types', 'dtos': 'types',
  'dto': 'types', 'request': 'types', 'response': 'types',
  'hooks': 'hooks',
  'store': 'state', 'state': 'state', 'reducers': 'state', 'actions': 'state', 'slices': 'state',
  'assets': 'assets', 'static': 'assets', 'public': 'assets',
  'cmd': 'entry', 'bin': 'entry',
  'docs': 'documentation', 'documentation': 'documentation', 'wiki': 'documentation',
  'deploy': 'infrastructure', 'deployment': 'infrastructure', 'infra': 'infrastructure',
  'infrastructure': 'infrastructure', 'k8s': 'infrastructure', 'kubernetes': 'infrastructure',
  'helm': 'infrastructure', 'charts': 'infrastructure', 'terraform': 'infrastructure',
  'tf': 'infrastructure', 'docker': 'infrastructure',
  '.github': 'ci-cd', '.gitlab': 'ci-cd', '.circleci': 'ci-cd',
  '.playwright-mcp': 'test-artifacts',
  'slipbox': 'service',
  'todo': 'service',
  'upload': 'service',
  'common': 'utility',
  'apis': 'api',
  'apisl': 'api',
  'router': 'config',
  'lib': 'utility',
  'modules': 'state',
  'plans': 'documentation',
  'public': 'assets',
  '.claude': 'config',
  '.understand-anything': 'config',
  'qa-screenshots': 'test-artifacts',
  'server': 'data',
  'functions': 'utility',
};

// Also check file-level patterns
function matchFilePattern(node) {
  const name = node.name || '';
  const path = node.filePath || '';

  // Test files
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(name) ||
      /^test_/.test(name) || /_test\.go$/.test(name) ||
      /Test\.(java|php)$/.test(name) || /_spec\.rb$/.test(name)) {
    return 'test';
  }

  // Declaration files
  if (/\.d\.ts$/.test(name)) return 'types';

  // Entry points
  if (/^index\.(ts|tsx|js)$/.test(name) && path.includes('/')) {
    // Only if it's a package/directory root - detected by being the only file in folder
    return 'entry';
  }
  if (/^__init__\.py$/.test(name)) return 'entry';
  if (/^manage\.py$/.test(name)) return 'entry';
  if (/^wsgi\.py$/.test(name) || /^asgi\.py$/.test(name)) return 'config';
  if (/^main\.go$/.test(name)) return 'entry';
  if (/^main\.rs$/.test(name) || /^lib\.rs$/.test(name)) return 'entry';
  if (/^Application\.java$/.test(name) || /^Program\.cs$/.test(name)) return 'entry';
  if (/^config\.ru$/.test(name)) return 'entry';

  // Config files
  if (/^Cargo\.toml$/.test(name) || /^go\.mod$/.test(name) || /^Gemfile$/.test(name) ||
      /^pom\.xml$/.test(name) || /^build\.gradle$/.test(name) || /^composer\.json$/.test(name)) {
    return 'config';
  }

  // Infrastructure
  if (/^Dockerfile/.test(name) || /^docker-compose/.test(name)) return 'infrastructure';
  if (/\.tf$/.test(name) || /\.tfvars$/.test(name)) return 'infrastructure';
  if (path.includes('.github/workflows/') || name === '.gitlab-ci.yml' || name === 'Jenkinsfile') return 'ci-cd';

  // Data
  if (/\.sql$/.test(name)) return 'data';
  if (/\.(graphql|gql|proto)$/.test(name)) return 'types';

  // Documentation
  if (/\.(md|rst)$/.test(name)) return 'documentation';

  // Infrastructure
  if (/^Makefile$/.test(name)) return 'infrastructure';

  // Build artifacts
  if (/\.(tsbuildinfo)$/.test(name)) return 'config';

  return null;
}

const patternMatches = {};
Object.keys(directoryGroups).forEach(g => {
  // Try directory name first
  if (dirPatternMap[g]) {
    patternMatches[g] = dirPatternMap[g];
  } else {
    // Try to determine pattern from files within
    const files = directoryGroups[g];
    const matchedPatterns = {};
    files.forEach(fid => {
      const node = fileNodes.find(n => n.id === fid);
      if (!node) return;
      const fp = matchFilePattern(node);
      if (fp) matchedPatterns[fp] = (matchedPatterns[fp] || 0) + 1;
    });
    if (Object.keys(matchedPatterns).length > 0) {
      // Pick the most common pattern
      const best = Object.entries(matchedPatterns).sort((a, b) => b[1] - a[1])[0][0];
      // Don't default single files to entry
      if (files.length > 1 || best !== 'entry') {
        patternMatches[g] = best;
      }
    }
  }
});

// Add file-level pattern matches for groups that don't have directory matches
Object.keys(directoryGroups).forEach(g => {
  if (patternMatches[g]) return;
  // Try matching individual files
  const files = directoryGroups[g];
  const matchedPatterns = {};
  files.forEach(fid => {
    const node = fileNodes.find(n => n.id === fid);
    if (!node) return;
    const fp = matchFilePattern(node);
    if (fp) matchedPatterns[fp] = (matchedPatterns[fp] || 0) + 1;
  });
  if (Object.keys(matchedPatterns).length > 0) {
    const best = Object.entries(matchedPatterns).sort((a, b) => b[1] - a[1])[0][0];
    if (files.length > 1 || best !== 'entry') {
      patternMatches[g] = best;
    }
  }
});

// ---- H. Deployment Topology Detection ----
const infraFiles = [];
const allFileNames = fileNodes.map(n => n.name || '');
const allFilePaths = fileNodes.map(n => n.filePath || '');

const hasDockerfile = allFileNames.some(n => /^Dockerfile/.test(n));
const hasCompose = allFileNames.some(n => /^docker-compose/.test(n));
const hasK8s = allFileNames.some(n => /\.yaml$/.test(n)) && allFilePaths.some(p => p.includes('k8s') || p.includes('kubernetes'));
const hasTerraform = allFileNames.some(n => /\.tf$/.test(n));
const hasCI = allFileNames.some(n => n === 'Jenkinsfile' || n === '.gitlab-ci.yml') ||
             allFilePaths.some(p => p.includes('.github/workflows/'));

// Collect infra files more broadly
fileNodes.forEach(n => {
  const name = n.name || '';
  const path = n.filePath || '';
  if (/^Dockerfile/.test(name) || /^docker-compose/.test(name) || /\.tf$/.test(name) ||
      /\.tfvars$/.test(name) || path.includes('.github/workflows/') || name === 'Jenkinsfile' ||
      name === '.gitlab-ci.yml' || path.includes('.mcp.json')) {
    infraFiles.push(path || name || n.id);
  }
});

const deploymentTopology = {
  hasDockerfile,
  hasCompose,
  hasK8s,
  hasTerraform,
  hasCI,
  infraFiles: [...new Set(infraFiles)]
};

// ---- I. Data Pipeline Detection ----
const schemaFiles = [];
const migrationFiles = [];
const dataModelFiles = [];
const apiHandlerFiles = [];

fileNodes.forEach(n => {
  const path = n.filePath || '';
  const name = n.name || '';
  const tags = n.tags || [];
  const summary = n.summary || '';

  if (/\.sql$/.test(name) && path.includes('migration')) {
    migrationFiles.push(n.id);
  } else if (/\.sql$/.test(name)) {
    schemaFiles.push(n.id);
  }
  if (/\.(graphql|gql|proto)$/.test(name)) {
    schemaFiles.push(n.id);
  }
  // Data models
  if (tags.includes('data-model') || tags.includes('gorm') || tags.includes('entity') ||
      summary.includes('数据模型') || summary.includes('GORM 结构体') || summary.includes('model') ||
      tags.includes('type-definition') || tags.includes('interface')) {
    if (path.includes('model') || path.includes('interfaces')) {
      dataModelFiles.push(n.id);
    }
  }
  // API handlers
  if (tags.includes('api-handler') || summary.includes('HTTP 处理器') || summary.includes('API接口')) {
    apiHandlerFiles.push(n.id);
  }
});

const dataPipeline = {
  schemaFiles: [...new Set(schemaFiles)],
  migrationFiles: [...new Set(migrationFiles)],
  dataModelFiles: [...new Set(dataModelFiles)],
  apiHandlerFiles: [...new Set(apiHandlerFiles)]
};

// ---- J. Documentation Coverage ----
const docGroups = {};
const allDocFileIds = [];

fileNodes.forEach(n => {
  const path = n.filePath || n.name || '';
  if (/\.(md|rst)$/.test(path) || n.tags?.includes('documentation') ||
      n.type === 'document' || n.tags?.some(t => t.includes('文档') || t.includes('doc'))) {
    allDocFileIds.push(n.id);
    const group = getDirGroup(n);
    docGroups[group] = true;
  }
  // Also check README
  if (/^README\.md$/i.test(n.name || '') || n.name?.toLowerCase() === 'readme.md') {
    const group = getDirGroup(n);
    docGroups[group] = true;
  }
});

const allGroups = Object.keys(directoryGroups);
const groupsWithDocs = Object.keys(docGroups).filter(g => allGroups.includes(g));
const undocumentedGroups = allGroups.filter(g => !docGroups[g] && directoryGroups[g].length > 0);

const docCoverage = {
  groupsWithDocs: groupsWithDocs.length,
  totalGroups: allGroups.length,
  coverageRatio: allGroups.length > 0 ? Math.round((groupsWithDocs.length / allGroups.length) * 100) / 100 : 0,
  undocumentedGroups
};

// ---- K. Dependency Direction ----
// For each pair of groups, determine dominant direction
const depPairCounts = {};
importEdges.forEach(e => {
  const srcNode = fileNodes.find(n => n.id === e.source);
  const tgtNode = fileNodes.find(n => n.id === e.target);
  if (!srcNode || !tgtNode) return;
  const srcGroup = getDirGroup(srcNode);
  const tgtGroup = getDirGroup(tgtNode);
  if (srcGroup === tgtGroup) return;
  const key = [srcGroup, tgtGroup].sort().join('<>');
  if (!depPairCounts[key]) depPairCounts[key] = { a: srcGroup, b: tgtGroup, aToB: 0, bToA: 0 };
  if (srcGroup === depPairCounts[key].a) {
    depPairCounts[key].aToB++;
  } else {
    depPairCounts[key].bToA++;
  }
});

const dependencyDirection = [];
Object.values(depPairCounts).forEach(pair => {
  const { a, b, aToB, bToA } = pair;
  if (aToB > bToA) {
    dependencyDirection.push({ dependent: a, dependsOn: b, importsCount: aToB });
  } else if (bToA > aToB) {
    dependencyDirection.push({ dependent: b, dependsOn: a, importsCount: bToA });
  }
  // If equal, don't add a direction
});

// ---- Stats ----
const filesPerGroup = {};
Object.entries(directoryGroups).forEach(([g, files]) => {
  filesPerGroup[g] = files.length;
});

const nodeTypeCounts = {};
Object.entries(nodeTypeGroups).forEach(([t, files]) => {
  nodeTypeCounts[t] = files.length;
});

// Prepare top fan-in/fan-out
const sortedFanIn = Object.entries(fanIn).sort((a, b) => b[1] - a[1]).slice(0, 20);
const sortedFanOut = Object.entries(fanOut).sort((a, b) => b[1] - a[1]).slice(0, 20);

const fileFanIn = Object.fromEntries(sortedFanIn);
const fileFanOut = Object.fromEntries(sortedFanOut);

const fileStats = {
  totalFileNodes: fileNodes.length,
  filesPerGroup,
  nodeTypeCounts
};

// ---- Assemble output ----
const result = {
  scriptCompleted: true,
  directoryGroups,
  nodeTypeGroups,
  crossCategoryEdges,
  interGroupImports,
  intraGroupDensity,
  patternMatches,
  deploymentTopology,
  dataPipeline,
  docCoverage,
  dependencyDirection,
  fileStats,
  fileFanIn,
  fileFanOut
};

try {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log('Analysis script completed successfully');
  console.log(`File nodes analyzed: ${fileNodes.length}`);
  console.log(`Directory groups found: ${Object.keys(directoryGroups).length}`);
} catch (e) {
  console.error('Failed to write output:', e.message);
  process.exit(1);
}
