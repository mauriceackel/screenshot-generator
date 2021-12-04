import fs from 'fs';

const basePath = '../resources/websites';
const files = fs.readdirSync(basePath);

for (const file of files) {
  let i = 0;
  const del = file.split('_').slice(-1)[0].startsWith('1');

  if (del) {
    fs.unlinkSync(`${basePath}/${file}`);
  } else {
    let newName = file.replace('_0.jpg', '.jpg');
    // console.log(newName);
    fs.renameSync(`${basePath}/${file}`, `${basePath}/${newName}`);
  }
}
