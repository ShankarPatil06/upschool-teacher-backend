// const uuid = require("uuidv4");
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwt_decode = require('jwt-decode');
const dynamoDbCon = require('../awsConfig');
const constant = require('../constants/constant');
const {groupTypes } = require('../constants/constant');
const { constants } = require("buffer");
const { StatusCodes } = require('http-status-codes');
const fs = require("fs");
// const { getS3SignedUrl } = require("../services/s3Service");
const s3Services = require("../services/s3Service");


const excelEpoc = new Date(1900, 0, 0).getTime();
const msDay = 86400000;

exports.getCurrentTimestamp = () => new Date().toISOString();

// exports.getRandomString = function () {
//     // let group_random_user_id = crypto.randomBytes(20).toString("hex");
//     // return uuid.fromString(group_random_user_id);
//         return uuidv4(); // Generates a random UUID
// }
exports.getRandomString = () => uuidv4(); 


// exports.getRandomString = function () {
//     let group_random_user_id = crypto.randomBytes(20).toString("hex");
//     return uuid.fromString(group_random_user_id);
//     // const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // Predefined namespace for DNS
//     // let group_random_user_id = crypto.randomBytes(20).toString("hex");
//     // return v5(group_random_user_id, NAMESPACE);
// }

exports.getRandomOtp = function () {
    return Math.floor(100000 + Math.random() * 900000);
}

exports.getEncryptedPassword = function (password) {
    let encrypt_key = crypto.createCipher('aes-128-cbc', process.env.SECRET_KEY);
    let encrypted_password = encrypt_key.update(password, 'utf8', 'hex')
    encrypted_password += encrypt_key.final('hex');
    return encrypted_password;
}

exports.getDecryptedPassword = function (password) {
    let decrypt_key = crypto.createDecipher('aes-128-cbc', process.env.SECRET_KEY);
    let decrypted_password = decrypt_key.update(password, 'hex', 'utf8')
    decrypted_password += decrypt_key.final('utf8');
    return decrypted_password;
}

exports.getJwtToken = function (request) {
    return jwt.sign({ teacher_id: request.teacher_id, user_role: request.user_role, user_name: request.user_firstname }, process.env.SECRET_KEY);
}

exports.getJwtTokenForScanner = function (request) {
    return jwt.sign({ teacher_id: request.teacher_id, test_id: request.test_id }, process.env.SECRET_KEY);
}

exports.decodeJwtToken = function (token) {
    return jwt_decode(token);
}

exports.hashingPassword = function (hashReq) {
    let givenPassword = hashReq.salt + hashReq.password;
    let hashedPassword = crypto.createHash('sha256').update(givenPassword).digest('base64');
    return hashedPassword;
}

exports.change_dd_mm_yyyy = function (givenDate) {
    console.log({givenDate});
    if (givenDate.toString().includes('-')) {
        let splitedDate = givenDate.split("-");
        let dd_mm_yyyy = splitedDate[2] + "-" + splitedDate[1] + "-" + splitedDate[0];
        return dd_mm_yyyy;
    }
    else {
        return "00-00-0000";
    }
}


exports.sortDataBasedOnTimestamp = function (j, data) {
    let orderedData = data;
    function getSortedData(i) {
        if (i < data.Items.length) {
            let today = new Date(data.Items[i].case_created_ts);
            let y = today.getFullYear();
            let m = today.getMonth() + 1;
            let newM = m < 12 ? '0' + m : m;
            let d = today.getDate();
            let newD = d < 10 ? '0' + d : d;
            let h = today.getHours();
            let newH = h < 10 ? '0' + h : h;
            let mt = today.getMinutes();
            let newMt = mt < 10 ? '0' + mt : mt;
            let sec = today.getSeconds();
            let newSec = sec < 10 ? '0' + sec : sec;
            let ts = y + "" + newM + "" + newD + "" + newH + "" + newMt + "" + newSec;
            let timeerds = parseInt(ts);
            data.Items[i].order_id = timeerds;
            i++;
            getSortedData(i);
        } else {
            data.Items.sort(function (a, b) {
                return b.order_id - a.order_id;
            });
            return orderedData;
        }
    }
    getSortedData(j);
    return orderedData;
}

exports.findDuplicatesInArrayOfObjects = function (reqArray, checkField) {
    console.log(reqArray);
    const lookup = reqArray.reduce((a, e) => {
        a[e[checkField]] = ++a[e[checkField]] || 0;
        return a;
    }, {});

    let duplicates = reqArray.filter(e => lookup[e[checkField]]);

    return duplicates;
}

exports.strToLowercase = (str) => str.toLowerCase();

const isNullOrEmpty = (str) => !str;

exports.isNullOrEmpty = isNullOrEmpty;

exports.isEmptyObject = (val) => isNullOrEmpty(val) || (val && Object.keys(val).length === 0);

exports.isEmptyArray = (val) => val && !val.length;

const removeDuplicates = (arr) => [...new Set(arr)];

exports.removeDuplicates = removeDuplicates;

exports.reverse = (arr) => [...arr].reverse();

exports.extractValue = (arr, prop) => removeDuplicates(arr.map(item => item[prop]));

exports.parseStr = (str, replaceStr = "") => isNullOrEmpty(str) ? replaceStr : str;

exports.hasText = (str) => !!(str && str.trim() !== "");

exports.hasNoText = (str) => !(str && str.trim() !== "");

exports.sortArrayOfObjects = (arr, keyToSort, direction) => {
    if (direction === 'none') return arr;

    const compare = (objectA, objectB) => {
        const valueA = objectA[keyToSort]
        const valueB = objectB[keyToSort]

        if (valueA === valueB) return 0;

        if (valueA > valueB) {
            return direction === 'ascending' ? 1 : -1
        } else {
            return direction === 'ascending' ? -1 : 1
        }
    }

    return arr.slice().sort(compare)
}

exports.sortByDate = (arr, keyToSort) => arr.sort((a, b) => new Date(b[keyToSort]) - new Date(a[keyToSort]));

exports.getExtType = function (file_type) {
    let file_ext;
    switch (file_type) {
        case 'image/jpeg':
            file_ext = '.jpg';
            break;

        case 'text/plain':
            file_ext = '.txt';
            break;

        case 'text/html':
            file_ext = '.html';
            break;

        case 'text/css':
            file_ext = '.css';
            break;

        case 'image/png':
            file_ext = '.png';
            break;

        case 'application/pdf':
            file_ext = '.pdf';
            break;

        case 'application/json':
            file_ext = '.json';
            break;

        case 'application/octet-stream':
            file_ext = '.docx';
            break;

        case 'application/msword':
            file_ext = '.doc';
            break;

        case 'application/vnd.ms-excel':
            file_ext = '.xls';
            break;

        case 'application/vnd.ms-powerpoint':
            file_ext = '.ppt';
            break;

        case "application/zip":
            file_ext = ".zip";
            break;

        case "application/x-zip-compressed":
            file_ext = ".zip";
            break;

        case "multipart/x-zip":
            file_ext = ".zip"
            break;
    }
    return file_ext;
}

exports.getMimeType = function (file_ext) {
    let file_mime;
    switch (file_ext) {
        case '.jpg':
            file_mime = 'image/jpeg';
            break;

        case '.jpeg':
            file_mime = 'image/jpeg';
            break;

        case '.txt':
            file_mime = 'text/plain';
            break;

        case '.html':
            file_mime = 'text/html';
            break;

        case '.css':
            file_mime = 'text/css';
            break;

        case '.png':
            file_mime = 'image/png';
            break;

        case '.pdf':
            file_mime = 'application/pdf';
            break;

        case '.json':
            file_mime = 'application/json';
            break;

        case '.docx':
            file_mime = 'application/octet-stream';
            break;

        case '.doc':
            file_mime = 'application/msword';
            break;

        case '.xls':
            file_mime = 'application/vnd.ms-excel';
            break;

        case '.xlsx':
            file_mime = 'application/vnd.ms-excel';
            break;

        case '.ppt':
            file_mime = 'application/vnd.ms-powerpoint';
            break;

        case '.zip':
            file_mime = 'application/zip';
            break;
    }
    return file_mime;
}

exports.excelDateToJavascriptDate = function (excelDate) {
    return new Date(excelEpoc + excelDate * msDay);
}

exports.convertNumberToAlphabet = function (number) {
    return (number + 9).toString(36).toUpperCase();
}

exports.compareAndFindDuplicateObj = function (arrayOfId, arrayOfObj) {
    console.log("arrayOfId : ", arrayOfId);
    console.log("arrayOfObj : ", arrayOfObj);
    function comparer(otherArray) {
        return function (current) {
            return otherArray.filter(function (other) {
                return other == current.chapter_id
            }).length != 0;
        }
    }

    let onlyInB = arrayOfObj.filter(comparer(arrayOfId));
    return onlyInB
}

exports.giveindextoList = function (listToCompare, listToChange, key) {
    // Adding Index to List given
    let count = 1;
    listToChange.length > 0 && listToCompare.map(ele1 => {
        listToChange.map(ele2 => {
            if (ele1 === ele2[key]) {
                ele2.index = count;
                count++;
            }
        })
    })
    // Sorting List based on index key value 
    listToChange.sort((a, b) => a.index - b.index);
    return listToChange;
}

exports.getDifferenceValueFromTwoArray = async function (arrayOne, arrayTwo) {
    let result = [];
    await arrayOne.map(aOne => {
        if (!arrayTwo.includes(aOne)) {
            result.push(aOne);
        }
    })

    return result;
}
exports.checkOneArrayElementsinAnother = function (arrayOne, arrayTwo) {
    const result = arrayOne.every(function (elem) {
        return arrayTwo.indexOf(elem) > -1;
    });
    return result;
};
exports.sortOneArrayBasedonAnother = function (arrayToBeSorted, arrayAsIndex, Key) {
    arrayToBeSorted = arrayAsIndex.map((a) => arrayToBeSorted.filter((e) => e[Key] === a)[0]);
    return arrayToBeSorted;
};
exports.PutObjectS3SigneUdrl = async function (requestFileName, folderName) {

    let file_type = requestFileName.split(".");
    let file_ext = '.' + file_type[file_type.length - 1];

    let URL_EXPIRATION_SECONDS = 300;
    let randomID = exports.getRandomString();
    let Key = `${folderName}/${randomID}` + file_ext;

    // Get signed URL from S3
    let s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key,
        Expires: URL_EXPIRATION_SECONDS,
        ContentType: exports.getMimeType(file_ext),
        ACL: 'public-read'
    }

    let uploadURL = await dynamoDbCon.s3.getSignedUrlPromise('putObject', s3Params);

    return { uploadURL: uploadURL, Key: Key };
}

exports.removeDuplicatesFromArrayOfObj = async function (reqArray, checkField) {

    const uniqueArr = reqArray.filter((obj, index) => {
        return index === reqArray.findIndex(o => obj[checkField] === o[checkField]);
    });

    return uniqueArr;
}
exports.shuffleArray = async function (reqArray) {

    let shuffled = await reqArray
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)

    return shuffled;
}


exports.removeExistObject = async (idArray, checkObjArr, idName) => {
    let finalArr = [];

    await checkObjArr.forEach(oQues => {
        if (!idArray.find(qId => qId === oQues[idName])) {
            finalArr.push(oQues);
        }
    })

    return finalArr;
}

exports.getAnswerContentFileUrl = async (answerArr) => {
console.log("answerArr",answerArr)
    return new Promise(async (resolve, reject) => {

        async function contentUrl(i) {
            if (i < answerArr.length) {
                console.log("answerArr",answerArr[i].answer_content)
                answerArr[i].answer_content_url = (JSON.stringify(answerArr[i].answer_content).includes("question_uploads/")) ? await s3Services.getS3SignedUrl(answerArr[i].answer_content) : "N.A.";
                i++;
                contentUrl(i);
            }
            else {
                resolve(answerArr);
            }
        }
        contentUrl(0)

    })
}


exports.checkPriorityQuestions = async (quesDetails) => {
    let priorityOrder = [];
    return new Promise(async (resolve, reject) => {
        async function secLoop(i) {
            if (i < quesDetails.length) {
                await quesDetails[i].questions.forEach((qes, j) => {
                    priorityOrder.push(
                        {
                            "sec": i,
                            "que": j,
                            "pre": (qes.concept_ids.length > 0) ? 0 : (qes.concept_ids.length == 0 && quesDetails[i].topic_ids.length > 0) ? 1 : 2,
                            "qStatus": "No"
                        }
                    )
                });
                i++;
                secLoop(i);
            }
            else {
                resolve(priorityOrder);
            }
        }
        secLoop(0)
    })
}

exports.formattingAnswer = async (answer) => {
    answer = answer.split("\n");  // Split by line
  const formattedAnswer = answer.map((words) => {
    // Remove LaTeX style parentheses (\\( and \\)) and \\qquad with surrounding spaces
    words = words.replace(/\\\(\s*\\qquad\s*\\\)/g, ""); // Remove \\( \\qquad \\)
    words = words.replace(/\s*\\qquad\s*/g, ""); // Remove \\qquad with spaces
    // Remove all spaces
    words = words.replace(/\s/g, "");
    // Remove periods and other unwanted characters
    words = words.replace(/\./g, "");  // Remove periods
    words = words.replace(/\:/g, "");  // Remove colons
    words = words.replace(/\;/g, "");  // Remove semicolons

    // Convert to lowercase if needed
    words = words.toLowerCase();

    return words;
  });

  console.log("AFTER FORMATTING : ", formattedAnswer);
  return formattedAnswer;
}

exports.getAnswerBlanks = async (blankCount) => {

    let blank = "";
    let dashes = constant.answerSheet;
    let iCount = 0;
    for (let i = 0; i < blankCount; i++) {
        iCount = i + 1;
        blank += (iCount == 1) ? dashes.first : (iCount == 2) ? dashes.second : (iCount > 2 && iCount % 2 != 0) ? dashes.odd : (iCount > 2 && iCount % 2 == 0) ? dashes.even : "";

        blank += (iCount % 2 == 0 && iCount != blankCount) ? "\n\n" : "";
    }

    return blank.slice(0, -1);
}

exports.checkDuplicateQuestionIds = async (duplicateArrayCheck, group_question_id, questions_list) => {
    
    async function duplicateCheck(k){
                                
        let dupCheck = duplicateArrayCheck.filter((d) =>  d === group_question_id[k] && d ); 

        console.log("dupCheck : ", dupCheck); 
        console.log("group_question_id : ", group_question_id[k]);
        console.log("duplicateArrayCheck : ", duplicateArrayCheck);

        if(k < group_question_id.length){
          if(dupCheck.length > 0){
              console.log("Inside If : ");

            k++; 
            duplicateCheck(k); 
          }else{
            questions_list.push(group_question_id[k]); 
            duplicateArrayCheck.push(group_question_id[k]); 
            return{
                break: false, duplicateArrayCheck, questions_list  // Loop completed without Breaking 
            }
          }
        }else{ 
            return{
                break: true, reason: constant.messages.NO_ENOUGH_QUESTIONS, duplicateArrayCheck, questions_list
            }
        }
      }
      duplicateCheck(0); 

    }
exports.getMarksDetailsFormat = async (secAndQues) => {
    let finalDetials = [];
    let questionArr = [];

    return new Promise(async (resolve, reject) => {
        async function secLoop(i) {
            if (i < secAndQues.length) {
                questionArr = [];
                await secAndQues[i].question_id.forEach(ques => {
                    questionArr.push(
                        {
                            question_id: ques,
                            modified_marks: "N.A.",
                            obtained_marks: "N.A.",
                            student_answer: "N.A."
                        }
                    );
                })

                // finalDetials.push({ section_name: secAndQues[i].section_name, qa_details: questionArr });
                finalDetials.push( ...questionArr );
                i++;
                secLoop(i);
            }
            else {
                resolve({qa_details : finalDetials});
            }
        }
        secLoop(0)
    })
}

exports.getQuizMarksDetailsFormat = async (questionDetails) => {
    let finalDetials = [];
    let questionArr = [];

    let quizSetDetails = constant.quizSetDetails;
    return new Promise(async (resolve, reject) => {
        async function secLoop(i) {
            if (i < quizSetDetails.length) {
                questionArr = [];
                await questionDetails[quizSetDetails[i].setKey].forEach(ques => {
                    questionArr.push(
                        {
                            question_id: ques,
                            modified_marks: "N.A.",
                            obtained_marks: "N.A.",
                            student_answer: "N.A."
                        }
                    );
                })

                finalDetials.push({ set_key: quizSetDetails[i].setKey, set_name: quizSetDetails[i].setName, qa_details: questionArr });
                i++;
                secLoop(i);
            }
            else {
                resolve(finalDetials);
            }
        }
        secLoop(0)
    })
}

exports.concatAnswers = async (studentAns) => {
    console.log("STUDENT ANSWERS :", studentAns);
    return new Promise(async (resolve, reject) => {
        async function studentLoop(i) {
            if (i < studentAns.length) {
                studentAns[i].overall_answer = await exports.checkAndConcatAns(studentAns[i].answer_metadata);
                i++;
                studentLoop(i);
            }
            else {
                resolve(studentAns);
            }
        }
        studentLoop(0);
    })
}

exports.checkAndConcatAns = async (studAns) => {
    let concatData = [];
    let checkObj = await studAns.filter(chVar => !Number(chVar.page_no));
    if (checkObj.length == 0) {
        let orderedAnsSheet = studAns.sort((a, b) => parseFloat(a.page_no) - parseFloat(b.page_no));

        const missingNumbers = await orderedAnsSheet.reduce((result, current, index, arr) => {
            if (index !== 0) {
                const prevNumber = arr[index - 1].number;
                const currentNumber = current.number;
                for (let i = prevNumber + 1; i < currentNumber; i++) {
                    result.push(i);
                }
            }
            return result;
        }, []);

        if (missingNumbers.length == 0 && Number(orderedAnsSheet[0].page_no) == 1) {
            await orderedAnsSheet.forEach(sAns => {
                concatData = concatData.concat(sAns.studentAnswer);
            })
        }
    }

    return concatData;
}

exports.splitSectionAnswer = async (studMetaData, questionPaper) => {

    return new Promise(async (resolve, reject) => {
        let sectionList = await questionPaper.map(sec => sec.section_name);

        let sectionIndex = await sectionList.map(secName => {
            return studMetaData.indexOf(secName.toLowerCase().replace(/ /g, ''));
        })

        let splitedAns = [];
        let forIndividualAns;
        async function splitAns(j) {
            if (j < sectionIndex.length) {
                if (j < sectionIndex.length && ((j + 1) == sectionIndex.length)) {
                    // forIndividualAns = studMetaData.slice(sectionIndex[j]);
                    // forIndividualAns.shift(); // Remove the first element
                    // forIndividualAns.pop(); // Remove last element

                    forIndividualAns = await exports.formatIndividualAnsArr(studMetaData, sectionIndex[j], "N.A.");
                    await exports.splitIndividualAns(forIndividualAns).then((speAns) => {
                        splitedAns.push({ secAns: forIndividualAns, individualAns: speAns });
                    })

                    // splitedAns.push({ secAns: studMetaData.slice(sectionIndex[j])});
                }
                else {
                    // forIndividualAns = studMetaData.slice(sectionIndex[j], sectionIndex[j+1] + 1);
                    // forIndividualAns.shift(); // Remove the first element
                    // forIndividualAns.pop(); // Remove last element

                    forIndividualAns = await exports.formatIndividualAnsArr(studMetaData, sectionIndex[j], sectionIndex[j + 1] + 1);
                    await exports.splitIndividualAns(forIndividualAns).then((speAns) => {
                        splitedAns.push({ secAns: forIndividualAns, individualAns: speAns });
                    })

                    // splitedAns.push({ secAns: studMetaData.slice(sectionIndex[j], sectionIndex[j+1] + 1)});        
                }
                j++;
                splitAns(j);
            }
            else {
                resolve(splitedAns);
            }
        }
        splitAns(0)
    })
}

exports.splitStudentQuizAnswer = async (studMetaData) => {
    console.log("studMetaData",studMetaData)
    return new Promise(async (resolve, reject) => {
        let splitedAns = [];
        await exports.splitIndividualAns(studMetaData).then((speAns) => {
            splitedAns.push({ individualAns: speAns });
        })
        resolve(splitedAns);
    })
}

exports.formatIndividualAnsArr = async (studMetaData, sectionIndex, splitContinues) => {
    // forIndividualAns = studMetaData.slice(sectionIndex[j]);
    // forIndividualAns.shift(); // Remove the first element
    // forIndividualAns.pop(); // Remove last element

    // forIndividualAns = studMetaData.slice(sectionIndex[j], sectionIndex[j+1] + 1);
    // forIndividualAns.shift(); // Remove the first element
    // forIndividualAns.pop(); // Remove last element

    let resArr = splitContinues === "N.A." ? studMetaData.slice(sectionIndex) : studMetaData.slice(sectionIndex, splitContinues);
    resArr.shift(); // Remove the first element
    resArr.pop(); // Remove last element
    return resArr;
}

// exports.splitIndividualAns = async (ansArray) => {

//     return new Promise(async (resolve, reject) => {
//         let individualAns = [];
//         let formattedAns = "";
//         let tempAns = "";
        
//         await ansArray.forEach(inAns => {
//             if(inAns.toLowerCase().replace(/ /g,'').includes(constant.evalConstant.ans))
//             {
//                 individualAns.push(tempAns.replace(new RegExp(`${constant.evalConstant.empty}`, "gi"), ""));
//                 formattedAns = inAns.toLowerCase().replace(/ /g, '').split(constant.evalConstant.ans)[1];
//                 tempAns = formattedAns == "" ? constant.evalConstant.empty : formattedAns;
//             }
//             else {
//                 if (tempAns.length > 0) {
//                     tempAns += tempAns != constant.evalConstant.splitLines ? constant.evalConstant.splitLines + inAns : inAns;
//                 }
//             }
//         })

//         if (tempAns.length > 0) {
//             individualAns.push(tempAns.replace(new RegExp(`${constant.evalConstant.empty}`, "gi"), ""));
//         }
//         individualAns.shift();
//         resolve(individualAns);
//     })
// }

exports.splitIndividualAns = async (ansArray) => {
    if (!Array.isArray(ansArray)) {
        console.error("splitIndividualAns expected an array but got:", ansArray);
        return []; // or handle the error appropriately
    }

    return new Promise(async (resolve, reject) => {
        let individualAns = [];
        let formattedAns = "";
        let tempAns = "";
        
        await ansArray.forEach(inAns => {
            if(inAns.toLowerCase().replace(/ /g,'').includes(constant.evalConstant.ans))
            {
                individualAns.push(tempAns.replace(new RegExp(`${constant.evalConstant.empty}`, "gi"), ""));
                formattedAns = inAns.toLowerCase().replace(/ /g, '').split(constant.evalConstant.ans)[1];
                tempAns = formattedAns == "" ? constant.evalConstant.empty : formattedAns;
            }
            else {
                if (tempAns.length > 0) {
                    tempAns += tempAns != constant.evalConstant.splitLines ? constant.evalConstant.splitLines + inAns : inAns;
                }
            }
        });

        if (tempAns.length > 0) {
            individualAns.push(tempAns.replace(new RegExp(`${constant.evalConstant.empty}`, "gi"), ""));
        }
        individualAns.shift();
        resolve(individualAns);
    });
};


exports.getIndexOfAlphabet = async (char) => {
    char = char.toUpperCase().replace(/\,/g, "").trim();
    const charCode = char.charCodeAt(0);
    return charCode >= 65 && charCode && char.length == 1 <= 90 ? charCode - 65 : -1;
}

exports.getIndexOfStudentAns = async (ansArr) => {
    return new Promise(async (resolve, reject) => {
        let studentAns = [];
        await ansArr.forEach(async (sAns) => {
            studentAns.push({ studAnsIndex: await exports.getIndexOfAlphabet(sAns) });
        })
        resolve(studentAns);
    })
}

exports.getOptionsWrightAnswers = async (options) => {
    return new Promise(async (resolve, reject) => {
        let correctAns = [];
        await options.forEach((op, i) => {
            if (op.answer_display === "Yes") {
                correctAns.push({ ansIndex: i, weightage: Number(op.answer_weightage) });
            }
        })
        resolve(correctAns);
    })
}

exports.getObjectiveMarks = async (arr1, arr2) => {
    return new Promise(async (resolve, reject) => {
        // const resultMap = await arr2.reduce((map, obj) => {
        //     map.set(obj.studAnsIndex, (map.get(obj.studAnsIndex) || 0) + obj.weightage);
        //     return map;
        // }, new Map());

        // const overallMarks = await arr1.reduce((sum, obj1) => {
        //     return sum + (resultMap.get(obj1.ansIndex) || 0);
        // }, 0);

        // resolve(overallMarks);
        /** ========================================================================================= **/

        // let overallMarks =  await arr2.reduce(async (overallWeightage, student) => {
        //     const match = await arr1.find(answer => answer.ansIndex === student.studAnsIndex);
        //     return overallWeightage + (match ? match.weightage : 0);
        // }, 0);

        /** ========================================================================================= **/

        const promises = arr2.map(async (student) => {
            const match = await arr1.find(answer => answer.ansIndex === student.studAnsIndex);
            return match ? match.weightage : 0;
        });

        const weights = await Promise.all(promises);
        // return weights.reduce((sum, weightage) => sum + weightage, 0);

        resolve(weights.reduce((sum, weightage) => sum + weightage, 0));
    })
}

exports.fetchQuizSetName = (variant) => {
    // const returnValue = await variant === 'A' ? variant === 'B' ? constant.quizSets.b : constant.quizSets.a : constant.quizSets.c ;
    return variant === 'A' ? constant.quizSets.a : variant === 'B' ? constant.quizSets.b : constant.quizSets.c ;
}

exports.getRandomQuestionsFromGroups = (group_response, noOfQuestions, randomDupCheck, quiz_duration) => { 

    let questions_list = []; 
    let group_list = []; 
    let dupcheck = []; 

    return new Promise((resolve, reject) => {
       
        try {
            async function getRandomGroups(i){
                if(group_list.length < Number(noOfQuestions)){ 

                  const randomIndexforGroup = Math.floor(Math.random() * group_response.length); 
          
                  if(dupcheck.includes(randomIndexforGroup)){
                    i++; 
                    getRandomGroups(i);
                  }else{
                    let randomGroup = group_response[randomIndexforGroup]; 
                    group_list.push(randomGroup);
                    dupcheck.push(randomIndexforGroup); 
                    i++; 
                    getRandomGroups(i);
                  }
          
                }else{
                  let indheck = []; 
                  await group_list.forEach((Grp) => quiz_duration += Number(Grp.question_duration)); 

                  function qtnLoop(ind){
                      if(ind < group_list.length){ 

                        if(indheck.length < group_list[ind].group_question_id.length){
                            // Pick Random Questions out of each group : 
                            const randomIndex = Math.floor(Math.random() * group_list[ind].group_question_id.length); 
                            let qtn_id = group_list[ind].group_question_id[randomIndex]; 
                            let dupCheck = randomDupCheck.filter((id) => id === qtn_id);
                            
                            !indheck.includes(randomIndex) && indheck.push(randomIndex); 

                            if(dupCheck.length > 0){
                                qtnLoop(ind); 
                            }else{
                                questions_list.push(qtn_id); 
                                randomDupCheck.push(qtn_id); 
                                ind++;
                                qtnLoop(ind); 
                            }
                        }else{
                           
                            reject(constant.messages.INSUFFICIENT_QUESTIONS)
                        }
                         
                      }else{

                        resolve({questions_list, randomDupCheck, quiz_duration,group_list}); 
    
                      }
                  }; 
                  qtnLoop(0); 
                  
                }
              }
              getRandomGroups(0); 
        }
          catch(err) {
            console.log("Error is here : ", err); 
            reject(err); 
        }
      })
}

exports.getRandomGroups = (group_response, noOfQuestions, quiz_duration) => {

    let group_list = []; 
    let dupcheck = []; 

    return new Promise((resolve, reject) => {
       
        try {
            async function getRandomGroups(i){
                if(group_list.length < Number(noOfQuestions)){ 
                    
                  const randomIndexforGroup = Math.floor(Math.random() * group_response.length); 
        
                  if(dupcheck.includes(randomIndexforGroup)){
                    i++; 
                    getRandomGroups(i);
                  }else{
                    let randomGroup = group_response[randomIndexforGroup]; 
                    group_list.push(randomGroup);
                    dupcheck.push(randomIndexforGroup); 
                    i++; 
                    getRandomGroups(i);
                  }
        
                }else{
                    await group_list.forEach((Grp) => quiz_duration += Number(Grp.question_duration)); 

                    resolve({group_list, quiz_duration}); 
                }
            }
          getRandomGroups(0); 
        }
          catch(err) {
            console.log("Error is here : ", err); 
            reject(err); 
        }
      })
}

exports.splitGroups = async (topicData, concepts_response) => {

    let basic_groups = []; 
    let intermediate_groups = []; 
    let advanced_groups = []; 

    await topicData.topic_concept_id.forEach((f) => {
            
        let eachConcept = concepts_response.filter((concept) => concept.concept_id === f); 

        basic_groups.push(...eachConcept[0].concept_group_id.basic); 
        intermediate_groups.push(...eachConcept[0].concept_group_id.intermediate); 
        advanced_groups.push(...eachConcept[0].concept_group_id.advanced); 
          
      })

      return {
        basic_groups, 
        intermediate_groups, 
        advanced_groups 
      }
}

exports.assignNumberofQuestions = async (fetchResponse, selectedTopics, param) => { 

    if(param === "topics"){

        await fetchResponse.forEach(async (fetchData, Index) => {
            let topicDetails = await selectedTopics.filter((ele) => ele.topic_id === fetchData.topic_id); 
            fetchResponse[Index].noOfQuestions = topicDetails[0].noOfQuestions; 
          }); 
        
          return fetchResponse; 

    }else if(param === "concepts"){
        // console.log("fetchResponse : ", fetchResponse);
        
        await fetchResponse.forEach(async (fetchData, Index) => {
            
            await selectedTopics.forEach(async (ele1) => {

                await ele1.selectedConcepts.forEach((ele2) => { ( ele2.concept_id === fetchData.concept_id ) && ( fetchResponse[Index].noOfQuestions = ele2.noOfQuestions ) }); 
            }); 
            
          }); 
        
          return fetchResponse; 
    }
}

exports.reduceKeys = (data, keysToRetain) => {
    const filteredData = data.map(item =>
        keysToRetain.reduce((obj, key) => {
            if (item.hasOwnProperty(key)) {
                obj[key] = item[key];
            }
            return obj;
        }, {})
    ); 
    return filteredData; 
}; 

exports.getQuestionTrackForAutomatic = (selectedTopics, topic_response, concepts_response, questions_list, non_considered_topic_data, group_list) => {
    
    let questionTrackData = []; 
    selectedTopics.forEach((topic) => {
    
    let topic_concept_id = (topic_response.find((top) => top.topic_id === topic.topic_id)).topic_concept_id; 

        topic_concept_id.forEach((concept) => {

        let rawGroupDetails = (concepts_response.find((con) => con.concept_id === concept)).concept_group_id; 

        let groupDetails = [...rawGroupDetails.basic, ...rawGroupDetails.intermediate, ...rawGroupDetails.advanced]; 

        groupDetails.forEach((grp) => {
            let grpPicked = group_list.filter((grpList) => grpList.group_id === grp); 

            if(!exports.isEmptyArray(grpPicked)){
                let pickedQtnsFromGrp = grpPicked[0].group_question_id.filter((grpQtn) => questions_list.includes(grpQtn)); 

                let trackPerQUestion = pickedQtnsFromGrp.map((qtn) => ({
                    topic_id: topic.topic_id,
                    question_id: qtn,
                    concept_id: concept,
                    group_id: grpPicked[0].group_id,
                    type: exports.filterGroupType(grpPicked[0].group_id, rawGroupDetails)
                }) ); 
                questionTrackData.push(...trackPerQUestion); 

                // check if topic is nonAssigned based on selected questions count 
                if(!exports.isEmptyArray(pickedQtnsFromGrp)){
                    non_considered_topic_data[topic.topic_id] = false; 
                }
            }; 
        });  
    }); 
});
return {res_questionTrackData: questionTrackData, res_non_considered_topic_data: non_considered_topic_data}; 

}

exports.getQuestionTrackForExpress = (topic, topic_response, concepts_response, questions_list, non_considered_topic_data, group_list) => {

    // Formatting Topic-Concept-Group-Question level DS : 
    let questionTrackData = []; 
    let topic_concept_id = (topic_response.find((top) => top.topic_id === topic.topic_id)).topic_concept_id; 

    topic_concept_id.forEach((concept) => {

        let rawGroupDetails = (concepts_response.find((con) => con.concept_id === concept)).concept_group_id
        let groupDetails = [...rawGroupDetails.basic, ...rawGroupDetails.intermediate, ...rawGroupDetails.advanced]; 

        groupDetails.forEach((grp) => {
        let grpPicked = group_list.filter((grpList) => grpList.group_id === grp); 

        if(!exports.isEmptyArray(grpPicked)){
            let pickedQtnsFromGrp = grpPicked[0].group_question_id.filter((grpQtn) => questions_list.includes(grpQtn))

            let trackPerQUestion = pickedQtnsFromGrp.map((qtn) => ({
                topic_id: topic.topic_id,
                question_id: qtn,
                concept_id: concept,
                group_id: grpPicked[0].group_id,
                type: exports.filterGroupType(grpPicked[0].group_id, rawGroupDetails)
            }) ); 
            questionTrackData.push(...trackPerQUestion); 
            
            // check if topic is nonAssigned based on selected questions count 
            if(!exports.isEmptyArray(pickedQtnsFromGrp)){
                non_considered_topic_data[topic.topic_id] = false; 
            }
        }; 
        }); 
    }); 

    return {res_topic: questionTrackData, res_non_considered_topic_data: non_considered_topic_data}
}

exports.getQuestionTrackForManual = async (topicId, concepts_response, questions_list, non_considered_topic_data, group_list) => {

    // Formatting Topic-Concept-Group-Question level DS 
    let questionTrackData = []; 
    await concepts_response.forEach((concept) => {

        let rawGroupDetails = concept.concept_group_id
        let groupDetails = [...rawGroupDetails.basic, ...rawGroupDetails.intermediate, ...rawGroupDetails.advanced]; 

        groupDetails.forEach((grp) => {
        let grpPicked = group_list.filter((grpList) => grpList.group_id === grp); 

        if(!exports.isEmptyArray(grpPicked)){
            let pickedQtnsFromGrp = grpPicked[0].group_question_id.filter((grpQtn) => questions_list.includes(grpQtn))

            let trackPerQUestion = pickedQtnsFromGrp.map((qtn) => ({
                topic_id: topicId,
                question_id: qtn,
                concept_id: concept.concept_id,
                group_id: grpPicked[0].group_id,
                type: exports.filterGroupType(grpPicked[0].group_id, rawGroupDetails)
            }) ); 

            questionTrackData.push(...trackPerQUestion);

            // check if topic is nonAssigned based on selected questions count 
            if(!exports.isEmptyArray(pickedQtnsFromGrp)){
                non_considered_topic_data[topicId] = false; 
            }
        }; 
        }); 
    }); 
    return {res_concept: questionTrackData, res_non_considered_topic_data: non_considered_topic_data}; 
};

exports.filterGroupType = (groupId, allGroups) => {
    return allGroups.basic.includes(groupId) ? groupTypes.Basic : allGroups.intermediate.includes(groupId) ? groupTypes.Intermediate : allGroups.advanced.includes(groupId) ? groupTypes.Advanced : 'N.A.'
}; 

// Function to build an array of rows from the Athena query results
exports.processRows = (resultsData) => {
    // Build an array of columns from the Athena query results
    let cols = resultsData.ResultSet.ResultSetMetadata.ColumnInfo.map(c => c.Name);

    let rows = [];
    resultsData.ResultSet.Rows.map((result) => {
      let row = {};
      result.Data.map((r, i) => {
        row[cols[i]] = r.VarCharValue;
      });
      rows.push(row);
    });
    return rows.slice(1);
  }

  exports.ERROR = StatusCodes;

  exports.formatResponse = (res ,data ,statusCode = 200) =>
  {
    return res.status(statusCode).json(data);
  }
  exports.formatErrorResponse = (errorMessage, status = '') => {  let error = new Error(errorMessage);  error.status = status;  return error;};
  exports.formatResponse2 = (result) => ({ "Items": result });
  exports.getDataByFilterKey = async (request) => {
   console.log("test2request", request);
    let { items, condition } = request;
    const result = items.reduce((acc, item, index) => {
        const currentResult = Object.entries(items[index]).reduce((acc, [key, value]) => {
            const uniqueKey = `:${key}_${index}`;
            acc.FilterExpression += `${key} = ${uniqueKey} ${condition} `;
            acc.ExpressionAttributeValues[`${uniqueKey}`] = value;
            return acc;
        },
            {
                FilterExpression: ' ',
                ExpressionAttributeValues: {},
            });
        // Remove the trailing condition (AND/OR) from the current FilterExpression
        currentResult.FilterExpression = currentResult.FilterExpression.slice(0, -(condition.length + 1));
 
        // Concatenate the FilterExpression for the current item with the overall result
        acc.FilterExpression += `(${currentResult.FilterExpression}) ${condition} `;
        acc.ExpressionAttributeValues = {
            ...acc.ExpressionAttributeValues,
            ...currentResult.ExpressionAttributeValues,
        };
 
        return acc;
    }, {
        FilterExpression: '',
        ExpressionAttributeValues: {},
    });
    result.FilterExpression = result.FilterExpression.slice(0, -(condition.length + 1));
    result.ExpressionAttributeValues[':common_id'] = '61692656'   
    return result;
}

exports.formatDate =(isoString) => {
    const date = new Date(isoString);
  
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
  
    return `${day}-${month}-${year}`;
  }

  exports.fortmatData = (data) => JSON.stringify(data, null, 2);

  exports.readFile = async filePath => await fs.promises.readFile(filePath, 'utf8');

  exports.extractValuesFromInput = async (input) => {
    // Split the input string by newlines
    let lines = input.split('\n');
    
    // Create an array to store the formatted lines as objects
    let formattedLines = [];
  
    // Helper function to process lines with a specific label
    const processLine = (line, label) => {
        console.log("label - ",label);
      const [_, ...value] = line.slice(2).split(':');
      formattedLines.push({
        label: label,
        value: value.join(':').replace(/\*/g, '').replace(/\\$/, '').trim()
      });
    };
  
    // Iterate over each line and apply formatting
    lines.forEach((line) => {
      // Trim whitespace and skip empty lines
      line = line.trim();
      if (line === '') return;
  
      // Process specific lines
      if (line.includes('Set')) processLine(line, "set");
      else if (line.includes('Quiz ID')) processLine(line, "Quiz ID");
      else if (line.includes('Quiz Name')) processLine(line, "Quiz Name");
      else if (line.includes('Class')) processLine(line, "Class");
      else if (line.includes('Section')) processLine(line, "Section");
      else if (line.includes('Subject Name')) processLine(line, "Subject Name");
      else if (line.includes('Test ID')) processLine(line, "Test ID");
      else if (line.includes('Roll No')) processLine(line, "Roll No");
       else if (line.includes('Page')) {
        const match = line.match(/Page No: (\d+)\/\d+/);
        if (match) {
          formattedLines.push({
            label: "pageNo",
            value: match[1].replace(/\*/g, '').replace(/\\$/, '').trim()
          });
        }
      }
    });
  
    return formattedLines;
  };
//   exports.extractAnswersFromInput = async (input) => {
//     // Split the input by newline
//     let lines = input.split('\n');
    
//     // Array to store the extracted question-answer pairs
//     let answers = [];
    
//     // Iterate over each line and check for answer format
//     lines.forEach((line) => {
//       // Trim the line to remove extra spaces
//       line = line.trim();
      
//       // Check if the line starts with a number followed by 'Ans:'
//       const match = line.match(/^(\d+)\.\s*Ans:\s*(.*)$/);
      
//       if (match) {
//         // Extract question number and the corresponding answer
//         const question = match[1] + '.'; // e.g., "2."
//         const answer = match[2]; // e.g., "one"
        
//         // Push the question-answer pair to the array
//         answers.push({ question, answer });
//       }
//     });
    
//     return answers;
//   }

exports.extractAnswersFromInput = async (input) => {
    
    let sections = input.split(/\d+\.\s*Ans:/).filter((sec) => sec.trim().length > 0);
    
    let answers = [];
    
    sections.shift();
    
    sections.forEach((section, index) => {
      let trimmedSection = section.trim();
      
      if (index < 6) {
        let questionNumber = (index + 1) + '.';
        let answer = trimmedSection.split("\n")[0].trim();
        answers.push({ question: questionNumber, answer: answer });
      } else {
        let questionNumber = (index + 1) + '.';
        let answer = trimmedSection;
        answers.push({ question: questionNumber, answer: answer });
      }
    });
  
    console.log("Extracted answers:", answers);
    
    return answers;
  };
  
  
  
  
  
  
  
  
  
  
  
  
  
  
