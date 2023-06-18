const XLSX = require("xlsx");

exports.init = init;
function init() {
  app.commands.register("PickClass:start", start, "Pick Class (start)");
}

function start() {
  generateCSV();
}

function generateCSV() {
  let project = app.project.getProject();
  let projectName = project.name;
  let diagrams = project.ownedElements[0];
  debugger;
  const workbook = XLSX.utils.book_new();

  let sheet = [];
  sheet.push(['', 'FI']);
  for (let i = 1; i < diagrams.ownedElements.length; i++) {
    let classe = diagrams.ownedElements[i];
    let countGeneralization = 0;
    classe.ownedElements.forEach(element => {
      if (element.source) {
        let sourcerId = element.source._id;
        let classeId = classe._id;
        let isSourcer = sourcerId == classeId;
        if (element instanceof type.UMLGeneralization && isSourcer) {
          countGeneralization++;
        }
      }
    });
    let line = [classe.name, countGeneralization];
    sheet.push(line);
    console.log(classe);
  }
  sheet.push([]);
  sheet.push(['FI = quantidade de classes integradas DEPOIS da classe em questao']);
  sheet.push(['FIT = somatório dos Fis das classes integradas ANTES da classe em questao']);
  sheet.push([]);

  sheet.push(['Ordem de integração']);
  for (let i = 1; i < diagrams.ownedElements.length; i++) {
    let classe = diagrams.ownedElements[i];
    let line = [i, classe.name, 'qlqrcoisa'];
    sheet.push(line);
    // console.log(classe);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheet);
  let classes = diagrams.ownedElements[2];
  let relacionamentos = classes.ownedElements[0];
  console.log(classes); // "Book Sample"
  console.info(relacionamentos instanceof type.UMLModel);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilha 1');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = projectName + '.xlsx';
  link.click();

  URL.revokeObjectURL(url);

}

