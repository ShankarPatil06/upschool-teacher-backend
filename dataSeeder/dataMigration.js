const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
AWS.config.update({
    region: process.env.REGION, // e.g., 'us-east-1'
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,  // Set these in environment variables
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

let DBEnvPrefix = 'prod_';
let DBNamePrefix = `${DBEnvPrefix}upschool_`;

const TABLE_NAMES = {
    upschool_users_table: `${DBNamePrefix}users_table`,
    upschool_digi_card_table: `${DBNamePrefix}digi_card_table`,
    upschool_topic_table: `${DBNamePrefix}topic_table`,
    upschool_chapter_table: `${DBNamePrefix}chapter_table`,
    upschool_unit_table: `${DBNamePrefix}unit_table`,
    upschool_standard_table: `${DBNamePrefix}standard_table`,

    upschool_parent_info: `${DBNamePrefix}parent_info`,
    upschool_student_info: `${DBNamePrefix}student_info`,
    upschool_teacher_info: `${DBNamePrefix}teacher_info`,
    upschool_school_info_table: `${DBNamePrefix}school_info_table`,
    upschool_class_table: `${DBNamePrefix}class_table`,
    upschool_client_class_table: `${DBNamePrefix}client_class_table`,
    upschool_section_table: `${DBNamePrefix}section_table`,
    upschool_concept_blocks_table: `${DBNamePrefix}concept_blocks_table`,
    upschool_subject_table: `${DBNamePrefix}subject_table`,
    upschool_teaching_activity: `${DBNamePrefix}teaching_activity`,
    upschool_digicard_teacher_extension: `${DBNamePrefix}digicard_teacher_extension`,
    upschool_quiz_table: `${DBNamePrefix}quiz_table`,
    upschool_question_source: `${DBNamePrefix}question_source`,
    upschool_blueprint_table: `${DBNamePrefix}blueprint_table`,
    upschool_question_table: `${DBNamePrefix}question_table`,
    upschool_cognitive_skill: `${DBNamePrefix}cognitive_skill`,
    upschool_content_category: `${DBNamePrefix}content_category`,
    upschool_group_table: `${DBNamePrefix}group_table`,
    upschool_test_question_paper: `${DBNamePrefix}test_question_paper`,
    upschool_class_test_table: `${DBNamePrefix}class_test_table`,
    upschool_scanner_session_info: `${DBNamePrefix}scanner_session_info`,
    upschool_test_result: `${DBNamePrefix}test_result`,
    upschool_quiz_result: `${DBNamePrefix}quiz_result`,
    upschool_presets_table: `${DBNamePrefix}presets_table`,
}

const dynamoDB = new AWS.DynamoDB.DocumentClient();

async function scanTable(tableName) {
    let items = [];
    let params = { TableName: tableName };
    let lastEvaluatedKey = null;

    do {
        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }

        try {
            const result = await dynamoDB.scan(params).promise();
            items = items.concat(result.Items);
            lastEvaluatedKey = result.LastEvaluatedKey;
        } catch (error) {
            console.error(`Error scanning table ${tableName}:`, error);
            return [];
        }

    } while (lastEvaluatedKey);

    return items;
}

async function exportAllTables() {
    const outputDir = path.join(__dirname, 'dynamodb_exports');

    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    for (let [key, tableName] of Object.entries(TABLE_NAMES)) {
        console.log(`Fetching data from ${tableName}...`);
        const tableData = await scanTable(tableName);

        // Define the file path for each table
        const outputFile = path.join(outputDir, `${tableName}.json`);

        // Write data to the respective file
        fs.writeFileSync(outputFile, JSON.stringify(tableData, null, 2));

        console.log(`Data export completed for ${tableName}! File saved: ${outputFile}`);
    }
}

// Execute the script
exportAllTables().catch(console.error);

// (async () => {
//     for (let [key, tableName] of Object.entries(TABLE_NAMES)) {
//         console.log({ firstttttt: tableName })
//     }
// })()