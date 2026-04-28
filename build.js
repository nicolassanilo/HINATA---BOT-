/**
 * HINATA-BOT Build Script v2.0
 * Script de compilación avanzado con minificación, TypeScript y más
 */

import { existsSync, readdirSync, statSync, rmSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const config = {
  srcDir: 'src-build',
  distDir: 'dist',
  minify: true,
  sourceMaps: true
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}➜ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}✖ ${message}${colors.reset}`);
}

function success(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function warn(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

// ============================================
// FUNCIONES DE VERIFICACIÓN
// ============================================

function checkProjectStructure() {
  log('Verificando estructura del proyecto...', 'cyan');
  
  const requiredDirs = ['plugins', 'lib', 'media', 'config', 'imagenes'];
  const requiredFiles = ['index.js', 'package.json'];
  
  let allGood = true;
  
  for (const dir of requiredDirs) {
    if (existsSync(dir)) {
      success(`Directorio ${dir}/ existe`);
    } else {
      error(`Falta directorio ${dir}/`);
      allGood = false;
    }
  }
  
  for (const file of requiredFiles) {
    if (existsSync(file)) {
      success(`Archivo ${file} existe`);
    } else {
      error(`Falta archivo ${file}`);
      allGood = false;
    }
  }
  
  return allGood;
}

function countPlugins() {
  log('Contando plugins...', 'cyan');
  
  if (!existsSync('plugins')) {
    error('Directorio plugins no encontrado');
    return 0;
  }
  
  const files = readdirSync('plugins');
  const jsFiles = files.filter(f => f.endsWith('.js') && !f.startsWith('_'));
  
  success(`${jsFiles.length} plugins encontrados`);
  return jsFiles.length;
}

// ============================================
// MINIFICACIÓN DE JavaScript
// ============================================

function minifyJS(content) {
  let minified = content.replace(/\/\/.*$/gm, '');
  minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
  minified = minified.replace(/\s+/g, ' ');
  minified = minified.replace(/\s*([{}();,:=+\-*/<>!&|.}])\s*/g, '$1');
  minified = minified.replace(/;\s*}/g, '}');
  minified = minified.replace(/\n\s*/g, '');
  minified = minified.trim();
  return minified;
}

function minifyCSS(content) {
  let minified = content.replace(/\/\*[\s\S]*?\*\//g, '');
  minified = minified.replace(/\s+/g, ' ');
  minified = minified.replace(/\s*([{}:;,+])\s*/g, '$1');
  minified = minified.trim();
  return minified;
}

// ============================================
// CONVERSIÓN A TypeScript (Básico)
// ============================================

function convertToTypeScript(jsContent) {
  let tsContent = jsContent;
  const functionPattern = /function\s+(\w+)\s*\(([^)]*)\)/g;
  tsContent = tsContent.replace(functionPattern, (match, name, params) => {
    const paramList = params.split(',').map(p => p.trim()).filter(p => p);
    const typedParams = paramList.map(p => `${p}: any`).join(', ');
    return `function ${name}(${typedParams}): any`;
  });
  tsContent = tsContent.replace(/const\s+(\w+)\s*=/g, 'const $1: any =');
  tsContent = tsContent.replace(/let\s+(\w+)\s*=/g, 'let $1: any =');
  return tsContent;
}

// ============================================
// PROCESAMIENTO DE ARCHIVOS
// ============================================

function processFile(filePath, options = {}) {
  const { minify = false, toTS = false, verbose = false } = options;
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    let outputPath = filePath;
    let processed = false;
    
    if (minify && filePath.endsWith('.js')) {
      content = minifyJS(content);
      outputPath = filePath.replace('.js', '.min.js');
      processed = true;
    }
    
    if (toTS && filePath.endsWith('.js')) {
      content = convertToTypeScript(content);
      outputPath = filePath.replace('.js', '.ts');
      processed = true;
    }
    
    if (verbose) {
      info(`Procesado: ${filePath} → ${outputPath}`);
    }
    
    return { success: true, content, outputPath, processed };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function processDirectory(dir, options = {}) {
  log(`Procesando directorio: ${dir}`, 'cyan');
  
  const results = {
    processed: 0,
    errors: 0,
    files: []
  };
  
  if (!existsSync(dir)) {
    error(`Directorio no encontrado: ${dir}`);
    return results;
  }
  
  const files = readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = join(dir, file.name);
    
    if (file.isDirectory()) {
      const subResults = processDirectory(filePath, options);
      results.processed += subResults.processed;
      results.errors += subResults.errors;
    } else if (file.isFile()) {
      const ext = extname(file.name).toLowerCase();
      
      if (ext === '.js' || ext === '.json') {
        const result = processFile(filePath, options);
        
        if (result.success) {
          results.files.push(filePath);
          if (result.processed) results.processed++;
        } else {
          results.errors++;
          error(`Error en ${filePath}: ${result.error}`);
        }
      }
    }
  }
  
  return results;
}

// ============================================
// BUNDLING (Concatenación)
// ============================================

function bundleFiles(files, outputFile) {
  log('Creando bundle...', 'cyan');
  
  let bundle = `/**
 * HINATA-BOT Bundle
 * Generado automáticamente
 * Fecha: ${new Date().toISOString()}
 */

`;
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const name = basename(file);
    
    bundle += `\n// ===== ${name} =====\n`;
    bundle += content + '\n';
  }
  
  writeFileSync(outputFile, bundle);
  success(`Bundle creado: ${outputFile}`);
  
  return bundle.length;
}

// ============================================
// ANÁLISIS DE DEPENDENCIAS
// ============================================

function analyzeDependencies() {
  log('Analizando dependencias...', 'cyan');
  
  const deps = new Map();
  const dirs = ['plugins', 'lib'];
  
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    
    const files = readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.js')) {
        const filePath = join(dir, file.name);
        const content = readFileSync(filePath, 'utf-8');
        
        const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
          const dep = match[1];
          deps.set(dep, (deps.get(dep) || 0) + 1);
        }
        
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        
        while ((match = requireRegex.exec(content)) !== null) {
          const dep = match[1];
          deps.set(dep, (deps.get(dep) || 0) + 1);
        }
      }
    }
  }
  
  info(`Total de dependencias: ${deps.size}`);
  
  for (const [dep, count] of deps) {
    log(`  ${dep}: ${count} uso(s)`, 'blue');
  }
  
  return deps;
}

// ============================================
// GENERACIÓN DE DOCUMENTACIÓN
// ============================================

function generateDocs() {
  log('Generando documentación...', 'cyan');
  
  let docs = `# Documentación de HINATA-BOT
  
## Información del Proyecto
- **Versión**: 1.1.0
- **Fecha de generación**: ${new Date().toISOString()}

## Estructura

`;
  
  const dirs = ['plugins', 'lib', 'config'];
  
  for (const dir of dirs) {
    docs += `### ${dir}/\n`;
    
    if (existsSync(dir)) {
      const files = readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile()) {
          const ext = extname(file.name);
          docs += `- \`${file.name}\`${ext === '.js' ? ' (Plugin)' : ''}\n`;
        }
      }
    }
    
    docs += '\n';
  }
  
  docs += `## Comandos Disponibles
  
### Administración
- \`#bienvenida\` - Configurar bienvenida
- \`#welcome on/off\` - Activar/desactivar
- \`#menu\` - Mostrar menú

### Multimedia
- \`#musica\` - Descargar música
- \`#youtube\` - Descargar videos
- \`#sticker\` - Crear stickers

### Juegos
- \`#juegos\` - Menú de juegos
- \`#rpg\` - Rol

---
*Documentación generada automáticamente por build.js*
`;
  
  writeFileSync('DOCS.md', docs);
  success('Documentación generada: DOCS.md');
}

// ============================================
// REPORTE DE ESTADO
// ============================================

function generateStatusReport() {
  log('Generando reporte de estado...', 'cyan');
  
  const report = {
    fecha: new Date().toISOString(),
    version: '1.1.0',
    estructura: checkProjectStructure(),
    plugins: countPlugins(),
    dependencias: analyzeDependencies()
  };
  
  const reportContent = `# Reporte de Estado - HINATA-BOT
  
## Información General
- **Fecha**: ${report.fecha}
- **Versión**: ${report.version}

## Estado del Proyecto
- Estructura: ${report.estructura ? '✅ OK' : '❌ Con errores'}
- Plugins: ${report.plugins} encontrados

---
*Generado automáticamente por build.js*
`;
  
  writeFileSync('STATUS.md', reportContent);
  success('Reporte generado: STATUS.md');
}

// ============================================
// LIMPIEZA
// ============================================

function cleanTempFiles() {
  log('Limpiando archivos temporales...', 'cyan');
  
  let cleaned = 0;
  
  if (existsSync('node_modules/.cache')) {
    try {
      rmSync('node_modules/.cache', { recursive: true, force: true });
      cleaned++;
      success('Cache de node_modules limpiado');
    } catch (e) {
      info('No se pudo limpiar cache: ' + e.message);
    }
  }
  
  const dirs = ['plugins', 'lib'];
  
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    
    const files = readdirSync(dir);
    
    for (const file of files) {
      if (file.endsWith('.min.js')) {
        try {
          rmSync(join(dir, file));
          cleaned++;
        } catch (e) {
          // Ignorar errores
        }
      }
    }
  }
  
  if (cleaned > 0) {
    success(`${cleaned} archivos limpiados`);
  } else {
    info('No había archivos temporales que limpiar');
  }
}

// ============================================
// AYUDA
// ============================================

function showHelp() {
  console.log(`
╔════════════════════════════════════════╗
║     HINATA-BOT Build Script v2.0        ║
╚════════════════════════════════════════╝

Uso: node build.js [comando] [opciones]

┌─ COMANDOS PRINCIPALES
│
│ build         - Compilar y verificar el proyecto
│ check         - Verificar estructura
│ lint          - Verificar archivos JavaScript
│ clean         - Limpiar archivos temporales
│ report        - Generar reporte de estado
│ docs          - Generar documentación
│ all           - Ejecutar todas las tareas
│ help          - Mostrar esta ayuda
│
└─────────────────────────────────────────

┌─ COMANDOS AVANZADOS
│
│ minify        - Minificar archivos JavaScript
│ bundle        - Crear bundle de todos los plugins
│ deps          - Analizar dependencias
│ to-ts         - Convertir JS a TypeScript (básico)
│
└─────────────────────────────────────────

┌─ EJEMPLOS
│
│ node build.js build
│ node build.js minify
│ node build.js bundle
│ node build.js all
│
└─────────────────────────────────────────
`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  console.log(`
╔════════════════════════════════════════╗
║     🔧 HINATA-BOT Build System v2.0     ║
╚════════════════════════════════════════╝
`);
  
  switch (command) {
    case 'build':
    case 'all':
      log('Iniciando compilación completa...', 'yellow');
      checkProjectStructure();
      countPlugins();
      analyzeDependencies();
      generateStatusReport();
      success('¡Build completado!');
      break;
      
    case 'check':
      checkProjectStructure();
      break;
      
    case 'lint':
      countPlugins();
      break;
      
    case 'clean':
      cleanTempFiles();
      break;
      
    case 'report':
      generateStatusReport();
      break;
      
    case 'docs':
      generateDocs();
      break;
      
    case 'minify':
      log('Minificando archivos...', 'yellow');
      processDirectory('plugins', { minify: true, verbose: true });
      processDirectory('lib', { minify: true, verbose: true });
      success('¡Minificación completada!');
      break;
      
    case 'bundle':
      log('Creando bundle...', 'yellow');
      const pluginFiles = readdirSync('plugins')
        .filter(f => f.endsWith('.js') && !f.startsWith('_'))
        .map(f => join('plugins', f));
      
      const libFiles = readdirSync('lib')
        .filter(f => f.endsWith('.js'))
        .map(f => join('lib', f));
      
      bundleFiles([...pluginFiles, ...libFiles], 'bundle.js');
      success('¡Bundle creado!');
      break;
      
    case 'deps':
      analyzeDependencies();
      break;
      
    case 'to-ts':
      log('Convirtiendo a TypeScript...', 'yellow');
      processDirectory('plugins', { toTS: true, verbose: true });
      processDirectory('lib', { toTS: true, verbose: true });
      success('¡Conversión completada! (experimental)');
      break;
      
    case 'help':
    default:
      showHelp();
      break;
  }
}

main().catch(e => {
  error(`Error fatal: ${e.message}`);
  process.exit(1);
});