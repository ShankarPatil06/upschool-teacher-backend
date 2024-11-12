const baseService = (repo) => {

 
const deleteItem = async (params) => await repo.deleteItem(params);

const deleteMany = async (params) =>  await repo.deleteMany(params);

const getByObjects = async (params) => await repo.getByObjects(params)

const getItem = async (params) => await repo.getItem(params);

const putItem = async (params) => await repo.putItem(params);

const query = async (params) => await repo.query(params);

const scanTable = async (params) => await repo.scanTable(params);

const updateService = async (params) => await repo.updateService(params);

    

    return {
        deleteItem,
        deleteMany,
    
        getByObjects,
        getItem,
    
        putItem,
    
        query,
    
        scanTable,
        
        updateService,
    };
};

module.exports.baseService = baseService;