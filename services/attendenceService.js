const teacherRepository = require('../repository/teacherRepository');
const schoolRepository = require('../repository/schoolRepository');
const constant = require('../constants/constant');
const fetch = require('node-fetch'); // required if not using globally
const MAX_RADIUS_METERS = 2000;

// Haversine formula to compute distance
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    console.log("Input Coordinates:");
    console.log("lat1:", lat1, "lon1:", lon1);
    console.log("lat2:", lat2, "lon2:", lon2);

    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    console.log("Distance calculated (in meters):", distance);
    return distance;
}



async function getLatLngFromAddress(address) {
    const apiKey = '458ed111fc3047b589afd7b7f73f27a7';
    const formattedAddress = `${address}`; // Append state & country
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(formattedAddress)}&key=${apiKey}&countrycode=in&limit=1&no_annotations=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data?.results?.length > 0) {
        const result = data.results[0];
        const { lat, lng } = result.geometry;

        console.log("📍 OpenCage Result:", result.formatted);
        console.log("✅ Coordinates:", lat, lng);

        return { lat, lng };
    } else {
        throw new Error("Could not geocode school address.");
    }
}


exports.clockInTeacher = async (request) => {


    try {
        const { userId, time, latitude, longitude } = request;



        if (!latitude || !longitude) {
            return { statusCode: 400, message: "Location is required" };
        }

        // Step 5: Fetch today's attendance
        const data = await teacherRepository.fetchTodayAttendanceByUserId(request);
        const logs = data?.Item?.attendanceLogs || [];
        const lastLog = logs[logs.length - 1];



        //////cal lat lon address
        const schoolId = data?.Item?.school_id;
        console.log("schoolId", schoolId);

        const fetchedSchoolData = await schoolRepository.getSchoolById(schoolId);
        const add1 = fetchedSchoolData.Items[0].school_contact_info.business_address.address_line1 || '';
        const add2 = fetchedSchoolData.Items[0].school_contact_info.business_address.address_line2 || '';

        const fullAddress = `${add1.trim()} ${add2.trim()}`.trim();



        if (!fullAddress) {
            return { statusCode: 404, message: "School address not found" };
        }

        // Step 3: Convert school address to coordinates
        const { lat: SCHOOL_LAT, lng: SCHOOL_LNG } = await getLatLngFromAddress(fullAddress);

        // Step 4: Compare with teacher's current location
        const distance = getDistanceFromLatLonInMeters(latitude, longitude, SCHOOL_LAT, SCHOOL_LNG);

        console.log("distance MAX_RADIUS_METERS", distance, MAX_RADIUS_METERS);

        if (distance > MAX_RADIUS_METERS) {
            return {
                statusCode: 403,
                message: `You are outside the allowed radius (${distance.toFixed(1)}m)`
            };
        }
        ///////   ??????/////////////////////

        if (lastLog && lastLog.clockInTime && !lastLog.clockOutTime) {
            return {
                statusCode: 400,
                message: "Already clocked in today",
                clockIn: lastLog.clockInTime
            };
        }

        // Step 6: Save clock-in

        const updateResult = await teacherRepository.appendClockInLog(request);



        return {
            status: true,
            message: "Clock-in successful",
            clockIn: time,
            updatedItem: updateResult?.Attributes || updateResult,
            fullAddress
        };

    } catch (error) {
        console.error("Clock-in Error:", error);
        return {
            statusCode: 500,
            message: constant.messages.DATABASE_ERROR
        };
    }
};

exports.getTeacherTodayAttendance = async (request) => {
    try {
        const data = await teacherRepository.fetchTodayAttendanceByUserId(request);

        console.log("datagetatt", data);
        const logs = data?.Item?.attendanceLogs || [];
        const latest = logs[logs.length - 1] || {};

        const schoolId = data?.Item?.school_id;
        console.log("schoolId", schoolId);

        const fetchedSchoolData = await schoolRepository.getSchoolById(schoolId);

        // const methodAttendence = fetchBySchoolId.Items.methodAttendence
        const methodAttendence = fetchedSchoolData?.Items?.[0]?.methodAttendence;
        const methodEffectiveFrom = fetchedSchoolData.Items?.[0]?.methodEffectiveFrom

        console.log("methodAttendence", methodAttendence);



        return {
            clockIn: latest.clockIn || '',
            clockOut: latest.clockOut || '',
            methodEffectiveFrom: methodEffectiveFrom,
            methodAttendence: methodAttendence,
            date: data?.Item?.date || new Date().toDateString(),
            fullLogs: logs
        };
    } catch (err) {
        console.log("Fetch Error", err);
        throw new Error(constant.messages.DATABASE_ERROR);
    }
};


exports.clockOutTeacher = async (request) => {

    const { latitude, longitude, time, userId } = request
    try {
        const data = await teacherRepository.fetchTodayAttendanceByUserId(request);
        const logs = data?.Item?.attendanceLogs || [];

        if (logs.length === 0 || !logs[logs.length - 1]?.clockIn.time) {
            return {
                statusCode: 400,
                message: "Must clock in first"
            };
        }

        const lastLog = logs[logs.length - 1];
        if (lastLog.clockOutTime) {
            return {
                statusCode: 400,
                message: "Already clocked out today",
                clockOut: lastLog.clockOutTime
            };
        }


        // ????????????????????????????????????
        //////cal lat lon address



        // const schoolId = data?.Item?.school_id;
        // console.log("schoolId", schoolId);

        // const fetchedSchoolData = await schoolRepository.getSchoolById(schoolId);
        // const add1 = fetchedSchoolData.Items[0].school_contact_info.business_address.address_line1 || '';
        // const add2 = fetchedSchoolData.Items[0].school_contact_info.business_address.address_line2 || '';

        // const fullAddress = `${add1.trim()} ${add2.trim()}`.trim();


        // if (!fullAddress) {
        //     return { statusCode: 404, message: "School address not found" };
        // }

        // // Step 3: Convert school address to coordinates
        // const { lat: SCHOOL_LAT, lng: SCHOOL_LNG } = await getLatLngFromAddress(fullAddress);

        // // Step 4: Compare with teacher's current location
        // const distance = getDistanceFromLatLonInMeters(latitude, longitude, SCHOOL_LAT, SCHOOL_LNG);

        // console.log("distance MAX_RADIUS_METERS", distance, MAX_RADIUS_METERS);

        // if (distance > MAX_RADIUS_METERS) {
        //     return {
        //         statusCode: 403,
        //         message: `You are outside the allowed radius (${distance.toFixed(1)}m)`
        //     };
        // }
        ///////   ??????/////////////////////

        // ????????????????????????????????????

        const updated = await teacherRepository.updateLastLogWithClockOut(request, logs);

        return {
            status: true,
            message: "Clock-out successful",
            clockOut: request.time,
            updatedItem: updated?.Attributes || updated
        };
    } catch (err) {
        console.error("Clock-out Error:", err);
        return {
            statusCode: 500,
            message: constant.messages.DATABASE_ERROR
        };
    }
};
