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

  let headerSheett = createHeaderSheet(diagrams.ownedElements.length);
  sheet.push(headerSheett);
  classesForIntegration = _.orderBy(classesForIntegration, 'name', 'asc');
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
    for (const element of table) {
      let className = element[0];
      let fitValue = _.find(arrayFIT, (f) => { return f.className == className });
      element.push(fitValue.fit);
    }

    let chosenClass = chooseClass(arrayFIT, arrayFi);
    let stubsInChosenClass = "";
    let arrayFINotIntegrated = arrayFi.filter(function (item) {
      return !item.hasIntegrated;
    });

    arrayFINotIntegrated.forEach(classNotIntegrated => {
      let classIncluded = _.find(classNotIntegrated.classesCompositeFi, (ic) => { return ic.name == chosenClass.className });
      if (classIncluded) {
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
  sheet.push(['IF = Number of integrated classes AFTER the given class.']);
  sheet.push(['LIF = Sum of the FIs of the integrated classes BEFORE the given class.']);
  sheet.push([]);
  sheet.push(['Integration order']);

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
  }
  return result;
}

function createHeaderSheet(classCount) {
  let header = [];
  header.push("");
  header.push("IF");
  for (let i = 1; i < classCount; i++) {
    header.push("LIF" + i);
  }
  return header;
}

function generateFI(classesForIntegration) {
  let result = [];
  classesForIntegration.forEach(classe => {
    let listAssociationsAnalyzed = [];
    classe.ownedElements.forEach(element => {
      let compositeFI = { id: '', name: '' };
      if (element instanceof type.UMLGeneralization) {
        if (element.target) {
          let specializedClass = element.source;
          compositeFI.id = specializedClass._id;
          compositeFI.name = specializedClass.name;

          let generalizationClass = element.target;
          let indexGeneralizationClass = _.findIndex(result, x => x.className === generalizationClass.name);

          if (hasCalculatedFIForClass(indexGeneralizationClass)) {
            result[indexGeneralizationClass].classFICount++;
            result[indexGeneralizationClass].classesCompositeFi.push(compositeFI);
          } else {
            let targetElementAssociation = createFIObject(generalizationClass._id, generalizationClass.name, compositeFI);
            result.push(targetElementAssociation);
          }
        }
      } else if (element instanceof type.UMLAssociation) {

        let classOfRelationship = element.end2.reference;
        let indexAssociationsAnalyzed = _.findIndex(listAssociationsAnalyzed, x => x === classOfRelationship.name);
        let unanalyzedAssociation = indexAssociationsAnalyzed === -1;
        if (unanalyzedAssociation) {
          listAssociationsAnalyzed.push(classOfRelationship.name);
          let isTargetPartAssociation = element.end2.aggregation == "shared" || element.end2.aggregation == "composite";

          let isDirectAssociationOrBidirectionalAssociation = element.end2.aggregation == "none";
          if (isDirectAssociationOrBidirectionalAssociation) {
            let firstReference = element.end1.reference;
            compositeFI.id = firstReference._id;
            compositeFI.name = firstReference.name;

            let secondReference = element.end2.reference;
            let indexSecondReference = _.findIndex(result, x => x.className === secondReference.name);

            if (hasCalculatedFIForClass(indexSecondReference)) {
              result[indexSecondReference].classFICount++;
              result[indexSecondReference].classesCompositeFi.push(compositeFI);
            } else {
              let secondElementAssociation = createFIObject(secondReference._id, secondReference.name, compositeFI);
              result.push(secondElementAssociation);
            }

            let isBidirectionalAssociation = element.end2.navigable == "unspecified";
            if (isBidirectionalAssociation) {
              let secondReference = element.end2.reference;
              let isCircularReference = secondReference.name === firstReference.name;
              if (!isCircularReference) {
                let unspecifiedConposite = { id: secondReference._id, name: secondReference.name };

                let indexUnspecified = _.findIndex(result, x => x.className === firstReference.name);
                
                if (hasCalculatedFIForClass(indexUnspecified)) {
                  result[indexUnspecified].classFICount++;
                  result[indexUnspecified].classesCompositeFi.push(unspecifiedConposite);
                } else {
                  let firstElementAssociation = createFIObject(firstReference._id, firstReference.name, unspecifiedConposite);
                  result.push(firstElementAssociation);
                }
              }
            }

          }
          else if (isTargetPartAssociation) {
            let targetClass = element.end2.reference;
            compositeFI.id = targetClass._id;
            compositeFI.name = targetClass.name;

            let indexPartClass = _.findIndex(result, x => x.className === classe.name);
            if (hasCalculatedFIForClass(indexPartClass)) {
              result[indexPartClass].classFICount++;
              result[indexPartClass].classesCompositeFi.push(compositeFI);
            } else {
              let classFI = createFIObject(classe._id, classe.name, compositeFI);
              result.push(classFI);
            }
          }
        }
      }
      else if (element instanceof type.UMLAssociationClassLink) {
        compositeFI.id = classe._id;
        compositeFI.name = classe.name;

        let firstReference = element.associationSide.end1.reference;
        let secondReference = element.associationSide.end2.reference;

        let indexFirstReference = _.findIndex(result, x => x.className === firstReference.name);
        let indexSecondReference = _.findIndex(result, x => x.className === secondReference.name);

        if (hasCalculatedFIForClass(indexFirstReference)) {
          result[indexFirstReference].classFICount++;
          result[indexFirstReference].classesCompositeFi.push(compositeFI);
        } else {
          let firstElementAssociation = createFIObject(firstReference._id, firstReference.name, compositeFI);
          result.push(firstElementAssociation);
        }
        
        let isSelfAssociation = indexSecondReference == indexFirstReference;
        if (!isSelfAssociation) {
          if (hasCalculatedFIForClass(indexSecondReference)) {
            result[indexSecondReference].classFICount++;
            result[indexSecondReference].classesCompositeFi.push(compositeFI);
          } else {
            let secondElementAssociation = createFIObject(secondReference._id, secondReference.name, compositeFI);
            result.push(secondElementAssociation);
          }
        }
      }
    });
  });

  classesForIntegration.forEach(classe => {
    let indexClass = _.findIndex(result, x => x.className === classe.name);

    if (!hasCalculatedFIForClass(indexClass)) {
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

  arrayFi.forEach(fiObject => {

    if (result.className === fiObject.className) {
      fiObject.hasIntegrated = true;
      fiObject.classesCompositeFi.forEach(classCompositeFIObject => {
        let index = _.findIndex(arrayFIT, x => x.className === classCompositeFIObject.name);
        let classCompositeHasINtegrated = arrayFIT[index].fit === '-';
        if (!classCompositeHasINtegrated) {
          arrayFIT[index].fit = arrayFIT[index].fit - result.classFICount;
        }
      });
      
      let indexResult = _.findIndex(arrayFIT, x => x.className === result.className);
      arrayFIT[indexResult].fit = "-";
    }
  });
  return result;
}

function createFIObject(classId, className, compositeFI) {
  let object = {
    classId: classId,
    className: className,
    classFICount: 1,
    classesCompositeFi: [compositeFI],
    hasIntegrated: false
  };
  return object;
}

function hasCalculatedFIForClass(indexClass){
  return indexClass != null && indexClass >= 0;
}