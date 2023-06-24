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

  let headerSheett = createHeaderSheet(diagrams.ownedElements.length);
  sheet.push(headerSheett);
  let arrayFi = generateFI(classesForIntegration);
  arrayFi = _.orderBy(arrayFi, 'className', 'asc');
  let table = [];
  arrayFi.forEach(element => {
    let line = [element.className, element.classFICount];
    table.push(line);
  });

  let arrayFIT = [];
  classesForIntegration.forEach(cfi => {
    let fit = getFit(cfi.name, arrayFi);
    arrayFIT.push({ className: cfi.name, fit: fit });
  });


  for (let i = 1; i <= classesForIntegration.length; i++) {
    for (let j = 0; j < table.length; j++) {
      let className = table[j][0];
      let fitValue = _.find(arrayFIT, (f) => { return f.className ==  className});
      table[j].push(fitValue.fit);
    }

    let chosenClass = chooseClass(arrayFIT, arrayFi);
    let stubsInChosenClass = "";
    let arrayFINotIntegrated = arrayFi.filter(function (item) {
      return item.hasIntegrated == false;
    });

    arrayFINotIntegrated.forEach(classNotIntegrated =>{
      let classIncluded = _.find(classNotIntegrated.classesCompositeFi, (ic) => { return ic.name ==  chosenClass.className});
      if(classIncluded){
        stubsInChosenClass += " Stub " + classNotIntegrated.className;
      }
    });

    let classToIntegration = { order: i, className: chosenClass.className, stubs: stubsInChosenClass };
    integratedClasses.push(classToIntegration);
  }

  table.forEach(line => {
    sheet.push(line);
  })


  sheet.push([]);
  sheet.push(['FI = quantidade de classes integradas DEPOIS da classe em questao']);
  sheet.push(['FIT = somatório dos Fis das classes integradas ANTES da classe em questao']);
  sheet.push([]);
  sheet.push(['Ordem de integração']);

  integratedClasses.forEach(item => {
    sheet.push([item.order, item.className, item.stubs]);
  });

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
    if (classe.name == "Aluno") {
      console.log("Aluno -> ", classe);
    }
  }
  return result;
}

function createHeaderSheet(classCount) {
  let header = [];
  header.push("");
  header.push("FI");
  for (let i = 1; i < classCount; i++) {
    header.push("FIT" + i);
  }
  return header;
}

function generateFI(classesForIntegration) {
  let result = [];
  classesForIntegration.forEach(classe => {
    classe.ownedElements.forEach(element => {
      let compositeFI = { id: '', name: '' };
      if (element.target) {
        if (element instanceof type.UMLGeneralization) {
          compositeFI.id = element.source._id;
          compositeFI.name = element.source.name;
          let index = null;
          for (let i = 0; i < result.length && index == null; i++) {
            if (result[i].className === element.target.name) {
              index = i;
            }
          }

          if (index != null && index >= 0) {
            result[index].classFICount++;
            result[index].classesCompositeFi.push(compositeFI);
          } else {
            let fi = {
              classId: element.target._id,
              className: element.target.name,
              classFICount: 1,
              classesCompositeFi: [compositeFI],
              hasIntegrated: false
            };
            result.push(fi);
          }
        }
      } else if (element instanceof type.UMLAssociation) {
        if (element.end2.aggregation == "none") {

          compositeFI.id = element.end1.reference._id;
          compositeFI.name = element.end1.reference.name;

          if (element.end2.navigable == "unspecified") {
            let unspecifiedConposite = { id: element.end2.reference._id, name: element.end2.reference.name };
            let indexUnspecified = null;
            for (let i = 0; i < result.length && indexUnspecified == null; i++) {
              if (result[i].className === element.end1.reference.name) {
                indexUnspecified = i;
              }
            }

            if (indexUnspecified != null && indexUnspecified >= 0) {
              result[indexUnspecified].classFICount++;
              result[indexUnspecified].classesCompositeFi.push(unspecifiedConposite);
            } else {
              let fi = {
                classId: compositeFI.id,
                className: compositeFI.name,
                classFICount: 1,
                classesCompositeFi: [unspecifiedConposite],
                hasIntegrated: false
              };
              result.push(fi);
            }
          }

          let index = null;
          for (let i = 0; i < result.length && index == null; i++) {
            if (result[i].className === element.end2.reference.name) {
              index = i;
            }
          }

          if (index != null && index >= 0) {
            result[index].classFICount++;
            result[index].classesCompositeFi.push(compositeFI);
          } else {
            let fi = {
              classId: element.end2.reference._id,
              className: element.end2.reference.name,
              classFICount: 1,
              classesCompositeFi: [compositeFI],
              hasIntegrated: false
            };
            result.push(fi);
          }
        }
        else if (element.end2.aggregation == "shared" || element.end2.aggregation == "composite") {

          compositeFI.id = element.end2.reference._id;
          compositeFI.name = element.end2.reference.name;
          
          let indexClass = _.findIndex(result, x => x.className === classe.name);

          if (indexClass != null && indexClass >= 0) {
            result[indexClass].classFICount++;
            result[indexClass].classesCompositeFi.push(compositeFI);
          } else {
            let classFI =  createFIObject(classe._id, classe.name, compositeFI);
            result.push(classFI);
          }
        }
      } else if (element instanceof type.UMLAssociationClassLink) {
        compositeFI.id = classe._id;
        compositeFI.name = classe.name;

        let firstReference = element.associationSide.end1.reference;
        let secondReference = element.associationSide.end2.reference;

        let indexFirstReference = _.findIndex(result, x => x.className === firstReference.name);
        let indexSecondReference = _.findIndex(result, x => x.className === secondReference.name);
        
        if (indexFirstReference != null && indexFirstReference >= 0) {
          result[indexFirstReference].classFICount++;
          result[indexFirstReference].classesCompositeFi.push(compositeFI);
        } else {
          let firstElementAssociation = createFIObject(firstReference._id, firstReference.name, compositeFI);
          result.push(firstElementAssociation);
        }
        if (indexSecondReference != null && indexSecondReference >= 0) {
          result[indexSecondReference].classFICount++;
          result[indexSecondReference].classesCompositeFi.push(compositeFI);
        } else {
          let secondElementAssociation = createFIObject(secondReference._id, secondReference.name, compositeFI);
          
          result.push(secondElementAssociation);
        }
      }
    });
  });

  classesForIntegration.forEach(classe => {
    let index = null;
    for (let i = 0; i < result.length && index == null; i++) {
      if (result[i].className === classe.name) {
        index = i;
      }
    }
    if (index == null) {
      let fi = {
        classId: classe._id,
        className: classe.name,
        classFICount: 0,
        classesCompositeFi: [],
        hasIntegrated: false
      };
      result.push(fi);
    }
  });
  console.log("result fi -> ", result);
  return result;
}

function getFit(className, arrayFi) {
  let countFIS = 0;
  arrayFi.forEach(element2 => {
    let item = _.find(element2.classesCompositeFi, ['name', className]);
    if (item) {
      countFIS += element2.classFICount;
    }
  });
  return countFIS;
}

function chooseClass(arrayFIT, arrayFi) {
  let arrayFINotIntegrated = arrayFIT.filter(function (item) {
    return item.fit != "-";
  });
  let candidatesClassFIT = [];
  candidatesClassFIT.push(arrayFINotIntegrated[0]);
  let item = _.find(arrayFi, ['className', candidatesClassFIT[0].className]);
  let candidatesClass = [];
  candidatesClass.push(item);

  for (let i = 1; i < arrayFINotIntegrated.length; i++) {
    if (arrayFINotIntegrated[i].fit < candidatesClassFIT[0].fit) {
      candidatesClassFIT = [];
      candidatesClass = [];
      let item = _.find(arrayFi, ['className', arrayFINotIntegrated[i].className]);
      candidatesClass.push(item);
      candidatesClassFIT.push(arrayFINotIntegrated[i]);

    } else if (arrayFINotIntegrated[i].fit == candidatesClassFIT[0].fit) {
      let item = _.find(arrayFi, ['className', arrayFINotIntegrated[i].className]);
      candidatesClass.push(item);
      candidatesClassFIT.push(arrayFINotIntegrated[i]);
    }

  }

  let result = candidatesClass[0];
  if (candidatesClass.length > 1) {
    candidatesClass.forEach(element => {
      if (element.classFICount > result.classFICount) {
        result = element;
      }
    });
  }

  arrayFi.forEach(element2 => {

    if (result.className == element2.className) {
      element2.hasIntegrated = true;
      element2.classesCompositeFi.forEach(a => {
        let index = null;
        for (let i = 0; i < arrayFIT.length && index == null; i++) {
          if (arrayFIT[i].className === a.name) {
            index = i;
          }
        }
        if (arrayFIT[index].fit != '-') {
          arrayFIT[index].fit = arrayFIT[index].fit - result.classFICount;
        }
      });
      let indexResult = null;
      for (let i = 0; i < arrayFIT.length && indexResult == null; i++) {
        if (arrayFIT[i].className === result.className) {
          indexResult = i;
        }
      }

      arrayFIT[indexResult].fit = "-";
    }
  });
  return result;
}

function createFIObject(classId, className, compositeFI){
  let object = {
    classId: classId,
    className: className,
    classFICount: 1,
    classesCompositeFi: [compositeFI],
    hasIntegrated: false
  };
  return object;
}