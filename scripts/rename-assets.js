const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const REPO_FILE_TO_UPDATE = path.join(__dirname, '..', 'pages', 'catalogo', 'catalogo.json');

function cleanName(name) {
  let ext = path.extname(name).toLowerCase();
  let base = name.slice(0, name.length - ext.length);

  // Handle double extensions like .png.png -> keep single
  base = base.replace(/(\.(png|jpg|jpeg|svg))+$/i, match => match.replace(/\.(png|jpg|jpeg|svg)$/i, ''));
  ext = path.extname(base) || ext;
  if (!ext) ext = '.png';
  base = base.replace(/\.(png|jpg|jpeg|svg)$/i, '');

  base = base.toLowerCase();
  base = base.replace(/[^a-z0-9_\-]+/g, '_');
  base = base.replace(/_+/g, '_');
  base = base.replace(/^_+|_+$/g, '');

  // Position inference
  let position = '';
  if (/frent|frente/.test(base)) position = 'front';
  if (/cost|costa|costas/.test(base)) position = 'back';

  // Remove modelo/modelo* prefixes
  base = base.replace(/^(modelo|modelofrente|modelofrente_|modelofrente|modelofrente|modelofrente-)/, '');
  base = base.replace(/^(modelocosta|modelocostas|modelocosta_)/, '');

  // Remove trailing words like nome, cname, sname, cnome
  base = base.replace(/(_?nome|_?cnome|_?sname|_?cname)$/,'');

  // Try to extract color or descriptor token
  const tokens = base.split(/[_\-]/).filter(Boolean);
  let descriptor = tokens.join('-') || 'asset';

  // If descriptor includes 'bege' or 'branca' or 'preta' normalize them
  descriptor = descriptor.replace(/bege[s]?/,'bege');
  descriptor = descriptor.replace(/branca[s]?/,'branca');
  descriptor = descriptor.replace(/preta[s]?/,'preta');
  descriptor = descriptor.replace(/all_black|allblack/,'all-black');
  descriptor = descriptor.replace(/off_white|offwhite/,'off-white');

  // Build final name
  const finalBase = position ? `${descriptor}-${position}` : descriptor;
  const finalExt = ext.startsWith('.') ? ext : `.${ext}`;
  return `${finalBase}${finalExt}`;
}

function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error('Assets directory not found:', ASSETS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(ASSETS_DIR).filter(f => fs.statSync(path.join(ASSETS_DIR, f)).isFile());
  const mapping = {};

  files.forEach(file => {
    const oldPath = path.join(ASSETS_DIR, file);
    const cleaned = cleanName(file);
    let newName = cleaned;
    // Avoid name collisions: append counter if exists
    let counter = 1;
    while (fs.existsSync(path.join(ASSETS_DIR, newName)) && newName !== file) {
      const parsed = path.parse(cleaned);
      newName = `${parsed.name}-${counter}${parsed.ext}`;
      counter += 1;
    }

    if (newName !== file) {
      const newPath = path.join(ASSETS_DIR, newName);
      fs.renameSync(oldPath, newPath);
      mapping[file] = newName;
      console.log(`Renomeado: ${file} -> ${newName}`);
    } else {
      mapping[file] = file;
      console.log(`Mantido: ${file}`);
    }
  });

  // Save mapping
  const mapFile = path.join(ASSETS_DIR, 'rename-map.json');
  fs.writeFileSync(mapFile, JSON.stringify(mapping, null, 2), 'utf8');
  console.log('Mapeamento salvo em', mapFile);

  // Update references in catalogo.json (only replaces occurrences of filenames)
  if (fs.existsSync(REPO_FILE_TO_UPDATE)) {
    let content = fs.readFileSync(REPO_FILE_TO_UPDATE, 'utf8');
    Object.keys(mapping).forEach(oldName => {
      const newName = mapping[oldName];
      // Replace both with and without URL parts
      const escapedOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escapedOld, 'g');
      content = content.replace(re, newName);
    });
    fs.writeFileSync(REPO_FILE_TO_UPDATE, content, 'utf8');
    console.log('Arquivo atualizado:', REPO_FILE_TO_UPDATE);
  } else {
    console.warn('Arquivo de catálogo não encontrado, pulei atualização de referências.');
  }

  console.log('Concluído. Revise assets/rename-map.json e confirme as alterações.');
}

main();
