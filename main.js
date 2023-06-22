const XLSX = require("xlsx");
const _ = require("lodash");
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
  const workbook = XLSX.utils.book_new();
  let sheet = [];
  let integratedClasses = [];
  let classesForIntegration = getAllClass(diagrams);
  debugger;
  _.orderBy(classesForIntegration, 'name', 'desc');

  let headerSheett = createHeaderSheet(diagrams.ownedElements.length);
  sheet.push(headerSheett);
  let fi = generateFI(classesForIntegration);


  sheet.push([]);
  sheet.push(['FI = quantidade de classes integradas DEPOIS da classe em questao']);
  sheet.push(['FIT = somatório dos Fis das classes integradas ANTES da classe em questao']);
  sheet.push([]);
  sheet.push(['Ordem de integração']);

  let ordenedClassesIntegration = getOrdenedClassesIntegration(integratedClasses);
  sheet.push(ordenedClassesIntegration);

  const worksheet = XLSX.utils.aoa_to_sheet(sheet);

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

function getAllClass(diagrams) {
  let result = [];
  for (let i = 1; i < diagrams.ownedElements.length; i++) {
    let classe = diagrams.ownedElements[i];
    result.push(classe);
    if(classe.name == "Turma"){
      console.log(classe.ownedElements[0]);
    }else if(classe.name == "Professor"){
      console.log("PROFESSOR -> ",classe.ownedElements[0]);
    }
  }
  return result;
}

function createHeaderSheet(classCount) {
  let header = [];
  header.push("");
  header.push("FI");
  for (let i = 1; i <= classCount; i++) {
    header.push("FIT" + i);
  }
  return header;
}

function getOrdenedClassesIntegration(integratedClasses) {
  let result = [];
  for (let i = 1; i <= integratedClasses.length; i++) {
    let classToIntegration = integratedClasses[i];
    let line = [i, classToIntegration.name, classToIntegration.stubs];
    result.push(line);
  }
  return result;
}

function generateFI(classesForIntegration) {
  let result = [];
  classesForIntegration.forEach(classe => {
    
    classe.ownedElements.forEach(element => {
      let compositeFI = {id:'', name: ''};
      if (element.target) {
        if (element instanceof type.UMLGeneralization) {
          compositeFI.id = element.source._id;
          compositeFI.name = element.source.name; 
          let index = null;
          for(let i = 0; i < result.length && index == null; i++){
            if(result[i].className === element.target.name){
              index = i;
            }
          }

          if(index != null && index >= 0){
              result[index].classFICount++;
              result[index].classConsiteFi.push(compositeFI);
          } else {
            let fi = {
              classId: element.target._id,
              className: element.target.name,
              classFICount: 1,
              classConsiteFi:[compositeFI]
            };
            result.push(fi);
          }
        }
      }else if(element instanceof type.UMLAssociation){

        if(element.end2.aggregation == "none"){

          compositeFI.id =  element.end1.reference._id;
          compositeFI.name = element.end1.reference.name;

          let index = null;
          for(let i = 0; i < result.length && index == null; i++){
            if(result[i].className === element.end2.reference.name){
              index = i;
            }
          }

          if(index != null && index >= 0){
              result[index].classFICount++;
              result[index].classConsiteFi.push(compositeFI);
          } else {
            let fi = {
              classId: element.end2.reference._id,
              className: element.end2.reference.name,
              classFICount: 1,
              classConsiteFi:[compositeFI]
            };
            result.push(fi);
          }
        }
        //composição ta certinho.
        else if(element.end2.aggregation == "shared" || element.end2.aggregation == "composite") {
          result.push(classe._id);
        }        
      }
    });
  });
  console.log("resultado -> ",result);
  return result;
}

function getClassById(classId, resultArray){
  let classe = _.find(resultArray, function(f){
    return f.classId == classId;
  });
  return classe;
}

// classesInDiagram.forEach(classe => {
//   let countGeneralization = _.countBy(generalizations, (id) => {
//     return id == classe._id ? 'classId' : '';
//   });

//   if (countGeneralization.classId) {
//     let line = [classe.name, countGeneralization.classId];
//     sheet.push(line);
//   } else {
//     let line = [classe.name];
//     sheet.push(line);
//   }

//   console.log(classe);
// });

