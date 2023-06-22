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
    if(classe.name == "Matricula"){
      console.log("matricula -> ", classe);
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
          
          compositeFI.id =  element.end2.reference._id;
          compositeFI.name = element.end2.reference.name;
          let index = null;
          for(let i = 0; i < result.length && index == null; i++){
            if(result[i].className === classe.name){
              index = i;
            }
          }

          if(index != null && index >= 0){
              result[index].classFICount++;
              result[index].classConsiteFi.push(compositeFI);
          } else {
            let fi = {
              classId: classe._id,
              className: classe.name,
              classFICount: 1,
              classConsiteFi:[compositeFI]
            };
            result.push(fi);
          }
          result.push(classe._id);
        }        
      }else if(element instanceof type.UMLAssociationClassLink){
        compositeFI.id =  classe._id;
        compositeFI.name = classe.name;
        
        let end1 = element.associationSide.end1.reference;
        let end2 = element.associationSide.end2.reference;

        let indexEnd1 = null;
        let indexEnd2 = null;
        for(let i = 0; i < result.length && (indexEnd1 == null || indexEnd2 == null); i++){
          if(result[i].className === end1.name){
            indexEnd1 = i;
          }
          if(result[i].className === end2.name){
            indexEnd2 = i;
          }
        }
        if(indexEnd1 != null && indexEnd1 >= 0){
          result[indexEnd1].classFICount++;
          result[indexEnd1].classConsiteFi.push(compositeFI);
        }else{
          let fiEnd1 = {
            classId: end1._id,
            className: end1.name,
            classFICount: 1,
            classConsiteFi:[compositeFI]
          };
          result.push(fiEnd1); 
        }
        if(indexEnd2 != null && indexEnd2 >= 0){
          result[indexEnd2].classFICount++;
          result[indexEnd2].classConsiteFi.push(compositeFI);
        }else{
          let fiEnd2 = {
            classId: end2._id,
            className: end2.name,
            classFICount: 1,
            classConsiteFi:[compositeFI]
          };
          result.push(fiEnd2); 
        }
      }

    });
  });
  console.log("resultado -> ",result);
  return result;
}


